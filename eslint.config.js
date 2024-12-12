const eslint = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')
const eslintConfigPrettier = require('eslint-config-prettier')

module.exports = tseslint.config(
  {
    ignores: ['**/wire.d.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  }
)
