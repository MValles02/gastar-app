import { expect, test, type Page } from '@playwright/test';
import { visaStatement } from './galicia-pdf';
import {
	createAccount,
	createVia,
	findMovements,
	monthDay,
	openItem,
	pick,
	postDelete,
	rule,
	setCurrencyCookie,
	signUpVerified,
	todayInAppTz,
	upload,
	gotoHydrated
} from './helpers';

// Fixed payments link to imported charges: by description (amount follows the charge) and by an explicit,
// remembered choice. One fresh user; the rules and the Galicia connection are created in beforeAll.
test.describe.configure({ mode: 'serial' });

let page: Page;

/** DD-MM-YY of a YYYY-MM-DD day, the way the statement prints it. */
const statementDate = (ymd: string) => `${ymd.slice(8)}-${ymd.slice(5, 7)}-${ymd.slice(2, 4)}`;

/** Uploads a statement and waits for the import to land on /imports. */
async function uploadStatement(pdf: Buffer) {
	await upload(page, pdf);
	await expect(page).toHaveURL(/\/imports/);
}

test.beforeAll(async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL });
	page = await context.newPage();
	await signUpVerified(page, context.request, {
		email: `e2e+rlink-${Date.now()}@gastar.local`,
		password: 'e2e-pass-1234',
		name: 'E2E Vinculo'
	});
	const create = (path: string, form: Record<string, string>) =>
		createVia(page, baseURL!, path, form);
	const account = (name: string, currency: 'ARS' | 'USD') =>
		createAccount(page, baseURL!, name, currency);
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

	await gotoHydrated(page, '/profile/galicia');
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
	await uploadStatement(
		visaStatement({
			number: 'VI00000000005555551',
			cafe: { reference: 'CAFE INVENTADO', voucher: '000456', date: statementDate(todayInAppTz()) }
		})
	);
	await openItem(page, 'CAFE INVENTADO');
	await pick(page, 'Categoría', 'Fijos');
	await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(page.getByText('Movimiento aprobado.')).toBeVisible();

	await page.goto('/plan');
	await expect(rule(page, 'Café Inventado')).toContainText('Pagado');
	expect(await findMovements(page, 'CAFE INVENTADO')).toHaveLength(1);

	// The rule follows the charge (2.500,50 rounds to whole pesos) and remembers what it was.
	await page.goto('/plan');
	await rule(page, 'Café Inventado').locator('a[data-slot="item"]').click();
	await expect(page.getByRole('button', { name: /^Monto:/ })).toContainText('2.501');
	await expect(page.getByText('Antes $2.000')).toBeVisible();

	// Deleting (or undoing) that charge puts the rule's amount back.
	for (const href of await findMovements(page, 'CAFE INVENTADO'))
		await postDelete(page, baseURL!, href);
	await page.goto('/plan');
	await rule(page, 'Café Inventado').locator('a[data-slot="item"]').click();
	await expect(page.getByRole('button', { name: /^Monto:/ })).toContainText('2.000');
	await expect(page.getByText('Antes $')).toHaveCount(0);
});

test("a remembered explicit link links next month's item with another description", async () => {
	await uploadStatement(
		visaStatement({
			number: 'VI00000000005555552',
			cafe: {
				reference: 'MOVISTAR DA 000000583683789',
				voucher: '000901',
				date: statementDate(monthDay(2, 10))
			}
		})
	);
	await openItem(page, 'MOVISTAR DA');
	await pick(page, 'Categoría', 'Fijos');
	await pick(page, 'Es el pago fijo', 'Teléfono');
	await page.getByRole('checkbox', { name: 'Recordar para la próxima' }).check();
	await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(page.getByText('Movimiento aprobado.')).toBeVisible();

	// Last month's charge does not pay this month.
	await page.goto('/plan');
	await expect(rule(page, 'Teléfono')).toContainText('Pendiente · día 10');

	// This month: same merchant, another code; the upload auto-approves it into the remembered rule.
	await uploadStatement(
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
	await expect(rule(page, 'Teléfono')).toContainText('Pagado');
});
