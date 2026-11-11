import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { egyptianPhone, isEmail, normalizeEgyptianPhone, otpCode } from '../src/auth/phone';

describe('normalizeEgyptianPhone', () => {
  it('accepts local Egyptian numbers', () => {
    assert.equal(normalizeEgyptianPhone('01012345678'), '01012345678');
    assert.equal(normalizeEgyptianPhone('01112345678'), '01112345678');
    assert.equal(normalizeEgyptianPhone('01212345678'), '01212345678');
    assert.equal(normalizeEgyptianPhone('01512345678'), '01512345678');
  });

  it('normalises international and compact forms', () => {
    assert.equal(normalizeEgyptianPhone('+201012345678'), '01012345678');
    assert.equal(normalizeEgyptianPhone('201012345678'), '01012345678');
    assert.equal(normalizeEgyptianPhone('00201012345678'), '01012345678');
    assert.equal(normalizeEgyptianPhone('1012345678'), '01012345678');
  });

  it('strips spaces, dashes, and parentheses', () => {
    assert.equal(normalizeEgyptianPhone('010 1234-5678'), '01012345678');
    assert.equal(normalizeEgyptianPhone('(010) 1234 5678'), '01012345678');
  });

  it('rejects invalid prefixes and lengths', () => {
    assert.equal(normalizeEgyptianPhone('01312345678'), null);
    assert.equal(normalizeEgyptianPhone('0101234567'), null);
    assert.equal(normalizeEgyptianPhone('010123456789'), null);
    assert.equal(normalizeEgyptianPhone('not-a-phone'), null);
    assert.equal(normalizeEgyptianPhone(''), null);
  });

  it('transforms through the zod schema', () => {
    assert.equal(egyptianPhone.parse(' +20 101 234 5678 '), '01012345678');
    assert.throws(() => egyptianPhone.parse('123'));
  });
});

describe('isEmail and otpCode', () => {
  it('detects email-like identifiers', () => {
    assert.equal(isEmail('user@example.com'), true);
    assert.equal(isEmail('01012345678'), false);
  });

  it('accepts exactly five digits', () => {
    assert.equal(otpCode.parse('12345'), '12345');
    assert.throws(() => otpCode.parse('1234'));
    assert.throws(() => otpCode.parse('123456'));
    assert.throws(() => otpCode.parse('12a45'));
  });
});
