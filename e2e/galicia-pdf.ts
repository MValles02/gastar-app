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

/**
 * Closing 29-Sep-26. Pesos: 100.000,00 previous balance paid in full, a 100,00 tax credit, consumos
 * 10.000,00 (cuota 03/06) + 2.500,50 - 500,00 (a credit), charges 120,00 + 30,00 + 15,00, so the
 * taxes item nets 65,00 and TOTAL A PAGAR is 12.065,50. Dollars: 10,00 paid, one 15,00 consumo.
 * `total` overrides the pesos TOTAL A PAGAR (a statement that does not reconcile).
 */
export function visaStatement(o: { number?: string; total?: string } = {}): Buffer {
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
			[23, 247, '10-09-26'],
			[74, 247, 'K'],
			[86, 247, 'CAFE INVENTADO'],
			[365, 247, '000456'],
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
