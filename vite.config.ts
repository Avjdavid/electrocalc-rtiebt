import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  base: '/electrocalc-rtiebt/', // use o NOME EXATO do repositório no GitHub
  plugins: [react(), tsconfigPaths()],
})
