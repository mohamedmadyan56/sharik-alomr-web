import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { config } from '../src/config';
import {
  createTwoFactorChallenge,
  readTwoFactorChallenge,
} from '../src/auth/twoFactor';

function sign(encoded: string): string {
  return createHmac('sha256', config.session.secret)
    .update(`2fa:${encoded}`)
    .digest('base64url');
}

describe('two-factor challenge', () => {
  it('round-trips the user id', () => {
    const token = createTwoFactorChallenge('user-123');
    assert.equal(readTwoFactorChallenge(token), 'user-123');
  });

  it('rejects a tampered signature', () => {
    const token = createTwoFactorChallenge('user-123');
    const [payload] = token.split('.');
    assert.throws(() => readTwoFactorChallenge(`${payload}.bad-signature`));
  });

  it('rejects a forged payload without a valid signature', () => {
    const token = createTwoFactorChallenge('user-123');
    const [, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'attacker', exp: Date.now() + 60_000 }),
    ).toString('base64url');
    assert.throws(() => readTwoFactorChallenge(`${forged}.${signature}`));
  });

  it('rejects a signed payload with an invalid subject', () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 123, exp: Date.now() + 60_000 }),
    ).toString('base64url');
    assert.throws(() => readTwoFactorChallenge(`${payload}.${sign(payload)}`));
  });

  it('rejects an expired challenge', () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-123', exp: Date.now() - 1_000 }),
    ).toString('base64url');
    assert.throws(() => readTwoFactorChallenge(`${payload}.${sign(payload)}`));
  });

  it('rejects malformed tokens', () => {
    assert.throws(() => readTwoFactorChallenge('not-a-token'));
    assert.throws(() => readTwoFactorChallenge(''));
  });
});
