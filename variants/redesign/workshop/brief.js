// Contact brief: turns a few choices and one line of text into a prefilled email.
// Nothing is sent from the page; the visitor's own email app opens with the draft.
export function initBrief() {
  const form = document.querySelector('[data-brief]');
  if (!form) return;
  const error = form.querySelector('[data-brief-error]');
  const done = form.querySelector('[data-brief-done]');
  const text = form.querySelector('textarea');
  form.addEventListener('input', () => { error.hidden = true; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const needs = [...form.querySelectorAll('[name=need]:checked')].map(i => i.value);
    const people = form.querySelector('[name=people]:checked')?.value;
    const today = text.value.trim();
    if (!needs.length && !today) {
      error.hidden = false;
      error.textContent = 'Pick at least one option or write a line about the work.';
      form.querySelector('[name=need]').focus();
      return;
    }
    error.hidden = true;
    const lines = [];
    if (needs.length) lines.push(`What I need: ${needs.join(', ')}`);
    if (people) lines.push(`People who would use it: ${people}`);
    if (today) lines.push(`How it works today:\n${today}`);
    lines.push('', 'Sent from the brief form on portfolio.wasabietech.com');
    const body = lines.join('\n');
    const subject = `Project enquiry${needs.length ? `: ${needs.join(', ')}` : ''}`;
    // Webmail users may have no email app, so the drafted message stays on the page to copy.
    form.querySelector('[data-brief-text]').value = `Subject: ${subject}\n\n${body}`;
    copied.textContent = '';
    done.hidden = false;
    location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  const copied = form.querySelector('[data-brief-copied]');
  form.querySelector('[data-brief-copy]').addEventListener('click', async () => {
    const text = form.querySelector('[data-brief-text]');
    try { await navigator.clipboard.writeText(text.value); copied.textContent = 'Copied'; }
    catch { text.select(); copied.textContent = 'Selected: press Ctrl+C or Cmd+C to copy'; }
  });
}
