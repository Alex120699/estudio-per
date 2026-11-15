import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Iconos PNG para instalar la app (Android e iOS) a partir del SVG cuadrado, sin esquinas
// redondeadas: cada sistema aplica su propia máscara. Se generan con `npm run iconos`.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.15, resizeOptions: { background: '#0b3d62' } },
    apple: { ...minimal2023Preset.apple, padding: 0.15, resizeOptions: { background: '#0b3d62' } },
  },
  images: ['public/icon-cuadrado.svg'],
})
