import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillMovement,
	gotoHydrated,
	login,
	OTHER_EMAIL,
	rule,
	todayInAppTz
} from './helpers';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"): no other spec
// reads his ARS totals, so parallel workers stay independent.

const checkbox = (page: Page) => page.getByRole('switch', { name: 'Repetir todos los meses' });
/** A uniquely described ARS outcome as `otro`, filled but not submitted. */
const fillOutcome = (page: Page, description: string, amount: string) =>
	fillMovement(page, {
		type: 'Gasto',
		amount,
		description,
		account: 'Otra cuenta pesos',
		category: 'Ajena'
	});

/** Deletes every movement, then every rule, whose description matches. */
async function cleanup(page: Page, baseURL: string, description: string) {
	await deleteMovements(page, baseURL, description);
	await deleteRules(page, baseURL, description);
}

const movementCount = async (page: Page, description: string) => {
	await page.goto(`/movements?q=${encodeURIComponent(description)}`);
	return page.locator('a[href*="movements/"]').filter({ hasText: description }).count();
};

test('Repetir todos los meses creates the rule and a movement linked to it', async ({
	page,
	baseURL
}) => {
	const description = 'Repite e2e';
	await login(page, OTHER_EMAIL);
	await cleanup(page, baseURL!, description);
	try {
		await fillOutcome(page, description, '1.000');
		await expect(checkbox(page)).not.toBeChecked();
		await checkbox(page).check();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		// The flag is stripped from the URL, so a reload does not toast again.
		await expect(page).not.toHaveURL(/saved=/);
		await page.reload();
		await expect(page.getByText('Movimiento guardado.')).toHaveCount(0);

		await page.goto('/plan');
		const row = rule(page, description);
		await expect(row).toHaveCount(1);
		await expect(row).toContainText('Pagado');
		await expect(row).toContainText(`Día ${Number(todayInAppTz().slice(8, 10))}`);
		expect(await movementCount(page, description)).toBe(1);
	} finally {
		await cleanup(page, baseURL!, description);
	}
});

test('unchecked creates no rule', async ({ page, baseURL }) => {
	const description = 'Sin repetir e2e';
	await login(page, OTHER_EMAIL);
	await cleanup(page, baseURL!, description);
	try {
		await fillOutcome(page, description, '1.000');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		expect(await movementCount(page, description)).toBe(1);
		await page.goto('/plan');
		await expect(rule(page, description)).toHaveCount(0);
	} finally {
		await cleanup(page, baseURL!, description);
	}
});

test('a transfer hides the switch and never creates a rule', async ({ page, baseURL }) => {
	const description = 'Transferencia e2e';
	await login(page, OTHER_EMAIL);
	await cleanup(page, baseURL!, description);
	try {
		await gotoHydrated(page, '/movements/new');
		await expect(checkbox(page)).toBeVisible();
		await page.getByRole('radio', { name: 'Transf.' }).check();
		await expect(checkbox(page)).toHaveCount(0);

		// A crafted post (what a no-JS form sends) with the switch on: the server ignores it.
		const id = async (legend: string, label: RegExp) => {
			await page.getByRole('button', { name: new RegExp(legend) }).click();
			const value = await page
				.getByRole('dialog')
				.last()
				.locator('[data-option-row]', { hasText: label })
				.getAttribute('data-value');
			await page.keyboard.press('Escape');
			return value;
		};
		const origin = await id('Desde', /Otra cuenta pesos/);
		const destination = await id('Hacia', /Otra cuenta\s*Dólares/);
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'transfer',
				amount: '1000',
				description,
				accountId: origin!,
				destinationAccountId: destination!,
				exchangeRate: '1000',
				occurredAt: todayInAppTz(),
				repeat: 'on'
			},
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);
		expect(await movementCount(page, description)).toBe(1);
		await page.goto('/plan');
		await expect(rule(page, description)).toHaveCount(0);
	} finally {
		await cleanup(page, baseURL!, description);
	}
});

test('a rejected post with the switch on writes no movement and no rule', async ({
	page,
	browser,
	baseURL
}) => {
	const description = 'Atómico e2e';
	await login(page, OTHER_EMAIL);
	await cleanup(page, baseURL!, description);
	const demoContext = await browser.newContext({ baseURL });
	try {
		const demoPage = await demoContext.newPage();
		await login(demoPage);
		await demoPage.goto('/movements/new');
		const foreignAccount = await demoPage
			.locator('input[name="accountId"]')
			.first()
			.getAttribute('value');

		await page.goto('/movements/new');
		const category = await page.locator('input[name="categoryId"]').first().getAttribute('value');
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				amount: '1000',
				description,
				accountId: foreignAccount!,
				categoryId: category!,
				occurredAt: todayInAppTz(),
				repeat: 'on'
			},
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.status()).toBe(400);
		expect(await movementCount(page, description)).toBe(0);
		await page.goto('/plan');
		await expect(rule(page, description)).toHaveCount(0);
	} finally {
		await demoContext.close();
		await cleanup(page, baseURL!, description);
	}
});
