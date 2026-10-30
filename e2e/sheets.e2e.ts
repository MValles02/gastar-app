// Form screens are bottom sheets: Cancelar top-left, Guardar top-right (a real submit, with or without
// JS), and dragging the grabber down dismisses like Cancelar (pops, no new history entry). How the drag
// feels on a real iPhone (touch, momentum, the rise and fall) needs a manual check.
import { expect, test, type Page } from '@playwright/test';
import { login, PHONE } from './helpers';

test.use({ viewport: PHONE });

const historyLength = (page: Page) => page.evaluate(() => history.length);
const sheetTransform = (page: Page) =>
	page.locator('main.sheet').evaluate((el) => getComputedStyle(el).transform);

/** Opens Cambiar nombre from Perfil, so the sheet has a screen under it in history. */
async function openNameSheet(page: Page) {
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Cambiar nombre' }).click();
	await expect(page).toHaveURL(/\/profile\/name$/);
	await expect(page.locator('main.sheet')).toBeVisible();
	await page.waitForLoadState('networkidle');
	await settled(page);
}

/** Waits out the page transition: while one runs, the browser hit-tests the whole page as <html>. */
const settled = (page: Page) =>
	page.waitForFunction(
		() => !(document as Document & { activeViewTransition?: unknown }).activeViewTransition,
		null,
		{ polling: 'raf' }
	);

/**
 * Drags the grabber down by `dy` px in `steps` moves, pausing `holdMs` before letting go. Returns the
 * sheet's transform just before the release.
 */
async function dragGrabber(page: Page, dy: number, { steps = 10, holdMs = 0 } = {}) {
	const box = (await page.locator('[data-sheet-grabber]').boundingBox())!;
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + dy, { steps });
	if (holdMs) await page.waitForTimeout(holdMs);
	const held = await sheetTransform(page);
	await page.mouse.up();
	return held;
}

test('the sheet header: Cancelar top-left, title centered, Guardar top-right, no tab bar', async ({
	page
}) => {
	await openNameSheet(page);
	const header = page.locator('header.sheet-bar');
	const cancel = (await header.getByRole('link', { name: 'Cancelar' }).boundingBox())!;
	const title = (await header.getByRole('heading', { level: 1 }).boundingBox())!;
	const save = header.getByRole('button', { name: 'Guardar', exact: true });
	const submit = (await save.boundingBox())!;
	expect(cancel.x).toBeLessThan(PHONE.width / 4);
	expect(submit.x + submit.width).toBeGreaterThan((PHONE.width * 3) / 4);
	expect(Math.abs(title.x + title.width / 2 - PHONE.width / 2)).toBeLessThan(4);
	await expect(save).toHaveAttribute('type', 'submit');
	await expect(save).toHaveAttribute('form', 'sheet-form');
	await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
});

test('dragging the grabber down past the threshold returns to the origin without a new entry', async ({
	page
}) => {
	await openNameSheet(page);
	const length = await historyLength(page);
	await dragGrabber(page, 260);
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByRole('link', { name: 'Cambiar nombre' })).toBeVisible();
	expect(await historyLength(page)).toBe(length);
	// The sheet was popped: it is forward history now, not behind Perfil.
	await page.goBack();
	await expect(page).not.toHaveURL(/\/profile/);
});

test('a short drag springs back and the sheet stays', async ({ page }) => {
	await openNameSheet(page);
	const length = await historyLength(page);
	// The sheet follows the pointer (translateY 50px), then returns when let go short of the threshold.
	expect(await dragGrabber(page, 50, { holdMs: 250 })).toBe('matrix(1, 0, 0, 1, 0, 50)');
	await expect.poll(() => sheetTransform(page)).toBe('none');
	await page.waitForTimeout(300);
	await expect(page).toHaveURL(/\/profile\/name$/);
	expect(await historyLength(page)).toBe(length);
});

test('a drag that starts on Cancelar or Guardar does not move the sheet', async ({ page }) => {
	await openNameSheet(page);
	const box = (await page.getByRole('link', { name: 'Cancelar' }).boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2, box.y + 200, { steps: 8 });
	expect(await sheetTransform(page)).toBe('none');
	await page.mouse.up();
	await expect(page).toHaveURL(/\/profile\/name$/);
});

test('opening a sheet rises and dismissing it lowers (view transitions)', async ({ page }) => {
	await page.addInitScript(() => {
		const w = window as Window & { __transitions?: (string | undefined)[] };
		w.__transitions = [];
		const start = document.startViewTransition?.bind(document);
		if (!start) return;
		document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
			w.__transitions!.push(document.documentElement.dataset.navTransition);
			return start(arg);
		}) as typeof start;
	});
	const transitions = () =>
		page.evaluate(() => (window as Window & { __transitions?: string[] }).__transitions);
	await openNameSheet(page);
	await expect.poll(transitions).toContain('sheet-up');
	await dragGrabber(page, 260);
	await expect(page).toHaveURL(/\/profile$/);
	await expect.poll(transitions).toEqual(expect.arrayContaining(['sheet-up', 'sheet-down']));
});

test('top-right Guardar submits the form with JavaScript', async ({ page }) => {
	await openNameSheet(page);
	const name = page.getByLabel('Nombre');
	const original = await name.inputValue();
	await name.fill('   ');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Falta el nombre.')).toBeVisible();
	await expect(page).toHaveURL(/\/profile\/name$/);

	await name.fill(original);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/profile$/);
});

test.describe('without JavaScript', () => {
	async function noJsPage(page: Page) {
		await login(page);
		const state = await page.context().storageState();
		const browser = page.context().browser()!;
		const context = await browser.newContext({
			javaScriptEnabled: false,
			viewport: PHONE,
			storageState: state
		});
		return context.newPage();
	}

	test('top-right Guardar submits the form', async ({ page }) => {
		const nojs = await noJsPage(page);
		try {
			await nojs.goto('/profile/name');
			const name = nojs.getByLabel('Nombre');
			const original = await name.inputValue();
			await name.fill('   ');
			await nojs.getByRole('button', { name: 'Guardar', exact: true }).click();
			await expect(nojs.getByText('Falta el nombre.')).toBeVisible();

			await nojs.getByLabel('Nombre').fill(original);
			await nojs.getByRole('button', { name: 'Guardar', exact: true }).click();
			await expect(nojs).toHaveURL(/\/profile$/);
		} finally {
			await nojs.context().close();
		}
	});

	test('Cancelar is a working link', async ({ page }) => {
		const nojs = await noJsPage(page);
		try {
			await nojs.goto('/accounts/new');
			await nojs.getByRole('link', { name: 'Cancelar' }).click();
			await expect(nojs).toHaveURL(/\/accounts$/);
		} finally {
			await nojs.context().close();
		}
	});
});
