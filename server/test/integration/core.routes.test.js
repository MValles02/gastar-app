import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/server.js';
import { createAccount, createCategory, createUser } from '../helpers/factories.js';
import { disconnectDb, prisma, resetDb } from '../helpers/db.js';
import { registerAndGetSession } from '../helpers/auth.js';

const { baseUrl, close } = await startTestServer();

after(async () => {
  await close();
  await disconnectDb();
});

beforeEach(async () => {
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

test('auth flow supports register, me, logout and rejects duplicate register', async () => {
  const session = await registerAndGetSession(baseUrl, {
    email: 'auth-flow@example.com',
    password: 'secret123',
  });

  assert.equal(session.response.status, 201);
  assert.match(session.cookie, /token=/);

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: session.cookie },
  });

  const meBody = await meResponse.json();
  assert.equal(meResponse.status, 200);
  assert.equal(meBody.data.email, 'auth-flow@example.com');

  const duplicateResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate User',
      email: 'auth-flow@example.com',
      password: 'secret123',
    }),
  });

  assert.equal(duplicateResponse.status, 409);

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: session.cookie },
  });

  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get('set-cookie') || '', /token=/);
});

test('protected routes reject unauthenticated requests and auth validates credentials', async () => {
  const unauthorizedResponse = await fetch(`${baseUrl}/api/accounts`);
  const unauthorizedBody = await unauthorizedResponse.json();

  assert.equal(unauthorizedResponse.status, 401);
  assert.match(unauthorizedBody.error, /unauthorized/i);

  const { user } = await createUser({ email: 'login-check@example.com' });

  const invalidLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'wrong-password' }),
  });

  assert.equal(invalidLoginResponse.status, 401);

  const malformedRegisterResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'bad-email', password: '123' }),
  });

  assert.equal(malformedRegisterResponse.status, 400);
});

