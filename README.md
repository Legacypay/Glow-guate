# Glow Peptides GT

Source for **glow-now.netlify.app** — the Glow Peptides Guatemala ordering site.

Plain HTML/CSS/JS, no build step. Netlify publishes the repo root as-is;
pushing to `main` deploys to production.

## Files
- `index.html` — page shell, static sections, and the hidden Netlify form (`pedido-gt`) that registers the order fields
- `app.js` — i18n (ES/EN), catalog rendering, cart, checkout, order submission. **`CONFIG` at the top** holds the contact email (macriarenas@glowguate.com), the WhatsApp
  number in E.164 digits (50255279444), the GTQ exchange rate and the pickup location.
- `data.js` — the 19 products (bilingual copy, USD prices), COA index, categories
- `styles.css` — styles
- `coa/` — certificate PDFs (Freedom Diagnostics); `img/` — product renders

## Orders
Submitting the checkout posts to Netlify Forms (`pedido-gt`). Submissions appear in Netlify → Forms and are emailed to macriarenas@glowguate.com
(Netlify → Site configuration → Notifications → Form submission).
No payment is taken on-site. Customers pay by bank transfer in **quetzales** to the
Banco Industrial account in `CONFIG.bank`; the confirmation screen shows the exact Q
amount and the account details, with the order number as the transfer reference.

**`CONFIG.fxRate` is real money.** Because customers transfer quetzales, that rate sets
the exact amount each order is paid at — it is not a display estimate. Line items are
converted per unit and summed, so what a customer sees always adds up to what they send.

## Editing prices / products
Edit `data.js`. `price` is USD; the quetzal figure shown is `price × CONFIG.fxRate`.
