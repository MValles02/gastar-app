import test from 'node:test';
import assert from 'node:assert/strict';
import { hashResetToken } from '../src/shared/utils/reset-token.js';

test('hashResetToken is deterministic and does not return the raw token', () => {
  const rawToken = 'reset-token-example';
  const hashedOnce = hashResetToken(rawToken);
  const hashedTwice = hashResetToken(rawToken);

  assert.equal(hashedOnce, hashedTwice);
  assert.notEqual(hashedOnce, rawToken);
  assert.match(hashedOnce, /^[a-f0-9]{64}$/);
});
