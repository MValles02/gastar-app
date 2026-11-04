import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillMovement,
	linkId,
	login,
	OTHER_EMAIL,
	postDelete,
	setCurrencyCookie,
	todayInAppTz,
	WHOLE_PESOS_ERROR
} from './helpers';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"): no other spec
// reads his ARS totals, so parallel workers stay independent.
test.describe.configure({ timeout: 60_000 });

const rule = (page: Page, text: string) => page.locator('.rule', { hasText: text });
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
		await page.goto('/movements/new');
		await expect(checkbox(page)).toBeVisible();
		await page.getByRole('radio', { name: 'Transf.' }).check({ force: true });
		await expect(checkbox(page)).toHaveCount(0);

		// A crafted post (what a no-JS form sends) with the switch on: the server ignores it.
		const id = async (legend: string, label: RegExp) => {
			await page.getByRole('button', { name: new RegExp(legend) }).click();
			const value = await page
				.getByRole('dialog')
				.locator('button.opt', { hasText: label })
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

test('ARS decimals with the switch on: message, nothing written, switch kept', async ({
	page,
	baseURL
}) => {
	const description = 'Decimales e2e';
	await login(page, OTHER_EMAIL);
	await cleanup(page, baseURL!, description);
	try {
		await fillOutcome(page, description, '1.500,50');
		await checkbox(page).check();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
		await expect(page).toHaveURL(/\/movements\/new$/);
		await expect(checkbox(page)).toBeChecked();
		expect(await movementCount(page, description)).toBe(0);
		await page.goto('/plan');
		await expect(rule(page, description)).toHaveCount(0);
	} finally {
		await cleanup(page, baseURL!, description);
	}
});

test('Inicio with a plan shows the same Disponible as /plan and links to it', async ({
	page,
	baseURL
}) => {
	// otro's USD plan is mutated by no spec.
	await login(page, OTHER_EMAIL);
	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/');
	const card = page.getByRole('region', { name: 'Disponible', exact: true });
	await expect(card).toBeVisible();
	await expect(card.getByText(/Vas bien|Vas rápido|Te pasaste/)).toBeVisible();
	const onHome = await card.locator('.available-amount').innerText();

	await page
		.getByRole('navigation', { name: 'Navegación principal' })
		.getByRole('link', { name: 'Plan', exact: true })
		.click();
	await expect(page).toHaveURL(/\/plan$/);
	const summary = page.getByRole('region', { name: /^Disponible · / });
	// Inicio renders a negative amount as "-" + newline + amount: compare without whitespace.
	expect((await summary.locator('.hero').innerText()).replace(/\s/g, '')).toBe(
		onHome.replace(/\s/g, '')
	);
});

test('Registrar pago saves the rule category, whatever category is posted', async ({
	page,
	baseURL
}) => {
	const description = 'Pago categoria e2e';
	const extra = 'Otra categoria e2e';
	const headers = { origin: baseURL!, accept: 'text/html' };
	await login(page, OTHER_EMAIL);
	let extraId: string | undefined;
	// Leftovers of an interrupted run: a same-name category would make the create below fail.
	await cleanup(page, baseURL!, description);
	await page.goto('/categories');
	const stale = await page
		.getByRole('link', { name: new RegExp(extra) })
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).pathname));
	for (const path of stale) await postDelete(page, baseURL!, path);
	try {
		const created = await page.request.post('/categories/new', {
			form: { name: extra, color: 'green' },
			headers
		});
		extraId = created.url().split('/').pop()!;
		expect(extraId).toMatch(/^[0-9a-f-]{36}$/);

		await fillOutcome(page, description, '1.000');
		await checkbox(page).check();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		await page.goto('/plan');
		const id = await linkId(rule(page, description).locator('a[data-slot="item"]'));
		// Drop the movement the rule was created with so this month's payment is still open.
		await deleteMovements(page, baseURL!, description);

		await page.goto(`/movements/new?recurring=${id}`);
		await expect(checkbox(page)).toHaveCount(0);
		await expect(page.locator('input[name="categoryId"]')).toHaveAttribute('type', 'hidden');
		await expect(page.getByText('Ajena', { exact: true })).toBeVisible();
		const accountId = await page.locator('input[name="accountId"]').getAttribute('value');

		const res = await page.request.post('/movements/new', {
			form: {
				recurringId: id,
				type: 'outcome',
				amount: '1000',
				description,
				accountId: accountId!,
				categoryId: extraId,
				occurredAt: todayInAppTz()
			},
			headers
		});
		expect(res.url()).toMatch(/\/plan\?saved=1$/);

		await page.goto(`/movements?q=${encodeURIComponent(description)}`);
		const row = page.locator('a[href*="movements/"]').filter({ hasText: description });
		await expect(row).toHaveCount(1);
		// Rows show the category as an icon only; its name is on the detail page.
		await row.click();
		await expect(page.getByText('Ajena', { exact: true })).toBeVisible();
		await expect(page.getByText(extra)).toHaveCount(0);
	} finally {
		await cleanup(page, baseURL!, description);
		if (extraId) await postDelete(page, baseURL!, `/categories/${extraId}`);
	}
});
