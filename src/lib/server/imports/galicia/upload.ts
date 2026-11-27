import { es } from '#lib/copy/es.ts';
import { MAX_STATEMENT_BYTES } from '#lib/server/constants.ts';

/** An error message when the posted `statement` value is not an acceptable file, else null. */
export function checkStatementFile(file: unknown): string | null {
	if (!(file instanceof File) || file.size === 0) return es.profile.galicia.noFile;
	if (file.size > MAX_STATEMENT_BYTES) {
		return es.profile.galicia.tooBig(MAX_STATEMENT_BYTES / 1024 / 1024);
	}
	return null;
}

/** The file's bytes, or null when they are not a PDF (`%PDF-` magic). */
export async function readStatementPdf(file: File): Promise<Uint8Array | null> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	return new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-' ? bytes : null;
}
