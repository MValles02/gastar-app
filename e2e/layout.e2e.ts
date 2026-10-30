import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	expectNoHorizontalOverflow,
	firstDetailHref,
	login,
	MIN_TARGET_PX,
	pathOf,
	PHONE,
	SMALL_PHONE
} from './helpers';

const widths = [320, 390, 1280];
const routes = [
	'/',
	'/movements',
	'/accounts',
	'/categories',
	'/reports',
	'/plan',
	'/profile',
	'/notifications',
	'/accounts/new',
	'/movements/new',
	'/categories/new'
];

async function h1Top(page: Page, url: string) {
	await page.goto(url);
	const box = await page.getByRole('heading', { level: 1 }).boundingBox();
	expect(box).not.toBeNull();
	return box!.y;
}

const backLink = (page: Page) =>
	page.locator(
		'header.top-bar a[aria-label^="Volver"], header.top-bar a[aria-label="Cerrar"], header a[data-sheet-cancel]'
	);

for (const width of widths) {
	test(`login has no horizontal overflow at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/login', { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { level: 1, name: 'Gastar' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Olvidé mi contraseña' })).toBeVisible();
		await expectNoHorizontalOverflow(page);
	});

	test(`app routes render an h1 without overflow at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await login(page);
		for (const route of routes) {
			await page.goto(route);
			await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
			await expectNoHorizontalOverflow(page);
		}
	});
}

test('the bell to Avisos is at least 44px at 320px', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await login(page);
	const bell = page.locator('header.top-bar a[aria-label^="Avisos"]');
	const box = await bell.boundingBox();
	expect(box!.width).toBeGreaterThanOrEqual(MIN_TARGET_PX);
	expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
	await bell.click();
	await expect(page).toHaveURL(/\/notifications$/);
	// Sub-screens use the little header: no bell.
	await expect(bell).toHaveCount(0);
});

test('list rows keep a single-line title and never overflow at 320px', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await login(page);
	for (const route of ['/', '/movements', '/plan', '/notifications']) {
		await page.goto(route, { waitUntil: 'networkidle' });
		const titles = page.locator('[role="listitem"] [data-slot="item-title"]');
		const count = await titles.count();
		for (let i = 0; i < count; i++) {
			const { height, lineHeight } = await titles.nth(i).evaluate((el) => {
				const cs = getComputedStyle(el);
				return { height: el.getBoundingClientRect().height, lineHeight: parseFloat(cs.lineHeight) };
			});
			expect(height, `${route} row ${i}`).toBeLessThanOrEqual(lineHeight * 1.1);
		}
		// Line 2 (chips included) fits one text line: two wrapped lines would be at least 2x its line height.
		// Avisos (S25.1): the pill sits on its own line and the message may wrap to 2 lines below it.
		const maxLines = route === '/notifications' ? 3.4 : 1.7;
		const lines = page.locator('[role="listitem"] [data-slot="item-description"]');
		const lineCount = await lines.count();
		for (let i = 0; i < lineCount; i++) {
			const { height, lineHeight } = await lines.nth(i).evaluate((el) => {
				const cs = getComputedStyle(el);
				return { height: el.getBoundingClientRect().height, lineHeight: parseFloat(cs.lineHeight) };
			});
			expect(height, `${route} line 2 of row ${i}`).toBeLessThan(lineHeight * maxLines);
		}
		await expectNoHorizontalOverflow(page);
	}
});

test('movement row line 2 shows the account only and never overflows at 375px', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await login(page);
	await page.goto('/movements', { waitUntil: 'networkidle' });
	const lines = page.locator('[role="listitem"] [data-slot="item-description"]');
	const n = await lines.count();
	expect(n).toBeGreaterThan(0);
	for (let i = 0; i < n; i++) {
		const overflow = await lines.nth(i).evaluate((el) => el.scrollWidth > el.clientWidth);
		expect(overflow, `line 2 of row ${i}`).toBe(false);
	}

	await page.goto('/movements?q=Proyecto%20freelance', { waitUntil: 'networkidle' });
	const line = lines.first();
	await expect(line).toBeVisible();
	await expect(line).not.toContainText('Freelance');
});

test('detail pages have no horizontal overflow at 320px', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await login(page);
	for (const entity of ['accounts', 'movements', 'categories']) {
		const href = await firstDetailHref(page, entity);
		if (!href) continue;
		await page.goto(href);
		await expect(page.getByRole('heading', { level: 1 }), href).toBeVisible();
		await expectNoHorizontalOverflow(page);
	}
});

