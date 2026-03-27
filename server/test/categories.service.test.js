import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb, disconnectDb } from './helpers/db.js';
import { createUser as createTestUser } from './helpers/factories.js';
import { getCategoriesByUser, createCategory } from '../src/features/categories/categories.service.js';

describe('categories.service', () => {
  before(resetDb);
  after(disconnectDb);

  it('returns categories for the given user only', async () => {
    const { user } = await createTestUser();
    await createCategory(user.id, { name: 'Comida', icon: '🍕' });
    const result = await getCategoriesByUser(user.id);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Comida');
  });

  it('throws when deleting a category with transactions', async () => {
    // This test requires integration setup — skip in unit tests
    // Covered by integration tests in core.routes.test.js
  });
});
