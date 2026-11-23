import path from 'node:path';
import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { FAKE_GMAIL, FAKE_GOOGLE, FAKE_MP } from './e2e/fakes.js';

// e2e builds redirect OAuth form posts to the local fakes (127.0.0.1 or localhost).
type Origin = `http://${'127.0.0.1' | 'localhost'}:${number}`;
const e2eFormActionOrigins: Origin[] =
	process.env.VITE_E2E === '1'
		? [FAKE_MP, FAKE_GOOGLE, FAKE_GMAIL].flatMap(({ port }): Origin[] => [
				`http://127.0.0.1:${port}`,
				`http://localhost:${port}`
			])
		: [];

export default defineConfig({
	resolve: {
		// tw-animate-css only exports a `style` condition, which the SSR build of app.css does not apply.
		alias: {
			'tw-animate-css': path.resolve(
				import.meta.dirname,
				'node_modules/tw-animate-css/dist/tw-animate.css'
			)
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),
			// Inline per-component CSS under 2 KB (about 38 of ~43 render-blocking sheets per screen,
			// ~26 KB raw HTML); app.css and the few larger sheets stay cached files.
			inlineStyleThreshold: 2048,
			csp: {
				mode: 'auto',
				// No frame-ancestors here; clickjacking is enforced via X-Frame-Options. Violations are logged via /csp-report.
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'base-uri': ['self'],
					// ?/connect on /profile/mercado-pago answers with a 303 to Mercado Pago's OAuth page, ?/google on /login and /signup to Google's.
					'form-action': [
						'self',
						'https://auth.mercadopago.com',
						'https://accounts.google.com',
						...e2eFormActionOrigins
					],
					'report-uri': ['/csp-report']
				}
			}
		})
	]
});
