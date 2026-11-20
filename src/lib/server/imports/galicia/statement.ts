import { createHash } from 'node:crypto';
import { getDocumentProxy } from 'unpdf';
import { CURRENCIES, type Currency } from '#lib/money.ts';
import { CARD_NETWORKS, type CardNetwork } from '#lib/imports.ts';
import { NETWORK_IMPORT } from '../networks';

// Parser for Banco Galicia credit-card statement PDFs (Visa and Mastercard). The PDF is read in
// memory only; nothing here logs or returns the holder's name, address or account numbers.

export type { CardNetwork };

/** One consumo line of DETALLE DEL CONSUMO. `cents` is signed: negative lines are credits. */
export type StatementLine = {
	/** Purchase date, YYYY-MM-DD. */
	date: string;
	reference: string;
	/** Cuota as printed (`05/12`), null for single-payment purchases. */
	installment: string | null;
	/** COMPROBANTE, when printed. */
	voucher: string | null;
	currency: Currency;
	cents: number;
};

export type Statement = {
	network: CardNetwork;
	/** SHA-256 prefix of the statement number: stable per statement, never the number itself. */
	numberHash: string;
	/** Closing date (CIERRE ACTUAL), YYYY-MM-DD. */
	closing: string;
	consumos: StatementLine[];
	/**
	 * Net of taxes, perceptions and other charges/credits per currency, in signed cents. Excludes the
	 * RG 5617 dollar perception and its refunds: the card is always paid in dollars, so it never applies.
	 */
	charges: Record<Currency, number>;
};

/** What the upload says for each way a statement can fail. */
export const STATEMENT_ERRORS = {
	unreadable: 'No pudimos leer el PDF. Subí el resumen tal como lo descargaste de Galicia.',
	too_many_pages: 'El PDF tiene demasiadas páginas para ser un resumen.',
	not_galicia: 'Ese PDF no es un resumen de tarjeta de Banco Galicia.',
	unbalanced: 'El resumen no cuadra con el total; no se importó nada.'
} as const;

export type StatementErrorCode = keyof typeof STATEMENT_ERRORS;

export class StatementError extends Error {
	readonly code: StatementErrorCode;
	constructor(code: StatementErrorCode) {
		super(code);
		this.code = code;
	}
}

const MAX_PAGES = 20;
/** Deadline for PDF text extraction (loading + all pages); a crafted PDF cannot keep the server busy longer. */
const PARSE_TIMEOUT_MS = 5000;
const GALICIA_CUIT = '30-50000173-5';

type Token = { x: number; s: string };
type Line = { tokens: Token[]; text: string };

const MONTHS: Record<string, string> = {
	ene: '01',
	feb: '02',
	mar: '03',
	abr: '04',
	may: '05',
	jun: '06',
	jul: '07',
	ago: '08',
	sep: '09',
	set: '09',
	oct: '10',
	nov: '11',
	dic: '12'
};

/** `29-10-26` or `29-Oct-26` → `2026-10-29`; null otherwise. */
function parseDate(s: string): string | null {
	const m = /^(\d{2})-(\d{2}|[A-Za-z]{3})-(\d{2})$/.exec(s);
	if (!m) return null;
	const month = /^\d+$/.test(m[2]) ? m[2] : MONTHS[m[2].toLowerCase()];
	if (!month || Number(month) < 1 || Number(month) > 12) return null;
	const day = Number(m[1]);
	if (day < 1 || day > 31) return null;
	return `20${m[3]}-${month}-${m[1]}`;
}

/** `-1.234,56` or `1.234,56-` → signed cents; null when not an amount. */
function parseAmount(s: string): number | null {
	const m = /^(-)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})(-)?$/.exec(s);
	if (!m || (m[1] && m[4])) return null;
	const cents = Number(m[2].replace(/\./g, '')) * 100 + Number(m[3]);
	return m[1] || m[4] ? -cents : cents;
}

