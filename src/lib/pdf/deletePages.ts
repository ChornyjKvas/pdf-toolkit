import { loadPdf, PdfMergeError } from './merge'
import { parsePageRanges, RangeValidationError } from './ranges'

export type DeletionPlan = { deletedPages: number[]; retainedPages: number[]; normalized: string }

/** Reuse the existing parser; retain 1-based numbers until PDF processing. */
export function getDeletionPlan(expression: string, pageCount: number): DeletionPlan {
  const selection = parsePageRanges(expression, pageCount, 'extract')
  if (selection.pages.length >= pageCount) throw new RangeValidationError('At least one page must remain. Select fewer pages to delete.')
  const removed = new Set(selection.pages)
  return {
    deletedPages: selection.pages,
    retainedPages: Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => !removed.has(page)),
    normalized: selection.normalized,
  }
}

export class DeletePagesError extends Error {
  constructor(message: string, cause?: unknown) { super(message, { cause }); this.name = 'DeletePagesError' }
}

/** Build a fresh PDF from retained pages in original order; no browser APIs. */
export async function deletePages(bytes: Uint8Array, expression: string): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const source = await loadPdf(bytes)
    const plan = getDeletionPlan(expression, source.getPageCount())
    const { PDFDocument } = await import('pdf-lib')
    const output = await PDFDocument.create()
    const pages = await output.copyPages(source, plan.retainedPages.map((page) => page - 1))
    for (const page of pages) output.addPage(page)
    return new Uint8Array(await output.save({ addDefaultPage: false, updateFieldAppearances: false }))
  } catch (error) {
    if (error instanceof PdfMergeError || error instanceof RangeValidationError || error instanceof DeletePagesError) throw error
    throw new DeletePagesError('Could not remove the selected pages. Try a smaller PDF or a different unencrypted copy.', error)
  }
}
