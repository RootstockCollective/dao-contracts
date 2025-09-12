import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default [
  // 1) Base config for JS & TS
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 3) Extend from recommended configurations
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettier,

  // 4) Shared “top-level” rules for all matching files
  {
    rules: {
      'prettier/prettier': ['warn'],
    },
  },

  // 5) **Override just for test files**
  {
    files: ['test/**/*.ts', 'test/**/*.js'],
    rules: {
      // Turn off the rule that flags Chai property-based assertions
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
]
