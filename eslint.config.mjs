import { defineConfig, globalIgnores } from 'eslint/config'
import eslintPluginImport from 'eslint-plugin-import'
import eslintPluginN from 'eslint-plugin-n'
import eslintPluginPromise from 'eslint-plugin-promise'
import globals from 'globals'
import standard from 'eslint-config-standard'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: standard.parserOptions.ecmaFeatures,
        ecmaVersion: 2022
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
        document: 'readonly',
        navigator: 'readonly',
        window: 'readonly'
      }
    },
    name: 'zcli/standard',
    plugins: {
      import: eslintPluginImport,
      n: eslintPluginN,
      promise: eslintPluginPromise
    },
    rules: {
      ...standard.rules,
      'no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true
      }]
    }
  },
  {
    extends: [tseslint.configs.recommended],
    files: ['**/*.ts', '**/*.test.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module'
      }
    },
    name: 'zcli/monorepo',
    rules: {
      '@typescript-eslint/no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true
      }],
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [2, { argsIgnorePattern: '^_', varsIgnorePattern: '^_.+', caughtErrorsIgnorePattern: '^_.+' }],
      'eol-last': ['error', 'always'],
      'space-before-blocks': ['error', 'always'],
      camelcase: 'off',
      indent: ['error', 2],
      semi: 'off'
    }
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: globals.mocha,
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module'
      }
    },
    name: 'zcli/tests'
  },
  globalIgnores([
    'node_modules',
    'packages/**/node_modules'
  ])
])
