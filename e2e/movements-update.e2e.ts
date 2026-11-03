import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	fillMovement,
	findMovements,
	linkId,
	login,
	WHOLE_PESOS_ERROR
} from './helpers';

// Descriptions of movements this spec created; removed in afterEach.
const created: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

async function create(page: Page, description: string, account: string) {
	await fillMovement(page, {
		type: 'Gasto',
		amount: '10',
		description,
		account,
		category: 'Supermercado'
	});
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
}

const postUpdate = (page: Page, baseURL: string, href: string, form: Record<string, string>) =>
	page.request.post(`${href}?/update`, {
		form,
		headers: { origin: baseURL, 'x-sveltekit-action': 'true' }
	});

test('?/update with only a description persists it', async ({ page, baseURL }) => {
	const before = unique('Update desc');
	const after = unique('Update desc nuevo');
	await create(page, before, 'Banco Galicia');
	const [href] = await findMovements(page, before);
	const res = await postUpdate(page, baseURL!, href, { description: after });
	expect((await res.json()).type).toBe('success');
	await page.goto(href);
	await expect(page.getByRole('button', { name: `Descripción: ${after}` })).toBeVisible();
});

test('?/update rejects an ARS amount with decimals', async ({ page, baseURL }) => {
	const desc = unique('Update monto');
	await create(page, desc, 'Banco Galicia');
	const [href] = await findMovements(page, desc);
	const res = await postUpdate(page, baseURL!, href, { amount: '10,50' });
	const body = await res.json();
	expect(body.type).toBe('failure');
	expect(body.status).toBe(400);
	expect(body.data).toContain(WHOLE_PESOS_ERROR);
});

test('repeated ?account= lists the movements of both accounts', async ({ page }) => {
	const prefix = unique('Update multi');
	await create(page, `${prefix} uno`, 'Banco Galicia');
	await create(page, `${prefix} dos`, 'Efectivo');
	await page.goto('/accounts');
	const galicia = await linkId(page.getByRole('link', { name: /Banco Galicia/ }).first());
	const efectivo = await linkId(page.getByRole('link', { name: /Efectivo/ }).first());

	await page.goto(`/movements?q=${encodeURIComponent(prefix)}&account=${galicia}`);
	await expect(page.getByText(`${prefix} uno`)).toBeVisible();
	await expect(page.getByText(`${prefix} dos`)).toHaveCount(0);

	await page.goto(
		`/movements?q=${encodeURIComponent(prefix)}&account=${galicia}&account=${efectivo}`
	);
	await expect(page.getByText(`${prefix} uno`)).toBeVisible();
	await expect(page.getByText(`${prefix} dos`)).toBeVisible();
});
