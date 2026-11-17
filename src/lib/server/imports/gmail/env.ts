import * as env from '$app/env/private';

/** Google's OAuth authorization root; overridden in tests only. */
export const gmailAuthBaseUrl = () => env.GMAIL_AUTH_BASE_URL || 'https://accounts.google.com';

/**
 * Google's token and revoke endpoints root; overridden in tests only. The Gmail API calls of the sync
 * (a later phase) use the same override, so the fake serves them too.
 */
export const gmailApiBaseUrl = () => env.GMAIL_API_BASE_URL || 'https://oauth2.googleapis.com';
