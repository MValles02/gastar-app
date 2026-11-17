// Synthetic Banco Galicia Visa statements for the E2E: a fake holder, fake numbers and the same
// text layout (column x positions) as the real PDFs, written as a minimal text-only PDF.

type Text = [x: number, y: number, s: string];

/** A minimal PDF: Helvetica (WinAnsi), one content stream per page, each string placed with Tm. */
function pdf(pages: Text[][]): Buffer {
	const objects: string[] = [];
	const add = (body: string) => objects.push(body) + 2; // ids 1 and 2: catalog and page tree
	const font = add(
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
	);
	const kids: number[] = [];
	for (const texts of pages) {
		const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
		const stream = texts
			.map(([x, y, s]) => `BT /F1 7 Tf 1 0 0 1 ${x} ${y} Tm (${esc(s)}) Tj ET`)
			.join('\n');
		const content = add(
			`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`
		);
		kids.push(
			add(
				`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`
			)
		);
	}
	const all = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`,
		...objects
	];
	let out = '%PDF-1.4\n';
	const offsets: number[] = [];
	all.forEach((body, i) => {
		offsets.push(Buffer.byteLength(out, 'latin1'));
		out += `${i + 1} 0 obj\n${body}\nendobj\n`;
	});
	const xref = Buffer.byteLength(out, 'latin1');
	out += `xref\n0 ${all.length + 1}\n0000000000 65535 f \n`;
	for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
	out += `trailer\n<< /Size ${all.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(out, 'latin1');
}

const header = (number: string): Text[] => [
	[76, 764, `Resumen N° ${number}`],
	[75, 743, 'Tarjeta Crédito'],
	[157, 743, 'VISA'],
	[320, 719, 'Consumidor Final'],
	[453, 719, 'CUIT Banco: 30-50000173-5'],
	[34, 716, 'TITULAR DE PRUEBA']
];

const detailHeader = (y: number): Text[] => [
	[23, y + 16, 'DETALLE DEL CONSUMO'],
	[23, y, 'FECHA'],
	[88, y, 'REFERENCIA'],
	[320, y, 'CUOTA'],
	[365, y, 'COMPROBANTE'],
	[467, y, 'PESOS'],
	[542, y, 'DÓLARES']
];

const toCents = (amount: string) => Number(amount.replace(/[.,]/g, ''));
const fromCents = (cents: number) =>
	`${String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(cents % 100).padStart(2, '0')}`;

/**
 * A statement of only consumo lines: no previous balance, payments or charges, so TOTAL A PAGAR is the
 * sum of the lines per currency and it always reconciles. Dates are `DD-MM-YY`, amounts `1.234,56`
 * (`ars` or `usd` per line); `cuota` (`01/06`) marks an installment line.
 */
export function statementOf(o: {
	number: string;
	closing: string;
	lines: {
		date: string;
		reference: string;
		cuota?: string;
		voucher: string;
		ars?: string;
		usd?: string;
	}[];
}): Buffer {
	const rows: Text[] = [];
	let y = 380;
	for (const l of o.lines) {
		rows.push([23, y, l.date], [86, y, l.reference], [365, y, l.voucher]);
		if (l.cuota) rows.push([325, y, l.cuota]);
		if (l.ars) rows.push([450, y, l.ars]);
		if (l.usd) rows.push([550, y, l.usd]);
		y -= 16;
	}
	const sum = (k: 'ars' | 'usd') =>
		fromCents(o.lines.reduce((s, l) => s + (l[k] ? toCents(l[k]) : 0), 0));
	return pdf([
		[
			...header(o.number),
			[227, 572, '01-01-26'],
			[284, 572, '02-01-26'],
			[340, 572, o.closing],
			[397, 572, '03-01-26'],
			[453, 572, '04-01-26'],
			[510, 572, '05-01-26'],
			...detailHeader(400),
			...rows,
			[38, y - 8, 'TOTAL A PAGAR'],
			[450, y - 8, sum('ars')],
			[550, y - 8, sum('usd')]
		]
	]);
}

/**
 * Closing 29-Sep-26. Pesos: 100.000,00 previous balance paid in full, a 100,00 RG 5617 refund, consumos
 * 10.000,00 (cuota 03/06) + 2.500,50 - 500,00 (a credit), charges 120,00 + 30,00 + 15,00 (RG 5617), so
 * TOTAL A PAGAR is 12.065,50 and the taxes item, without the RG 5617 lines, is 150,00. Dollars: 10,00 paid, one 15,00 consumo.
 * `total` overrides the pesos TOTAL A PAGAR (a statement that does not reconcile); `cafe` the
 * reference, voucher and date (DD-MM-YY) of the 2.500,50 line.
 */
export function visaStatement(
	o: {
		number?: string;
		total?: string;
		cafe?: { reference: string; voucher: string; date?: string };
	} = {}
): Buffer {
	const number = o.number ?? 'VI00000000001234567';
	const total = o.total ?? '12.065,50';
	return pdf([
		[
			...header(number),
			[227, 572, '01-Sep-26'],
			[284, 572, '09-Sep-26'],
			[340, 572, '29-Sep-26'],
			[397, 572, '13-Oct-26'],
			[453, 572, '29-Oct-26'],
			[510, 572, '10-Nov-26'],
			[39, 387, 'CONSOLIDADO'],
			[467, 387, 'PESOS'],
			[542, 387, 'DÓLARES'],
			[86, 368, 'SALDO ANTERIOR'],
			[452, 368, '100.000,00'],
			[560, 368, '10,00'],
			[23, 352, '09-09-26'],
			[86, 352, 'SU PAGO EN PESOS'],
			[448, 352, '-100.000,00'],
			[23, 335, '09-09-26'],
			[86, 335, 'SU PAGO EN USD'],
			[556, 335, '-10,00'],
			[23, 319, '09-09-26'],
			[86, 319, 'DEV.IMP. RG 5617 30%('],
			[185, 319, '333,33)'],
			[455, 319, '-100,00'],
			...detailHeader(278),
			[23, 263, '15-06-26'],
			[74, 263, '*'],
			[86, 263, 'TIENDA FICTICIA_CS'],
			[325, 263, '03/06'],
			[365, 263, '000123'],
			[452, 263, '10.000,00'],
			[23, 247, o.cafe?.date ?? '10-09-26'],
			[74, 247, 'K'],
			[86, 247, o.cafe?.reference ?? 'CAFE INVENTADO'],
			[365, 247, o.cafe?.voucher ?? '000456'],
			[457, 247, '2.500,50'],
			[23, 231, '12-09-26'],
			[74, 231, 'K'],
			[86, 231, 'SERVICIO DEMO USD'],
			[234, 231, '15,00'],
			// A wrapped COMPROBANTE sits a point below its row, as in the real statements.
			[366, 230, '000789'],
			[558, 231, '15,00'],
			[23, 215, '14-09-26'],
			[86, 215, 'DEVOLUCION PRUEBA'],
			[365, 215, '000999'],
			[461, 215, '-500,00']
		],
		[
			...header(number),
			...detailHeader(621),
			[86, 590, 'TARJETA 0000 Total Consumos de TITULAR DE PRUEBA'],
			[450, 590, '12.000,50'],
			[544, 590, '15,00'],
			[23, 560, '29-09-26'],
			[86, 560, 'IMPUESTO DE SELLOS'],
			[191, 560, '$'],
			[456, 560, '120,00'],
			[23, 544, '29-09-26'],
			[86, 544, 'IVA RG 4240 21%('],
			[164, 544, '142,86)'],
			[461, 544, '30,00'],
			[23, 528, '29-09-26'],
			[86, 528, 'DB.RG 5617 30% ( 50,00 )'],
			[461, 528, '15,00'],
			[444, 500, total],
			[544, 500, '15,00'],
			[38, 499, 'TOTAL A PAGAR'],
			[67, 460, 'Cuotas a vencer:'],
			[71, 444, '$10.000,00 $10.000,00 $10.000,00']
		]
	]);
}
