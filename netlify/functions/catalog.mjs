// Server-side prices for the card path.
//
// pay-start must not sign an amount the browser handed it — a customer can edit
// anything before it leaves their machine, and a card charge settles with no
// human looking at it. So the total is recomputed here from the same data.js
// the site serves, fetched from our own origin so the two can never drift.
let cache = { at: 0, prices: null };
const TTL_MS = 5 * 60 * 1000;

export async function productPrices(origin) {
  if (cache.prices && Date.now() - cache.at < TTL_MS) return cache.prices;

  const res = await fetch(`${origin}/data.js`, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`data.js ${res.status}`);
  const code = await res.text();

  // data.js only assigns onto `window`; give it a bare object and read it back.
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function('window', code)(win);
  if (!Array.isArray(win.PRODUCTS) || !win.PRODUCTS.length) throw new Error('no PRODUCTS in data.js');

  const prices = new Map();
  for (const p of win.PRODUCTS) {
    if (p && p.slug && Number.isFinite(Number(p.price))) prices.set(String(p.slug), Number(p.price));
  }
  if (!prices.size) throw new Error('no priced products');

  cache = { at: Date.now(), prices };
  return prices;
}

// The exchange rate is real money, so it is read from the same app.js the
// customer's browser used rather than kept as a second copy here.
let fxCache = { at: 0, rate: null };

export async function siteFxRate(origin) {
  if (fxCache.rate && Date.now() - fxCache.at < TTL_MS) return fxCache.rate;
  const res = await fetch(`${origin}/app.js`, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`app.js ${res.status}`);
  const m = (await res.text()).match(/fxRate:\s*([\d.]+)/);
  const rate = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('no fxRate in app.js');
  fxCache = { at: Date.now(), rate };
  return rate;
}

// Mirrors qUnit()/cartTotalQ() in app.js: convert per unit and sum, so the
// quetzal total always equals the sum of the lines the customer was shown.
export async function serverTotalQ(origin, items, fxRate) {
  const prices = await productPrices(origin);
  let totalQ = 0;
  const lines = [];
  for (const it of items) {
    const usd = prices.get(String(it.slug));
    if (usd === undefined) throw new Error(`unknown product: ${it.slug}`);
    const qty = Math.max(1, Math.min(999, Number(it.qty) || 1));
    const unitQ = Math.round(usd * fxRate);
    totalQ += unitQ * qty;
    lines.push({ slug: it.slug, qty, usd, gtq: unitQ });
  }
  return { totalQ, lines };
}
