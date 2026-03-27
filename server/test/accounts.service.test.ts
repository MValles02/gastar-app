import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb, disconnectDb } from './helpers/db.js';
import { createUser } from './helpers/factories.js';
import { getAccountsByUser, createAccount } from '../src/features/accounts/accounts.service.js';

describe('accounts.service', () => {
  before(resetDb);
  after(disconnectDb);

  it('returns empty array when user has no accounts', async () => {
    const { user } = await createUser();
    const result = await getAccountsByUser(user.id);
    assert.deepEqual(result, []);
  });

  it('returns accounts for the given user only', async () => {
    const { user } = await createUser();
    await createAccount(user.id, { name: 'Cuenta ARS', type: 'cash', currency: 'ARS', balance: 1000 });
    const result = await getAccountsByUser(user.id);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Cuenta ARS');
  });
});
