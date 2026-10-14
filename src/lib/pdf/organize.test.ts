import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptedPdf, syntheticPdf } from '../../test/pdfFixtures'
import { rotationFixture } from '../../test/rotationFixtures'
import { organizePdf, OrganizePdfError, originalPages } from './organize'

afterEach(() => vi.restoreAllMocks())
function content(document: PDFDocument, index: number): string {
  const object = document.context.lookup(document.getPage(index).node.Contents())
  const streams = object instanceof PDFArray ? object.asArray().map((reference) => document.context.lookup(reference) as PDFRawStream) : [object as PDFRawStream]
  return streams.map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode())).join('')
}
describe('pure organizer export', () => {
  it('reorders, removes and rotates while preserving geometry, crop boxes and labeled content', async () => {
    const source = await PDFDocument.load(await rotationFixture([0, 90, 180, 270, 90]))
    source.getPage(3).setCropBox(10, 20, 450, 400)
    const bytes = await source.save()
    const result = await PDFDocument.load(await organizePdf(bytes, [{ id: 4, rotation: 90 }, { id: 1, rotation: 270 }, { id: 3, rotation: 180 }, { id: 5, rotation: 0 }]))
    expect(result.getPageCount()).toBe(4)
    expect(result.getPages().map((page) => page.getRotation().angle)).toEqual([0, 270, 0, 90])
    for (const [index, id] of [4, 1, 3, 5].entries()) {
      const before = source.getPage(id - 1)
      const after = result.getPage(index)
      expect([after.getWidth(), after.getHeight(), after.getCropBox()]).toEqual([before.getWidth(), before.getHeight(), before.getCropBox()])
      expect(content(result, index)).toBe(content(source, id - 1))
      const hex = Array.from(`Rotation page ${id}`).map((character) => character.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase()
      expect(content(result, index)).toContain(hex)
    }
  })
  it('exports one retained page without a blank replacement', async () => {
    expect((await PDFDocument.load(await organizePdf(await rotationFixture(), [{ id: 2, rotation: 0 }]))).getPageCount()).toBe(1)
  })
  it('rejects all-removed output', async () => { await expect(organizePdf(await rotationFixture(), [])).rejects.toThrow('At least one page') })
  it.each([0, -1, 5, 1.5, NaN])('rejects invalid original page ID %s', async (id) => {
    await expect(organizePdf(await rotationFixture(), [{ id, rotation: 0 }])).rejects.toBeInstanceOf(OrganizePdfError)
  })
  it('rejects duplicate identities', async () => { await expect(organizePdf(await rotationFixture(), [{ id: 1, rotation: 0 }, { id: 1, rotation: 90 }])).rejects.toThrow('exactly once') })
  it.each([45, -90, 360])('rejects unsupported relative angle %s', async (rotation) => {
    await expect(organizePdf(await rotationFixture(), [{ id: 1, rotation }])).rejects.toThrow('rotations must be')
  })
  it('rejects malformed, empty, encrypted and zero-page PDFs', async () => {
    const layout = [{ id: 1, rotation: 0 }]
    await expect(organizePdf(new TextEncoder().encode('not pdf'), layout)).rejects.toMatchObject({ code: 'invalid' })
    await expect(organizePdf(new Uint8Array(), layout)).rejects.toMatchObject({ code: 'empty' })
    await expect(organizePdf(await encryptedPdf(), layout)).rejects.toMatchObject({ code: 'encrypted' })
    await expect(organizePdf(await syntheticPdf([]), layout)).rejects.toMatchObject({ code: 'no-pages' })
  })
  it('rejects save failure without returning bytes', async () => {
    const bytes = await rotationFixture()
    vi.spyOn(PDFDocument.prototype, 'save').mockRejectedValueOnce(new Error('synthetic failure'))
    await expect(organizePdf(bytes, originalPages(4))).rejects.toBeInstanceOf(OrganizePdfError)
  })
})
