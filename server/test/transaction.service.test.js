import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTransactionBalances,
  reverseTransactionBalances,
  getBalanceDelta,
} from '../src/services/transaction.service.js';

test('getBalanceDelta maps transaction types to expected account deltas', () => {
  assert.equal(getBalanceDelta('income', 50), 50);
  assert.equal(getBalanceDelta('expense', 50), -50);
  assert.equal(getBalanceDelta('transfer', 50), -50);
});

test('applyTransactionBalances updates both sides of a transfer', async () => {
  const calls = [];
  const tx = {
    account: {
      update: async ({ where, data }) => {
        calls.push({ id: where.id, delta: data.balance.increment });
      },
    },
  };

  const sourceAccount = { id: 'source-account', currency: 'ARS' };
  const destAccount = { id: 'destination-account', currency: 'ARS' };

  await applyTransactionBalances(
    tx,
    {
      accountId: 'source-account',
      type: 'transfer',
      amount: '250.75',
      amountArs: '250.75',
      transferTo: 'destination-account',
    },
    sourceAccount,
    destAccount
  );

  assert.deepEqual(calls, [
    { id: 'source-account', delta: -250.75 },
    { id: 'destination-account', delta: 250.75 },
  ]);
});

test('reverseTransactionBalances undoes an expense', async () => {
  const calls = [];
  const tx = {
    account: {
      update: async ({ where, data }) => {
        calls.push({ id: where.id, delta: data.balance.increment });
      },
    },
  };

  await reverseTransactionBalances(
    tx,
    {
      accountId: 'expense-account',
      type: 'expense',
      amount: '99.99',
      amountArs: '99.99',
      transferTo: null,
    },
    { id: 'expense-account', currency: 'ARS' }
  );

  assert.deepEqual(calls, [{ id: 'expense-account', delta: 99.99 }]);
});
