import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pdfFile, syntheticPdf } from '../../test/pdfFixtures'

const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), options: { workerSrc: '' }, destroy: vi.fn(), cleanup: vi.fn(), render: vi.fn(), cancel: vi.fn(), getPage: vi.fn() }))
vi.mock('pdfjs-dist', () => ({ getDocument: mocks.getDocument, GlobalWorkerOptions: mocks.options }))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker-local.mjs' }))
import { openPreview } from './pdfPreview'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.destroy.mockResolvedValue(undefined)
  mocks.render.mockReturnValue({ promise: Promise.resolve(), cancel: mocks.cancel })
  mocks.getPage.mockResolvedValue({ rotate: 90, cleanup: mocks.cleanup, getViewport: ({ scale }: { scale: number }) => ({ width: 200 * scale, height: 400 * scale }), render: mocks.render })
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ getPage: mocks.getPage }), destroy: mocks.destroy })
})
describe('PDF.js preview lifecycle', () => {
  it('uses local bytes, local worker/support assets and bounded canvas dimensions', async () => {
    const controller = new AbortController()
    const session = await openPreview(pdfFile('local.pdf', await syntheticPdf([200])), controller.signal)
    const parameters = mocks.getDocument.mock.calls[0][0]
    expect(parameters.data).toBeInstanceOf(Uint8Array)
    expect(parameters.url).toBeUndefined()
    expect(parameters.standardFontDataUrl).toContain('/pdfjs/standard_fonts/')
    expect(mocks.options.workerSrc).toBe('/assets/pdf.worker-local.mjs')
    const canvas = document.createElement('canvas')
    await session.render(1, 270, canvas, new AbortController().signal, vi.fn())
    expect(canvas.width).toBeLessThanOrEqual(330)
    expect(canvas.height).toBeLessThanOrEqual(390)
    expect(mocks.cleanup).toHaveBeenCalled()
    await session.destroy(); await session.destroy()
    expect(mocks.destroy).toHaveBeenCalledTimes(1)
  })
  it('cancels active rendering and destroys the loading task on source abort', async () => {
    let finish: () => void = () => {}
    mocks.render.mockReturnValue({ promise: new Promise<void>((resolve) => { finish = resolve }), cancel: mocks.cancel })
    const controller = new AbortController()
    const session = await openPreview(pdfFile('local.pdf', await syntheticPdf([200])), controller.signal)
    const pending = session.render(1, 0, document.createElement('canvas'), new AbortController().signal, vi.fn())
    await vi.waitFor(() => expect(mocks.render).toHaveBeenCalled())
    controller.abort()
    expect(mocks.cancel).toHaveBeenCalled()
    expect(mocks.destroy).toHaveBeenCalledTimes(1)
    finish(); await pending
  })
  it('does not load a worker after source cancellation during reading', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(openPreview(pdfFile('local.pdf', await syntheticPdf([200])), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(mocks.getDocument).not.toHaveBeenCalled()
  })
  it('destroys failed loading tasks', async () => {
    mocks.getDocument.mockReturnValue({ promise: Promise.reject(new Error('synthetic preview failure')), destroy: mocks.destroy })
    await expect(openPreview(pdfFile('local.pdf', await syntheticPdf([200])), new AbortController().signal)).rejects.toThrow('synthetic preview failure')
    expect(mocks.destroy).toHaveBeenCalledTimes(1)
  })
})
