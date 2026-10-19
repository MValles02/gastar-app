import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 5173;
const BASE_URL = `http://localhost:${PORT}`;
const MP_PORT = Number(process.env.FAKE_MP_PORT) || 5199;
const MP_URL = `http://127.0.0.1:${MP_PORT}`;

export default defineConfig({
	testDir: 'e2e',
	testMatch: /.*\.e2e\.ts/,
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
		// Set E2E_PORT and FAKE_MP_PORT to unique values per worktree so a run never reuses another checkout's servers.
		{
			command: `pnpm dev --port ${PORT} --strictPort`,
			url: `${BASE_URL}/health`,
			reuseExistingServer: !process.env.CI,
			// Default SIGKILL of `pnpm dev` leaves vite running and the run never exits.
			gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
			timeout: 120_000,
			env: {
				MP_ACCESS_TOKEN: 'TEST-fake-mp-token',
				MP_IMPORT_ACCOUNT_ID: '00000000-0000-4000-8000-00000000a001',
				MP_API_BASE_URL: MP_URL,
				MP_REPORT_POLL_MS: '100',
				// Scheduler off so e2e stays deterministic (syncs only via "Sincronizar ahora").
				MP_SYNC_INTERVAL_HOURS: '0'
			}
		}
	]
});
