import { defineConfig } from 'eslint/config'
import globals from 'globals'
import pluginJs from '@eslint/js'
import { includeIgnoreFile } from '@eslint/compat'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import { fileURLToPath } from 'node:url'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
  // 1) Base config for JS & TS
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 2) Register plugins
  {
    plugins: {
      markdown,
      json,
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
      'markdown/no-html': 'error',
      'json/no-duplicate-keys': 'error',
    },
  },

  // 5) Ignore gitignore files and folders
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),

  // 6) **Override just for test files**
  {
    files: ['test/**/*.ts', 'test/**/*.js'],
    rules: {
      // Turn off the rule that flags Chai property-based assertions
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
])
