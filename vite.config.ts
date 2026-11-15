/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Estudio PER — Patrón de Embarcaciones de Recreo',
        short_name: 'Estudio PER',
        description: 'Tests y simulacros del examen teórico del PER, sin límite de tiempo y con historial.',
        lang: 'es',
        start_url: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0b3d62',
        background_color: '#ffffff',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
