# Systems Builder résumé

Owner-selected source: `resume-datasheet-source.html`. `../resume.html` is a byte-identical copy because the existing VPS nightly generator reads that path. Keep both in sync; never run the live generator as a draft test (it replaces public, dist and legacy PDFs).

2026-10-03 edit: replace duplicate Procure Pilot entry with MAP (My Awesome App); retain procurement achievements under Procura; correct the Starlight experience reference. MAP description is grounded in map-android README/PRODUCT and owner's daily use. No commercial adoption/performance claims added. Profile, employment, metrics and skills otherwise preserved.

The selected PDF used wkhtmltopdf0.12.6.1. Safe draft build from repository root:

```sh
wkhtmltopdf --quiet --enable-local-file-access resume/resume-datasheet-source.html /tmp/Hafiz-Jamali-Systems-Builder-MAP.pdf
pdfinfo /tmp/Hafiz-Jamali-Systems-Builder-MAP.pdf
```

Tracked PDF copies: `resume/Resume-Hafiz-Jamali.pdf` and `apps/web/public/resume/Resume-Hafiz-Jamali.pdf`; identical bytes after

[... 502 chars omitted from this earlier write call; full text saved at /home/theoses/.theoses/agent/sessions/--opt-theoses2-releases-current--/artifacts/01a075d6-ae25-7068-90c4-438515d2d451/pruned-args-call_HJHSnoMsduNkTaERUGmPnW6o_fc_0d85dec01173a617016ac0fc85ad4087d0b450897cbfcfd.txt, read it with the read tool ...]

imary readable résumé preview with download optional. This PR prepares the document; website preview UI and canonical deployment remain deferred pending owner's edited-document review. Do not claim the current live download has changed.
