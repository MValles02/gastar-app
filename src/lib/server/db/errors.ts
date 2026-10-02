/** Postgres error code from a thrown error (drizzle may wrap it in `cause`). */
export const pgErrorCode = (err: unknown): string | undefined => {
	const e = err as { code?: string; cause?: { code?: string } } | null | undefined;
	return e?.code ?? e?.cause?.code;
};
