import bcrypt from 'bcrypt';
import { prisma } from './db.js';

let counter = 0;

function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export async function createUser(overrides: Record<string, unknown> = {}) {
  const password = (overrides.password as string) ?? 'secret123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: (overrides.name as string) ?? 'Test User',
      email: (overrides.email as string) ?? uniqueEmail(),
      passwordHash,
      resetToken: (overrides.resetToken as string) ?? null,
      resetTokenExpiry: (overrides.resetTokenExpiry as Date) ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return { user, password };
}

export async function createAccount(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.account.create({
    data: {
      userId,
      name: (overrides.name as string) ?? `Cuenta ${counter + 1}`,
      type: (overrides.type as string) ?? 'checking',
      balance: (overrides.balance as number) ?? 0,
      currency: (overrides.currency as string) ?? 'ARS',
    },
  });
}

export async function createCategory(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.category.create({
    data: {
      userId,
      name: (overrides.name as string) ?? `Categoria ${counter + 1}`,
      icon: (overrides.icon as string) ?? 'wallet',
    },
  });
}
