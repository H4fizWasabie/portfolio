// Request form: posts to the portfolio API (POST /api/contact, JSON).
// Without JavaScript the form's own mailto action opens the visitor's mail app instead.
const failures = {
  400: 'Your request was not accepted. Check your name, email and message.',
  429: 'Several requests were sent in a short time, so this one was not sent.',
};

const form = document.querySelector('[data-request]');
if (form) {
  form.noValidate = true;
  const $ = s => form.querySelector(s);
  const fields = ['message', 'name', 'email'].map(n => $(`[name=${n}]`));
  const flag = (field, bad) => {
    if (bad) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', `err-${field.name}`); }
    else { field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); }
  };
  fields.forEach(f => f.addEventListener('input', () => flag(f, false)));

  // "Request one like this" names its system: an empty message starts "Something like PIMS: " and takes focus at the end.
  // The name comes from the page's own data-about links (here on a click, or in ?about= from a /work/ page), so no other text is accepted.
  const about = [...document.querySelectorAll('[data-about]')].map(a => a.dataset.about);
  const prefill = name => {
    if (!about.includes(name)) return;
    const message = fields[0];
    if (!message.value) message.value = `Something like ${name}: `;
    setTimeout(() => message.focus({ preventScroll: true })); // after the jump to #request, which would clear the focus
  };
  document.addEventListener('click', e => { const a = e.target.closest('[data-about]'); if (a) prefill(a.dataset.about); });
  addEventListener('load', () => prefill(new URLSearchParams(location.search).get('about')));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const [message, name, email] = fields.map(f => f.value.trim());
    const bad = [!message, !name, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)];
    fields.forEach((f, i) => flag(f, bad[i]));
    const first = fields[bad.indexOf(true)];
    if (first) return first.focus();

    const send = $('button'), label = send.firstElementChild, fail = $('.fail');
    fail.hidden = true;
    send.disabled = true;
    label.textContent = 'Sending…';
    let why;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, website: $('[name=website]').value }),
      });
      if (!res.ok) why = failures[res.status] || 'Your request could not be sent.';
    } catch {
      why = 'Your request could not be sent. Check your connection.';
    }
    send.disabled = false;
    label.textContent = 'Send request';

    if (why) {
      $('.why').textContent = why;
      fail.hidden = false;
      fail.focus();
      return;
    }
    form.classList.add('sent');
    $('.office .stamp').hidden = false;
    const done = $('.done');
    done.hidden = false;
    done.focus();
  });
}
