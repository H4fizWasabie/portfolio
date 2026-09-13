import Fastify from 'fastify';
import pg from 'pg';
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

app.listen({ host: '127.0.0.1', port: Number(process.env.PORT || 8085) }).catch(err => { app.log.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await app.close(); await pool.end(); process.exit(0); });
