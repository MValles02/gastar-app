import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: /.*\.e2e\.ts/,
	retries: process.env.CI ? 1 : 0,
	// html feeds the report artifact CI uploads on failure.
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://localhost:5173',
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
	},
	// Locally reuses an already running `pnpm dev` (and its .env).
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173/health',
		reuseExistingServer: !process.env.CI,
		// Default SIGKILL of `pnpm dev` leaves vite running and the run never exits.
		gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
		timeout: 120_000
	}
});
