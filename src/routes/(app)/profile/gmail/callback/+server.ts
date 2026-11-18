import { GMAIL_LINK } from '#lib/server/imports/gmail/oauth.ts';
import { callbackHandler } from '#lib/server/imports/oauth-link.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = callbackHandler(GMAIL_LINK);
