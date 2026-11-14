import { expect, test, type Page } from '@playwright/test';
import { visaStatement } from './galicia-pdf';
import {
	findMovements,
	pathOf,
	pick,
	postDelete,
	setCurrencyCookie,
	signUpVerified,
	todayInAppTz
} from './helpers';

// Fixed payments link to imported charges: by description (amount follows the charge) and by an explicit,
// remembered choice. One fresh user; the rules and the Galicia connection are created in beforeAll.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

let page: Page;

/** DD-MM-YY of a YYYY-MM-DD day, the way the statement prints it. */
const statementDate = (ymd: string) => `${ymd.slice(8)}-${ymd.slice(5, 7)}-${ymd.slice(2, 4)}`;

/** The 10th of last month, as YYYY-MM-DD. */
const lastMonth10 = () => {
	const [y, m] = todayInAppTz().split('-').map(Number);
	return new Date(Date.UTC(y, m - 2, 10)).toISOString().slice(0, 10);
};

const rule = (text: string) => page.locator('.rule', { hasText: text });

async function upload(pdf: Buffer) {
	await page.goto('/profile/galicia');
	await page
		.locator('input[name="statement"]')
		.setInputFiles({ name: 'resumen.pdf', mimeType: 'application/pdf', buffer: pdf });
	await page.getByRole('button', { name: 'Subir resumen' }).click();
	await expect(page).toHaveURL(/\/imports/);
}

/** Opens the review page of the pending item whose title contains `text`. */
async function openItem(text: string) {
	const href = await pathOf(
		page
			.locator('[data-slot="item-group"] [role="listitem"]')
			.filter({ hasText: text })
			.getByRole('link')
	);
	// hydration guard: the pickers on the review page need JavaScript.
	await page.goto(href, { waitUntil: 'networkidle' });
}

test.beforeAll(async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL });
	page = await context.newPage();
	await signUpVerified(page, context.request, {
		email: `e2e+rlink-${Date.now()}@gastar.local`,
		password: 'e2e-pass-1234',
		name: 'E2E Vinculo'
	});
	const headers = { origin: baseURL!, accept: 'text/html' };
	const create = async (path: string, form: Record<string, string>) => {
		const res = await page.request.post(path, { form, headers });
		expect(res.ok()).toBe(true);
		return res.url().split('/').pop()!;
	};
	const account = (name: string, currency: string) =>
		create('/accounts/new', { name, currency, initialBalance: '0', icon: 'bank', color: 'green' });
	const accountId = await account('Caja pesos', 'ARS');
	await account('Caja dólares', 'USD');
	const categoryId = await create('/categories/new', {
		name: 'Fijos',
		color: 'green',
		kind: 'outcome'
	});
	for (const [description, amount] of [
		['Café Inventado', '2000'],
		['Teléfono', '9000']
	])
		await create('/plan/recurring/new', {
			type: 'outcome',
			description,
			amount,
			dayOfMonth: '10',
			accountId,
			categoryId
		});
	await setCurrencyCookie(page, baseURL!, 'ARS');

	await page.goto('/profile/galicia');
	await page.waitForLoadState('networkidle'); // hydration guard: the account pickers save through JS
	await pick(page, 'Pesos', 'Caja pesos');
	await expect(page.getByRole('button', { name: /Pesos/ })).toContainText('Caja pesos');
	await pick(page, 'Dólares', 'Caja dólares');
	await expect(page.getByRole('button', { name: /Dólares/ })).toContainText('Caja dólares');
});

test.afterAll(async () => {
	await page.context().close();
});

test('an imported charge matching a rule by description is linked on approval', async ({
	baseURL
}) => {
	await upload(
		visaStatement({
			number: 'VI00000000005555551',
			cafe: { reference: 'CAFE INVENTADO', voucher: '000456', date: statementDate(todayInAppTz()) }
		})
	);
	await openItem('CAFE INVENTADO');
	await pick(page, 'Categoría', 'Fijos');
	await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(page).toHaveURL(/\/imports\?done=approved/);

	await page.goto('/plan');
	await expect(rule('Café Inventado')).toContainText('Pagado');
	expect(await findMovements(page, 'CAFE INVENTADO')).toHaveLength(1);

	// The rule follows the charge (2.500,50 rounds to whole pesos) and remembers what it was.
	await rule('Café Inventado').locator('a[data-slot="item"]').click();
	await expect(page.getByRole('button', { name: /^Monto:/ })).toContainText('2.501');
	await expect(page.getByText('Antes $2.000')).toBeVisible();

	// Deleting (or undoing) that charge puts the rule's amount back.
	for (const href of await findMovements(page, 'CAFE INVENTADO'))
		await postDelete(page, baseURL!, href);
	await page.goto('/plan');
	await rule('Café Inventado').locator('a[data-slot="item"]').click();
	await expect(page.getByRole('button', { name: /^Monto:/ })).toContainText('2.000');
	await expect(page.getByText('Antes $')).toHaveCount(0);
});

test("a remembered explicit link links next month's item with another description", async () => {
	await upload(
		visaStatement({
			number: 'VI00000000005555552',
			cafe: {
				reference: 'MOVISTAR DA 000000583683789',
				voucher: '000901',
				date: statementDate(lastMonth10())
			}
		})
	);
	await openItem('MOVISTAR DA');
	await pick(page, 'Categoría', 'Fijos');
	await pick(page, 'Es el pago fijo', 'Teléfono');
	await page.getByRole('checkbox', { name: 'Recordar para la próxima' }).check();
	await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(page).toHaveURL(/\/imports\?done=approved/);

	// Last month's charge does not pay this month.
	await page.goto('/plan');
	await expect(rule('Teléfono')).toContainText('Pendiente · día 10');

	// This month: same merchant, another code; the upload auto-approves it into the remembered rule.
	await upload(
		visaStatement({
			number: 'VI00000000005555553',
			cafe: {
				reference: 'MOVISTAR DA 000000600111222',
				voucher: '000902',
				date: statementDate(todayInAppTz())
			}
		})
	);
	await page.goto('/plan');
	await expect(rule('Teléfono')).toContainText('Pagado');
});
