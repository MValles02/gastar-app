import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 5173;
const BASE_URL = `http://localhost:${PORT}`;

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
			url: 'http://127.0.0.1:5199/__fake/health',
			reuseExistingServer: !process.env.CI
		},
		// Locally reuses an already running `pnpm dev` (and its .env); a reused server must have the same MP env.
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
				MP_API_BASE_URL: 'http://127.0.0.1:5199',
				MP_REPORT_POLL_MS: '100'
			}
		}
	]
});
