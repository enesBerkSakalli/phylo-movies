import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'engine/**',
      'electron-app/**',
      'logs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'src/**/*.{js,jsx,ts,tsx}',
      'test/**/*.{js,jsx,ts,tsx}',
      'scripts/**/*.js',
      'vite.config.mts',
      'vitest.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-unused-vars': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'warn',
      'no-unused-expressions': 'warn',
      'no-useless-assignment': 'warn',
      'no-useless-catch': 'warn',
      'no-useless-escape': 'warn',
      'preserve-caught-error': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['test/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.vitest,
      },
    },
    rules: {
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
