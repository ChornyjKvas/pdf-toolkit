import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptedPdf, syntheticPdf } from '../../test/pdfFixtures'
import { rotationFixture } from '../../test/rotationFixtures'
import { rotatePdf, RotatePdfError } from './rotate'
import type { RotationDegrees } from './rotate'

afterEach(() => vi.restoreAllMocks())

function content(document: PDFDocument, index: number): string {
  const object = document.context.lookup(document.getPage(index).node.Contents())
  const streams = object instanceof PDFArray ? object.asArray().map((reference) => document.context.lookup(reference) as PDFRawStream) : [object as PDFRawStream]
  return streams.map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode())).join('')
}

describe('pure relative PDF rotation', () => {
  it.each([
    [90, [90, 180, 270, 0]],
    [180, [180, 270, 0, 90]],
    [270, [270, 0, 90, 180]],
  ] as const)('adds %i degrees modulo 360 to all existing angles', async (angle, expected) => {
    const bytes = await rotationFixture()
    const before = await PDFDocument.load(bytes)
    const after = await PDFDocument.load(await rotatePdf(bytes, { mode: 'all' }, angle))
    expect(after.getPages().map((page) => page.getRotation().angle)).toEqual(expected)
    expect(after.getPageCount()).toBe(4)
    expect(after.getPages().map((page) => [page.getWidth(), page.getHeight()])).toEqual([[200, 400], [300, 420], [400, 440], [500, 460]])
    for (let index = 0; index < 4; index += 1) {
      expect(content(after, index)).toBe(content(before, index))
      const label = `Rotation page ${index + 1}`
      const encoded = Array.from(label).map((character) => character.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase()
      expect(content(after, index)).toContain(encoded)
    }
  })

  it('rotates only entered targets and does not reorder the document', async () => {
    const bytes = await rotationFixture()
    const before = await PDFDocument.load(bytes)
    const after = await PDFDocument.load(await rotatePdf(bytes, { mode: 'selected', expression: ' 4 , 2 - 2 ' }, 90))
    expect(after.getPages().map((page) => page.getRotation().angle)).toEqual([0, 180, 180, 0])
    expect(after.getPages().map((page) => page.getWidth())).toEqual([200, 300, 400, 500])
    for (let index = 0; index < 4; index += 1) expect(content(after, index)).toBe(content(before, index))
  })

  it('normalizes negative and over-360 existing rotations', async () => {
    const bytes = await rotationFixture([-90, 450])
    const after = await PDFDocument.load(await rotatePdf(bytes, { mode: 'all' }, 90))
    expect(after.getPages().map((page) => page.getRotation().angle)).toEqual([0, 180])
  })

  it.each(['', '0', '1,1', '3-1', '99', 'one'])('rejects invalid selected pages %j', async (expression) => {
    await expect(rotatePdf(await rotationFixture(), { mode: 'selected', expression }, 90)).rejects.toThrow()
  })

  it('rejects invalid rotation choices with a controlled error', async () => {
    await expect(rotatePdf(await rotationFixture(), { mode: 'all' }, 45 as RotationDegrees)).rejects.toBeInstanceOf(RotatePdfError)
  })

  it('rejects empty, malformed, encrypted and zero-page sources', async () => {
    await expect(rotatePdf(new Uint8Array(), { mode: 'all' }, 90)).rejects.toMatchObject({ code: 'empty' })
    await expect(rotatePdf(new TextEncoder().encode('not a PDF'), { mode: 'all' }, 90)).rejects.toMatchObject({ code: 'invalid' })
    await expect(rotatePdf(await encryptedPdf(), { mode: 'all' }, 90)).rejects.toMatchObject({ code: 'encrypted' })
    await expect(rotatePdf(await syntheticPdf([]), { mode: 'all' }, 90)).rejects.toMatchObject({ code: 'no-pages' })
  })

  it('converts save/memory failures to a controlled error without output', async () => {
    const bytes = await rotationFixture()
    vi.spyOn(PDFDocument.prototype, 'save').mockRejectedValueOnce(new Error('synthetic memory failure'))
    await expect(rotatePdf(bytes, { mode: 'all' }, 180)).rejects.toBeInstanceOf(RotatePdfError)
  })
})