test('h1 top is identical across tab pages and across sub-pages at 390x844', async ({ page }) => {
	await page.setViewportSize(PHONE);
	await login(page);
	const account = await firstDetailHref(page, 'accounts');
	const groups = [
		['/', '/movements', '/reports', '/plan'],
		['/accounts', '/categories', '/profile', ...(account ? [account] : [])]
	];
	for (const urls of groups) {
		const tops: number[] = [];
		for (const url of urls) tops.push(await h1Top(page, url));
		expect(tops).toEqual(tops.map(() => tops[0]));
	}
});

/** Whether the focused element shows an outline or a box-shadow ring (non-transparent colour, spread > 0). */
const focusIsVisible = (page: Page) =>
	page.evaluate(() => {
		const s = getComputedStyle(document.activeElement!);
		if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) return true;
		// Computed layers look like: <colour> 0px 0px 0px 3px [inset]
		const layers =
			s.boxShadow.match(/(?:rgba?|oklab|oklch|color)\([^)]*\)\s+(?:-?[\d.]+px\s+){3}[\d.]+px/g) ??
			[];
		return layers.some((l) => {
			const spread = parseFloat(l.split(/\s+/).pop()!);
			return spread > 0 && !/(,\s*0|\/\s*0)\)/.test(l);
		});
	});

for (const route of ['/accounts/new', '/movements/new']) {
	test(`keyboard focus shows a visible ring on ${route}`, async ({ page }) => {
		await login(page);
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.keyboard.press('Tab');
		await expect.poll(() => focusIsVisible(page)).toBe(true);
	});
}

test('keyboard focus shows a visible ring on the login auth tabs', async ({ page }) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.keyboard.press('Tab');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeFocused();
	await expect.poll(() => focusIsVisible(page)).toBe(true);
});

test('movement form controls share one height of at least 44px at 390x844', async ({ page }) => {
	await page.setViewportSize(PHONE);
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	// Only the pickers: shadcn inputs are 2rem tall by design, the amount field is excluded.
	const heights = await page
		.locator('button.trigger')
		.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
	expect(heights.length).toBeGreaterThan(1);
	for (const h of heights) expect(h).toBeGreaterThanOrEqual(MIN_TARGET_PX);
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
			'/reports',
			'/plan',
			'/profile'
		]) {
			await page.goto(route);
			await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
			await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
			await expectNoHorizontalOverflow(page);
		}
	});
}

test('Inicio hero amount scales with text and never breaks inside a digit group at 320px', async ({
	page
}) => {
	await page.setViewportSize(SMALL_PHONE);
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	const hero = page.locator('.hero-amount');
	const size = () => hero.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
	const base = await size();
	await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
	expect(await size()).toBeGreaterThan(base);
	await expectNoHorizontalOverflow(page);
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
	await page.setViewportSize(PHONE);
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
		.locator('header.sheet-bar')
		.evaluate((el) => el.getBoundingClientRect().bottom);
	let checked = 0;
	for (let i = 0; i < 40; i++) {
		await page.keyboard.press('Shift+Tab');
		const top = await page.evaluate(() => {
			const el = document.activeElement!;
			return el.closest('main') && !el.closest('header.sheet-bar, .submit-layer')
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
	for (const tab of ['/', '/movements', '/plan', '/reports']) {
		await page.goto(tab);
		await expect(backLink(page), tab).toHaveCount(0);
	}
	const account = await firstDetailHref(page, 'accounts');
	const category = await firstDetailHref(page, 'categories');
	const movement = await firstDetailHref(page, 'movements');
	await page.goto('/plan');
	const ruleHref = await pathOf(
		page.locator('main a[href*="/plan/recurring/"]:not([href*="/new"])').first()
	);
	expect(account && category && movement && ruleHref).toBeTruthy();
	const rows: [string, string][] = [
		['/profile', '/'],
		['/notifications', '/'],
		['/accounts', '/profile'],
		['/categories', '/profile'],
		['/plan/recurring/new', '/plan'],
		[ruleHref, '/plan'],
		[`${ruleHref}/edit`, ruleHref],
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
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Nuevo movimiento' }).click();
	await expect(page).toHaveURL(/\/movements\/new$/);
	await expect.poll(() => pathOf(backLink(page))).toBe('/plan');
	expect(await pathOf(page.getByRole('link', { name: 'Cancelar' }))).toBe('/plan');
});

async function expectOutcomeTone(page: Page) {
	const value = page.locator('.hero-amount');
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

test('the tab bar is absent on the new-movement sheet and Guardar stays in view when scrolled at 390x844', async ({
	page
}) => {
	await page.setViewportSize(PHONE);
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: /Fecha/ }).focus();
	await page.mouse.wheel(0, 2000);
	const submit = page.getByRole('button', { name: 'Guardar', exact: true });
	await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
	await expect(submit).toBeInViewport();
	expect((await submit.boundingBox())!.y).toBeGreaterThanOrEqual(0);
});
