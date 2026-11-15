import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from './db/errors';
import { requireUser } from './guards';

type Guards = { notFound: () => never; requireId: (id: string) => void };
type IdEvent = { locals: App.Locals; params: { id: string } };
type Write = (userId: string, id: string) => Promise<unknown[]>;

/** Which lifecycle buttons a detail page shows. */
export const lifecycleState = ({
	referenced,
	archived
}: {
	referenced: boolean;
	archived: boolean;
}) => ({
	canDelete: !referenced,
	canArchive: !archived,
	canUnarchive: archived
});

/** Runs `write`; null when a foreign key blocks it (a reference added after the pre-check). */
export async function catchForeignKey<T>(write: () => Promise<T>): Promise<T | null> {
	try {
		return await write();
	} catch (e) {
		if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION) return null;
		throw e;
	}
}

/** `?/archive` and `?/unarchive`: 404 when the row is not the user's, else `{ done: true }`. */
export function archiveActions(
	setArchived: (userId: string, id: string, at: Date | null) => Promise<unknown[]>,
	{ notFound, requireId }: Guards
) {
	const action =
		(archive: boolean) =>
		async ({ locals, params }: IdEvent) => {
			requireId(params.id);
			const rows = await setArchived(
				requireUser(locals).id,
				params.id,
				archive ? new Date() : null
			);
			if (rows.length === 0) notFound();
			return { done: true };
		};
	return { archive: action(true), unarchive: action(false) };
}

/** `?/delete`: 409 with `message` while anything references the row, else deletes and redirects. */
export function deleteUnlessReferenced(
	{
		isReferenced,
		remove,
		message,
		redirectTo
	}: {
		isReferenced: (userId: string, id: string) => Promise<boolean>;
		remove: Write;
		message: string;
		redirectTo: string;
	},
	{ notFound, requireId }: Guards
) {
	return async ({ locals, params }: IdEvent) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		if (await isReferenced(userId, params.id)) return formFail(409, { formError: message });
		const rows = await catchForeignKey(() => remove(userId, params.id));
		if (!rows) return formFail(409, { formError: message });
		if (rows.length === 0) notFound();
		redirect(303, redirectTo);
	};
}
