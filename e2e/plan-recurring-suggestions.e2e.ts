import { expect, test, type Cookie, type Page } from '@playwright/test';
import { linkId, setCurrencyCookie, signUpVerified, todayInAppTz } from './helpers';

// Rules of the "Detectamos que se repiten" list (recurringCandidates + recurringSuggestions). Each
// test arranges its own data under a unique description, so the tests are independent of each other
// and of the seed. Not covered here (the app cannot create such rows, so no E2E can arrange them): an
// outcome without a category (DB check), an outcome in an income-only category (kind lock) and
// descriptions that differ only by surrounding whitespace (both forms trim on save).
test.describe.configure({ timeout: 90_000 });

const password = 'e2e-pass-1234';
const ids = { account: '', usd: '', archived: '', food: '', both: '' };
let cookies: Cookie[] = [];
let foreignSuggestionId = '';

/** The 15th of the month `back` months ago (1 = this month, so 2..4 are the last 3 full months). */
function dayOf(back: number, day = 15) {
	const [y, m] = todayInAppTz().split('-').map(Number);
	return new Date(Date.UTC(y, m - back, day)).toISOString().slice(0, 10);
}

type Mv = {
	description: string;
	amount?: string;
	account?: string;
	category?: string;
	recurringId?: string;
};

/** Posts one outcome per entry of `backs` (months ago), the way a no-JS form would. */
async function addOutcomes(page: Page, baseURL: string, mv: Mv, backs = [2, 3, 4]) {
	for (const back of backs) {
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				amount: mv.amount ?? '12345',
				description: mv.description,
				accountId: mv.account ?? ids.account,
				categoryId: mv.category ?? ids.food,
				...(mv.recurringId ? { recurringId: mv.recurringId } : {}),
				occurredAt: dayOf(back)
			},
			headers: { origin: baseURL, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);
	}
}

const suggestions = (page: Page) => page.goto('/plan/setup?step=2', { waitUntil: 'networkidle' });
const row = (page: Page, text: string) => page.getByRole('link', { name: new RegExp(text) });

test.beforeAll(async ({ browser, baseURL }) => {
	const create = async (page: Page, path: string, form: Record<string, string>) => {
		const res = await page.request.post(path, {
			form,
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);
		return res.url().split('/').pop()!;
	};
	const account = (page: Page, name: string, currency: string) =>
		create(page, '/accounts/new', {
			name,
			currency,
			initialBalance: '0',
			icon: 'bank',
			color: 'green'
		});

	const context = await browser.newContext({ baseURL });
	const other = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await signUpVerified(page, context.request, {
			email: `e2e+sugg-${Date.now()}@gastar.local`,
			password,
			name: 'E2E Sugerencias'
		});
		ids.account = await account(page, 'Caja sug e2e', 'ARS');
		ids.usd = await account(page, 'Dólares sug e2e', 'USD');
		ids.archived = await account(page, 'Vieja sug e2e', 'ARS');
		ids.food = await create(page, '/categories/new', {
			name: 'Comida sug e2e',
			color: 'green',
			kind: 'outcome'
		});
		ids.both = await create(page, '/categories/new', {
			name: 'Mixta sug e2e',
			color: 'blue',
			kind: ''
		});
		cookies = await context.cookies();

		// A second user with its own repeated outcome.
		const p2 = await other.newPage();
		await signUpVerified(p2, other.request, {
			email: `e2e+sugg2-${Date.now()}@gastar.local`,
			password,
			name: 'E2E Sugerencias 2'
		});
		const acc2 = await account(p2, 'Caja ajena sug e2e', 'ARS');
		const cat2 = await create(p2, '/categories/new', {
			name: 'Ajena sug e2e',
			color: 'green',
			kind: 'outcome'
		});
		await addOutcomes(p2, baseURL!, {
			description: 'Aislado sug e2e',
			account: acc2,
			category: cat2
		});
		await suggestions(p2);
		const href = await row(p2, 'Aislado sug e2e').getAttribute('href');
		foreignSuggestionId = new URL(href!, baseURL).searchParams.get('suggestion')!;
		expect(foreignSuggestionId).toBeTruthy();
	} finally {
		await context.close();
		await other.close();
	}
});

test.beforeEach(async ({ page }) => {
	await page.context().addCookies(cookies);
});

test('an outcome repeated in only 2 of the last 3 full months is not suggested', async ({
	page,
	baseURL
}) => {
	await addOutcomes(page, baseURL!, { description: 'Dos meses sug e2e' }, [2, 3]);
	await addOutcomes(page, baseURL!, { description: 'Tres meses sug e2e' });
	await suggestions(page);
	await expect(row(page, 'Tres meses sug e2e')).toHaveCount(1);
	await expect(row(page, 'Dos meses sug e2e')).toHaveCount(0);
});

