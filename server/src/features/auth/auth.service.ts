import bcrypt from 'bcrypt';
import prisma from '../../shared/utils/prisma.js';
import type { User } from '../../shared/types/domain.types.js';

type UserPublic = Pick<User, 'id' | 'email' | 'name' | 'exchangeRatePreference'>;

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  exchangeRatePreference: true,
} as const;

// Prisma returns `string` for exchangeRatePreference until the pending migration
// generates an enum-typed client. This cast is safe because the DB column and
// default value constrain the field to 'blue' | 'official'.
function toUserPublic(raw: {
  id: string;
  email: string;
  name: string;
  exchangeRatePreference: string;
}): UserPublic {
  return raw as unknown as UserPublic;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(userId: string): Promise<UserPublic | null> {
  const raw = await prisma.user.findUnique({ where: { id: userId }, select: USER_PUBLIC_SELECT });
  return raw ? toUserPublic(raw) : null;
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
  const raw = await prisma.user.create({
    data: { name, email, passwordHash },
    select: USER_PUBLIC_SELECT,
  });
  return toUserPublic(raw);
}

export async function validatePassword(
  user: { passwordHash: string | null },
  password: string
): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

type UpdateUserData = Pick<User, 'exchangeRatePreference'>;

export async function updateUser(userId: string, data: UpdateUserData): Promise<UserPublic> {
  const raw = await prisma.user.update({
    where: { id: userId },
    data,
    select: USER_PUBLIC_SELECT,
  });
  return toUserPublic(raw);
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function setResetToken(
  email: string,
  hashedToken: string,
  expiry: Date
): Promise<void> {
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

export async function resetPassword(userId: string, newPassword: string): Promise<UserPublic> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const raw = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    select: USER_PUBLIC_SELECT,
  });
  return toUserPublic(raw);
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
  // Use upsert to atomically find-or-create, avoiding TOCTOU race conditions.
  // We match on email (unique) so that a pre-existing email account gets its
  // googleId linked on first OAuth login. If no record exists, we create one.
  const raw = await prisma.user.upsert({
    where: { email },
    create: { email, name, googleId },
    update: { googleId },
    select: USER_PUBLIC_SELECT,
  });
  return toUserPublic(raw);
}
