import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 5173;
const BASE_URL = `http://localhost:${PORT}`;
const MP_PORT = Number(process.env.FAKE_MP_PORT) || 5199;
const MP_URL = `http://127.0.0.1:${MP_PORT}`;

export default defineConfig({
	testDir: 'e2e',
	testMatch: /.*\.e2e\.ts/,
	// Spec files run in parallel workers on one shared DB; tests inside a file run in order. Most
	// writers use the seeded `otro` user, so a spec that asserts exact figures uses data no other
	// file writes, or its own `signUpVerified` user.
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	// html feeds the report artifact CI uploads on failure.
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: BASE_URL,
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
	},
	webServer: [
		{
			command: 'node e2e/fake-mp.js',
			url: `${MP_URL}/__fake/health`,
			reuseExistingServer: !process.env.CI,
			env: { FAKE_MP_PORT: String(MP_PORT) }
		},
		// Locally reuses an already running `pnpm dev` (and its .env); a reused server must have the same MP env.
		// Without one (CI), builds with VITE_E2E=1 (enables the test-only routes) and serves `node build`.
		// Set E2E_PORT and FAKE_MP_PORT to unique values per worktree so a run never reuses another checkout's servers.
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
				// Must match the fake's defaults (e2e/fake-mp.js).
				MP_CLIENT_ID: 'test-client-id',
				MP_CLIENT_SECRET: 'test-client-secret',
				// base64 of 32 ASCII chars.
				MP_TOKEN_KEY: Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
				MP_AUTH_BASE_URL: MP_URL,
				MP_API_BASE_URL: MP_URL,
				MP_REPORT_POLL_MS: '100',
				// Scheduler off so e2e stays deterministic (syncs only via "Sincronizar ahora").
				MP_SYNC_INTERVAL_HOURS: '0'
			}
		}
	]
});
