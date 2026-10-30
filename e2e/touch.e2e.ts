// Touch polish: 44px hit areas on the small controls, no grey tap flash, a pressed state without sticky
// hover on touch screens, and a navigation progress bar that only shows on slow loads. (How a press
// feels on a real iPhone, and iOS's own :active rules, need a device: Chromium only emulates them.)
import { expect, test, type Locator, type Page } from '@playwright/test';
import { login, MIN_TARGET_PX, PHONE } from './helpers';

test.use({ viewport: PHONE });

/**
 * Every point of a 44px square centred on the control hits it (an invisible overhang or pseudo-element
 * counts) or the label it sits in. Returns the offsets that miss.
 */
async function hitAreaMisses(control: Locator) {
	await control.scrollIntoViewIfNeeded();
	return control.evaluate((el, size) => {
		const r = el.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const h = size / 2 - 0.5;
		const owner = el.closest('label') ?? el;
		const offsets = [-h, 0, h].flatMap((dx) => [-h, 0, h].map((dy) => [dx, dy]));
		return offsets.filter(([dx, dy]) => {
			const hit = document.elementFromPoint(cx + dx, cy + dy);
			return !hit || !owner.contains(hit);
		});
	}, MIN_TARGET_PX);
}

const expectHitArea = async (control: Locator) => expect(await hitAreaMisses(control)).toEqual([]);

test('the password eye button has a 44px hit area', async ({ page }) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await expectHitArea(page.getByRole('button', { name: 'Mostrar contraseña' }));
});

test('there is no grey tap highlight', async ({ page }) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	const color = await page
		.getByRole('button', { name: 'Ingresar' })
		.evaluate((el) => getComputedStyle(el).getPropertyValue('-webkit-tap-highlight-color'));
	expect(color).toBe('rgba(0, 0, 0, 0)');
});

test.describe('signed in', () => {
	test.beforeEach(async ({ page }) => login(page));

	test('currency tabs and month arrows have 44px hit areas', async ({ page }) => {
		await page.goto('/reports', { waitUntil: 'networkidle' });
		for (const currency of ['ARS', 'USD'])
			await expectHitArea(page.getByRole('radio', { name: currency, exact: true }));
		await expectHitArea(page.getByRole('link', { name: 'Mes anterior' }));
		await page.getByRole('link', { name: 'Mes anterior' }).click();
		await expect(page).toHaveURL(/\?month=/);
		await expectHitArea(page.getByRole('link', { name: 'Mes siguiente' }));
	});

	test('movement type toggle and the repeat switch have 44px hit areas', async ({ page }) => {
		await page.goto('/movements/new', { waitUntil: 'networkidle' });
		for (const type of ['Ingreso', 'Gasto', 'Transf.'])
			await expectHitArea(page.getByRole('radio', { name: type, exact: true }));
		await expectHitArea(page.getByRole('switch', { name: 'Repetir cada mes' }));
	});

	test('the savings % / $ toggle has 44px hit areas', async ({ page }) => {
		await page.goto('/plan/savings', { waitUntil: 'networkidle' });
		await page.getByRole('radio', { name: 'Otro', exact: true }).click();
		for (const unit of ['%', '$'])
			await expectHitArea(page.getByRole('radio', { name: unit, exact: true }));
	});

	test('a pressed row fills muted on touch, with no sticky hover', async ({ browser, baseURL }) => {
		const context = await browser.newContext({
			baseURL,
			viewport: PHONE,
			hasTouch: true,
			isMobile: true
		});
		const page = await context.newPage();
		await login(page);
		await page.goto('/accounts', { waitUntil: 'networkidle' });
		expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false);

		const row = page.locator('main a[data-slot="item"]').first();
		const fill = () => row.evaluate((el) => getComputedStyle(el).backgroundColor);
		const muted = await page.evaluate(() => {
			const probe = document.createElement('div');
			probe.style.background = 'var(--muted)';
			document.body.append(probe);
			const color = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return color;
		});
		const rest = await fill();
		expect(rest).not.toBe(muted);

		const box = (await row.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		expect(await fill()).toBe(rest);
		await page.mouse.down();
		await expect.poll(fill).toBe(muted);
		await page.mouse.move(0, 0);
		await page.mouse.up();
		await context.close();
	});
});

/** Records whether the progress bar ever appears from now on. */
const watchProgress = (page: Page) =>
	page.evaluate(() => {
		const w = window as Window & { __sawProgress?: boolean };
		w.__sawProgress = false;
		new MutationObserver(() => {
			if (document.querySelector('.nav-progress')) w.__sawProgress = true;
		}).observe(document.body, { childList: true, subtree: true });
	});

const sawProgress = (page: Page) =>
	page.evaluate(() => (window as Window & { __sawProgress?: boolean }).__sawProgress);

/** Holds /movements' data for `ms` before letting it through. */
const delayMovements = (page: Page, ms: number) =>
	page.route('**/movements/__data.json*', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, ms));
		await route.continue();
	});

/** Running time-based animations (the top bar's scroll-driven hairline follows the scroll, not time). */
const timedAnimations = (page: Page) =>
	page.evaluate(
		() => document.getAnimations().filter((a) => a.timeline === document.timeline).length
	);

test.describe('navigation progress bar', () => {
	test.beforeEach(async ({ page }) => login(page));

	const bar = (page: Page) => page.getByRole('progressbar', { name: 'Cargando' });
	const openMovements = (page: Page) =>
		page.getByRole('link', { name: 'Movimientos', exact: true }).click();

	test('does not appear on a fast navigation', async ({ page }) => {
		await watchProgress(page);
		await openMovements(page);
		await expect(page).toHaveURL(/\/movements$/);
		await page.waitForLoadState('networkidle');
		expect(await sawProgress(page)).toBe(false);
	});

	test('appears when the data takes longer than 150ms, then goes away', async ({ page }) => {
		await delayMovements(page, 1200);
		await openMovements(page);
		await expect(bar(page)).toBeVisible();
		await expect(page).toHaveURL(/\/movements$/);
		await expect(bar(page)).toHaveCount(0);
	});

	test('with reduced motion nothing animates while it shows', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await delayMovements(page, 1200);
		await openMovements(page);
		await expect(bar(page)).toBeVisible();
		expect(await timedAnimations(page)).toBe(0);
		await expect(page).toHaveURL(/\/movements$/);
		await expect(bar(page)).toHaveCount(0);
		expect(await timedAnimations(page)).toBe(0);
	});
});
