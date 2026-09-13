import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import type { CaseStudy, Metric } from '@portfolio/shared';
import { loadCaseStudy, loadMetrics, loadWork } from './api';

const HeroField = lazy(() => import('./HeroField'));
function HeroVisual() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; setEnabled(innerWidth >= 900 && !reduced && !!document.createElement('canvas').getContext('webgl')); }, []);
  return enabled ? <Suspense fallback={<div className="poster"/>}><HeroField/></Suspense> : <svg className="poster" viewBox="0 0 600 300" aria-hidden="true"><path d="M0 60H600M0 120H600M0 180H600M0 240H600M40 0V300M160 0V300M280 0V300M400 0V300M520 0V300" /></svg>;
}
const steps = [
  ['Find the signal', 'Research products, customers, competitors, constraints, and the real question behind the request.'],
  ['Shape the message', 'Turn raw information into a clear angle, useful copy, visual direction, and a reason to act.'],
  ['Automate the repeat', 'Use Theoses and practical systems to make research, drafts, reports, and follow-up easier to repeat.'],
  ['Review the evidence', 'Look at engagement, questions, workflow friction, and outcomes. Keep what works; revise what does not.'],
] as const;
const workVisuals: Record<string, { src: string; alt: string }> = {
  'hills-ai-content-lab': { src: '/img/hills-featured-range.jpeg', alt: "Hill's product range campaign visual" },
  procura: { src: '/img/procura-dash.png', alt: 'Procura procurement workspace overview' },
  pims: { src: '/img/pims-dash.png', alt: 'PIMS inventory workspace overview' },
};

function Rail({ progress, section }: { progress: number; section: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.floor(elapsed / 1000);
  return <aside className="rail" aria-label="Page instrument"><span>{section} / 05</span><div className="trace"><i style={{ height: `${progress * 100}%` }} /></div><span>{Math.min(100, Math.round(progress * 100))}%</span><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span></aside>;
}

function Landing() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [work, setWork] = useState<CaseStudy[]>([]);
  const [progress, setProgress] = useState(0);
  const [section, setSection] = useState('01');
  useEffect(() => {
    loadMetrics().then(setMetrics); loadWork().then(setWork);
    const seen = new Set<string>();
    const landmarks = [...document.querySelectorAll<HTMLElement>('[data-folio]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const folio = entry.target.getAttribute('data-folio')!;
        setSection(folio);
        if (seen.has(folio)) return;
        seen.add(folio);
        fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: 'section-reach', slug: folio }) }).catch(() => {});
      });
    }, { threshold: 0.45 });
    landmarks.forEach(element => observer.observe(element));
    const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; setProgress(max ? scrollY / max : 0); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => { observer.disconnect(); removeEventListener('scroll', onScroll); };
  }, []);
  return <><a className="skip-link" href="#main">Skip to content</a><Rail progress={progress} section={section}/><main id="main"><header className="topbar"><Link to="/">HJ / PORTFOLIO</Link><nav><a href="#work">Work</a><a href="#contact">Contact</a><Link to="/resume">Resume</Link></nav></header><section className="hero section-grid" data-folio="01"><div className="hero-copy"><p className="kicker">AI-assisted marketing / systems / operations</p><h1>I make useful things move.</h1><p className="lede">I turn messy product information, operational problems, and half-formed ideas into clear content, practical systems, and workflows that people can actually use.</p><div className="actions"><a className="button" href="#work">See the work</a><Link className="button" to="/resume">View resume</Link><a className="button" href="mailto:kisame350@gmail.com">Start a conversation</a></div><p className="footline">Based in Malaysia · building with AI every day</p></div><div className="hero-visual"><HeroVisual/></div></section><section className="section" data-folio="02"><p className="folio">02 / METRICS</p><h2>Useful work leaves a trace.</h2><div className="metrics">{metrics.map(metric => <div className="metric" key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span>{metric.basis && <small>{metric.basis}</small>}</div>)}</div></section><section className="section" id="work" data-folio="03"><p className="folio">03 / SELECTED WORK</p><h2>Work that has a pulse.</h2><p className="section-intro">Real systems and honest practice projects, showing how I think, make, test, and improve.</p><div className="work-list">{work.map((item, index) => { const visual = workVisuals[item.slug]; return <Link className="work-row" to={`/work/${item.slug}`} key={item.slug}><span>0{index + 1}</span>{visual ? <figure className="work-thumb"><img src={visual.src} alt={visual.alt} loading="lazy" /></figure> : <span className="work-thumb work-thumb-empty" aria-hidden="true">TH</span>}<div><h3>{item.title}</h3><p>{item.summary}</p><small>{item.kind}</small><div className="tags">{item.tags.map(tag => <em key={tag}>{tag}</em>)}</div></div><b>OPEN</b></Link>; })}</div><div className="bridge"><h3>One idea, packaged for action.</h3><p>The same thinking travels from a live business system to a marketing concept: understand the signal, make it clear, then decide what to do next.</p></div></section><section className="section loop" data-folio="04"><div><p className="folio">04 / WORKING LOOP</p><h2>My working loop.</h2><p className="section-intro">The same habits carry from procurement to marketing: get close to the facts, make the work visible, and learn from the response.</p></div><div className="steps">{steps.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section><section className="section contact" id="contact" data-folio="05"><p className="folio">05 / CONTACT</p><h2>Bring me a messy problem. I'll help make it legible.</h2><p>Marketing support, content operations, AI-assisted workflows, or a practical system that saves a team time.</p><div className="contact-actions"><a className="contact-link" href="mailto:kisame350@gmail.com">kisame350@gmail.com</a><Link className="contact-link" to="/resume">View resume</Link></div><footer>© Mohammad Hafiz Bin Jamali</footer></section></main></>;
}

function Detail() {
  const slug = useLocation().pathname.split('/').pop()!;
  const [work, setWork] = useState<CaseStudy | null>();
  useEffect(() => { loadCaseStudy(slug).then(setWork); }, [slug]);
  const visual = work ? workVisuals[work.slug] : undefined;
  return <main className="detail"><Link to="/">Back to work</Link>{work ? <><p className="folio">CASE STUDY / {work.kind}</p><h1>{work.title}</h1><p className="lede">{work.summary}</p>{visual && <figure className="detail-media"><img src={visual.src} alt={visual.alt} /></figure>}<div className="tags">{work.tags.map(tag => <em key={tag}>{tag}</em>)}</div>{work.blocks?.map(block => <section className="detail-block" key={block.heading}><h2>{block.heading}</h2><p>{block.body}</p></section>)}{Object.entries(work.links).map(([label, url]) => <a className="contact-link" href={url} key={url}>{label}</a>)}</> : <><h1>Case study not found.</h1><p className="lede">That work page does not exist.</p></>}</main>;
}
function Resume() { return <main className="detail"><Link to="/">Back</Link><p className="folio">RESUME</p><h1>Hafiz Jamali</h1><p className="lede">A practical resume for marketing systems, content operations, and AI-assisted workflows.</p><a className="button" href="/resume/Resume-Hafiz-Jamali.pdf">Open resume PDF</a></main>; }
function NotFound() { return <main className="detail"><Link to="/">Back home</Link><p className="folio">404 / NOT FOUND</p><h1>That page is not here.</h1><p className="lede">The portfolio route you requested does not exist.</p></main>; }
export default function App() { return <Routes><Route path="/" element={<Landing/>}/><Route path="/work/:slug" element={<Detail/>}/><Route path="/resume" element={<Resume/>}/><Route path="*" element={<NotFound/>}/></Routes>; }
