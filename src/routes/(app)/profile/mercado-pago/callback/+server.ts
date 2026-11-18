import { MP_LINK } from '#lib/server/imports/mercado-pago/oauth.ts';
import { callbackHandler } from '#lib/server/imports/oauth-link.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = callbackHandler(MP_LINK);
