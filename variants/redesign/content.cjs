// Shared copy for the redesign. Project facts live in the approved projects module;
// this decides their order and holds the site-wide wording.
const approved = require('../product-launch/projects.cjs');

const order = ['procura', 'pims', 'dd-drugs-register', 'theoses', '89lab', 'map', 'yen'];
const projects = order.map(slug => {
  const p = approved.find(x => x.slug === slug);
  if (!p) throw new Error(`missing project ${slug}`);
  return p;
});

const site = {
  name: 'Hafiz Jamali',
  email: 'hafizwasabie@gmail.com',
  mailto: 'mailto:hafizwasabie@gmail.com?subject=Project%20enquiry',
  github: 'https://github.com/H4fizWasabie',
  resume: 'https://portfolio.wasabietech.com/resume/',
  title: 'Hafiz Jamali | Custom business apps and AI automation',
  description: 'Hafiz Jamali builds custom business apps and AI automation for stock, purchasing, records and repetitive work.',
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
  demoNote: 'Screens and demos use fictional sample data.'
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { projects, site, esc };
