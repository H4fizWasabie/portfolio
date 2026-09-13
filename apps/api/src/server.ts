import Fastify from 'fastify';
import pg from 'pg';
import tls from 'node:tls';
import os from 'node:os';
import type { ContactPayload } from '@portfolio/shared';

const app = Fastify({ logger: true, trustProxy: '127.0.0.1' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost/portfolio' });
const hits = new Map<string, { at: number; count: number }>();

app.get('/api/health', async () => { await pool.query('select 1'); return { ok: true }; });
app.get('/api/metrics', async () => (await pool.query('select value,label,basis,"sortOrder" from metrics order by "sortOrder"')).rows);
app.get('/api/case-studies', async () => (await pool.query('select slug,title,kind,summary,tags,links,"sortOrder" from case_studies order by "sortOrder"')).rows);
app.get('/api/case-studies/:slug', async (req, res) => {
  const { slug } = req.params as { slug: string };
  const result = await pool.query('select slug,title,kind,summary,tags,links,"sortOrder" from case_studies where slug=$1', [slug]);
  if (!result.rows[0]) return res.code(404).send({ error: 'Case study not found' });
  const blocks = await pool.query('select heading,body,"sortOrder" from case_study_blocks where case_study_id=(select id from case_studies where slug=$1) order by "sortOrder"', [slug]);
  return { ...result.rows[0], blocks: blocks.rows };
});
app.post('/api/analytics', async (req, res) => { const { event, slug } = req.body as { event?: string; slug?: string }; if (!event) return res.code(400).send({ error: 'Event is required' }); await pool.query('insert into analytics_events(event,slug) values($1,$2)', [event, slug || null]); return { ok: true }; });
app.get('/api/admin/analytics', async (req, res) => { const token = process.env.ADMIN_TOKEN; if (!token || req.headers['x-admin-token'] !== token) return res.code(404).send(); return (await pool.query('select event,slug,count(*)::int as count from analytics_events group by event,slug order by count desc')).rows; });
app.post('/api/contact', async (req, res) => {
  const body = req.body as ContactPayload;
  if (body?.website) return { ok: true };
  if (!body?.name || !body.email || !body.message) return res.code(400).send({ error: 'Invalid contact details' });
  const ip = req.ip; const now = Date.now(); const hit = hits.get(ip);
  if (hit && now - hit.at >= 3600000) hits.delete(ip);
  const current = hits.get(ip);
  if (current && current.count >= 5) return res.code(429).send({ error: 'Too many messages' });
  hits.set(ip, { at: current?.at || now, count: (current?.count || 0) + 1 });
  await pool.query('insert into contact_messages(name,email,message,ip_hash) values($1,$2,$3,md5($4))', [body.name, body.email, body.message, ip]);
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `Portfolio contact from ${body.name} <${body.email}>\n${body.message}` }) }).catch(app.log.error);
  return { ok: true };
});

/* ---------- live system status (variant delta / mission control) ---------- */
await pool.query(`create table if not exists system_checks(
  id serial primary key,
  system text not null,
  at timestamptz not null default now(),
  ok boolean not null,
  latency_ms int not null
)`);

async function probeHttp(url: string) {
  const t = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: 'manual' });
    return { ok: r.status < 500, ms: Date.now() - t };
  } catch { return { ok: false, ms: Date.now() - t }; }
}

const PROBES: Record<string, () => Promise<{ ok: boolean; ms: number }>> = {
  'procura': () => probeHttp('http://127.0.0.1:8082/'),
  'pims': () => probeHttp('http://127.0.0.1:8083/'),
  'portfolio-api': async () => {
    const t = Date.now(); await pool.query('select 1'); return { ok: true, ms: Date.now() - t };
  },
  'edge': () => probeHttp('https://portfolio.wasabietech.com/api/health'),
};

