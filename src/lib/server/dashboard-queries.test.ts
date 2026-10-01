import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
	accountSummary,
	categorySums,
	originTypeSums,
	recentMovements,
	transfersInSum
} from './dashboard-queries';

const range = { start: new Date('2026-10-01T03:00:00Z'), end: new Date('2026-11-01T03:00:00Z') };

const builders = (u: string) => [
	accountSummary(u),
	originTypeSums(u, 'ARS'),
	originTypeSums(u, 'USD', range),
	transfersInSum(u, 'ARS'),
	categorySums(u, 'ARS', range),
	recentMovements(u, 'ARS')
];

it('every query is scoped by owner_id with the userId as a param', () => {
	for (const q of builders('user-a')) {
		const { sql, params } = q.toSQL();
		expect(sql).toContain('owner_id');
		expect(params).toContain('user-a');
	}
	for (const [i, q] of builders('user-b').entries()) {
		expect(q.toSQL().params).toContain('user-b');
		expect(q.toSQL().params).not.toContain('user-a');
		expect(builders('user-a')[i].toSQL().params).not.toEqual(q.toSQL().params);
	}
});

it('recentMovements checks ownership on the destination alias too', () => {
	const { sql } = recentMovements('u', 'ARS').toSQL();
	expect(sql).toContain('"dest"."owner_id"');
	expect(sql).toMatch(/order by .* desc/i);
	expect(sql).toMatch(/limit/i);
});

it('transfersInSum checks ownership on both origin and destination accounts', () => {
	const { sql, params } = transfersInSum('user-a', 'ARS').toSQL();
	expect(sql).toContain('"financial_accounts"."owner_id" = $');
	expect(sql).toContain('"dest"."owner_id" = $');
	expect(sql.match(/"owner_id" = \$/g)).toHaveLength(2);
	expect(params.filter((p) => p === 'user-a')).toHaveLength(2);
});

it('accountSummary has no archived filter', () => {
	expect(accountSummary('u').toSQL().sql).not.toContain('archived_at');
});

it('month range filters on occurred_at', () => {
	const { sql } = categorySums('u', 'ARS', range).toSQL();
	expect(sql).toContain('"occurred_at" >=');
	expect(sql).toContain('"occurred_at" <');
});

const userIdRe = new RegExp('\\.user' + 'Id\\b');

it('access.ts is the only src file referencing the owner column', () => {
	const hits: string[] = [];
	const walk = (dir: string) => {
		for (const f of readdirSync(dir)) {
			const p = join(dir, f);
			if (statSync(p).isDirectory()) walk(p);
			else if (/\.(ts|svelte)$/.test(f)) {
				const src = readFileSync(p, 'utf8');
				if (src.includes('owner' + 'Id') || userIdRe.test(src)) hits.push(p);
			}
		}
	};
	walk('src');
	expect(hits.map((h) => h.split('/').pop()).sort()).toEqual(['access.ts', 'schema.ts']);
});

it('categories joins carry the ownership condition', () => {
	for (const q of [categorySums('user-a', 'ARS', range), recentMovements('user-a', 'ARS')]) {
		const { sql, params } = q.toSQL();
		expect(sql).toContain('"categories"."user_id" = $');
		expect(params).toContain('user-a');
		expect(params).not.toContain('user-b');
	}
	expect(recentMovements('u', 'ARS').toSQL().sql).toMatch(
		/left join "categories" on .*"categories"."user_id" = \$/is
	);
});
