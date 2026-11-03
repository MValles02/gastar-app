import { expect, test, type Page } from '@playwright/test';
import { firstDetailHref, login, PHONE, setCurrencyCookie } from './helpers';

const bell = (page: Page) => page.locator('header.top-bar a[aria-label^="Avisos"]');
const avatar = (page: Page) => page.locator('header.top-bar a[aria-label="Perfil"]');
const fontSize = (page: Page, selector: string) =>
	page
		.locator(selector)
		.first()
		.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
const color = (page: Page, selector: string) =>
	page
		.locator(selector)
		.first()
		.evaluate((el) => getComputedStyle(el).color);

test.beforeEach(async ({ page }) => {
	await page.setViewportSize(PHONE);
	await login(page);
});

test('the full header is only on the four tab pages', async ({ page }) => {
	const account = await firstDetailHref(page, 'accounts');
	const movement = await firstDetailHref(page, 'movements');
	for (const url of ['/', '/movements', '/plan', '/reports']) {
		await page.goto(url);
		await expect(bell(page), url).toHaveCount(1);
		await expect(avatar(page), url).toHaveCount(1);
	}
	for (const url of ['/accounts', account, movement, '/notifications', '/profile']) {
		if (!url) continue;
		await page.goto(url);
		await expect(page.getByRole('heading', { level: 1 }), url).toBeVisible();
		await expect(bell(page), url).toHaveCount(0);
		await expect(avatar(page), url).toHaveCount(0);
	}
});

test('on Inicio the bell and the avatar have the same size', async ({ page }) => {
	await page.goto('/');
	const b = await bell(page).boundingBox();
	const a = await avatar(page).boundingBox();
	expect(a!.width).toBeCloseTo(b!.width, 0);
	expect(a!.height).toBeCloseTo(b!.height, 0);
});

test('the Inicio header does not change on scroll', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const eyebrow = page.locator('header.top-bar .eyebrow');
	const before = await fontSize(page, 'header.top-bar h1');
	await expect(eyebrow).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 500));
	await expect(eyebrow).toBeVisible();
	expect(await fontSize(page, 'header.top-bar h1')).toBe(before);
});

test('the Inicio hero is the same size in ARS and USD and does not overflow', async ({
	page,
	baseURL
}) => {
	const sizes: number[] = [];
	for (const currency of ['ARS', 'USD']) {
		await setCurrencyCookie(page, baseURL!, currency);
		await page.goto('/', { waitUntil: 'networkidle' });
		const hero = page.locator('.hero-amount').first();
		await expect(hero).toContainText(currency === 'USD' ? 'US$' : '$');
		sizes.push(await fontSize(page, '.hero-amount .fit'));
		const box = await hero.boundingBox();
		const text = await hero.locator('.money').boundingBox();
		expect(text!.width).toBeLessThanOrEqual(box!.width + 0.5);
	}
	expect(sizes[1]).toBe(sizes[0]);
});

test('account balances use the neutral text colour, not the income green', async ({
	page,
	baseURL
}) => {
	await setCurrencyCookie(page, baseURL!, 'ARS');
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.locator('main .money.income')).toHaveCount(0);
	const balance = await color(page, 'main [role="listitem"] .money.neutral');
	const text = await page.evaluate(() => {
		const probe = document.createElement('span');
		probe.style.color = 'var(--text)';
		document.body.append(probe);
		const c = getComputedStyle(probe).color;
		probe.remove();
		return c;
	});
	expect(balance).toBe(text);
});

test('the delete confirm shows Cancelar and the action side by side, and Cancelar keeps the movement', async ({
	page
}) => {
	const href = await firstDetailHref(page, 'movements');
	test.skip(!href, 'no movements in the seed');
	await page.goto(href!, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Eliminar' }).click();
	const dialog = page.getByRole('alertdialog');
	const cancel = await dialog.getByRole('button', { name: 'Cancelar' }).boundingBox();
	const confirm = await dialog.getByRole('button', { name: 'Eliminar' }).boundingBox();
	expect(confirm!.y).toBeCloseTo(cancel!.y, 0);
	expect(cancel!.x).toBeLessThan(confirm!.x);
	expect(Math.abs(cancel!.width - confirm!.width)).toBeLessThan(4);
	await dialog.getByRole('button', { name: 'Cancelar' }).click();
	await expect(dialog).toBeHidden();
	await page.goto(href!);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('text inputs stay 16px while body text is 15px (no iOS zoom)', async ({ page }) => {
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	expect(await fontSize(page, 'input[name="name"]')).toBe(16);
	expect(await fontSize(page, 'body')).toBe(15);
});
