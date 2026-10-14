import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptedPdf, syntheticPdf } from '../../test/pdfFixtures'
import { splitPdf, sourceBasename } from './split'

afterEach(() => vi.restoreAllMocks())

describe('pure PDF splitting', () => {
  it.each([
    ['1-3', [101, 102, 103]],
    ['2,5,7-9', [102, 105, 107, 108, 109]],
    ['5,2-3', [105, 102, 103]],
  ])('extracts exact page order for %s', async (input, expected) => {
    const bytes = await syntheticPdf(Array.from({ length: 9 }, (_, index) => 101 + index))
    const outputs = await splitPdf(bytes, input, 'extract', 'source.pdf')
    expect(outputs).toHaveLength(1)
    expect(outputs[0].name).toBe('source-extracted.pdf')
    const doc = await PDFDocument.load(outputs[0].bytes)
    expect(doc.getPages().map((page) => page.getWidth())).toEqual(expected)
  })

  it('creates three separate outputs for 1-3,4-5,6 with correct names and contents', async () => {
    const bytes = await syntheticPdf([101, 102, 103, 104, 105, 106])
    const outputs = await splitPdf(bytes, '1-3,4-5,6', 'files', 'source.PDF')
    expect(outputs.map((output) => output.name)).toEqual(['source-pages-1-3.pdf', 'source-pages-4-5.pdf', 'source-pages-6.pdf'])
    const widths = await Promise.all(outputs.map(async (output) => (await PDFDocument.load(output.bytes)).getPages().map((page) => page.getWidth())))
    expect(widths).toEqual([[101, 102, 103], [104, 105], [106]])
  })

  it('retains mixed dimensions and rotations in requested order', async () => {
    const source = await PDFDocument.load(await syntheticPdf([200, 600], 90))
    source.getPage(0).setSize(210, 450)
    const outputs = await splitPdf(await source.save(), '2,1', 'extract', 'mixed.pdf')
    const doc = await PDFDocument.load(outputs[0].bytes)
    expect(doc.getPages().map((page) => [page.getWidth(), page.getHeight(), page.getRotation().angle])).toEqual([[600, 400, 90], [210, 450, 90]])
  })

  it.each(['extract', 'files'] as const)('revalidates expressions within processing in %s mode', async (mode) => {
    await expect(splitPdf(await syntheticPdf([200]), '1,1', mode, 'a.pdf')).rejects.toThrow('selected more than once')
  })

  it('rejects too many outputs before creating any', async () => {
    const bytes = await syntheticPdf(Array.from({ length: 31 }, (_, index) => 200 + index))
    const create = vi.spyOn(PDFDocument, 'create')
    await expect(splitPdf(bytes, Array.from({ length: 31 }, (_, index) => index + 1).join(','), 'files', 'a.pdf')).rejects.toThrow('at most 30')
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects empty, malformed, zero-page, and encrypted source documents', async () => {
    await expect(splitPdf(new Uint8Array(), '1', 'extract', 'a.pdf')).rejects.toMatchObject({ code: 'empty' })
    await expect(splitPdf(new TextEncoder().encode('not a PDF'), '1', 'extract', 'a.pdf')).rejects.toMatchObject({ code: 'invalid' })
    await expect(splitPdf(await syntheticPdf([]), '1', 'extract', 'a.pdf')).rejects.toMatchObject({ code: 'no-pages' })
    await expect(splitPdf(await encryptedPdf(), '1', 'extract', 'a.pdf')).rejects.toMatchObject({ code: 'encrypted' })
  })

  it('rejects the entire operation when a later output fails', async () => {
    const bytes = await syntheticPdf([200, 300])
    const realSave = PDFDocument.prototype.save
    vi.spyOn(PDFDocument.prototype, 'save').mockImplementationOnce(realSave).mockRejectedValueOnce(new Error('synthetic memory failure'))
    await expect(splitPdf(bytes, '1,2', 'files', 'a.pdf')).rejects.toThrow('Could not create the selected PDFs')
  })

  it('makes safe output basenames', () => {
    expect(sourceBasename('My document.PDF')).toBe('My document')
    expect(sourceBasename('a/b:c.pdf')).toBe('a-b-c')
    expect(sourceBasename('.pdf')).toBe('document')
    expect(sourceBasename('a'.repeat(255) + '.pdf')).toHaveLength(120)
  })
})
