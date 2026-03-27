import bcrypt from 'bcrypt';
import prisma from '../../shared/utils/prisma.js';
import type { User } from '../../shared/types/domain.types.js';

type UserPublic = Pick<User, 'id' | 'email' | 'name' | 'exchangeRatePreference'>;

const USER_PUBLIC_SELECT = { id: true, email: true, name: true, exchangeRatePreference: true } as const;

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(userId: string): Promise<UserPublic | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: USER_PUBLIC_SELECT });
}

export async function createUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<UserPublic> {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { name, email, passwordHash },
    select: USER_PUBLIC_SELECT,
  });
}

export async function validatePassword(
  user: { passwordHash: string | null },
  password: string
): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateUser(userId: string, data: Record<string, unknown>): Promise<UserPublic> {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_PUBLIC_SELECT,
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function setResetToken(email: string, hashedToken: string, expiry: Date): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { resetToken: hashedToken, resetTokenExpiry: expiry },
  });
}

export async function findUserByResetToken(hashedToken: string) {
  return prisma.user.findFirst({
    where: { resetToken: hashedToken, resetTokenExpiry: { gt: new Date() } },
  });
}

export async function clearResetToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { resetToken: null, resetTokenExpiry: null },
  });
}

export async function resetPassword(userId: string, newPassword: string): Promise<UserPublic> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    select: USER_PUBLIC_SELECT,
  });
}

export async function findOrCreateGoogleUser({
  email,
  name,
  googleId,
}: {
  email: string;
  name: string;
  googleId: string;
}): Promise<UserPublic> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    select: { ...USER_PUBLIC_SELECT, googleId: true },
  });
  if (existing) {
    if (!existing.googleId) {
      await prisma.user.update({ where: { id: existing.id }, data: { googleId } });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { googleId: _gid, ...userPublic } = existing;
    return userPublic;
  }
  return prisma.user.create({
    data: { email, name, googleId },
    select: USER_PUBLIC_SELECT,
  });
}
