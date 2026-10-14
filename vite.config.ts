import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync, mkdirSync } from 'node:fs'

// Local PDF.js support assets work in dev and in static production builds.
const previewAssets = new URL('./public/pdfjs/', import.meta.url)
mkdirSync(previewAssets, { recursive: true })
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(new URL(`./node_modules/pdfjs-dist/${folder}`, import.meta.url), new URL(`${folder}/`, previewAssets), { recursive: true })
}
cpSync(new URL('./node_modules/pdfjs-dist/LICENSE', import.meta.url), new URL('LICENSE.txt', previewAssets))

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true },
})
