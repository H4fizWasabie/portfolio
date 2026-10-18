# Enquiries go through the portfolio API

The homepage is static, but an Enquiry is sent by the portfolio's own API, which saves it in Postgres and then alerts Hafiz on Telegram through a bot used only by the portfolio. We chose this over opening the visitor's mail app, which fails or confuses people whose phone has no mail account set up, and over a third-party form service, so visitors' names and emails stay on Hafiz's VPS and no third party sits on the page. The visitor sees a clear "Sent".

## Consequences

- The enquiry is saved before the Telegram alert is sent, so a failed alert loses nothing; it only goes unnoticed until someone checks the database.
- Without JavaScript, or when sending fails, the Enquiry form falls back to the visitor's mail app.
- Spam protection is a hidden field and five Enquiries an hour per visitor, with no CAPTCHA, to keep third parties off the page.
