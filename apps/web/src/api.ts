import type { CaseStudy, Metric } from '@portfolio/shared';
const fallbackMetrics: Metric[] = [
  { value: '76.5%', label: 'less manual PRF creation', sortOrder: 1 }, { value: '90%', label: 'automated ordering accuracy', sortOrder: 2 }, { value: '71%', label: 'fewer critical stock incidents', sortOrder: 3 }, { value: '24/7', label: 'self-hosted AI workflows', sortOrder: 4 }
];
const fallbackWork: CaseStudy[] = [
  { slug:'theoses', title:'Theoses', kind:'Personal system · always on', tags:['AI agents','automation','content systems','VPS'], summary:'A self-hosted AI agent I use for research, planning, content drafts, repeatable workflows, documentation, and daily digital operations. It is the system behind the work on this page.', links:{github:'https://github.com/H4fizWasabie/theoses2'}, sortOrder:1 },
  { slug:'hills-ai-content-lab', title:"Hill's AI Content Lab", kind:'Practice project', tags:['hooks','content strategy','AI-assisted'], summary:'A self-directed pet-food promotion concept built from supplied product material.', links:{}, sortOrder:2 },
  { slug:'procura', title:'Procura', kind:'Production system', tags:['research','reporting','Go'], summary:'Product, supplier, and purchasing information turned into a connected workflow for better decisions.', links:{site:'https://procura.wasabietech.com'}, sortOrder:3 },
  { slug:'pims', title:'PIMS', kind:'Production system', tags:['data','operations','monitoring'], summary:'Inventory visibility and alerts that keep a real veterinary operation moving.', links:{site:'https://pims.wasabietech.com'}, sortOrder:4 },
  { slug:'dd-drugs-register', title:'DD Drugs Register', kind:'Production system', tags:['Go','SQLite','healthcare','audit trail'], summary:'A hospital dangerous-drugs register: daily physical vs. system counts per drug, immutable records with audited corrections, and CSV export — the paper register, kept digitally.', links:{site:'https://dd.wasabietech.com', github:'https://github.com/H4fizWasabie/dd-drugs-record'}, sortOrder:5 }
];
async function get<T>(path: string, fallback: T): Promise<T> { try { const res = await fetch(`/api${path}`); if (!res.ok) throw new Error(); return await res.json(); } catch { return fallback; } }
export const loadMetrics = () => get('/metrics', fallbackMetrics);
export const loadWork = () => get('/case-studies', fallbackWork);
export const loadCaseStudy = (slug: string) => get(`/case-studies/${slug}`, fallbackWork.find(item => item.slug === slug) || null);
