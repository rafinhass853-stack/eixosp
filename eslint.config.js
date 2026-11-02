import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['functions/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Os módulos existentes usam efeitos assíncronos para sincronizar dados do Firestore.
    // A regra nova do React 19 sinaliza inclusive a inicialização do estado desses fluxos.
    files: ['src/**/*.{js,jsx}'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
])
