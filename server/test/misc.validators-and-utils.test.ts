import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountSchema, updateAccountSchema } from '../src/features/accounts/accounts.validators.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../src/features/categories/categories.validators.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../src/features/auth/auth.validators.js';
import {
  clearTestEmails,
  getTestEmails,
  sendPasswordResetEmail,
} from '../src/features/auth/email.service.js';
import { generateToken, setTokenCookie } from '../src/shared/utils/token.js';

test('account schemas parse valid input and reject invalid types', () => {
  const account = createAccountSchema.parse({
    name: 'Cash',
    type: 'checking',
    currency: 'ARS',
    balance: '12.5',
  });

  assert.equal(account.balance, 12.5);

  assert.throws(
    () => createAccountSchema.parse({ name: 'Cash', type: 'invalid' }),
    /invalid account type/i
  );

  const update = updateAccountSchema.parse({ name: 'Bank', currency: 'USD' });
  assert.equal(update.currency, 'USD');
});

test('category schemas validate required fields and partial updates', () => {
  const category = createCategorySchema.parse({ name: 'Food', icon: 'pizza' });
  assert.equal(category.icon, 'pizza');

  assert.throws(() => createCategorySchema.parse({ name: '' }), /name is required/i);

  const update = updateCategorySchema.parse({ icon: 'wallet' });
  assert.equal(update.icon, 'wallet');
});

test('auth schemas validate expected fields', () => {
  assert.equal(
    registerSchema.parse({
      name: 'Mateo Valles',
      email: 'mateo@example.com',
      password: 'secret123',
    }).email,
    'mateo@example.com'
  );

  assert.equal(
    loginSchema.parse({
      email: 'mateo@example.com',
      password: 'x',
    }).password,
    'x'
  );

  assert.equal(
    forgotPasswordSchema.parse({
      email: 'mateo@example.com',
    }).email,
    'mateo@example.com'
  );

  assert.equal(
    resetPasswordSchema.parse({
      token: 'raw-token',
      password: 'secret123',
    }).token,
    'raw-token'
  );
});

test('sendPasswordResetEmail stores test emails in NODE_ENV=test', async () => {
  clearTestEmails();
  process.env.NODE_ENV = 'test';
  process.env.APP_URL = 'https://example.test';

  await sendPasswordResetEmail('user@example.com', 'raw-token');

  const emails = getTestEmails();
  assert.equal(emails.length, 1);
  assert.equal(emails[0].email, 'user@example.com');
  assert.match(emails[0].resetUrl, /raw-token/);
});

test('token helpers sign JWTs and configure auth cookies', () => {
  process.env.JWT_SECRET = 'unit-test-secret';

  const token = generateToken('user-123');
  assert.equal(typeof token, 'string');

  const cookies: { name: string; value: string; options: Record<string, unknown> }[] = [];
  setTokenCookie(
    {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
    } as never,
    token
  );

  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, 'token');
  assert.equal(cookies[0].value, token);
  assert.equal(cookies[0].options.httpOnly, true);
});
