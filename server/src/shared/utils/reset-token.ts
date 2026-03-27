import crypto from 'node:crypto';

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyResetToken(token: string, hashed: string): boolean {
  return hashResetToken(token) === hashed;
}

export function generateResetToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hashed: hashResetToken(raw) };
}
