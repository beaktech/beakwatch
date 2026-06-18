import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'

export default defineConfig(({ command }) => {
  // Dev only: mirror the server's port so `npm run dev` proxies to wherever the
  // API actually listens. Reads PORT from server/.env (same source as the
  // server), so a custom port — or coexisting with another app on 2325 — works
  // without editing this file. Default matches server/index.js.
  let apiTarget = 'http://localhost:2325'
  if (command === 'serve' && !process.env.VITEST) {
    const env = dotenv.config({ path: fileURLToPath(new URL('./server/.env', import.meta.url)) }).parsed ?? {}
    apiTarget = `http://localhost:${env.PORT || 2325}`
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': apiTarget,
        '/birds': {
          target: apiTarget,
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
  }
})
