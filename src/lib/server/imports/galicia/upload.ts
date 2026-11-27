import type { Currency } from '#lib/money.ts';
import { MAX_STATEMENT_BYTES } from '#lib/server/constants.ts';

/** Shown when the statement has items in a currency whose Banco Galicia account is not chosen. */
export const MISSING_ACCOUNT_ERRORS: Record<Currency, string> = {
	ARS: 'Elegí la cuenta en pesos antes de subir el resumen.',
	USD: 'El resumen tiene consumos en dólares: elegí una cuenta en dólares.'
};

/** An error message when the posted `statement` value is not an acceptable file, else null. */
export function checkStatementFile(file: unknown): string | null {
	if (!(file instanceof File) || file.size === 0) return 'Elegí el PDF del resumen.';
	if (file.size > MAX_STATEMENT_BYTES) {
		return `El archivo supera los ${MAX_STATEMENT_BYTES / 1024 / 1024} MB.`;
	}
	return null;
}

/** The file's bytes, or null when they are not a PDF (`%PDF-` magic). */
export async function readStatementPdf(file: File): Promise<Uint8Array | null> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	return new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-' ? bytes : null;
}
