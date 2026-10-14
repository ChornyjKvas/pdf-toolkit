import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptedPdf, syntheticPdf } from '../../test/pdfFixtures'
import { rotationFixture } from '../../test/rotationFixtures'
import { deletePages, DeletePagesError, getDeletionPlan } from './deletePages'

afterEach(() => vi.restoreAllMocks())
const fixture = () => rotationFixture([0, 90, 180, 270, 90])
function content(document: PDFDocument, index: number): string {
  const object = document.context.lookup(document.getPage(index).node.Contents())
  const streams = object instanceof PDFArray ? object.asArray().map((reference) => document.context.lookup(reference) as PDFRawStream) : [object as PDFRawStream]
  return streams.map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode())).join('')
}

describe('pure PDF page deletion', () => {
  it.each([
    ['3', [1, 2, 4, 5]],
    ['2,4', [1, 3, 5]],
    ['1,5', [2, 3, 4]],
    ['1-4', [5]],
    [' 4 , 2 ', [1, 3, 5]],
  ])('deletes %s and preserves exact retained pages', async (expression, retained) => {
    const bytes = await fixture()
    const before = await PDFDocument.load(bytes)
    const after = await PDFDocument.load(await deletePages(bytes, expression))
    expect(after.getPageCount()).toBe(retained.length)
    for (const [index, number] of retained.entries()) {
      const original = before.getPage(number - 1)
      const page = after.getPage(index)
      expect([page.getWidth(), page.getHeight(), page.getRotation().angle]).toEqual([original.getWidth(), original.getHeight(), original.getRotation().angle])
      expect(content(after, index)).toBe(content(before, number - 1))
      const label = `Rotation page ${number}`
      const encoded = Array.from(label).map((character) => character.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase()
      expect(content(after, index)).toContain(encoded)
    }
  })

  it('preserves entered deletion targets while retaining original document order', () => {
    expect(getDeletionPlan(' 4 - 4 , 2 ', 5)).toEqual({ deletedPages: [4, 2], retainedPages: [1, 3, 5], normalized: '4,2' })
  })

  it.each(['1-5', '5,4,3,2,1'])('rejects every-page deletion %s before constructing output', async (expression) => {
    const bytes = await fixture()
    const create = vi.spyOn(PDFDocument, 'create')
    await expect(deletePages(bytes, expression)).rejects.toThrow('At least one page must remain')
    expect(create).not.toHaveBeenCalled()
  })

  it('protects a single-page source from empty output', async () => {
    await expect(deletePages(await syntheticPdf([200]), '1')).rejects.toThrow('At least one page must remain')
  })

  it.each(['', '0', '-1', '6', '2-1', '1,1', '2-4,4', 'blah', '1.5'])('rejects invalid deletion expression %j', async (expression) => {
    await expect(deletePages(await fixture(), expression)).rejects.toThrow()
  })

  it('rejects empty, malformed, encrypted and zero-page input', async () => {
    await expect(deletePages(new Uint8Array(), '1')).rejects.toMatchObject({ code: 'empty' })
    await expect(deletePages(new TextEncoder().encode('not a PDF'), '1')).rejects.toMatchObject({ code: 'invalid' })
    await expect(deletePages(await encryptedPdf(), '1')).rejects.toMatchObject({ code: 'encrypted' })
    await expect(deletePages(await syntheticPdf([]), '1')).rejects.toMatchObject({ code: 'no-pages' })
  })

  it('converts output save/memory failure to a controlled error', async () => {
    const bytes = await fixture()
    vi.spyOn(PDFDocument.prototype, 'save').mockRejectedValueOnce(new Error('synthetic memory failure'))
    await expect(deletePages(bytes, '2')).rejects.toBeInstanceOf(DeletePagesError)
  })
})
