import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveTransaction } from '../src/features/transactions/transaction-rules.js';

test('getEffectiveTransaction preserves existing transfer destination when omitted', () => {
  const existing = {
    accountId: 'source',
    categoryId: 'category',
    type: 'transfer',
    amount: 10,
    description: 'move money',
    date: '2026-03-20',
    transferTo: 'destination',
  };

  const effective = getEffectiveTransaction(existing, {
    amount: 20,
  });

  assert.equal(effective.amount, 20);
  assert.equal(effective.transferTo, 'destination');
  assert.equal(effective.type, 'transfer');
});

test('getEffectiveTransaction clears transferTo when changing to a non-transfer type', () => {
  const existing = {
    accountId: 'source',
    categoryId: 'category',
    type: 'transfer',
    amount: 10,
    description: 'move money',
    date: '2026-03-20',
    transferTo: 'destination',
  };

  const effective = getEffectiveTransaction(existing, {
    type: 'expense',
  });

  assert.equal(effective.type, 'expense');
  assert.equal(effective.transferTo, null);
});
