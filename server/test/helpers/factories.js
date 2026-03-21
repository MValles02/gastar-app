import bcrypt from 'bcrypt';
import { prisma } from './db.js';

let counter = 0;

function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export async function createUser(overrides = {}) {
  const password = overrides.password ?? 'secret123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? uniqueEmail(),
      passwordHash,
      resetToken: overrides.resetToken ?? null,
      resetTokenExpiry: overrides.resetTokenExpiry ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return { user, password };
}

export async function createAccount(userId, overrides = {}) {
  return prisma.account.create({
    data: {
      userId,
      name: overrides.name ?? `Cuenta ${counter + 1}`,
      type: overrides.type ?? 'checking',
      balance: overrides.balance ?? 0,
      currency: overrides.currency ?? 'ARS',
    },
  });
}

export async function createCategory(userId, overrides = {}) {
  return prisma.category.create({
    data: {
      userId,
      name: overrides.name ?? `Categoria ${counter + 1}`,
      icon: overrides.icon ?? 'wallet',
    },
  });
}
