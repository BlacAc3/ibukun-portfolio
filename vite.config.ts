import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { imagetools } from 'vite-imagetools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), imagetools()],
  // three.js is a lazy chunk, loaded only when a 3D scene scrolls into view.
  build: { chunkSizeWarningLimit: 1000 },
})
