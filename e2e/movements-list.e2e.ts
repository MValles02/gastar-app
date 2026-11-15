// The Filtros drawer of /movements stages its changes until "Ver N movimientos".
import { expect, test, type Page } from '@playwright/test';
import { deleteMovements, linkId, login, openFilters, PHONE, todayInAppTz } from './helpers';

test.use({ viewport: PHONE });

const created: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

/** Creates a 1-peso outcome today on each account in `accounts`. Returns the shared description prefix. */
async function arrange(page: Page, baseURL: string, accounts: string[]) {
	const prefix = `Lista ${Date.now()}`;
	created.push(prefix);
	await page.goto('/categories');
	const categoryId = await linkId(page.getByRole('link', { name: /Supermercado/ }));
	const accountIds: Record<string, string> = {};
	await page.goto('/accounts');
	for (const account of accounts)
		accountIds[account] ??= await linkId(page.getByRole('link', { name: new RegExp(account) }));
	for (const [i, account] of accounts.entries()) {
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				amount: '1',
				description: `${prefix} ${i}`,
				accountId: accountIds[account],
				categoryId,
				occurredAt: todayInAppTz()
			},
			headers: { origin: baseURL, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);
	}
	return prefix;
}

const filtersButton = (page: Page) => page.getByRole('button', { name: /^Filtros/ });

test('filter changes are staged until "Ver N movimientos", which equals the rows shown', async ({
	page,
	baseURL
}) => {
	const prefix = await arrange(page, baseURL!, ['Efectivo', 'Banco Galicia', 'Banco Galicia']);
	const rows = page.locator('main a', { hasText: prefix });
	await page.goto(`/movements?q=${encodeURIComponent(prefix)}`);
	await page.waitForLoadState('networkidle'); // hydration guard: the Filtros drawer needs JS
	await expect(rows).toHaveCount(3);
	// The search term is not a filter: no badge.
	await expect(filtersButton(page)).toHaveText('Filtros');

	const before = page.url();
	const dialog = await openFilters(page);
	await dialog.getByRole('button', { name: /^Cuenta/ }).click();
	await page.getByRole('dialog').last().getByText('Banco Galicia', { exact: true }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Cuenta', exact: true })).toHaveCount(0);

	const see = dialog.getByRole('button', { name: /^Ver/ });
	await expect(see).toHaveText('Ver 2 movimientos');
	// Staged only: the URL and the list behind the drawer are untouched.
	expect(page.url()).toBe(before);
	await expect(rows).toHaveCount(3);

	await see.click();
	await expect(page).toHaveURL(/[?&]account=[0-9a-f-]{36}/);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(rows).toHaveCount(2);
	await expect(filtersButton(page)).toContainText('1');
	await expect(page.getByRole('status').filter({ hasText: /movimientos?/ })).toHaveText(
		'2 movimientos'
	);
});
