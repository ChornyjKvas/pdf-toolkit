import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptedPdf, syntheticPdf } from '../../test/pdfFixtures'
import { inspectPdf, mergePdfs, PdfMergeError } from './merge'

afterEach(() => vi.restoreAllMocks())

describe('pure PDF merge', () => {
  it('copies every page in order and preserves different dimensions and rotation', async () => {
    const first = await syntheticPdf([200, 210])
    const second = await syntheticPdf([500], 90)
    const output = await PDFDocument.load(await mergePdfs([first, second]))
    expect(output.getPageCount()).toBe(3)
    expect(output.getPages().map((page) => page.getWidth())).toEqual([200, 210, 500])
    expect(output.getPages().map((page) => page.getHeight())).toEqual([400, 400, 400])
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([0, 0, 90])
  })

  it('respects reordered sources while preserving each source sequence', async () => {
    const first = await syntheticPdf([200, 210])
    const second = await syntheticPdf([500])
    const output = await PDFDocument.load(await mergePdfs([second, first]))
    expect(output.getPages().map((page) => page.getWidth())).toEqual([500, 200, 210])
  })

  it.each([0, 1])('rejects %i inputs', async (count) => {
    const valid = await syntheticPdf([200])
    await expect(mergePdfs(Array.from({ length: count }, () => valid))).rejects.toMatchObject({ code: 'too-few' })
  })

  it('rejects malformed bytes with a controlled error and source position', async () => {
    const good = await syntheticPdf([200])
    const operation = mergePdfs([good, new TextEncoder().encode('not a PDF')])
    await expect(operation).rejects.toBeInstanceOf(PdfMergeError)
    await expect(operation).rejects.toMatchObject({ code: 'invalid', message: expect.stringContaining('PDF 2:') })
  })

  it('rejects an empty byte array', async () => {
    await expect(inspectPdf(new Uint8Array())).rejects.toMatchObject({ code: 'empty' })
  })

  it('rejects a valid PDF with zero pages rather than adding a blank page', async () => {
    const empty = await syntheticPdf([])
    expect((await PDFDocument.load(empty)).getPageCount()).toBe(0)
    await expect(mergePdfs([await syntheticPdf([200]), empty])).rejects.toMatchObject({ code: 'no-pages' })
  })

  it('rejects encryption instead of ignoring it', async () => {
    await expect(inspectPdf(await encryptedPdf())).rejects.toMatchObject({ code: 'encrypted' })
  })

  it('reports output-generation failure without returning a result', async () => {
    const bytes = await syntheticPdf([200])
    vi.spyOn(PDFDocument.prototype, 'save').mockRejectedValueOnce(new Error('simulated memory failure'))
    await expect(mergePdfs([bytes, bytes])).rejects.toMatchObject({ code: 'processing' })
  })
})
