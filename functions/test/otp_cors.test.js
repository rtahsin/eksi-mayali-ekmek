const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/** Mirror of functions/index.js otpCorsAllowed (keep in sync). */
const ALLOWED_ORIGINS = [
  'https://ekmeklab.com',
  'https://www.ekmeklab.com',
  'https://ekmeklab.tr',
  'https://www.ekmeklab.tr',
  'https://eksimayaliekmekweb.web.app',
  'https://eksimayaliekmekweb.firebaseapp.com',
];
const OTP_CLIENT_HEADER = 'x-ekmeklab-client';
const OTP_CLIENT_VALUE = 'ekmeklab-app';

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) ||
    /http:\/\/localhost:\d+/.test(origin) ||
    /http:\/\/127\.0\.0\.1:\d+/.test(origin);
}

function otpCorsAllowed(req) {
  const origin = req.headers.origin;
  if (origin) return isAllowedOrigin(origin);
  const client = String(req.headers[OTP_CLIENT_HEADER] || '').trim().toLowerCase();
  return client === OTP_CLIENT_VALUE;
}

describe('otpCorsAllowed', () => {
  it('allows known browser Origin without client header', () => {
    assert.equal(
      otpCorsAllowed({ headers: { origin: 'https://ekmeklab.com' } }),
      true,
    );
  });

  it('denies unknown Origin even with client header', () => {
    assert.equal(
      otpCorsAllowed({
        headers: {
          origin: 'https://evil.example',
          [OTP_CLIENT_HEADER]: OTP_CLIENT_VALUE,
        },
      }),
      false,
    );
  });

  it('allows originless request with X-Ekmeklab-Client', () => {
    assert.equal(
      otpCorsAllowed({ headers: { [OTP_CLIENT_HEADER]: 'ekmeklab-app' } }),
      true,
    );
  });

  it('denies originless request without client header', () => {
    assert.equal(otpCorsAllowed({ headers: {} }), false);
  });

  it('allows localhost Origin', () => {
    assert.equal(
      otpCorsAllowed({ headers: { origin: 'http://localhost:5000' } }),
      true,
    );
  });
});
