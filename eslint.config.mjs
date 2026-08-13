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
      'electron-app/node_modules/**',
      'electron-app/frontend-dist/**',
      'logs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: [
      'src/**/*.{js,jsx,ts,tsx}',
      'test/**/*.{js,jsx,ts,tsx}',
      'scripts/**/*.{js,mjs}',
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
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*', '~/*', '#/*', 'src/*'],
              message: 'Path aliases are forbidden. Use a relative import.',
            },
          ],
        },
      ],
      // Correctness rules the codebase already satisfies. Kept at error so the
      // clean state is enforced rather than merely observed.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      // Defect detectors, all at zero findings when introduced: each one flags a
      // construct that is almost always a mistake rather than a style choice.
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'array-callback-return': 'error',
      'no-promise-executor-return': 'error',
      'guard-for-in': 'error',
      'default-case-last': 'error',
      radix: 'error',
      // Small clarity rules, five findings between them at introduction.
      'no-unneeded-ternary': 'error',
      'prefer-object-spread': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      // Structural rules, measured against src before enabling.
      'symbol-description': 'error',
      'no-unreachable-loop': 'error',
      'grouped-accessor-pairs': 'error',
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
    // Application source only. scripts/ are CLI entry points whose output is
    // console, and test/ callbacks are conventionally written as `function`.
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Tests assert on literal source text containing ${...}, so this is src-only.
      'no-template-curly-in-string': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      // Application-code structure. Scoped to src/ because test harnesses reuse a
      // module-level binding inside hook callbacks by convention, which reads as a
      // shadow, and CLI scripts intentionally reassign locals.
      'no-shadow': 'error',
      'no-param-reassign': 'error',
    },
  },
  {
    // react-hooks rules also cover custom hooks written in .js, not only the
    // component files. The compiler-powered rules catch cascading renders and
    // ref reads/writes during render that AST-only linting misses.
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/no-deriving-state-in-effects': 'warn',
    },
  },
  {
    // react-refresh only concerns component module exports, so it stays on the
    // component files.
    files: ['src/**/*.{jsx,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Generated shadcn files: copied in verbatim and maintained upstream, so the
    // rules that fight their generated style are turned off here rather than
    // edited into local drift.
    files: ['src/components/ui/**/*.{jsx,tsx}', 'src/hooks/use-mobile.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'no-shadow': 'off',
      'no-param-reassign': 'off',
    },
  },
  {
    // Electron main/preload run in Node and are written as CommonJS, so they need
    // the same require() and underscore-prefix exemptions the rest of the repo has.
    files: ['electron-app/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-vars': 'off',
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
  }
);
