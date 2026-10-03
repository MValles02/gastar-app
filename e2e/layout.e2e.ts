import { expect, test, type Page } from '@playwright/test';

// Same defaults as scripts/seed.js (local demo user, not a secret).
const email = process.env.SEED_EMAIL || 'demo@gastar.local';
const password = process.env.SEED_PASSWORD || 'demo1234';

const widths = [320, 390, 1280];
const routes = [
	'/',
	'/movements',
	'/accounts',
	'/categories',
	'/profile',
	'/accounts/new',
	'/movements/new',
	'/categories/new'
];

async function login(page: Page) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña').fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
	await expect(page).toHaveURL(/\/$/);
}

async function expectNoOverflow(page: Page) {
	const { scrollWidth, clientWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function h1Top(page: Page, url: string) {
	await page.goto(url);
	const box = await page.getByRole('heading', { level: 1 }).boundingBox();
	expect(box).not.toBeNull();
	return box!.y;
}

// First detail link of an entity list, or null when the seed has no rows.
async function firstDetailHref(page: Page, entity: string) {
	await page.goto(`/${entity}`);
	const link = page.locator(`main a[href^="/${entity}/"]:not([href="/${entity}/new"])`).first();
	return (await link.count()) ? link.getAttribute('href') : null;
}

for (const width of widths) {
	test(`login has no horizontal overflow at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/login', { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { level: 1, name: 'Gastar' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
		await expect(page.getByText('¿Olvidaste tu contraseña?')).toBeVisible();
		await expectNoOverflow(page);
	});

	test(`app routes render an h1 without overflow at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await login(page);
		for (const route of routes) {
			await page.goto(route);
			await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
			await expectNoOverflow(page);
		}
	});
}

test('detail pages have no horizontal overflow at 320px', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await login(page);
	for (const entity of ['accounts', 'movements', 'categories']) {
		const href = await firstDetailHref(page, entity);
		if (!href) continue;
		await page.goto(href);
		await expect(page.getByRole('heading', { level: 1 }), href).toBeVisible();
		await expectNoOverflow(page);
	}
});

test('h1 top is identical across pages at 390x844', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await login(page);
	const account = await firstDetailHref(page, 'accounts');
	const urls = [
		'/movements',
		'/accounts',
		'/categories',
		'/profile',
		...(account ? [account] : [])
	];
	const tops: number[] = [];
	for (const url of urls) tops.push(await h1Top(page, url));
	expect(tops).toEqual(tops.map(() => tops[0]));
});

test('keyboard focus shows an outline on /accounts/new', async ({ page }) => {
	await login(page);
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.keyboard.press('Tab');
	const outline = await page.evaluate(() => {
		const s = getComputedStyle(document.activeElement!);
		return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
	});
	expect(outline.style).not.toBe('none');
	expect(outline.width).toBeGreaterThan(0);
});
