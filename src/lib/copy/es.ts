import { DESCRIPTION_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_NAME_MAX_LENGTH } from '../constants.ts';
import type { Currency } from '../money.ts';

/** The word for n (es-AR: singular only for 1). */
export const plural = (n: number, one: string, other: string): string => (n === 1 ? one : other);

/** "3 cuentas". */
export const countOf = (n: number, one: string, other: string): string =>
	`${n} ${plural(n, one, other)}`;

/** Amounts arrive formatted (formatMoney); the catalogue never formats. */
export type FormattedAmount = string;

const common = {
	tooManyAttempts: (when: 'minuto' | 'rato') =>
		`Demasiados intentos. Probá de nuevo en un ${when}.`,
	fields: {
		/** "La descripción puede tener hasta 60 caracteres." style message. */
		tooLong: (subject: string, max: number) => `${subject} puede tener hasta ${max} caracteres.`,
		descriptionTooLong: `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`,
		passwordMin: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
		invalidEmail: 'Email inválido.',
		nameMissing: 'Falta el nombre.',
		nameTooLong: `Usá un nombre de hasta ${USER_NAME_MAX_LENGTH} caracteres.`,
		enterName: 'Ingresá un nombre.',
		pickColor: 'Elegí un color.',
		pickIcon: 'Elegí un ícono.',
		pickCurrency: 'Elegí una moneda.',
		pickAccount: 'Elegí la cuenta.'
	},
	amount: {
		arsWhole: 'Los montos en pesos van sin decimales.',
		example: '(ej.: 1.234 en pesos o 1.234,56 en dólares)'
	}
} as const;

const auth = {
	login: { badCredentials: 'Email o contraseña incorrectos.' }
} as const;

const movements = {
	errors: {
		type: 'Elegí un tipo de movimiento.',
		date: 'Ingresá una fecha válida.',
		descEmpty: 'Ingresá una descripción.',
		descLong: common.fields.descriptionTooLong,
		amount: `Ingresá un monto mayor a cero ${common.amount.example}.`,
		account: 'Elegí una cuenta.',
		archivedAccount: 'Esa cuenta está archivada. Elegí otra.',
		destination: 'Elegí la cuenta de destino.',
		sameAccount: 'Elegí una cuenta distinta de la de origen.',
		rate: 'Ingresá la cotización (1 USD = X ARS) en pesos enteros y mayor a cero.',
		zero: 'El monto convertido da 0. Revisá el monto o la cotización.',
		overflow: 'El monto convertido es demasiado grande.',
		category: 'Elegí una categoría.',
		archivedCategory: 'Esa categoría está archivada. Elegí otra.',
		kindMismatch: {
			income: 'Esa categoría es de ingresos. Elegí otra.',
			outcome: 'Esa categoría es de gastos. Elegí otra.'
		},
		notFound: 'Movimiento no encontrado.',
		unavailable: 'La cuenta o la categoría ya no está disponible.',
		recurringInvalid: 'Elegí un pago fijo válido.',
		recurringTaken: 'Ese pago fijo no está disponible o ya tiene un movimiento ese mes.'
	}
} as const;

const accounts = {
	errors: {
		notFound: 'Cuenta no encontrada.',
		deleteReferenced: 'Esta cuenta tiene movimientos. Podés archivarla.'
	}
} as const;

const categories = {
	errors: {
		notFound: 'Categoría no encontrada.',
		duplicateName: 'Ya tenés una categoría con ese nombre.',
		deleteReferenced: 'Esta categoría tiene movimientos. Podés archivarla.',
		kindLocked: 'Tiene movimientos, solo se puede cambiar a Ambos.'
	}
} as const;

const plan = {
	errors: {
		limitNotFound: 'Límite no encontrado.',
		recurringNotFound: 'Movimiento fijo no encontrado.'
	},
	limits: {
		meterLabel: (name: string) => `Límite de ${name}`,
		meterValue: (spent: string, limit: string) => `${spent} de ${limit}`,
		empty: 'Sin límites.'
	},
	recurring: {
		noRate: 'Sin cotización',
		meta: (day: number, detail: string) => `Día ${day} · ${detail}`
	}
} as const;

