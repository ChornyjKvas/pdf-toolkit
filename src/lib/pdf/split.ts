import { loadPdf, PdfMergeError } from './merge'
import { parsePageRanges, RangeValidationError } from './ranges'
import type { SplitMode } from './ranges'

export type SplitOutput = { name: string; pages: number[]; bytes: Uint8Array<ArrayBuffer> }

export function sourceBasename(name: string): string {
  const withoutExtension = name.replace(/\.pdf$/i, '')
  const safe = Array.from(withoutExtension).filter((character) => character.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/g, '').slice(0, 120)
  return safe || 'document'
}

/** All outputs succeed before returning. No browser, network, or persistence APIs. */
export async function splitPdf(bytes: Uint8Array, expression: string, mode: SplitMode, sourceName: string): Promise<SplitOutput[]> {
  try {
    const source = await loadPdf(bytes)
    const selection = parsePageRanges(expression, source.getPageCount(), mode)
    const { PDFDocument } = await import('pdf-lib')
    const groups = mode === 'extract' ? [{ label: 'extracted', pages: selection.pages }] : selection.groups
    const basename = sourceBasename(sourceName)
    const outputs: SplitOutput[] = []
    for (const group of groups) {
      const document = await PDFDocument.create()
      const copied = await document.copyPages(source, group.pages.map((page) => page - 1))
      for (const page of copied) document.addPage(page)
      outputs.push({ name: `${basename}-${mode === 'extract' ? 'extracted' : `pages-${group.label}`}.pdf`, pages: group.pages, bytes: new Uint8Array(await document.save({ addDefaultPage: false })) })
    }
    return outputs
  } catch (error) {
    if (error instanceof PdfMergeError || error instanceof RangeValidationError) throw error
    throw new Error('Could not create the selected PDFs. Try fewer pages, a smaller file, or a different unencrypted copy.', { cause: error })
  }
}
