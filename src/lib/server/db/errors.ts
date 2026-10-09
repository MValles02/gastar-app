/** Postgres error code from a thrown error (drizzle may wrap it in `cause`). */
export const pgErrorCode = (err: unknown): string | undefined => {
	const e = err as { code?: string; cause?: { code?: string } } | null | undefined;
	return e?.code ?? e?.cause?.code;
};

/** Postgres SQLSTATE codes the app reacts to. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
