// One home for what the e2e config, the fakes (plain Node) and the specs share: each fake's port (set the
// FAKE_*_PORT env vars to unique values per worktree) and OAuth client, and the fixture date constants.

const fake = (port, clientId, clientSecret) => ({
	port,
	url: `http://127.0.0.1:${port}`,
	clientId,
	clientSecret
});

/** e2e/fake-mp.js */
export const FAKE_MP = fake(
	Number(process.env.FAKE_MP_PORT) || 5199,
	'test-client-id',
	'test-client-secret'
);
/** e2e/fake-google.js */
export const FAKE_GOOGLE = fake(
	Number(process.env.FAKE_GOOGLE_PORT) || 5198,
	'test-google-client-id',
	'test-google-client-secret'
);
/** e2e/fake-gmail.js */
export const FAKE_GMAIL = fake(
	Number(process.env.FAKE_GMAIL_PORT) || 5197,
	'test-gmail-client-id',
	'test-gmail-client-secret'
);

export const DAY_MS = 86_400_000;
/** Buenos Aires is UTC-3 all year. */
export const AR_OFFSET_MS = 3 * 3_600_000;

/** The Buenos Aires calendar day `n` days ago, as YYYY-MM-DD. */
export const arDaysAgo = (n) =>
	new Date(Date.now() - AR_OFFSET_MS - n * DAY_MS).toISOString().slice(0, 10);
