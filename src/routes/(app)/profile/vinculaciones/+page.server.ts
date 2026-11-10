import { getGaliciaConnection } from '$lib/server/galicia';
import { mpLinkState, mpOauthEnabled } from '$lib/server/mp-oauth';
import { requireUser } from '$lib/server/require-user';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const [mp, galicia] = await Promise.all([
		// Mercado Pago only where its OAuth app is configured; Banco Galicia is always available.
		mpOauthEnabled() ? mpLinkState(userId) : null,
		getGaliciaConnection(userId)
	]);
	return { mp, galiciaReady: !!galicia?.arsAccountId };
};
