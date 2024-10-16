import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import json from '@eslint/json'
import markdown from '@eslint/markdown'

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.node } },
  {
    plugins: {
      markdown,
      json,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettier,
  {
    rules: {
      'prettier/prettier': ['warn'],
      'markdown/no-html': 'error',
      'json/no-duplicate-keys': 'error',
    },
  },
]