test('outcomes linked to a rule (recurringId set) are not suggested', async ({ page, baseURL }) => {
	const headers = { origin: baseURL!, accept: 'text/html' };
	// The rule has another name, so only the link (not the rule-name rule) can hide the group.
	const created = await page.request.post('/plan/recurring/new', {
		form: {
			type: 'outcome',
			description: 'Regla vinc sug e2e',
			amount: '12345',
			dayOfMonth: '15',
			accountId: ids.account,
			categoryId: ids.food
		},
		headers
	});
	expect(created.ok()).toBe(true);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const ruleId = await linkId(
		page.locator('.rule', { hasText: 'Regla vinc sug e2e' }).locator('a[data-slot="item"]')
	);
	await addOutcomes(page, baseURL!, { description: 'Vinculado sug e2e', recurringId: ruleId });
	await addOutcomes(page, baseURL!, { description: 'Suelto sug e2e' });
	await suggestions(page);
	await expect(row(page, 'Suelto sug e2e')).toHaveCount(1);
	await expect(row(page, 'Vinculado sug e2e')).toHaveCount(0);
});

test('movements on an archived account are not suggested', async ({ page, baseURL }) => {
	await addOutcomes(page, baseURL!, { description: 'Archivada sug e2e', account: ids.archived });
	await suggestions(page);
	await expect(row(page, 'Archivada sug e2e')).toHaveCount(1);
	const res = await page.request.post(`/accounts/${ids.archived}?/archive`, {
		form: {},
		headers: { origin: baseURL!, accept: 'text/html' }
	});
	expect(res.ok()).toBe(true);
	await suggestions(page);
	await expect(row(page, 'Archivada sug e2e')).toHaveCount(0);
});

test('only outcomes in the plan currency are suggested', async ({ page, baseURL }) => {
	await addOutcomes(page, baseURL!, { description: 'Dolar sug e2e', account: ids.usd });
	await suggestions(page);
	await expect(row(page, 'Dolar sug e2e')).toHaveCount(0);
	await setCurrencyCookie(page, baseURL!, 'USD');
	await suggestions(page);
	await expect(row(page, 'Dolar sug e2e')).toHaveCount(1);
});

test('grouping is case-insensitive', async ({ page, baseURL }) => {
	// One movement per month, each with different casing: only one group has 3 months.
	await addOutcomes(page, baseURL!, { description: 'Mayus sug e2e' }, [2]);
	await addOutcomes(page, baseURL!, { description: 'MAYUS SUG E2E' }, [3]);
	await addOutcomes(page, baseURL!, { description: 'mayus sug e2e' }, [4]);
	await suggestions(page);
	await expect(row(page, 'sug e2e').filter({ hasText: /mayus/i })).toHaveCount(1);
});

test('an outcome with no category kind (both) is suggested', async ({ page, baseURL }) => {
	await addOutcomes(page, baseURL!, { description: 'Mixta sug e2e', category: ids.both });
	await suggestions(page);
	await expect(row(page, 'Mixta sug e2e')).toHaveCount(1);
});

test('the suggested amount averages the per-month sums', async ({ page, baseURL }) => {
	// Months 2 has two movements (10.000 + 5.000), months 3 and 4 one of 15.000: per-month sums are
	// 15.000 each. A plain average over the 4 movements would give 11.250.
	await addOutcomes(page, baseURL!, { description: 'Suma sug e2e', amount: '10000' }, [2]);
	await addOutcomes(page, baseURL!, { description: 'Suma sug e2e', amount: '5000' }, [2]);
	await addOutcomes(page, baseURL!, { description: 'Suma sug e2e', amount: '15000' }, [3, 4]);
	await suggestions(page);
	await expect(row(page, 'Suma sug e2e')).toContainText('15.000');
});

test("another user's repeated outcome is never suggested", async ({ page }) => {
	await suggestions(page);
	await expect(row(page, 'Aislado sug e2e')).toHaveCount(0);
});

for (const [name, id] of [
	['another user suggestion id', () => foreignSuggestionId],
	['a nonexistent id', () => '6f1d3c1e-0000-4000-8000-000000000000']
] as const) {
	test(`the rule form with ${name} is empty`, async ({ page }) => {
		await page.goto(`/plan/recurring/new?type=outcome&wizard=2&suggestion=${id()}`, {
			waitUntil: 'networkidle'
		});
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuevo pago fijo');
		await expect(page.locator('input[name="description"]')).toHaveValue('');
		await expect(page.locator('input[name="amount"]')).toHaveValue('');
		await expect(page.getByRole('button', { name: /^Cuenta/ })).not.toContainText('Caja');
		await expect(page.getByRole('button', { name: /^Categoría/ })).not.toContainText('sug e2e');
	});
}