test('account routes support CRUD and allow deleting accounts with transactions (cascade)', async () => {
  const { user, password } = await createUser();
  const session = await login(user, password);

  const createResponse = await fetch(`${baseUrl}/api/accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({
      name: 'Banco Principal',
      type: 'checking',
      currency: 'ARS',
      balance: 2500,
    }),
  });
  const createdAccount = await createResponse.json();
  assert.equal(createResponse.status, 201);

  const listResponse = await fetch(`${baseUrl}/api/accounts`, {
    headers: { cookie: session.cookie },
  });
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.length, 1);

  const updateResponse = await fetch(`${baseUrl}/api/accounts/${createdAccount.data.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({ name: 'Banco Secundario', currency: 'USD' }),
  });
  const updatedBody = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updatedBody.data.name, 'Banco Secundario');

  // Add a transaction so account is non-empty
  const category = await createCategory(user.id, { name: 'Comida' });
  const tx = await prisma.transaction.create({
    data: {
      accountId: createdAccount.data.id,
      categoryId: category.id,
      type: 'expense',
      amount: 50,
      amountArs: 50,
      date: new Date('2026-03-21'),
    },
  });

  // Deletion must succeed even with transactions present (cascade)
  const deleteResponse = await fetch(`${baseUrl}/api/accounts/${createdAccount.data.id}`, {
    method: 'DELETE',
    headers: { cookie: session.cookie },
  });
  assert.equal(deleteResponse.status, 200);

  // Transaction must have been cascade-deleted
  const remaining = await prisma.transaction.findUnique({ where: { id: tx.id } });
  assert.equal(remaining, null);

  // Create a second account as transfer destination, then delete it — transferTo should be nullified
  const destCreate = await fetch(`${baseUrl}/api/accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({ name: 'Destino', type: 'savings', currency: 'ARS', balance: 0 }),
  });
  const destAccount = await destCreate.json();

  const srcCreate = await fetch(`${baseUrl}/api/accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({ name: 'Origen', type: 'checking', currency: 'ARS', balance: 1000 }),
  });
  const srcAccount = await srcCreate.json();

  const transfer = await prisma.transaction.create({
    data: {
      accountId: srcAccount.data.id,
      categoryId: category.id,
      type: 'transfer',
      amount: 100,
      amountArs: 100,
      transferTo: destAccount.data.id,
      date: new Date('2026-03-21'),
    },
  });

  // Delete the destination account — must succeed, not FK error
  const destDeleteResponse = await fetch(`${baseUrl}/api/accounts/${destAccount.data.id}`, {
    method: 'DELETE',
    headers: { cookie: session.cookie },
  });
  assert.equal(destDeleteResponse.status, 200);

  // The transfer transaction still exists but transferTo is now null
  const updatedTransfer = await prisma.transaction.findUnique({ where: { id: transfer.id } });
  assert.notEqual(updatedTransfer, null);
  assert.equal(updatedTransfer.transferTo, null);

  // 404 on missing account
  const missingResponse = await fetch(`${baseUrl}/api/accounts/${createdAccount.data.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({ name: 'No existe' }),
  });
  assert.equal(missingResponse.status, 404);
});

test('category routes support CRUD and prevent deleting categories with transactions', async () => {
  const { user, password } = await createUser();
  const account = await createAccount(user.id, { balance: 400 });
  const session = await login(user, password);

  const createResponse = await fetch(`${baseUrl}/api/categories`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({ name: 'Servicios', icon: 'wifi' }),
  });

  const createdCategory = await createResponse.json();
  assert.equal(createResponse.status, 201);

  const listResponse = await fetch(`${baseUrl}/api/categories`, {
    headers: { cookie: session.cookie },
  });

  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.length, 1);

  const updateResponse = await fetch(`${baseUrl}/api/categories/${createdCategory.data.id}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({ name: 'Servicios del hogar' }),
  });

  const updateBody = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updateBody.data.name, 'Servicios del hogar');

  await prisma.transaction.create({
    data: {
      accountId: account.id,
      categoryId: createdCategory.data.id,
      type: 'expense',
      amount: 75,
      date: new Date('2026-03-21'),
    },
  });

  const blockedDeleteResponse = await fetch(
    `${baseUrl}/api/categories/${createdCategory.data.id}`,
    {
      method: 'DELETE',
      headers: { cookie: session.cookie },
    }
  );

  assert.equal(blockedDeleteResponse.status, 400);

  await prisma.transaction.deleteMany({ where: { categoryId: createdCategory.data.id } });

  const deleteResponse = await fetch(`${baseUrl}/api/categories/${createdCategory.data.id}`, {
    method: 'DELETE',
    headers: { cookie: session.cookie },
  });

  assert.equal(deleteResponse.status, 200);

  const missingResponse = await fetch(`${baseUrl}/api/categories/${createdCategory.data.id}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({ name: 'No existe' }),
  });

  assert.equal(missingResponse.status, 404);
});

test('report routes return filtered summaries and grouped category totals', async () => {
  const { user, password } = await createUser();
  const [cashAccount, bankAccount, foodCategory, salaryCategory] = await Promise.all([
    createAccount(user.id, { name: 'Caja', balance: 1200 }),
    createAccount(user.id, { name: 'Banco', balance: 800 }),
    createCategory(user.id, { name: 'Comida' }),
    createCategory(user.id, { name: 'Salario' }),
  ]);

  await prisma.transaction.createMany({
    data: [
      {
        accountId: cashAccount.id,
        categoryId: salaryCategory.id,
        type: 'income',
        amount: 300,
        date: new Date('2026-03-10'),
      },
      {
        accountId: cashAccount.id,
        categoryId: foodCategory.id,
        type: 'expense',
        amount: 50,
        date: new Date('2026-03-12'),
      },
      {
        accountId: bankAccount.id,
        categoryId: foodCategory.id,
        type: 'expense',
        amount: 70,
        date: new Date('2026-02-01'),
      },
    ],
  });

  const session = await login(user, password);

  const summaryResponse = await fetch(
    `${baseUrl}/api/reports/summary?from=2026-03-01&to=2026-03-31`,
    {
      headers: { cookie: session.cookie },
    }
  );

  const summaryBody = await summaryResponse.json();
  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryBody.data.totalBalance, 2000);
  assert.equal(summaryBody.data.totalIncome, 300);
  assert.equal(summaryBody.data.totalExpenses, 50);
  assert.equal(summaryBody.data.netFlow, 250);

  const byCategoryResponse = await fetch(
    `${baseUrl}/api/reports/by-category?from=2026-03-01&to=2026-03-31`,
    {
      headers: { cookie: session.cookie },
    }
  );

  const byCategoryBody = await byCategoryResponse.json();
  assert.equal(byCategoryResponse.status, 200);
  assert.equal(byCategoryBody.data.expenses.length, 1);
  assert.equal(byCategoryBody.data.expenses[0].categoryName, 'Comida');
  assert.equal(byCategoryBody.data.expenses[0].total, 50);
  assert.equal(byCategoryBody.data.incomes[0].categoryName, 'Salario');

  const invalidDateResponse = await fetch(`${baseUrl}/api/reports/summary?from=bad-date`, {
    headers: { cookie: session.cookie },
  });

  assert.equal(invalidDateResponse.status, 400);
});

test('editing a non-ARS account with a new cotizacion updates balanceArs', async () => {
  const { user, password } = await createUser();
  const session = await login(user, password);

  // Create USD account with initial cotizacion 1000 (balance $100 → 100000 ARS)
  const createResponse = await fetch(`${baseUrl}/api/accounts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({
      name: 'Dólares',
      type: 'savings',
      currency: 'USD',
      balance: 100,
      cotizacion: 1000,
    }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(Number(created.data.balanceArs), 100000);

  // Edit with new cotizacion 1200, same currency — balanceArs must update to 120000
  const updateResponse = await fetch(`${baseUrl}/api/accounts/${created.data.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: session.cookie },
    body: JSON.stringify({ cotizacion: 1200 }),
  });
  const updated = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(Number(updated.data.balanceArs), 120000);
});

test('registration does not seed default categories', async () => {
  const session = await registerAndGetSession(baseUrl, {
    email: 'no-cats@example.com',
    password: 'secret123',
  });
  assert.equal(session.response.status, 201);

  const categoriesResponse = await fetch(`${baseUrl}/api/categories`, {
    headers: { cookie: session.cookie },
  });
  const categoriesBody = await categoriesResponse.json();
  assert.equal(categoriesResponse.status, 200);
  assert.equal(categoriesBody.data.length, 0);
});
