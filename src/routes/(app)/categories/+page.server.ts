import type { PageServerLoad } from './$types';
import { NAME_MAX_LENGTH } from '$lib/limits';
import { hasAnyCategory, listCategories } from '$lib/server/categories-queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, NAME_MAX_LENGTH);
	const archived = url.searchParams.get('archived') === '1';

	const [anyCategory, categories] = await Promise.all([
		hasAnyCategory(userId),
		listCategories(userId, { q, archived })
	]);

	return { filters: { q, archived }, hasAnyCategory: anyCategory.length > 0, categories };
};
