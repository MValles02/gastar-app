import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'server/prisma/migrations/**',
    ],
  },

  // Server — Node.js ESM
  {
    files: ['server/src/**/*.js', 'server/test/**/*.js', 'server/scripts/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Client — Browser + React
  {
    files: ['client/src/**/*.{js,jsx}'],
    ...js.configs.recommended,
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Prettier — must be last to disable conflicting rules
  prettierConfig,
];
