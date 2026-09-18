// Everything the admin centre needs, behind one password-protected endpoint.
import {
  ordersStore, json, issueToken, requireAuth, passwordValid,
  getInventory, saveInventory, listOrders, STATUSES,
} from './lib.mjs';

const nowISO = () => new Date().toISOString();

/* Stock moves when money is confirmed: committed on "pagado", returned on
   "cancelado". Deliveries don't move stock again — it already left on payment. */
function applyStockChange(inv, order, from, to) {
  const committed = (s) => s === 'pagado' || s === 'entregado';
  const wasCommitted = committed(from);
  const isCommitted = committed(to);
  if (wasCommitted === isCommitted) return [];
  const sign = isCommitted ? -1 : 1;
  const moves = [];
  for (const item of order.items || []) {
    const before = Number(inv.stock[item.slug] ?? 0);
    inv.stock[item.slug] = before + sign * item.qty;
    moves.push({ slug: item.slug, delta: sign * item.qty, from: before, to: inv.stock[item.slug] });
  }
  return moves;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const action = body.action;

  if (action === 'login') {
    if (!passwordValid(body.password)) {
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return json({ error: 'wrong password' }, 401);
    }
    return json({ token: issueToken() });
  }

  if (!requireAuth(req)) return json({ error: 'unauthorized' }, 401);

  /* ---------------- read everything the dashboard renders ---------------- */
  if (action === 'data') {
    const [orders, inv] = await Promise.all([listOrders(), getInventory()]);
    const paid = orders.filter((o) => o.status === 'pagado' || o.status === 'entregado');
    const since = (days) => Date.now() - days * 864e5;
    const sumQ = (list) => list.reduce((s, o) => s + (Number(o.totalQ) || 0), 0);
    const sold = {};
    for (const o of paid) for (const i of o.items || []) sold[i.slug] = (sold[i.slug] || 0) + i.qty;

    return json({
      orders,
      inventory: inv,
      sold,
      stats: {
        total: orders.length,
        nuevo: orders.filter((o) => o.status === 'nuevo').length,
        pagado: orders.filter((o) => o.status === 'pagado').length,
        entregado: orders.filter((o) => o.status === 'entregado').length,
        cancelado: orders.filter((o) => o.status === 'cancelado').length,
        revenueQ: sumQ(paid),
        revenueQ30: sumQ(paid.filter((o) => new Date(o.createdAt).getTime() > since(30))),
        revenueQ7: sumQ(paid.filter((o) => new Date(o.createdAt).getTime() > since(7))),
        pendingQ: sumQ(orders.filter((o) => o.status === 'nuevo')),
        orders7: orders.filter((o) => new Date(o.createdAt).getTime() > since(7)).length,
      },
    });
  }

  /* ---------------- order status / notes ---------------- */
  if (action === 'setStatus') {
    const { num, status } = body;
    if (!STATUSES.includes(status)) return json({ error: 'bad status' }, 400);
    const store = ordersStore();
    const order = await store.get(String(num), { type: 'json' });
    if (!order) return json({ error: 'not found' }, 404);
    const from = order.status;
    if (from === status) return json({ ok: true, order, moves: [] });

    const inv = await getInventory();
    const moves = applyStockChange(inv, order, from, status);
    order.status = status;
    order.history = [...(order.history || []), { at: nowISO(), from, to: status, by: 'admin' }];
    await Promise.all([store.setJSON(order.num, order), moves.length ? saveInventory(inv) : null]);
    return json({ ok: true, order, moves, inventory: inv });
  }

  if (action === 'setNote') {
    const store = ordersStore();
    const order = await store.get(String(body.num), { type: 'json' });
    if (!order) return json({ error: 'not found' }, 404);
    order.adminNotes = String(body.note || '').slice(0, 2000);
    await store.setJSON(order.num, order);
    return json({ ok: true, order });
  }

  if (action === 'deleteOrder') {
    await ordersStore().delete(String(body.num));
    return json({ ok: true });
  }

  /* ---------------- inventory ---------------- */
  if (action === 'setStock') {
    const inv = await getInventory();
    const slug = String(body.slug || '');
    const value = Math.max(0, Math.min(99999, Number(body.value)));
    if (!slug || Number.isNaN(value)) return json({ error: 'bad stock' }, 400);
    const before = Number(inv.stock[slug] ?? 0);
    inv.stock[slug] = value;
    inv.log = [...(inv.log || []), { at: nowISO(), slug, from: before, to: value, reason: String(body.reason || 'ajuste manual').slice(0, 120) }].slice(-300);
    await saveInventory(inv);
    return json({ ok: true, inventory: inv });
  }

  if (action === 'setLowAt') {
    const inv = await getInventory();
    inv.lowAt = Math.max(0, Math.min(999, Number(body.value) || 0));
    await saveInventory(inv);
    return json({ ok: true, inventory: inv });
  }

  return json({ error: 'unknown action' }, 400);
};