/** Text items of every page, grouped into visual lines (top to bottom, page order). */
async function readLines(bytes: Uint8Array): Promise<Line[]> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new StatementError('unreadable')), PARSE_TIMEOUT_MS);
	});
	deadline.catch(() => {});
	const within = <T>(p: Promise<T>) => Promise.race([p, deadline]);
	let pdf;
	const loading = getDocumentProxy(bytes);
	try {
		pdf = await within(loading);
	} catch {
		clearTimeout(timer);
		// Timed out while loading: release the task once pdfjs settles.
		loading.then((d) => d.loadingTask.destroy()).catch(() => {});
		throw new StatementError('unreadable');
	}
	try {
		if (pdf.numPages > MAX_PAGES) throw new StatementError('too_many_pages');
		const lines: Line[] = [];
		for (let p = 1; p <= pdf.numPages; p++) {
			const page = await within(pdf.getPage(p));
			const content = await within(page.getTextContent());
			const items: { x: number; y: number; s: string }[] = [];
			for (const it of content.items) {
				if (!('str' in it) || !it.str.trim()) continue;
				items.push({ x: it.transform[4], y: it.transform[5], s: it.str.trim() });
			}
			items.sort((a, b) => b.y - a.y || a.x - b.x);
			// Cells of one row can sit a point or two apart vertically (e.g. a wrapped COMPROBANTE).
			const groups: { y: number; tokens: Token[] }[] = [];
			for (const it of items) {
				const last = groups.at(-1);
				if (last && last.y - it.y <= 3) last.tokens.push({ x: it.x, s: it.s });
				else groups.push({ y: it.y, tokens: [{ x: it.x, s: it.s }] });
			}
			for (const g of groups) {
				const tokens = g.tokens.sort((a, b) => a.x - b.x);
				lines.push({ tokens, text: tokens.map((t) => t.s).join(' ') });
			}
		}
		return lines;
	} catch (e) {
		if (e instanceof StatementError) throw e;
		throw new StatementError('unreadable');
	} finally {
		clearTimeout(timer);
		await pdf.loadingTask.destroy();
	}
}

const SUMMARY_RE = /SALDO PENDIENTE|TOTAL CONSUMOS|SUBTOTAL/i;
const CHARGE_RE =
	/IMPUESTO|SELLOS|IIBB|PERCEP|\bIVA\b|\bRG\s?\d|DB\.RG|DEV\.IMP|INTERES|COMISI|CARGO|BONIF/i;
/** RG 5617 30% perception on dollar spending (DB.RG 5617) and its refunds (DEV.IMP. RG 5617). */
const DOLLAR_PERCEPTION_RE = /RG\s?5617/i;
const CUOTA_RE = /^(?:C\.?)?(\d{2}\/\d{2})$/;

/**
 * Parses and reconciles a Galicia card statement. Throws StatementError: 'not_galicia' for any other
 * document, 'unbalanced' when SALDO ANTERIOR + payments + charges + consumos differs from TOTAL A PAGAR
 * by a cent in either currency, 'unreadable' when the layout is not the expected one.
 */
