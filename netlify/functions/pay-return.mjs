// Where CyberSource sends the customer back after a card payment.
//
// The redirect itself proves nothing — anyone can open this URL. What makes it
// trustworthy is the HMAC CyberSource signs the reply with, so an order is only
// ever marked paid after verifyResponse() passes AND the decision is ACCEPT
// with reason code 100. Everything else is recorded, not trusted.
import {
  ordersStore, getInventory, saveInventory, applyStockChange, notifyForm,
} from './lib.mjs';
import { verifyResponse, outcomeOf } from './cybersource.mjs';

const seeOther = (url) => new Response(null, { status: 303, headers: { location: url, 'cache-control': 'no-store' } });

export default async (req) => {
  const origin = new URL(req.url).origin;
  const back = (num, result) => seeOther(`${origin}/#/pago/${encodeURIComponent(num || 'desconocido')}/${result}`);

  if (req.method !== 'POST') return back('', 'error');

  let fields;
  try {
    const raw = await req.text();
    fields = Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return back('', 'error');
  }

  const num = String(fields.req_reference_number || '').slice(0, 32);

  // A bad signature means the reply did not come from CyberSource, or was
  // altered on the way. Never touch the order on that path.
  if (!verifyResponse(fields)) {
    console.error('pay-return: signature check FAILED', { num, decision: fields.decision });
    return back(num, 'error');
  }

  const outcome = outcomeOf(fields);
  const at = new Date().toISOString();
  const store = ordersStore();
  const order = await store.get(num, { type: 'json' });

  if (!order) {
    console.error('pay-return: no stored order for', num, 'outcome', outcome);
    return back(num, outcome === 'paid' ? 'ok' : 'fail');
  }

  order.payment = {
    ...(order.payment || {}),
    decision: fields.decision || '',
    reasonCode: fields.reason_code || '',
    transactionId: fields.transaction_id || '',
    authCode: fields.auth_code || '',
    cardType: fields.req_card_type || '',
    last4: fields.req_card_number ? String(fields.req_card_number).slice(-4) : '',
    amount: fields.auth_amount || fields.req_amount || '',
    currency: fields.req_currency || '',
    message: fields.message || '',
    finishedAt: at,
  };

  if (outcome === 'paid' && order.status !== 'pagado' && order.status !== 'entregado') {
    const from = order.status;
    order.status = 'pagado';
    order.pago = `Tarjeta ${fields.req_card_type ? '(' + fields.req_card_type + ') ' : ''}— aprobada${fields.auth_code ? ' · aut. ' + fields.auth_code : ''}`;
    order.history = (order.history || []).concat({ at, to: 'pagado', by: 'cybersource' });

    // Same stock rule the admin uses, so a card sale and a confirmed transfer
    // move inventory identically.
    const inv = await getInventory();
    const moves = applyStockChange(inv, order, from, 'pagado');
    if (moves.length) {
      inv.log = (inv.log || []).concat({ at, by: 'cybersource', num, moves });
      await saveInventory(inv);
    }
    await store.setJSON(num, order);
    await notifyForm(origin, order, order.pago);
    return back(num, 'ok');
  }

  if (outcome === 'review') {
    // Decision Manager held it (reason 480). The money may still settle, so the
    // order stays pending and the admin is told to check the Business Center.
    order.adminNotes = [order.adminNotes, `Decision Manager marcó este pago para revisión (${fields.reason_code || '480'}). Revisar en el Business Center antes de despachar.`].filter(Boolean).join('\n');
    order.history = (order.history || []).concat({ at, to: 'pendiente_pago', by: 'cybersource:review' });
    await store.setJSON(num, order);
    return back(num, 'revision');
  }

  order.pago = outcome === 'cancelled' ? 'Tarjeta — cancelada por el cliente' : `Tarjeta — rechazada (${fields.reason_code || 'sin código'})`;
  order.history = (order.history || []).concat({ at, to: 'pendiente_pago', by: `cybersource:${outcome}` });
  await store.setJSON(num, order);
  return back(num, 'fail');
};
