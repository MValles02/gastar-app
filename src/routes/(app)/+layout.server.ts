import { parseCurrencyPref } from '$lib/server/currency-pref';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => ({
	currency: parseCurrencyPref(cookies.get('currency'))
});
