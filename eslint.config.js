import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'reference', '.claude', 'coverage', 'playwright-report', 'test-results', 'public', 'node_modules'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'zod', allowTypeImports: true, message: 'Import z from src/lib/zodConfig, which turns on jitless mode before any schema is built.' }],
        },
      ],
    },
  },
  {
    files: ['scripts/**', 'e2e/**', '**/*.test.{ts,tsx}', 'tests/**'],
    rules: { 'no-console': 'off' },
  },
);
