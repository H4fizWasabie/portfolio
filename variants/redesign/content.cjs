// Shared copy for the redesign. Project facts live in the approved projects module;
// this decides their order and holds the site-wide wording.
const approved = require('../product-launch/projects.cjs');

const order = ['pims', 'dd-drugs-register', 'procura', 'cavelms', 'theoses', '89lab', 'map', 'yen'];
const projects = order.map(slug => {
  const p = approved.find(x => x.slug === slug);
  if (!p) throw new Error(`missing project ${slug}`);
  return p;
});

const email = 'hafizwasabie@gmail.com';
const site = {
  name: 'Hafiz Jamali',
  email,
  mailto: 'mailto:hafizwasabie@gmail.com?subject=Project%20enquiry',
  github: 'https://github.com/H4fizWasabie',
  resume: 'https://portfolio.wasabietech.com/resume/',
  title: 'Hafiz Jamali | Software that replaces paper and spreadsheets',
  description: 'Hafiz Jamali builds internal tools and AI automation that replace paper forms and spreadsheets.',
  headline: 'I build the software a veterinary hospital runs on.',
  sub: 'Stock, purchasing and a dangerous-drugs register, in daily use where I work. I build the same for other teams, automate the repeated work with AI, and teach people to build their own.',
  cta: 'Discuss your project',
  ctaShort: 'Contact',
  based: 'Based in Selangor, Malaysia (GMT+8).',
  about: [
    'I’m Hafiz Jamali. I build practical software around work I know: veterinary procurement, inventory, clinical records, personal organisation and AI-assisted workflows.',
    'Most of what you see here is in daily use. Each case study says what the software does, and what it does not claim.'
  ],
  hiring: 'Hiring for internal tools or AI automation?',
  contactTitle: 'What should your software do?',
  contactBody: 'Tell me what your team does today, what gets repeated, and what a better workflow would look like.',
  demoNote: 'Screens and demos use fictional sample data.',
  // The Case File (casefile/page.cjs): the first Sheet, Particulars and the Request form.
  statement: 'I replace paper forms and spreadsheets with software people use every day.',
  formTitle: 'Record of work',
  formSub: 'Hafiz Jamali · internal tools and AI automation',
  replaces: 'Paper stock requests, approvals, stock checks, scattered spreadsheets',
  where: 'A veterinary hospital in Selangor, Malaysia, and a training company',
  requestTitle: 'Request for work',
  requestSub: 'Tell me what your team does by hand today.',
  requestNote: `It comes straight to me, Hafiz. I reply by email from ${email}.`,
  requestSend: 'Request work',
  requestDone: 'Received. I’ll reply by email.',
  particulars: [
    ['Name', 'Mohammad Hafiz Jamali'],
    ['Based', 'Selayang, Selangor, Malaysia (GMT+8)'],
    ['Languages', 'English, Bahasa Malaysia, Iban'],
    ['Background', 'Years in procurement and inventory showed me where paper and spreadsheets break. I now replace them with software people use daily, and I take each system from requirements to production alone: data model, Go backend, deployment, backups, AI automation.'],
    ['Also', 'I also coach people and teams who want to build their own AI agents and automation.']
  ],
  deskNote: 'Screens use fictional sample data. Diagrams are diagrams, not screenshots.'
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { projects, site, esc };
