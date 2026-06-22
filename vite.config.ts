import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relativní cesty — funguje na GitHub Pages (i v podadresáři /petra-crm/).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
