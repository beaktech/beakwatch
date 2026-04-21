import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/birds': {
        target: 'http://localhost:3000',
        // Only proxy .jpg requests; let vite serve placeholder.svg etc. from public/
        bypass: (req) => (req.url.split('?')[0].endsWith('.jpg') ? undefined : req.url),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true,
  },
})
