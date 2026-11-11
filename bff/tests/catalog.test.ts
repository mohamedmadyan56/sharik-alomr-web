import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { categoryNameEn } from '../src/articles/categories';
import { featureNameEn, planNameEn } from '../src/plans/features';
import { toPublicUser, type PublicUserRow } from '../src/auth/user';

describe('localisation helpers', () => {
  it('maps known article categories to English', () => {
    assert.equal(categoryNameEn('marriage_tips', 'نصائح'), 'Marriage tips');
    assert.equal(categoryNameEn('sharia', 'شرع'), 'Sharia');
    assert.equal(categoryNameEn('unknown-key', 'اسم عربي'), 'اسم عربي');
  });

  it('maps known plan features and tiers', () => {
    assert.equal(planNameEn('gold', 'gold', 'الذهبية'), 'Gold');
    assert.equal(planNameEn('platinum', 'platinum', 'البلاتينية'), 'Platinum');
    assert.equal(featureNameEn('voice_call', 'مكالمات صوتية'), 'Voice calls');
    assert.equal(featureNameEn('unknown', 'ميزة'), 'ميزة');
  });
});

describe('toPublicUser', () => {
  const base = {
    id: 'user-1',
    phone: '01012345678',
    email: null,
    firstName: 'مريم',
    lastName: 'اختبار',
    gender: 'female',
    dateOfBirth: new Date('1995-05-15'),
    accountStatus: 'active',
    verification: 'unverified',
    isVerifiedBadge: false,
    profileQuality: 75,
    country: 'EG',
    city: 'القاهرة',
    phoneVerifiedAt: new Date(),
    emailVerifiedAt: null,
    createdAt: new Date(),
    passwordHash: null,
    sheikhProfile: null,
  } satisfies PublicUserRow;

  it('never leaks the password hash', () => {
    const result = toPublicUser({ ...base, passwordHash: 'hash' });
    assert.equal('passwordHash' in result, false);
    assert.equal(result.hasPassword, true);
  });

  it('masks reserved Google placeholder phones', () => {
    const result = toPublicUser({ ...base, phone: 'google_123456' });
    assert.equal(result.phone, '');
  });

  it('keeps real phone numbers and sheikh summary', () => {
    const result = toPublicUser(base);
    assert.equal(result.phone, '01012345678');
    assert.equal(result.isSheikh, false);
    assert.equal(result.sheikh, null);
  });
});
