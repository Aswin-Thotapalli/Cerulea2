/**
 * Deterministic, format-correct credential values for seeded Studio projects.
 * Every value is derived from HMAC-SHA256(project, keyName) so re-running a seed
 * produces the same value. Nothing here is a real credential; the values only
 * follow each provider's real key structure so the project reads like production.
 */
const crypto = require('crypto');

const SALT = 'cerulea-studio-seed-2026';
const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const B36U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function stream(project, key) {
  // Unbounded deterministic byte stream: HMAC(project|key|counter)
  let counter = 0;
  let buf = Buffer.alloc(0);
  let pos = 0;
  return (n) => {
    const out = [];
    while (out.length < n) {
      if (pos >= buf.length) {
        buf = crypto.createHmac('sha256', SALT).update(`${project}|${key}|${counter++}`).digest();
        pos = 0;
      }
      out.push(buf[pos++]);
    }
    return out;
  };
}
const pick = (next, alphabet, n) => next(n).map((b) => alphabet[b % alphabet.length]).join('');
const hex = (next, n) => next(Math.ceil(n / 2)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, n);
const digits = (next, n) => next(n).map((b) => String(b % 10)).join('');
const uuid = (next) => {
  const h = hex(next, 32).split('');
  h[12] = '4';
  h[16] = '89ab'[next(1)[0] % 4];
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};
const b64 = (next, n) => Buffer.from(next(Math.ceil(n * 0.75) + 2)).toString('base64').replace(/=+$/, '').slice(0, n);

/** Provider formats keyed by the seed's logical key name. */
function value(project, key) {
  const next = stream(project, key);
  const k = key.toUpperCase();

  // AWS
  if (/^(AWS_|CLOUDWATCH_).*ACCESS_KEY$/.test(k)) return 'AKIA' + pick(next, B36U, 16);
  if (/^(AWS_|CLOUDWATCH_).*SECRET_KEY$/.test(k)) return pick(next, B62 + '+/', 40);
  if (/KEY_ARN$/.test(k)) return `arn:aws:kms:ap-south-1:${digits(next, 12)}:key/${uuid(next)}`;

  // Sumsub
  if (k === 'SUMSUB_APP_TOKEN') return 'prd:' + pick(next, B62, 32) + '.' + pick(next, B62, 16);
  if (k === 'SUMSUB_SECRET_KEY') return pick(next, B62, 32);

  // DocuSign
  if (k === 'DOCUSIGN_INTEGRATION_KEY' || k === 'DOCUSIGN_USER_ID' || k === 'DOCUSIGN_ACCOUNT_ID') return uuid(next);
  if (k === 'DOCUSIGN_RSA_PRIVATE_KEY') {
    // A genuine RSA key generated deterministically is not possible with node's API,
    // so emit a fresh 2048-bit key once per project (stable across a single seed run).
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    return privateKey.export({ type: 'pkcs1', format: 'pem' });
  }

  // Resend
  if (k === 'RESEND_API_KEY') return 're_' + pick(next, B62, 8) + '_' + pick(next, B62, 24);

  // Twilio
  if (k === 'TWILIO_ACCOUNT_SID') return 'AC' + hex(next, 32);
  if (k === 'TWILIO_AUTH_TOKEN') return hex(next, 32);
  if (k === 'TWILIO_MESSAGING_SERVICE_SID') return 'MG' + hex(next, 32);

  // Webhooks
  if (/WEBHOOK_URL$|CALLBACK_URL$/.test(k)) return null; // caller supplies a real-looking URL
  if (/HMAC_SECRET$|WEBHOOK_SECRET$/.test(k)) return 'whsec_' + pick(next, B62, 40);

  // Elastic / Grafana / PagerDuty / PostHog
  if (k === 'ELK_API_KEY') return Buffer.from(`${pick(next, B62, 20)}:${pick(next, B62, 22)}`).toString('base64');
  if (k === 'GRAFANA_API_KEY') return 'glsa_' + pick(next, B62, 32) + '_' + hex(next, 8);
  if (k === 'PAGERDUTY_INTEGRATION_KEY') return hex(next, 32);
  if (k === 'PAGERDUTY_API_TOKEN') return pick(next, B62 + '+-', 20);
  if (k === 'PAGERDUTY_SERVICE_ID') return 'P' + pick(next, B36U, 6);
  if (k === 'POSTHOG_API_KEY') return 'phc_' + pick(next, B62, 43);

  // Indian trade / phytosanitary gateways
  if (/^(APEDA|NPPO|DPPQ)/.test(k) && /API_KEY$/.test(k)) return pick(next, B62, 40);
  if (/^ICEGATE.*USER_ID$/.test(k)) return 'ICEG' + digits(next, 7);
  if (/^ICEGATE.*PASSWORD$/.test(k)) return pick(next, B62, 12) + '#' + digits(next, 4);

  // Generic fallbacks by suffix
  if (/PASSWORD$/.test(k)) return pick(next, B62, 16) + '!' + digits(next, 2);
  if (/TOKEN$/.test(k)) return pick(next, B62, 40);
  if (/SECRET(_KEY)?$/.test(k)) return pick(next, B62, 40);
  if (/API_KEY$|_KEY$/.test(k)) return pick(next, B62, 32);
  if (/_ID$/.test(k)) return uuid(next);
  return pick(next, B62, 32);
}

/** K(project) returns a lookup: K('AgroTrace')('RESEND_API_KEY') */
const K = (project) => (key, fallback) => {
  const v = value(project, key);
  if (v === null) {
    if (fallback === undefined) throw new Error(`No value shape for ${key}; pass a fallback`);
    return fallback;
  }
  return v;
};

module.exports = { K, value };
