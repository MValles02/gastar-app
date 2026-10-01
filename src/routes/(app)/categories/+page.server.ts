import type { PageServerLoad } from './$types';
import { hasAnyCategory, listCategories } from '$lib/server/categories-queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 40);
	const archived = url.searchParams.get('archived') === '1';

	const [any, categories] = await Promise.all([
		hasAnyCategory(userId),
		listCategories(userId, { q, archived })
	]);

	return { filters: { q, archived }, hasAnyCategory: any.length > 0, categories };
};
