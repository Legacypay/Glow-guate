// Starts a card payment: stores the order, then hands back the signed fields
// the browser POSTs to CyberSource Secure Acceptance.
//
// The amount is signed here, on the server. A customer can edit anything in the
// form before it submits, but any edit breaks the signature and CyberSource
// refuses the transaction — so the price is not negotiable client-side.
import { ordersStore, json } from './lib.mjs';
import { cybsConfig, cybsReady, buildSignedRequest, cybsDateTime } from './cybersource.mjs';
import { serverTotalQ, siteFxRate } from './catalog.mjs';
import { randomUUID } from 'node:crypto';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!cybsReady()) return json({ error: 'card payment not configured' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  const o = body && body.order;
  if (!o || !o.num || !o.nombre || !Array.isArray(o.items) || !o.items.length) {
    return json({ error: 'incomplete order' }, 400);
  }

  const origin = new URL(req.url).origin;

  // The amount is recomputed from the published catalogue, never taken from the
  // browser. If the page was stale the customer is asked to reload rather than
  // being charged a price nobody agreed to.
  let totalQ, lines;
  try {
    const fx = await siteFxRate(origin);
    ({ totalQ, lines } = await serverTotalQ(origin, o.items, fx));
  } catch (e) {
    console.error('pay-start: could not price the order —', e.message);
    return json({ error: 'pricing unavailable' }, 503);
  }
  if (totalQ <= 0) return json({ error: 'bad amount' }, 400);

  const claimed = Math.round(Number(o.totalQ) || 0);
  if (claimed !== totalQ) {
    console.error('pay-start: price mismatch', { num: o.num, claimed, totalQ });
    return json({ error: 'price mismatch', totalQ }, 409);
  }

  const c = cybsConfig();
  const now = new Date().toISOString();

  const order = {
    num: String(o.num).slice(0, 32),
    createdAt: now,
    status: 'pendiente_pago',
    nombre: String(o.nombre || '').slice(0, 120),
    telefono: String(o.telefono || '').slice(0, 40),
    correo: String(o.correo || '').slice(0, 120),
    entrega: String(o.entrega || '').slice(0, 40),
    direccion: String(o.direccion || '').slice(0, 300),
    municipio: String(o.municipio || '').slice(0, 80),
    departamento: String(o.departamento || '').slice(0, 80),
    notas: String(o.notas || '').slice(0, 800),
    idioma: o.idioma === 'en' ? 'en' : 'es',
    items: o.items.slice(0, 50).map((i, n) => ({
      slug: String(i.slug || '').slice(0, 60),
      name: String(i.name || '').slice(0, 80),
      strength: String(i.strength || '').slice(0, 40),
      // qty/prices come from the server-side pricing pass, not the browser.
      qty: lines[n] ? lines[n].qty : Math.max(1, Math.min(999, Number(i.qty) || 1)),
      usd: lines[n] ? lines[n].usd : 0,
      gtq: lines[n] ? lines[n].gtq : 0,
    })),
    totalUsd: Number(o.totalUsd) || 0,
    totalQ,
    pago: 'Tarjeta (CyberSource) — pendiente',
    adminNotes: '',
    payment: { provider: 'cybersource', env: c.live ? 'live' : 'test', startedAt: now },
    history: [{ at: now, to: 'pendiente_pago', by: 'sitio' }],
  };

  // Stored before the redirect so an abandoned payment still leaves the
  // customer's details behind instead of vanishing.
  await ordersStore().setJSON(order.num, order);

  const nameParts = order.nombre.trim().split(/\s+/);

  const fields = {
    access_key: c.accessKey,
    profile_id: c.profileId,
    transaction_uuid: randomUUID(),
    signed_date_time: cybsDateTime(),
    locale: order.idioma === 'en' ? 'en-us' : c.locale,
    transaction_type: 'sale',
    reference_number: order.num,
    amount: totalQ.toFixed(2),
    currency: c.currency,
    bill_to_forename: (nameParts[0] || order.nombre).slice(0, 60),
    bill_to_surname: (nameParts.slice(1).join(' ') || nameParts[0] || 'NA').slice(0, 60),
    bill_to_email: order.correo,
    bill_to_phone: order.telefono.replace(/[^\d+]/g, '').slice(0, 15),
    bill_to_address_line1: (order.direccion || 'NA').slice(0, 60),
    bill_to_address_city: (order.municipio || order.departamento || 'Guatemala').slice(0, 50),
    bill_to_address_country: 'GT',
    override_custom_receipt_page: `${origin}/.netlify/functions/pay-return`,
  };

  // NeoNet require Device Fingerprint on every production transaction. Hosted
  // Checkout collects it itself; this passes ours through as well when the site
  // has been given a merchant ID, which is what the certification team looks for.
  if (o.deviceFingerprintId) {
    fields.device_fingerprint_id = String(o.deviceFingerprintId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  }

  return json({ ok: true, num: order.num, endpoint: c.endpoint, fields: buildSignedRequest(fields) });
};
