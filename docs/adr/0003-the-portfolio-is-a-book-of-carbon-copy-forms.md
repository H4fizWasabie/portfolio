# The portfolio is a book of carbon-copy forms

Supersedes [0002](0002-the-homepage-tours-a-house-room-by-room.md). The House tour was set aside because it put the scene ahead of the work, and the owner did not want to share it publicly. The site is now a book of carbonless duplicate forms on a desk: each system is filed on a Sheet shaped like the form it replaced, so the before and the after share one page, and each Sheet's sample form can be filled in to see the workflow. We chose this over a conventional developer portfolio and over a hospital-wayfinding design because the clients it is for (clinic owners, operations managers) recognise these forms, and because it proves the claim "I replace paper and spreadsheets" rather than stating it.

## Consequences

- No 3D, no scroll-driven camera: the page is plain HTML and CSS, and every Sample demo is progressive enhancement, so the page reads the same without JavaScript.
- The Workshop and its House stay in the repo as an archived design, served noindex at `/variant-workshop/`.
- Project pages under `/work/<slug>/` stay, each one Sheet; `/work/cavelms/` is new, so the server config's list of project paths changes with it.
