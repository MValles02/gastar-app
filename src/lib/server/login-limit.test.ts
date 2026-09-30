import { expect, it } from 'vitest';
import { isLoginBlocked, recordLoginFailure, trackedKeys } from './login-limit';

it('blocks after 5 failures per ip and recovers after the window', () => {
	for (let i = 0; i < 4; i++) recordLoginFailure('1.1.1.1', 1000);
	expect(isLoginBlocked('1.1.1.1', 2000)).toBe(false);
	recordLoginFailure('1.1.1.1', 1000);
	expect(isLoginBlocked('1.1.1.1', 2000)).toBe(true);
	recordLoginFailure('1.1.1.1', 1000);
	expect(isLoginBlocked('1.1.1.1', 2000)).toBe(true);
	expect(isLoginBlocked('2.2.2.2', 2000)).toBe(false);
	expect(isLoginBlocked('1.1.1.1', 62_000)).toBe(false);
});

it('only failures count: checking without recording never blocks', () => {
	for (let i = 0; i < 10; i++) expect(isLoginBlocked('3.3.3.3', 1000)).toBe(false);
});

it('sweeps expired entries once the map grows past 1000', () => {
	for (let i = 0; i < 1001; i++) recordLoginFailure(`10.0.${i}.1`, 0);
	expect(trackedKeys()).toBeGreaterThan(1000);
	isLoginBlocked('9.9.9.9', 120_000);
	expect(trackedKeys()).toBe(0);
});
