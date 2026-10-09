import { error } from '@sveltejs/kit';
import { isUuid } from './db/util';

/** A detail route's 404: `notFound()` throws it; `requireId(id)` throws it for a malformed id, before any query. */
export function notFoundHelpers(message: string) {
	const notFound = (): never => error(404, message);
	const requireId = (id: string) => {
		if (!isUuid(id)) notFound();
	};
	return { notFound, requireId };
}
