import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { RenderQueue } from './renderQueue'

GlobalWorkerOptions.workerSrc = workerUrl

export type PreviewSession = {
  render: (id: number, rotation: number, canvas: HTMLCanvasElement, signal: AbortSignal, onStart: () => void) => Promise<void>
  destroy: () => Promise<void>
}

export async function openPreview(file: File, signal: AbortSignal): Promise<PreviewSession> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (signal.aborted) throw new DOMException('Preview cancelled', 'AbortError')
  const localAsset = (path: string) => new URL(`pdfjs/${path}/`, document.baseURI).href
  const loading = getDocument({ data: bytes, enableXfa: false, stopAtErrors: true, verbosity: 0, cMapUrl: localAsset('cmaps'), cMapPacked: true, standardFontDataUrl: localAsset('standard_fonts'), wasmUrl: localAsset('wasm'), iccUrl: localAsset('iccs') })
  const tasks = new Set<RenderTask>()
  let closed = false
  const destroy = async () => {
    if (closed) return
    closed = true
    signal.removeEventListener('abort', abort)
    for (const task of tasks) task.cancel()
    await loading.destroy()
  }
  const abort = () => { void destroy().catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  try {
    const pdf = await loading.promise
    if (signal.aborted || closed) { await destroy(); throw new DOMException('Preview cancelled', 'AbortError') }
    const queue = new RenderQueue(2)
    return {
      destroy,
      render: (id, rotation, canvas, renderSignal, onStart) => queue.run(async () => {
        if (closed || renderSignal.aborted) throw new DOMException('Preview cancelled', 'AbortError')
        onStart()
        const page = await pdf.getPage(id)
        if (closed || renderSignal.aborted) { page.cleanup(); throw new DOMException('Preview cancelled', 'AbortError') }
        const totalRotation = ((page.rotate + rotation) % 360 + 360) % 360
        const natural = page.getViewport({ scale: 1, rotation: totalRotation })
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
        const scale = Math.min(220 / natural.width, 260 / natural.height) * ratio
        const viewport = page.getViewport({ scale, rotation: totalRotation })
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        canvas.style.width = `${viewport.width / ratio}px`; canvas.style.height = 'auto'
        const task = page.render({ canvas, viewport, background: 'white' })
        tasks.add(task)
        const cancel = () => task.cancel()
        renderSignal.addEventListener('abort', cancel, { once: true })
        try { await task.promise }
        finally { tasks.delete(task); renderSignal.removeEventListener('abort', cancel); page.cleanup() }
      }, renderSignal),
    }
  } catch (error) {
    await destroy().catch(() => {})
    throw error
  }
}
