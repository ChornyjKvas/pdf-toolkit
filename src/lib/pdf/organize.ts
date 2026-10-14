import { loadPdf, PdfMergeError } from './merge'

export type OrganizedPage = { id: number; rotation: number }
export class OrganizePdfError extends Error {
  constructor(message: string, cause?: unknown) { super(message, { cause }); this.name = 'OrganizePdfError' }
}
export function originalPages(count: number): OrganizedPage[] {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1, rotation: 0 }))
}

/** Stable IDs are 1-based original source pages; rotations are relative. */
export async function organizePdf(bytes: Uint8Array, pages: readonly OrganizedPage[]): Promise<Uint8Array<ArrayBuffer>> {
  if (!pages.length) throw new OrganizePdfError('At least one page must remain.')
  try {
    const source = await loadPdf(bytes)
    const seen = new Set<number>()
    for (const page of pages) {
      if (!Number.isInteger(page.id) || page.id < 1 || page.id > source.getPageCount() || seen.has(page.id)) throw new OrganizePdfError('Each retained source page must appear exactly once with a valid page number.')
      if (![0, 90, 180, 270].includes(page.rotation)) throw new OrganizePdfError('Page rotations must be 0, 90, 180, or 270 degrees.')
      seen.add(page.id)
    }
    const { PDFDocument, degrees } = await import('pdf-lib')
    const output = await PDFDocument.create()
    const copied = await output.copyPages(source, pages.map((page) => page.id - 1))
    for (const [index, page] of copied.entries()) {
      page.setRotation(degrees(((page.getRotation().angle + pages[index].rotation) % 360 + 360) % 360))
      output.addPage(page)
    }
    return new Uint8Array(await output.save({ addDefaultPage: false, updateFieldAppearances: false }))
  } catch (error) {
    if (error instanceof OrganizePdfError || error instanceof PdfMergeError) throw error
    throw new OrganizePdfError('Could not organize this PDF. Try a smaller file or a different unencrypted copy.', error)
  }
}
