import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	fillMovement,
	findMovements,
	login,
	unique,
	WHOLE_PESOS_ERROR
} from './helpers';

// Descriptions of movements this spec created; removed in afterEach.
const created: string[] = [];

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

test('?/update rejects an ARS amount with decimals', async ({ page, baseURL }) => {
	const desc = unique(created, 'Update monto');
	await create(page, desc, 'Banco Galicia');
	const [href] = await findMovements(page, desc);
	const res = await postUpdate(page, baseURL!, href, { amount: '10,50' });
	const body = await res.json();
	expect(body.type).toBe('failure');
	expect(body.status).toBe(400);
	expect(body.data).toContain(WHOLE_PESOS_ERROR);
});
