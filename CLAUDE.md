# Glow Peptides GT — María

Guatemala storefront + admin centre for **María Cristina Beatriz Arenas
Echeverría**, the owner's family member. Static vanilla JS, no build step.

- **Live:** https://glowguate.com (www and http both 301 to the apex)
- **Repo:** github.com/Legacypay/Glow-guate (public) → Netlify site `glow-now`
  (id `c39fff6d-12a7-4576-a45d-5e30d371cb15`), branch `main`
- **Deploy:** `git push` — Netlify publishes `site/` and builds the functions.
  A fresh clone needs `git config http.postBuffer 524288000` and
  `git config http.version HTTP/1.1` or the push fails with HTTP 400.
- **DNS is on Cloudflare**, both records **DNS-only / grey cloud** — the orange
  cloud blocks Netlify's certificate.

## The boundary that matters

A **second, unrelated operator** runs the same codebase at
https://glow-gt.netlify.app from `~/Desktop/glow-gt-2` (Netlify site `glow-gt`).
Different company, different bank account, separate Blobs store. Never deploy
that folder to this site or copy details between them.

## How it works

Three views in one page — `inicio`, `coas` (`#certificados`), `aprende` —
toggled by `route()` on hashchange; sections carry `data-view`.

Checkout → `netlify/functions/order` stores the order in Netlify Blobs **and**
forwards it to the Netlify form `pedido-gt` so the email alert fires
(→ info@glowpeptides.com). If the function fails the client posts the form
directly, so an order is never lost. Orders placed before the admin centre
existed (e.g. `GT-260918-XW55`) live only in Netlify Forms.

`/admin/` → password in the `ADMIN_PASSWORD` env var, sessions HMAC-signed with
`ADMIN_SECRET`; both functions-scoped, neither ever reaches the browser. Tokens
go in an `Authorization: Bearer` header, not the body. Marking an order
**pagado** decrements stock; **cancelado** restores it.

**Payment is a bank transfer in quetzales** to her Banco Industrial cuenta
monetaria, shown only on the order confirmation with the order number as the
reference. So `CONFIG.fxRate` is **real money**, not a display estimate — it is
computed per unit (`qUnit`) and summed (`cartTotalQ`) so lines equal the total.
There is no card processor behind the site.

## Layout

```
site/            what gets published — index.html, app.js (CONFIG at top),
                 data.js (19 products, 29 COA lots), content.js (generated),
                 styles.css, admin/, coa/, img/
netlify/functions/  order.mjs, admin.mjs, lib.mjs
tools/           build-content.mjs, es/, native/, og/render.mjs — never deployed
```

Prices and products: `site/data.js`. Store copy: the `I18N` block in
`site/app.js`. Articles: `node tools/build-content.mjs <path-to-main-repo>`
regenerates `site/content.js` (45 bilingual items) — don't hand-edit it. A new
English article needs a Spanish file in `tools/es/` or it renders with an "EN"
tag. Social card: `node tools/og/render.mjs` (headless Chrome).

## Copy rules

Not RUO — this market allows benefit and use claims. Say **"USA"**, never
"EE.UU.". Purity is a floor: **"≥99.2%"**, never a bare "99%". The lab is
Freedom Diagnostics, an independent U.S. lab — never "third-party".

## Open

Real 20 mg / 40 mg vial photos (Reta 20 and MOTS-c 40 still reuse the 10 mg
render), delivery pricing, an optional DMARC record for glowguate.com, and the
**leaked Slack webhook from the retired V1 app still needs rotating**.
