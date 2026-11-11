import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { config } from '../src/config';
import {
  createAdminTwoFactorChallenge,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpCode,
  generateTotpSecret,
  readAdminTwoFactorChallenge,
  totpUri,
  verifyTotpCode,
} from '../src/admin/totp';

// سر RFC 6238 القياسي (ASCII: 12345678901234567890)
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('admin TOTP', () => {
  it('matches RFC 6238 SHA-1 vectors (6 digits)', () => {
    const vectors: Array<[number, string]> = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
      [20000000000, '353130'],
    ];
    for (const [seconds, expected] of vectors) {
      assert.equal(generateTotpCode(RFC_SECRET, seconds * 1000), expected);
    }
  });

  it('accepts the current code and one adjacent window', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = generateTotpCode(secret, now);
    assert.equal(verifyTotpCode(secret, code, { forTime: now }), true);
    assert.equal(
      verifyTotpCode(secret, generateTotpCode(secret, now + 30_000), {
        forTime: now,
      }),
      true,
    );
    assert.equal(
      verifyTotpCode(secret, generateTotpCode(secret, now + 120_000), {
        forTime: now,
      }),
      false,
    );
  });

  it('rejects malformed codes', () => {
    const secret = generateTotpSecret();
    assert.equal(verifyTotpCode(secret, '12345'), false);
    assert.equal(verifyTotpCode(secret, 'abcdef'), false);
    assert.equal(verifyTotpCode(secret, ''), false);
  });

  it('generates a base32 secret with enough entropy', () => {
    const secret = generateTotpSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/);
    assert.notEqual(secret, generateTotpSecret());
  });

  it('builds a valid otpauth URI', () => {
    const uri = totpUri('JBSWY3DPEHPK3PXP', 'admin@example.com');
    assert.match(uri, /^otpauth:\/\/totp\//);
    assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);
    assert.match(uri, /issuer=Sharik\+Alomr/);
    assert.match(uri, /digits=6/);
    assert.match(uri, /period=30/);
  });

  it('encrypts secrets at rest and decrypts them back', () => {
    const secret = generateTotpSecret();
    const stored = encryptTotpSecret(secret);
    assert.notEqual(stored, secret);
    assert.match(stored, /^v1:/);
    assert.equal(decryptTotpSecret(stored), secret);
  });

  it('still reads legacy plaintext secrets', () => {
    const secret = generateTotpSecret();
    assert.equal(decryptTotpSecret(secret), secret);
  });
});

function sign(encoded: string): string {
  return createHmac('sha256', config.session.secret)
    .update(`admin2fa:${encoded}`)
    .digest('base64url');
}

describe('admin two-factor challenge', () => {
  it('round-trips the admin id', () => {
    const token = createAdminTwoFactorChallenge('admin-123');
    assert.equal(readAdminTwoFactorChallenge(token), 'admin-123');
  });

  it('rejects a tampered signature', () => {
    const token = createAdminTwoFactorChallenge('admin-123');
    const [payload] = token.split('.');
    assert.throws(() => readAdminTwoFactorChallenge(`${payload}.bad-signature`));
  });

  it('rejects a forged payload without a valid signature', () => {
    const token = createAdminTwoFactorChallenge('admin-123');
    const [, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'attacker', exp: Date.now() + 60_000 }),
    ).toString('base64url');
    assert.throws(() => readAdminTwoFactorChallenge(`${forged}.${signature}`));
  });

  it('rejects an expired challenge', () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'admin-123', exp: Date.now() - 1_000 }),
    ).toString('base64url');
    assert.throws(() =>
      readAdminTwoFactorChallenge(`${payload}.${sign(payload)}`),
    );
  });

  it('rejects malformed tokens', () => {
    assert.throws(() => readAdminTwoFactorChallenge('not-a-token'));
    assert.throws(() => readAdminTwoFactorChallenge(''));
  });
});
