/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Ruta donde se publica: «/» en Vercel o Netlify; «/<repo>/» en GitHub Pages (lo pasa el workflow).
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Estudio PER — Patrón de Embarcaciones de Recreo',
        short_name: 'Estudio PER',
        description: 'Tests y simulacros del examen teórico del PER, sin límite de tiempo y con historial.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0b3d62',
        background_color: '#0b3d62',
        // Generados con `npm run iconos` (pwa-assets.config.ts).
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,json}'],
        // El banco de preguntas va en el bundle (~2 MB) y tiene que quedar en caché para usarse sin conexión.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  json: { stringify: true },
  build: {
    // El banco de preguntas va en su propio fichero: si cambia el código, no hay que volver a descargarlo.
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('/data/preguntas.json') ? 'banco' : undefined) },
    },
  },
  test: {
    environment: 'node',
  },
})
