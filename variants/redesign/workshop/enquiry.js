// Enquiry form: sends the visitor's answers to the portfolio API (POST /api/contact).
// When sending fails, the message stays on the page with a mail link and a copy button.
// Without JavaScript the form's own mailto action opens the visitor's mail app instead.
const failures = {
  400: 'Your Enquiry was not accepted. Check your name, email and message.',
  429: 'You have sent several Enquiries in a short time, so this one was not sent.',
};

export function initEnquiry() {
  const form = document.querySelector('[data-enquiry]');
  if (!form) return;
  const $ = s => form.querySelector(s);
  const send = $('[data-enquiry-send]');
  const failed = $('[data-enquiry-failed]');
  const sent = document.querySelector('[data-enquiry-sent]');
  const copied = $('[data-enquiry-copied]');
  const fields = { today: $('[name=today]'), name: $('[name=name]'), email: $('[name=email]') };
  const invalid = (key, message) => {
    const error = $(`[data-error=${key}]`), field = fields[key];
    error.textContent = message;
    error.hidden = !message;
    if (message) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    const ids = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== error.id);
    field.setAttribute('aria-describedby', (message ? [...ids, error.id] : ids).join(' '));
  };
  for (const key in fields) fields[key].addEventListener('input', () => invalid(key, ''));
  form.addEventListener('change', () => invalid('today', ''));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const needs = [...form.querySelectorAll('[name=need]:checked')].map(i => i.value);
    const people = $('[name=people]:checked')?.value;
    const today = fields.today.value.trim(), name = fields.name.value.trim(), email = fields.email.value.trim();
    const problems = {
      today: !needs.length && !today && 'Pick at least one option or write a line about the work.',
      name: !name && 'Enter your name.',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (email ? 'Enter an email address like name@example.com.' : 'Enter your email.'),
    };
    for (const key in problems) invalid(key, problems[key]);
    const first = Object.keys(problems).find(key => problems[key]);
    if (first) return fields[first].focus();

    const lines = [];
    if (needs.length) lines.push(`What I need: ${needs.join(', ')}`);
    if (people) lines.push(`People who would use it: ${people}`);
    if (today) lines.push(`How it works today:\n${today}`);
    const message = lines.join('\n');
    const subject = `Project enquiry${needs.length ? `: ${needs.join(', ')}` : ''}`;
    const mail = `${message}\n\nName: ${name}\nEmail: ${email}\n\nSent from the Enquiry form on portfolio.wasabietech.com`;

    failed.hidden = true;
    send.disabled = true;
    let failure;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, website: $('[name=website]').value }),
      });
      if (!res.ok) failure = failures[res.status] || 'Your Enquiry could not be sent.';
    } catch {
      failure = 'Your Enquiry could not be sent. Check your connection.';
    }
    send.disabled = false;

    if (!failure) {
      form.hidden = true;
      sent.textContent = `Sent. I'll reply to ${email} within two working days.`;
      sent.hidden = false;
      return sent.focus();
    }
    // Webmail users may have no mail app, so the message also stays on the page to copy.
    $('[data-enquiry-text]').value = `Subject: ${subject}\n\n${mail}`;
    $('[data-enquiry-mail]').href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mail)}`;
    copied.textContent = '';
    failed.hidden = false;
    $('[data-enquiry-failure]').textContent = failure;
  });

  $('[data-enquiry-copy]').addEventListener('click', async () => {
    const text = $('[data-enquiry-text]');
    try { await navigator.clipboard.writeText(text.value); copied.textContent = 'Copied'; }
    catch { text.select(); copied.textContent = 'Selected: press Ctrl+C or Cmd+C to copy'; }
  });
}
