import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashToken } from '../src/auth/session';
import { paymentReference } from '../src/wallet/payments';

describe('hashToken', () => {
  it('is deterministic and namespaced', () => {
    const first = hashToken('token-value');
    assert.equal(first, hashToken('token-value'));
    assert.notEqual(first, hashToken('token-value', 'admin'));
    assert.notEqual(first, hashToken('other-token'));
    assert.match(first, /^[a-f0-9]{64}$/);
  });
});

describe('paymentReference', () => {
  it('has the documented format', () => {
    assert.match(paymentReference(), /^PAY-[0-9A-Z]+-[0-9A-Z]{6}$/);
  });

  it('generates unique references', () => {
    const references = new Set(Array.from({ length: 50 }, () => paymentReference()));
    assert.equal(references.size, 50);
  });
});
