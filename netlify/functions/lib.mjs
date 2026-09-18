// Shared helpers for the Glow Peptides GT functions.
import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ordersStore = () => getStore({ name: 'orders', consistency: 'strong' });
export const stateStore = () => getStore({ name: 'state', consistency: 'strong' });

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/* ---------------- session tokens ----------------
   A token is "<expiry>.<hmac>" signed with ADMIN_SECRET. Nothing sensitive is
   stored in it; it only proves the password was entered before it expired.   */
const SESSION_MS = 12 * 60 * 60 * 1000;

const sign = (value) => createHmac('sha256', process.env.ADMIN_SECRET || '').update(String(value)).digest('hex');

export function issueToken() {
  const expiry = Date.now() + SESSION_MS;
  return `${expiry}.${sign(expiry)}`;
}

export function tokenValid(token) {
  if (!token || !process.env.ADMIN_SECRET) return false;
  const [expiry, mac] = String(token).split('.');
  if (!expiry || !mac || Number(expiry) < Date.now()) return false;
  const expected = sign(expiry);
  const a = Buffer.from(mac, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Constant-time password check so a wrong guess can't be timed.
export function passwordValid(candidate) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = Buffer.from(String(candidate || ''), 'utf8');
  const b = Buffer.from(real, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireAuth(req) {
  const header = req.headers.get('authorization') || '';
  return tokenValid(header.replace(/^Bearer\s+/i, ''));
}

/* ---------------- inventory ---------------- */
// Seeded from María's first purchase order (GLOWORDERSEPT), so stock is real
// from day one rather than starting at zero for every SKU.
export const SEED_STOCK = {
  'retatrutide-10mg': 25, 'retatrutide-20mg': 20, 'tesamorelin-10mg': 10, 'ghk-cu-50mg': 15,
  'bpc-157-10mg': 10, 'tb-500-10mg': 10, 'mots-c-10mg': 10, 'mots-c-40mg': 5,
  'cjc-1295-ipamorelin': 20, 'glow-blend-70mg': 25, 'klow-blend-80mg': 25, 'wolverine-20mg': 25,
  'kpv-10mg': 15, 'selank-10mg': 10, 'semax-10mg': 10, 'nad-plus-500mg': 20,
  'glutathione-1500mg': 15, 'agua-bacteriostatica': 250, 'pt-141-10mg': 5,
};

export async function getInventory() {
  const store = stateStore();
  const saved = await store.get('inventory', { type: 'json' });
  if (saved && saved.stock) return saved;
  const fresh = { stock: { ...SEED_STOCK }, lowAt: 3, seededAt: new Date().toISOString(), log: [] };
  await store.setJSON('inventory', fresh);
  return fresh;
}

export const saveInventory = (inv) => stateStore().setJSON('inventory', inv);

export async function listOrders() {
  const store = ordersStore();
  const { blobs } = await store.list();
  const orders = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null)));
  return orders.filter(Boolean).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export const STATUSES = ['nuevo', 'pagado', 'entregado', 'cancelado'];
