import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/server.js';
import { createAccount, createCategory, createUser } from '../helpers/factories.js';
import { disconnectDb, prisma, resetDb } from '../helpers/db.js';
import { hashResetToken } from '../../src/shared/utils/reset-token.js';
import { clearTestEmails, getTestEmails } from '../../src/features/auth/email.service.js';

const { baseUrl, close } = await startTestServer();

after(async () => {
  await close();
  await disconnectDb();
});

beforeEach(async () => {
  clearTestEmails();
  await resetDb();
});

async function login(user, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password }),
  });

  return {
    response,
    cookie: response.headers.get('set-cookie'),
    body: await response.json(),
  };
}

test('POST /api/transactions creates a transfer and updates both account balances', async () => {
  const { user, password } = await createUser();
  const source = await createAccount(user.id, { name: 'Caja', balance: 1000 });
  const destination = await createAccount(user.id, { name: 'Banco', balance: 250 });
  const category = await createCategory(user.id, { name: 'Transferencias' });
  const session = await login(user, password);

  assert.equal(session.response.status, 200);

  const response = await fetch(`${baseUrl}/api/transactions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({
      accountId: source.id,
      categoryId: category.id,
      type: 'transfer',
      amount: 150,
      date: '2026-03-21',
      transferTo: destination.id,
    }),
  });

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.type, 'transfer');

  const [updatedSource, updatedDestination] = await Promise.all([
    prisma.account.findUnique({ where: { id: source.id } }),
    prisma.account.findUnique({ where: { id: destination.id } }),
  ]);

  assert.equal(Number(updatedSource.balance), 850);
  assert.equal(Number(updatedDestination.balance), 400);
});

test('PUT /api/transactions rejects categories owned by another user', async () => {
  const [{ user, password }, ownerTwo] = await Promise.all([createUser(), createUser()]);

  const [account, ownCategory, foreignCategory] = await Promise.all([
    createAccount(user.id, { balance: 500 }),
    createCategory(user.id, { name: 'Comida' }),
    createCategory(ownerTwo.user.id, { name: 'Privada' }),
  ]);

  const session = await login(user, password);
  const createResponse = await fetch(`${baseUrl}/api/transactions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({
      accountId: account.id,
      categoryId: ownCategory.id,
      type: 'expense',
      amount: 100,
      date: '2026-03-21',
    }),
  });

  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);

  const updateResponse = await fetch(`${baseUrl}/api/transactions/${created.data.id}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({
      categoryId: foreignCategory.id,
    }),
  });

  const updateBody = await updateResponse.json();
  assert.equal(updateResponse.status, 404);
  assert.match(updateBody.error, /categoria no encontrada/i);

  const refreshedAccount = await prisma.account.findUnique({ where: { id: account.id } });
  assert.equal(Number(refreshedAccount.balance), 400);
});

test('POST /api/auth/forgot-password stores a hashed reset token and emails the raw token', async () => {
  const { user } = await createUser();

  const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email }),
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.data.message, /si el correo existe/i);

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const sentEmails = getTestEmails();

  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].email, user.email);
  assert.ok(updatedUser.resetToken);
  assert.equal(updatedUser.resetToken, hashResetToken(sentEmails[0].resetToken));
});

test('POST /api/auth/reset-password accepts the raw emailed token and clears reset fields', async () => {
  const { user } = await createUser();

  await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email }),
  });

  const [{ resetToken }] = getTestEmails();

  const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token: resetToken,
      password: 'new-secret-123',
    }),
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.data.message, /contrasena actualizada/i);

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  assert.equal(updatedUser.resetToken, null);
  assert.equal(updatedUser.resetTokenExpiry, null);
});
