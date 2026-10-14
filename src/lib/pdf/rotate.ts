import { loadPdf, PdfMergeError } from './merge'
import { parsePageRanges, RangeValidationError } from './ranges'

export type RotationDegrees = 90 | 180 | 270
export type RotationSelection = { mode: 'all' } | { mode: 'selected'; expression: string }

export class RotatePdfError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'RotatePdfError'
  }
}

/** Rotate targets relative to their existing rotation; retain original page order. */
export async function rotatePdf(bytes: Uint8Array, selection: RotationSelection, angle: RotationDegrees): Promise<Uint8Array<ArrayBuffer>> {
  if (![90, 180, 270].includes(angle)) throw new RotatePdfError('Choose 90 degrees clockwise, 180 degrees, or 90 degrees counterclockwise.')
  try {
    const document = await loadPdf(bytes)
    const indices = selection.mode === 'all' ? document.getPageIndices() : parsePageRanges(selection.expression, document.getPageCount(), 'extract').pages.map((page) => page - 1)
    const { degrees } = await import('pdf-lib')
    for (const index of indices) {
      const page = document.getPage(index)
      page.setRotation(degrees(((page.getRotation().angle + angle) % 360 + 360) % 360))
    }
    // Avoid regenerating form appearances or inserting a default page on save.
    return new Uint8Array(await document.save({ addDefaultPage: false, updateFieldAppearances: false }))
  } catch (error) {
    if (error instanceof PdfMergeError || error instanceof RangeValidationError || error instanceof RotatePdfError) throw error
    throw new RotatePdfError('Could not rotate this PDF. Try a smaller file, fewer selected pages, or a different unencrypted copy.', error)
  }
}