const imports = {
	errors: {
		undoFailed: 'No se pudo deshacer.',
		undoChanged: 'No se pudo deshacer: el movimiento ya cambió.',
		approveFailed: 'No se pudo aprobar.',
		review: 'Revisá este movimiento.',
		discardChanged: 'No se pudo descartar: el movimiento ya cambió.'
	},
	sync: {
		busy: 'Ya hay una sincronización en curso. Probá en unos minutos.',
		badDate: 'Elegí una fecha válida.',
		maxBackfill: 'Podés traer hasta 12 meses para atrás.',
		reconnectMp: 'Reconectá Mercado Pago primero.',
		reconnectGmail: 'Reconectá Gmail primero.'
	},
	/** The error of an account picker that needs an active account in that currency. */
	accountIn: (currencyName: string) => `Elegí una cuenta en ${currencyName}.`,
	/** What the inbox says after "No se pudo sincronizar Gmail" for each stored code. */
	gmailSyncError: {
		reconnect: 'hay que volver a vincular Gmail',
		network: 'sin conexión con Gmail',
		api: 'Gmail respondió con un error',
		parse: 'algún mail de alertas de tarjeta no se pudo leer'
	},
	/** What the inbox says after "No se pudo sincronizar" for each stored code. */
	mpSyncError: {
		auth: 'token inválido o vencido',
		report_timeout: 'Mercado Pago tardó demasiado en generar el reporte',
		network: 'sin conexión con Mercado Pago',
		parse: 'reporte con formato inesperado',
		config: 'revisá la cuenta configurada',
		reconnect: 'hay que volver a vincular Mercado Pago'
	},
	/** MP's HTTP errors (`mp_<status>`) name their status. */
	mpHttpError: (status: string) => `error ${status} de Mercado Pago`
} as const;

const profile = {
	/** The provider-independent `?error=` notices of an OAuth link page. */
	link: {
		denied: 'Cancelaste la vinculación.',
		state: 'La vinculación venció. Probá de nuevo.'
	},
	gmail: {
		flashes: {
			scope: 'Para vincular Gmail tenés que permitir que Gastar lea tus mails.',
			exchange: 'Google no respondió. Probá de nuevo.'
		}
	},
	mercadoPago: {
		flashes: { exchange: 'Mercado Pago no respondió. Probá de nuevo.' }
	},
	galicia: {
		/** What the upload says for each way a statement can fail. */
		statement: {
			unreadable: 'No pudimos leer el PDF. Subí el resumen tal como lo descargaste de Galicia.',
			too_many_pages: 'El PDF tiene demasiadas páginas para ser un resumen.',
			not_galicia: 'Ese PDF no es un resumen de tarjeta de Banco Galicia.',
			unbalanced: 'El resumen no cuadra con el total; no se importó nada.'
		},
		/** Shown when the statement has items in a currency whose Banco Galicia account is not chosen. */
		missingAccount: {
			ARS: 'Elegí la cuenta en pesos antes de subir el resumen.',
			USD: 'El resumen tiene consumos en dólares: elegí una cuenta en dólares.'
		} satisfies Record<Currency, string>,
		noFile: 'Elegí el PDF del resumen.',
		tooBig: (mb: number) => `El archivo supera los ${mb} MB.`,
		rateLimited: 'Subiste muchos resúmenes seguidos. Probá en unos minutos.',
		importFailed: 'No se pudo importar el resumen. Probá de nuevo.'
	}
} as const;

/** Shared UI chrome (bases, headers, sheets). */
const ui = {
	close: 'Cerrar',
	back: 'Volver',
	search: 'Buscar',
	filters: 'Filtros',
	filter: 'Filtrar',
	applyFilters: 'Aplicar filtros',
	clear: 'Limpiar',
	/** The filter sheet's primary button: "Ver 3 movimientos" (count null: no count yet). */
	showResults: (count: number | null, noun: readonly [string, string]) =>
		count === null ? `Ver ${noun[1]}` : `Ver ${count} ${count === 1 ? noun[0] : noun[1]}`,
	month: 'Mes',
	prevMonth: 'Mes anterior',
	nextMonth: 'Mes siguiente',
	alerts: 'Avisos',
	alertsCount: (n: number) => `Avisos: ${n}`,
	badgeOverflow: (max: number) => `${max}+`,
	profile: 'Perfil',
	mainNav: 'Navegación principal',
	tabs: { home: 'Inicio', movements: 'Movimientos', plan: 'Plan', reports: 'Reportes' },
	newMovement: 'Nuevo movimiento',
	showPassword: 'Mostrar contraseña',
	hidePassword: 'Ocultar contraseña',
	currency: 'Moneda',
	unknownCategory: '?',
	iconColor: { title: 'Ícono y color', icon: 'Ícono', color: 'Color' },
	cancel: 'Cancelar',
	done: 'Listo',
	name: 'Nombre',
	docTitle: (t: string) => `${t} · Gastar`
} as const;

export const es = {
	common,
	ui,
	auth,
	home: {},
	movements,
	accounts,
	categories,
	plan,
	reports: {},
	imports,
	profile,
	emails: {}
} as const;

export type Copy = typeof es;