export async function parseGaliciaStatement(bytes: Uint8Array): Promise<Statement> {
	const lines = await readLines(bytes);
	const all = lines.map((l) => l.text);

	if (!all.some((t) => t.includes(`CUIT Banco: ${GALICIA_CUIT}`))) {
		throw new StatementError('not_galicia');
	}
	const cardLine = all.find((t) => /Tarjeta Cr[ée]dito/i.test(t)) ?? '';
	const network = CARD_NETWORKS.find((n) => NETWORK_IMPORT[n].statementMark.test(cardLine)) ?? null;
	if (!network) throw new StatementError('not_galicia');
	const number = all.map((t) => /Resumen N° ?(\S+)/.exec(t)?.[1]).find(Boolean);
	const dates = lines
		.map((l) => l.tokens.map((t) => parseDate(t.s)).filter((d): d is string => d !== null))
		.find((d) => d.length >= 6);
	if (!number || !dates) throw new StatementError('unreadable');
	const closing = dates[2];

	const zero = (): Record<Currency, number> => ({ ARS: 0, USD: 0 });
	const known = zero();
	const charges = zero();
	let total: Record<Currency, number> | null = null;
	const consumos: StatementLine[] = [];

	let section: 'none' | 'summary' | 'detail' = 'none';
	let pesosX = 0;
	let dollarsX = 0;
	// DETALLE DEL CONSUMO columns (left edges from its header row).
	let refX = 0;
	let cuotaX: number | null = null;
	let voucherX = 0;

	const xOf = (l: Line, re: RegExp) => l.tokens.find((t) => re.test(t.s))?.x;

	for (const line of lines) {
		const { tokens, text } = line;
		if (tokens.some((t) => t.s === 'CONSOLIDADO')) section = 'summary';
		if (/DETALLE DEL CONSUMO/.test(text)) section = 'detail';
		if (/Cuotas a vencer/i.test(text)) break;
		if (section === 'none') continue;

		const p = xOf(line, /^PESOS$/);
		const d = xOf(line, /^D[ÓO]LARES$/);
		if (p !== undefined && d !== undefined) {
			pesosX = p;
			dollarsX = d;
			if (section === 'detail') {
				refX = xOf(line, /^REFERENCIA$/) ?? 0;
				cuotaX = xOf(line, /^CUOTA$/) ?? null;
				voucherX = xOf(line, /^COMPROBANTE$/) ?? 0;
			}
			continue;
		}
		if (!pesosX) continue;

		const amountMinX = pesosX - 50;
		const split = (pesosX + dollarsX) / 2;
		const amounts = zero();
		let hasAmount = false;
		const rest: Token[] = [];
		for (const t of tokens) {
			const cents = t.x >= amountMinX ? parseAmount(t.s) : null;
			if (cents === null) rest.push(t);
			else {
				amounts[t.x >= split ? 'USD' : 'ARS'] += cents;
				hasAmount = true;
			}
		}
		if (!hasAmount) continue;
		const label = rest.map((t) => t.s).join(' ');

		if (/TOTAL A PAGAR/i.test(label)) {
			// Mastercard prints it in CONSOLIDADO and again after the detail: both must agree.
			if (total && (total.ARS !== amounts.ARS || total.USD !== amounts.USD)) {
				throw new StatementError('unreadable');
			}
			total = amounts;
			if (section === 'detail') break;
			continue;
		}
		if (SUMMARY_RE.test(label) || /Total Consumos de/i.test(label)) continue;
		// Reconciled but never imported: payments, the previous balance and the dollar perception.
		if (/SALDO ANTERIOR|SU PAGO/i.test(label) || DOLLAR_PERCEPTION_RE.test(label)) {
			known.ARS += amounts.ARS;
			known.USD += amounts.USD;
			continue;
		}
		if (section === 'summary') {
			charges.ARS += amounts.ARS;
			charges.USD += amounts.USD;
			continue;
		}

		// Detail row: FECHA [marker] REFERENCIA [CUOTA] COMPROBANTE PESOS DÓLARES.
		const date = rest[0] ? parseDate(rest[0].s) : null;
		if (!date || !refX || !voucherX) continue;
		const cells = rest.slice(1);
		let ref = cells.filter((t) => t.x >= refX - 4 && t.x < (cuotaX ?? voucherX) - 4);
		let installment =
			cuotaX === null
				? null
				: (cells
						.filter((t) => t.x >= cuotaX! - 6 && t.x < voucherX - 4)
						.map((t) => CUOTA_RE.exec(t.s)?.[1])
						.find(Boolean) ?? null);
		if (cuotaX === null && ref.length > 1) {
			// No CUOTA column: a trailing `NN/NN` in the reference is the cuota.
			const m = CUOTA_RE.exec(ref.at(-1)!.s);
			if (m) {
				installment = m[1];
				ref = ref.slice(0, -1);
			}
		}
		const voucher =
			cells.filter((t) => t.x >= voucherX - 6 && /^\d+$/.test(t.s)).map((t) => t.s)[0] ?? null;
		const reference = ref
			.map((t) => t.s)
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();

		if (!voucher && DOLLAR_PERCEPTION_RE.test(reference)) {
			known.ARS += amounts.ARS;
			known.USD += amounts.USD;
			continue;
		}
		if (!voucher && CHARGE_RE.test(reference)) {
			charges.ARS += amounts.ARS;
			charges.USD += amounts.USD;
			continue;
		}
		if (!reference || (amounts.ARS !== 0 && amounts.USD !== 0)) {
			throw new StatementError('unreadable');
		}
		const currency: Currency = amounts.USD !== 0 ? 'USD' : 'ARS';
		consumos.push({
			date,
			reference,
			installment: installment === '01/01' ? null : installment,
			voucher,
			currency,
			cents: amounts[currency]
		});
	}

	if (!total) throw new StatementError('unreadable');
	for (const c of CURRENCIES) {
		const lines = consumos.filter((l) => l.currency === c).reduce((s, l) => s + l.cents, 0);
		if (known[c] + charges[c] + lines !== total[c]) throw new StatementError('unbalanced');
	}

	return {
		network,
		numberHash: createHash('sha256').update(number).digest('hex').slice(0, 16),
		closing,
		consumos,
		charges
	};
}
