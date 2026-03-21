import crypto from 'node:crypto';

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
