import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTransactionSchema,
  updateTransactionSchema,
} from '../src/features/transactions/transaction.validators.js';

const accountId = '11111111-1111-4111-8111-111111111111';
const otherAccountId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';

test('createTransactionSchema accepts a valid transfer', () => {
  const parsed = createTransactionSchema.parse({
    accountId,
    categoryId,
    type: 'transfer',
    amount: '1200.50',
    date: '2026-03-21',
    transferTo: otherAccountId,
  });

  assert.equal(parsed.amount, 1200.5);
  assert.equal(parsed.transferTo, otherAccountId);
});

test('createTransactionSchema rejects transfer without destination account', () => {
  assert.throws(
    () =>
      createTransactionSchema.parse({
        accountId,
        categoryId,
        type: 'transfer',
        amount: 100,
        date: '2026-03-21',
      }),
    /cuenta destino/i
  );
});

test('updateTransactionSchema rejects transfer when transferTo is missing', () => {
  assert.throws(
    () =>
      updateTransactionSchema.parse({
        type: 'transfer',
        amount: 100,
      }),
    /cuenta destino/i
  );
});

test('updateTransactionSchema rejects same-account transfer updates', () => {
  assert.throws(
    () =>
      updateTransactionSchema.parse({
        accountId,
        type: 'transfer',
        transferTo: accountId,
      }),
    /diferente a la cuenta origen/i
  );
});

test('updateTransactionSchema allows clearing transferTo when transaction is not a transfer', () => {
  const parsed = updateTransactionSchema.parse({
    type: 'expense',
    transferTo: null,
  });

  assert.equal(parsed.type, 'expense');
  assert.equal(parsed.transferTo, null);
});