async function runChecks() {
  await Promise.all(Object.entries(PROBES).map(async ([id, fn]) => {
    try {
      const r = await fn();
      await pool.query('insert into system_checks(system,ok,latency_ms) values($1,$2,$3)', [id, r.ok, Math.round(r.ms)]);
    } catch { /* keep API alive even if a probe write fails */ }
  }));
}
runChecks();
setInterval(runChecks, 60_000);

let lastCpu = os.cpus().map(c => c.times);
function cpuPct() {
  const t = os.cpus().map(c => c.times);
  let idle = 0, total = 0;
  for (let i = 0; i < t.length; i++) {
    const lt = lastCpu[i] || t[i];
    idle += t[i].idle - lt.idle;
    total += (t[i].user + t[i].nice + t[i].sys + t[i].irq + t[i].idle) - (lt.user + lt.nice + lt.sys + lt.irq + lt.idle);
  }
  lastCpu = t;
  return total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0;
}

let certCache: { days: number; ok: boolean; at: number } | null = null;
function certInfo(host: string): Promise<{ days: number; ok: boolean }> {
  if (certCache && Date.now() - certCache.at < 600_000) return Promise.resolve({ days: certCache.days, ok: certCache.ok });
  return new Promise(res => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 5000 }, () => {
      try {
        const c = s.getPeerCertificate() as { valid_to?: string };
        const days = c.valid_to ? Math.round((new Date(c.valid_to).getTime() - Date.now()) / 86_400_000 * 10) / 10 : -1;
        certCache = { days, ok: true, at: Date.now() }; res({ days, ok: true });
      } catch { res({ days: -1, ok: false }); }
      s.end();
    });
    const fail = () => { certCache = { days: -1, ok: false, at: Date.now() }; res({ days: -1, ok: false }); };
    s.on('error', fail); s.on('timeout', () => { s.destroy(); fail(); });
  });
}

app.get('/api/status', async () => {
  await runChecks();
  const [latest, avail, p95, uptime, cert, cpu, mem] = await Promise.all([
    pool.query(`select distinct on (system) system, ok, latency_ms, at from system_checks order by system, at desc`),
    pool.query(`select system, to_char(date(at),'MM-DD') d, round(avg(case when ok then 100 else 0 end)::numeric,1) pct
                from system_checks where at > now() - interval '30 days'
                group by system, date(at) order by system, d`),
    pool.query(`select to_char(date_trunc('hour',at),'MM-DD HH24:00') h, round(percentile_cont(0.95) within group (order by latency_ms))::int p95
                from system_checks where system='edge' and ok and at > now() - interval '24 hours'
                group by date_trunc('hour',at) order by date_trunc('hour',at)`),
    pool.query(`select round(avg(case when ok then 100 else 0 end)::numeric,2) pct from system_checks
                where system='portfolio-api' and at > now() - interval '30 days'`),
    certInfo('portfolio.wasabietech.com'),
    Promise.resolve(cpuPct()),
    Promise.resolve({ used: +(os.totalmem() - os.freemem()) / 2 ** 30, total: +os.totalmem() / 2 ** 30 }),
  ]);
  const systems: Record<string, { ok: boolean; ms: number; at: string }> = {};
  for (const r of latest.rows) systems[r.system] = { ok: r.ok, ms: r.latency_ms, at: r.at };
  const availability: Record<string, { pct: number; days: { d: string; pct: number }[] }> = {};
  for (const r of avail.rows) {
    (availability[r.system] ||= { pct: 100, days: [] }).days.push({ d: r.d, pct: Number(r.pct) });
  }
  for (const id of Object.keys(availability)) {
    availability[id].pct = Math.round(availability[id].days.reduce((s, x) => s + x.pct, 0) / Math.max(availability[id].days.length, 1) * 10) / 10;
  }
  return { systems, availability, p95Samples: p95.rows.map(r => r.p95), cert, cpu, mem, uptimePct: uptime.rows[0]?.pct ?? null };
});

app.listen({ host: '127.0.0.1', port: Number(process.env.PORT || 8085) }).catch(err => { app.log.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await app.close(); await pool.end(); process.exit(0); });