import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      'no-console': process.env.CI ? 'error' : 'warn',
    },
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: {
            string: true,
            boolean: true,
          },
          ignoreMixedLogicalExpressions: true,
          ignoreConditionalTests: true,
        },
      ],
      '@typescript-eslint/prefer-optional-chain': ['error', { checkString: false }],
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },
  {
    ignores: ['dist/**'],
  },
];
