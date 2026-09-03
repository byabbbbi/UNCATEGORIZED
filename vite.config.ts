import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/UNCATEGORIZED/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/combos.ts')) return 'hard-table'
          if (id.includes('/src/data/gachaPool.ts')) return 'vault-data'
        },
      },
    },
  },
})
