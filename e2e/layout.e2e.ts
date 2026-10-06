import { expect, test, type Locator, type Page } from '@playwright/test';

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

// Path + query of a link as the browser resolves it (SSR hrefs are relative).
const pathOf = (link: Locator) => link.evaluate((a: HTMLAnchorElement) => a.pathname + a.search);

// First detail link of an entity list, or null when the seed has no rows.
async function firstDetailHref(page: Page, entity: string, query = '') {
	await page.goto(`/${entity}${query}`);
	const link = page.locator(`main a[href*="${entity}/"]:not([href$="/new"])`).first();
	return (await link.count()) ? pathOf(link) : null;
}

const backLink = (page: Page) => page.locator('header.top-bar a[aria-label^="Volver"]');

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
		'/',
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

for (const route of ['/accounts/new', '/movements/new']) {
	test(`keyboard focus shows an outline on ${route}`, async ({ page }) => {
		await login(page);
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.keyboard.press('Tab');
		const outline = await page.evaluate(() => {
			const s = getComputedStyle(document.activeElement!);
			return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
		});
		expect(outline.style).not.toBe('none');
		expect(outline.width).toBeGreaterThan(0);
	});
}

test('movement form controls share one height of at least 44px at 390x844', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	// The amount field is intentionally larger and excluded.
	const heights = await page
		.locator('input[name="description"], input[name="occurredAt"], select, button.trigger')
		.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
	expect(heights.length).toBeGreaterThan(1);
	for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
	expect(new Set(heights.map((h) => Math.round(h))).size).toBe(1);
});

