import { expect, test } from '@playwright/test';
import { firstDetailHref, login } from './helpers';

test('category detail shows the month from ?month= and has no month navigation', async ({
	page
}) => {
	await login(page);
	const href = await firstDetailHref(page, 'categories');
	expect(href).not.toBeNull();
	await page.goto(`${href}?month=2024-02`);
	await expect(page.getByText('Febrero de 2024')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Mes anterior' })).toHaveCount(0);
});
