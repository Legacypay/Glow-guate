// What the checkout needs to know before it draws the payment options.
// Public values only — never the secret key. The card option appears only when
// the server can actually sign a transaction, so the site configures itself
// rather than relying on a flag somebody has to remember to flip.
import { json } from './lib.mjs';
import { cybsConfig, cybsReady } from './cybersource.mjs';

export default async () => {
  const c = cybsConfig();
  const merchantId = process.env.CYBS_MERCHANT_ID || '';
  return json({
    card: cybsReady(),
    env: c.live ? 'live' : 'test',
    // Device Fingerprint org ids are fixed, published CyberSource values.
    deviceFingerprint: merchantId
      ? { orgId: c.live ? 'k8vif92e' : '1snn5n9w', merchantId }
      : null,
  });
};
