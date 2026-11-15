import { getGaliciaConnection, mpLinkState } from '#lib/server/imports/connections.ts';
import { mpOauthEnabled } from '#lib/server/imports/mercado-pago/oauth.ts';
import { requireUser } from '#lib/server/guards.ts';
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