for (const width of [320, 360]) {
	test(`list pages have no horizontal overflow at 200% text, ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 640 });
		await login(page);
		for (const route of [
			'/',
			'/accounts',
			'/movements',
			'/movements/new',
			'/categories',
			'/profile'
		]) {
			await page.goto(route);
			await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
			await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
			await expectNoOverflow(page);
		}
	});
}

test('Inicio hero amount scales with text and never breaks inside a digit group at 320px', async ({
	page
}) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	const hero = page.locator('.hero-amount');
	const size = () => hero.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
	const base = await size();
	await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
	expect(await size()).toBeGreaterThan(base);
	await expectNoOverflow(page);
	// Split the number's characters into rendered lines: every line but the last must end after a ".".
	const lines = await page.locator('.hero-amount .num').evaluate((el) => {
		const out: string[] = [];
		let top: number | null = null;
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
			for (let i = 0; i < n.length; i++) {
				const r = document.createRange();
				r.setStart(n, i);
				r.setEnd(n, i + 1);
				const t = r.getBoundingClientRect().top;
				if (top === null || Math.abs(t - top) > 2) out.push('');
				top = t;
				out[out.length - 1] += n.data[i];
			}
		}
		return out;
	});
	for (const line of lines.slice(0, -1)) expect(line).toMatch(/\.$/);
	expect(lines.join('')).toMatch(/^\d{1,3}(\.\d{3})*$/);
});

test('category detail navigates months', async ({ page }) => {
	await login(page);
	const href = await firstDetailHref(page, 'categories');
	expect(href).not.toBeNull();
	await page.goto('/categories');
	await page.locator(`main a[href="${href}"]`).click();
	await expect(page).toHaveURL(/\/categories\/[^/?]+$/);
	const label = page.locator('.month-label');
	const before = await label.textContent();
	await expect(page.locator('a[aria-label="Mes siguiente"]')).toHaveCount(0);
	await expect(page.getByLabel('Mes siguiente')).toHaveAttribute('aria-disabled', 'true');
	await page.getByRole('link', { name: 'Mes anterior' }).click();
	await expect(page).toHaveURL(/\?month=\d{4}-\d{2}$/);
	await expect(label).not.toHaveText(before!);
});

test('top bar is sticky and shows a hairline once scrolled at 390x844', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await login(page);
	await page.goto('/movements');
	const bar = page.locator('header.top-bar');
	const edge = () => bar.evaluate((el) => getComputedStyle(el).borderBottomColor);
	expect(await edge()).toBe('rgba(0, 0, 0, 0)');
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect.poll(edge).not.toBe('rgba(0, 0, 0, 0)');
	const box = await page.getByRole('heading', { level: 1 }).boundingBox();
	expect(box!.y).toBeGreaterThanOrEqual(0);
	expect(box!.y).toBeLessThan(100);
});

test('top bar is not pinned at 200% zoom (195x422)', async ({ page }) => {
	await page.setViewportSize({ width: 195, height: 422 });
	await login(page);
	await page.goto('/movements');
	const bar = page.locator('header.top-bar');
	await page.evaluate(() => window.scrollTo(0, 600));
	expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe('static');
	await expect(page.getByRole('heading', { level: 1 })).not.toBeInViewport();
});

test('focus is never hidden under the sticky bar', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 420 });
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	const barBottom = await page
		.locator('header.top-bar')
		.evaluate((el) => el.getBoundingClientRect().bottom);
	let checked = 0;
	for (let i = 0; i < 40; i++) {
		await page.keyboard.press('Shift+Tab');
		const top = await page.evaluate(() => {
			const el = document.activeElement!;
			return el.closest('main') && !el.closest('header.top-bar')
				? el.getBoundingClientRect().top
				: null;
		});
		if (top === null) continue;
		checked++;
		expect(top).toBeGreaterThanOrEqual(barBottom - 0.5);
	}
	expect(checked).toBeGreaterThan(3);
});

test('back links go up to a fixed parent and tabs have none', async ({ page }) => {
	await login(page);
	for (const tab of ['/', '/accounts', '/movements', '/categories']) {
		await page.goto(tab);
		await expect(backLink(page), tab).toHaveCount(0);
	}
	const account = await firstDetailHref(page, 'accounts');
	const category = await firstDetailHref(page, 'categories');
	const movement = await firstDetailHref(page, 'movements');
	expect(account && category && movement).toBeTruthy();
	const rows: [string, string][] = [
		['/profile', '/'],
		['/accounts/new', '/accounts'],
		['/categories/new', '/categories'],
		['/movements/new', '/'],
		[account!, '/accounts'],
		[`${account}/edit`, account!],
		[category!, '/categories'],
		[`${category}/edit`, category!],
		[movement!, '/movements'],
		[`${movement}/edit`, movement!]
	];
	for (const [url, back] of rows) {
		await page.goto(url);
		expect(await pathOf(backLink(page)), url).toBe(back);
	}
});

test('new movement returns to the screen it was opened from', async ({ page }) => {
	await login(page);
	await page.goto('/categories', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Nuevo movimiento' }).click();
	await expect(page).toHaveURL(/\/movements\/new$/);
	await expect.poll(() => pathOf(backLink(page))).toBe('/categories');
	expect(await pathOf(page.getByRole('link', { name: 'Cancelar' }))).toBe('/categories');
});

async function expectOutcomeTone(page: Page) {
	const value = page.locator('.value');
	await expect(value).toHaveText(/^-/);
	const color = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color);
	expect(await color(value)).toBe(await color(page.getByRole('heading', { level: 1 })));
}

test('outcomes are not coloured red on detail pages', async ({ page }) => {
	await login(page);
	const movement = await firstDetailHref(page, 'movements', '?type=outcome');
	expect(movement).not.toBeNull();
	await page.goto(movement!);
	await expectOutcomeTone(page);
	await page.goto('/categories');
	await page.getByRole('link', { name: 'Supermercado' }).click();
	await expectOutcomeTone(page);
});

test('a keyboard-focused submit button stays clear of the bottom nav at 390x844', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="occurredAt"]').focus();
	const submit = page.getByRole('button', { name: 'Guardar movimiento' });
	// The date input has several tab stops (day, month, year, picker).
	for (let i = 0; i < 6 && !(await submit.evaluate((el) => el === document.activeElement)); i++)
		await page.keyboard.press('Tab');
	await expect(submit).toBeFocused();
	const nav = await page.getByRole('navigation', { name: 'Navegación principal' }).boundingBox();
	await expect
		.poll(async () => (await submit.boundingBox())!.y + (await submit.boundingBox())!.height)
		.toBeLessThanOrEqual(nav!.y);
});
