import prettier from 'eslint-config-prettier';
import fs from 'node:fs';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import gastar from './eslint-rules/index.js';
import legacyAllowlist from './eslint-legacy-allowlist.js';

// Globs treat [id] and (app) specially; allowlisted paths are literal.
const escapeGlob = (p) => p.replace(/[[\]{}()*?!]/g, '\\$&');

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	// Vendored third-party skills (emilkowalski/skills)
	{ ignores: ['.claude/skills/**'] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		files: ['src/**/*.{ts,js,svelte}'],
		plugins: { gastar },
		rules: { 'gastar/no-arbitrary-tailwind': 'error', 'gastar/no-raw-color': 'error' }
	},
	{
		files: ['src/**/*.svelte'],
		plugins: { gastar },
		rules: {
			'svelte/no-inline-styles': ['error', { allowTransitions: true }],
			'gastar/no-literal-text': 'error'
		}
	},
	{
		files: ['src/routes/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: '(^|/)components/ui(/|$)',
							message: 'Routes use base components, never ui/.'
						}
					]
				}
			]
		}
	},
	{ files: ['src/lib/components/ui/**'], rules: { 'gastar/no-arbitrary-tailwind': 'off' } },
	...Object.entries(legacyAllowlist)
		.filter(([, list]) => list.length)
		.map(([rule, list]) => {
			for (const p of list) {
				if (!fs.existsSync(path.resolve(import.meta.dirname, p))) {
					throw new Error(`eslint-legacy-allowlist.js: "${p}" does not exist`);
				}
			}
			return { files: list.map(escapeGlob), rules: { [rule]: 'off' } };
		})
);
