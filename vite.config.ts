import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

// Local PDF.js support assets work in dev and in static production builds.
const previewAssets = new URL('./public/pdfjs/', import.meta.url)
mkdirSync(previewAssets, { recursive: true })
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(new URL(`./node_modules/pdfjs-dist/${folder}`, import.meta.url), new URL(`${folder}/`, previewAssets), { recursive: true })
}
cpSync(new URL('./node_modules/pdfjs-dist/LICENSE', import.meta.url), new URL('LICENSE.txt', previewAssets))

// Preserve notices for the installed production packages in the static artifact.
const lock = JSON.parse(readFileSync(new URL('./package-lock.json', import.meta.url), 'utf8')) as {
  packages: Record<string, { version?: string; dev?: boolean; optional?: boolean }>
}
const notices = ['Third-party dependency notices. These licenses do not license the PDF Toolkit project itself.']
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path || info.dev || info.optional) continue
  const folder = new URL(`./${path}/`, import.meta.url)
  const files = readdirSync(folder, { withFileTypes: true }).filter((file) => file.isFile() && /^(license|notice|copyrightnotice|copying)([._-]|$)/i.test(file.name))
  if (!files.length) throw new Error(`Missing dependency license: ${path}`)
  for (const file of files) notices.push(`\n=== ${path.replace('node_modules/', '')} ${info.version} / ${file.name} ===\n${readFileSync(new URL(file.name, folder), 'utf8')}`)
}
writeFileSync(new URL('./public/THIRD_PARTY_NOTICES.txt', import.meta.url), notices.join('\n'))

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true },
})
