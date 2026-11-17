import path from 'node:path';
import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

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
			csp: {
				mode: 'auto',
				// frame-ancestors is ignored in report-only; clickjacking is enforced via X-Frame-Options
				reportOnly: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'base-uri': ['self'],
					// ?/connect on /profile/mercado-pago answers with a 303 to Mercado Pago's OAuth page, ?/google on /login and /signup to Google's.
					'form-action': ['self', 'https://auth.mercadopago.com', 'https://accounts.google.com'],
					'report-uri': ['/csp-report']
				}
			}
		})
	]
});
