# Glow-guate

Source for **glow-now.netlify.app** (Netlify project `glow-now`).

## What this is
Prebuilt static output (Vite `dist`) of the earlier Glow Labs Rx site.
There is **no build step** — Netlify publishes this repo root as-is.

- Netlify build command: *(none)*
- Publish directory: `/`
- Deploy branch: `main` — pushing to `main` deploys to production

## Notes
- `leads/*.csv` is intentionally not in this repo (internal vendor and
  price lists; this repo is public).
- A hardcoded Slack incoming-webhook URL was stripped from
  `assets/index-ChpwTKXb.js` before the first commit. It had been shipped
  in public client-side JS and must be rotated in Slack.
- The original app source is not here — only the built bundle. Editing
  the SPA's behavior requires the original source.
