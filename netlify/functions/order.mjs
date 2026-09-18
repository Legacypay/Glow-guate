// Public endpoint the checkout posts to. Stores the order so the admin has
// structured, updatable data, then forwards the same fields to the Netlify
// form so the existing email notifications still fire.
import { ordersStore, json } from './lib.mjs';

const FORM_NAME = 'pedido-gt';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  const o = body && body.order;
  if (!o || !o.num || !o.nombre || !Array.isArray(o.items) || !o.items.length) {
    return json({ error: 'incomplete order' }, 400);
  }

  const order = {
    num: String(o.num).slice(0, 32),
    createdAt: new Date().toISOString(),
    status: 'nuevo',
    nombre: String(o.nombre || '').slice(0, 120),
    telefono: String(o.telefono || '').slice(0, 40),
    correo: String(o.correo || '').slice(0, 120),
    entrega: String(o.entrega || '').slice(0, 40),
    direccion: String(o.direccion || '').slice(0, 300),
    municipio: String(o.municipio || '').slice(0, 80),
    departamento: String(o.departamento || '').slice(0, 80),
    notas: String(o.notas || '').slice(0, 800),
    idioma: o.idioma === 'en' ? 'en' : 'es',
    items: o.items.slice(0, 50).map((i) => ({
      slug: String(i.slug || '').slice(0, 60),
      name: String(i.name || '').slice(0, 80),
      strength: String(i.strength || '').slice(0, 40),
      qty: Math.max(1, Math.min(999, Number(i.qty) || 1)),
      usd: Number(i.usd) || 0,
      gtq: Number(i.gtq) || 0,
    })),
    totalUsd: Number(o.totalUsd) || 0,
    totalQ: Number(o.totalQ) || 0,
    adminNotes: '',
    history: [{ at: new Date().toISOString(), to: 'nuevo', by: 'sitio' }],
  };

  // Stored first: this is the copy the admin works from.
  await ordersStore().setJSON(order.num, order);

  // Then the form post, purely so the email alerts keep working. A failure here
  // must not lose the order, so it is reported but not fatal.
  let notified = false;
  try {
    const form = new URLSearchParams({
      'form-name': FORM_NAME,
      numero_pedido: order.num,
      nombre: order.nombre,
      telefono: order.telefono,
      correo: order.correo,
      entrega: order.entrega,
      direccion: order.direccion,
      municipio: order.municipio,
      departamento: order.departamento,
      pago: String(o.pago || 'Transferencia bancaria'),
      notas: order.notas,
      resumen: order.items.map((i) => `${i.qty} × ${i.name} ${i.strength} — Q${i.gtq * i.qty}`).join('\n')
        + `\nTOTAL: Q${order.totalQ} GTQ ($${order.totalUsd.toFixed(2)} USD)`,
      total_usd: order.totalUsd.toFixed(2),
      total_gtq: String(order.totalQ),
      idioma: order.idioma,
    });
    const origin = new URL(req.url).origin;
    const res = await fetch(origin + '/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    notified = res.ok;
  } catch (e) {
    notified = false;
  }

  return json({ ok: true, num: order.num, notified });
};
