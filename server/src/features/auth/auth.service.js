import bcrypt from 'bcrypt';
import prisma from '../../shared/utils/prisma.js';

const USER_PUBLIC_SELECT = { id: true, email: true, name: true, cotizacionPreference: true };

export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(userId) {
  return prisma.user.findUnique({ where: { id: userId }, select: USER_PUBLIC_SELECT });
}

export async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { name, email, passwordHash },
    select: USER_PUBLIC_SELECT,
  });
}

export async function validatePassword(user, password) {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateUser(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_PUBLIC_SELECT,
  });
}

export async function deleteUser(userId) {
  return prisma.user.delete({ where: { id: userId } });
}

export async function setResetToken(email, hashedToken, expiry) {
  return prisma.user.update({
    where: { email },
    data: { resetToken: hashedToken, resetTokenExpiry: expiry },
  });
}

export async function findUserByResetToken(hashedToken) {
  return prisma.user.findFirst({
    where: { resetToken: hashedToken, resetTokenExpiry: { gt: new Date() } },
  });
}

export async function clearResetToken(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { resetToken: null, resetTokenExpiry: null },
  });
}

export async function resetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    select: USER_PUBLIC_SELECT,
  });
}

export async function findOrCreateGoogleUser({ email, name, googleId }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    select: USER_PUBLIC_SELECT,
  });
  if (existing) {
    if (!existing.googleId) {
      await prisma.user.update({ where: { id: existing.id }, data: { googleId } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { email, name, googleId },
    select: USER_PUBLIC_SELECT,
  });
}
