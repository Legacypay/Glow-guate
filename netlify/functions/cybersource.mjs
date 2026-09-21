// CyberSource Secure Acceptance — Hosted Checkout signing and verification.
//
// Hosted Checkout was chosen over the SOAP Toolkit and Secure Acceptance API
// because the card number never touches this site: the customer is handed to
// CyberSource's own page, which keeps us at PCI SAQ A and, per NeoNet, already
// sends the Device Fingerprint field they require for production.
//
// The whole scheme is one HMAC: every field we send is listed in
// `signed_field_names` and signed with the secret key, so CyberSource rejects
// anything a browser tampered with — most importantly the amount.
import { createHmac, timingSafeEqual } from 'node:crypto';

const TEST_ENDPOINT = 'https://testsecureacceptance.cybersource.com/pay';
const LIVE_ENDPOINT = 'https://secureacceptance.cybersource.com/pay';

export function cybsConfig() {
  const live = String(process.env.CYBS_ENV || 'test').toLowerCase() === 'live';
  return {
    live,
    endpoint: live ? LIVE_ENDPOINT : TEST_ENDPOINT,
    profileId: process.env.CYBS_PROFILE_ID || '',
    accessKey: process.env.CYBS_ACCESS_KEY || '',
    secretKey: process.env.CYBS_SECRET_KEY || '',
    // Secure Acceptance locale. If CyberSource rejects es-419, try "es".
    locale: process.env.CYBS_LOCALE || 'es-419',
    // NeoNet settles in Guatemala, so orders are charged in quetzales — the
    // same amount the bank-transfer path shows.
    currency: process.env.CYBS_CURRENCY || 'GTQ',
  };
}

// Card payment stays invisible on the site until all three credentials exist,
// so a half-finished setup can never strand a customer mid-checkout.
export function cybsReady() {
  const c = cybsConfig();
  return Boolean(c.profileId && c.accessKey && c.secretKey);
}

// signature = base64( HMAC-SHA256( secret_key, "name=value,name=value,..." ) )
// Field order follows signed_field_names exactly; a different order is a
// different signature.
export function signFields(fields, signedNames, secretKey) {
  const data = signedNames.map((n) => `${n}=${fields[n] === undefined || fields[n] === null ? '' : fields[n]}`).join(',');
  return createHmac('sha256', secretKey).update(data, 'utf8').digest('base64');
}

// Takes the business fields, adds the bookkeeping ones and returns everything
// the browser must POST. `signed_field_names` names itself, which is what
// CyberSource expects.
export function buildSignedRequest(fields) {
  const c = cybsConfig();
  const out = { ...fields };
  const signedNames = Object.keys(out).concat(['signed_field_names', 'unsigned_field_names']);
  out.unsigned_field_names = '';
  out.signed_field_names = signedNames.join(',');
  out.signature = signFields(out, signedNames, c.secretKey);
  return out;
}

// CyberSource signs its reply with the same key. Verifying it is what makes the
// reply trustworthy — never mark an order paid on the redirect alone.
export function verifyResponse(fields) {
  const c = cybsConfig();
  if (!c.secretKey) return false;
  const names = String(fields.signed_field_names || '').split(',').filter(Boolean);
  if (!names.length || !fields.signature) return false;
  const expected = signFields(fields, names, c.secretKey);
  const a = Buffer.from(String(fields.signature), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// CyberSource UTC stamp: 2026-09-21T18:44:15Z — no milliseconds.
export const cybsDateTime = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// Reason code 100 is the only success; everything else is a decline. 480/481
// mean Decision Manager held or rejected the order (see NeoNet's guide).
export function outcomeOf(fields) {
  const decision = String(fields.decision || '').toUpperCase();
  const reason = String(fields.reason_code || '');
  if (decision === 'ACCEPT' && reason === '100') return 'paid';
  if (decision === 'REVIEW') return 'review';
  if (decision === 'CANCEL') return 'cancelled';
  return 'declined';
}
