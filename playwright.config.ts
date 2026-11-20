import { defineConfig } from '@playwright/test';
import { FAKE_GMAIL, FAKE_GOOGLE, FAKE_MP } from './e2e/fakes.js';

const PORT = Number(process.env.E2E_PORT) || 5173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: 'e2e',
	testMatch: /.*\.e2e\.ts/,
	// Spec files run in parallel workers on one shared DB; tests inside a file run in order. Most
	// writers use the seeded `otro` user, so a spec that asserts exact figures uses data no other
	// file writes, or its own `signUpVerified` user.
	fullyParallel: false,
	// CI runners for this private repo have 2 vCPUs, so Playwright's default (half the cores)
	// would run every spec on a single worker. Measured: 3 workers 337/376s, 2 workers
	// 373/502/412s; 4 overloaded the runner and tripped test timeouts.
	workers: process.env.CI ? 3 : undefined,
	// html feeds the report artifact CI uploads on failure.
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: BASE_URL,
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
	},
	webServer: [
		{
			command: 'node e2e/fake-mp.js',
			url: `${FAKE_MP.url}/__fake/health`,
			reuseExistingServer: !process.env.CI,
			env: { FAKE_MP_PORT: String(FAKE_MP.port) }
		},
		{
			command: 'node e2e/fake-google.js',
			url: `${FAKE_GOOGLE.url}/__fake/health`,
			reuseExistingServer: !process.env.CI,
			env: { FAKE_GOOGLE_PORT: String(FAKE_GOOGLE.port) }
		},
		{
			command: 'node e2e/fake-gmail.js',
			url: `${FAKE_GMAIL.url}/__fake/health`,
			reuseExistingServer: !process.env.CI,
			env: { FAKE_GMAIL_PORT: String(FAKE_GMAIL.port) }
		},
		// Locally reuses an already running `pnpm dev` (and its .env); a reused server must have the same MP, Google and Gmail env.
		// Without one (CI), builds with VITE_E2E=1 (enables the test-only routes) and serves `node build`.
		// Set E2E_PORT, FAKE_MP_PORT, FAKE_GOOGLE_PORT and FAKE_GMAIL_PORT to unique values per worktree so a run never reuses another checkout's servers.
		{
			command: `pnpm build && node --env-file-if-exists=.env build`,
			url: `${BASE_URL}/health`,
			reuseExistingServer: !process.env.CI,
			// Default SIGKILL leaves child processes (vite, node build) running and the run never exits.
			gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
			timeout: 180_000,
			env: {
				VITE_E2E: '1',
				PORT: String(PORT),
				// Override .env (:5173) so a non-default E2E_PORT passes the CSRF origin check.
				ORIGIN: BASE_URL,
				BETTER_AUTH_URL: BASE_URL,
				MP_CLIENT_ID: FAKE_MP.clientId,
				MP_CLIENT_SECRET: FAKE_MP.clientSecret,
				// base64 of 32 ASCII chars.
				MP_TOKEN_KEY: Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
				MP_AUTH_BASE_URL: FAKE_MP.url,
				MP_API_BASE_URL: FAKE_MP.url,
				MP_REPORT_POLL_MS: '100',
				MP_REPORT_TIMEOUT_MS: '5000',
				// Scheduler off so e2e stays deterministic (syncs only via "Sincronizar ahora").
				MP_SYNC_INTERVAL_HOURS: '0',
				GOOGLE_CLIENT_ID: FAKE_GOOGLE.clientId,
				GOOGLE_CLIENT_SECRET: FAKE_GOOGLE.clientSecret,
				GOOGLE_DISCOVERY_URL: `${FAKE_GOOGLE.url}/.well-known/openid-configuration`,
				GMAIL_CLIENT_ID: FAKE_GMAIL.clientId,
				GMAIL_CLIENT_SECRET: FAKE_GMAIL.clientSecret,
				GMAIL_TOKEN_KEY: Buffer.from('fedcba9876543210fedcba9876543210').toString('base64'),
				GMAIL_AUTH_BASE_URL: FAKE_GMAIL.url,
				GMAIL_API_BASE_URL: FAKE_GMAIL.url,
				// Scheduler off so e2e stays deterministic (syncs only via "Sincronizar").
				GMAIL_SYNC_INTERVAL_MINUTES: '0'
			}
		}
	]
});
