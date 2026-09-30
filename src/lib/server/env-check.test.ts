import { describe, expect, it } from 'vitest';
import { checkEnv } from './env-check';

const ok = {
	BETTER_AUTH_SECRET: 'x'.repeat(32),
	BETTER_AUTH_URL: 'https://a.test',
	DATABASE_URL: 'postgres://u:p@h/d',
	ORIGIN: 'https://a.test',
	ADDRESS_HEADER: 'CF-Connecting-IP'
};

function message(env: Record<string, string | undefined>): string {
	try {
		checkEnv(env);
	} catch (e) {
		return (e as Error).message;
	}
	return '';
}

describe('checkEnv', () => {
	it('accepts a complete env', () => {
		expect(() => checkEnv(ok)).not.toThrow();
		expect(() => checkEnv({ ...ok, ADDRESS_HEADER: 'cf-connecting-ip' })).not.toThrow();
	});
	it('lists all missing names without values', () => {
		const msg = message({ ...ok, ORIGIN: '', DATABASE_URL: undefined, ADDRESS_HEADER: undefined });
		expect(msg).toContain('ORIGIN is missing');
		expect(msg).toContain('DATABASE_URL is missing');
		expect(msg).toContain('ADDRESS_HEADER is missing');
		expect(msg).not.toContain('BETTER_AUTH_URL');
	});
	it('rejects a short secret without leaking it', () => {
		const msg = message({ ...ok, BETTER_AUTH_SECRET: 'sh0rt-s3cret' });
		expect(msg).toMatch(/shorter than 32/);
		expect(msg).not.toContain('sh0rt-s3cret');
	});
	it('rejects a wrong ADDRESS_HEADER without echoing its value', () => {
		const msg = message({ ...ok, ADDRESS_HEADER: 'X-Forwarded-For' });
		expect(msg).toContain('ADDRESS_HEADER must be CF-Connecting-IP');
		expect(msg).not.toContain('X-Forwarded-For');
	});
});
