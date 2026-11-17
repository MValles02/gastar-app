import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Token encryption: "v1:" + base64(iv(12) | tag(16) | ct), AES-256-GCM, AAD = user id.
// `keyB64` is the connection's base64 key (MP_TOKEN_KEY, GMAIL_TOKEN_KEY).
const FORMAT = 'v1:';

const key = (keyB64: string | undefined) => Buffer.from(keyB64 ?? '', 'base64');

export function encryptToken(plain: string, userId: string, keyB64: string | undefined): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(keyB64), iv);
	cipher.setAAD(Buffer.from(userId));
	const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return FORMAT + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decryptToken(stored: string, userId: string, keyB64: string | undefined): string {
	if (!stored.startsWith(FORMAT)) throw new Error('token: unknown format');
	const raw = Buffer.from(stored.slice(FORMAT.length), 'base64');
	if (raw.length < 28) throw new Error('token: too short');
	const decipher = createDecipheriv('aes-256-gcm', key(keyB64), raw.subarray(0, 12), {
		authTagLength: 16
	});
	decipher.setAAD(Buffer.from(userId));
	decipher.setAuthTag(raw.subarray(12, 28));
	return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}
