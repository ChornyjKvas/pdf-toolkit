export type SplitMode = 'extract' | 'files'
export const MAX_SPLIT_FILES = 30

export class RangeValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'RangeValidationError' }
}

export type PageGroup = { label: string; pages: number[] }
export type ParsedRanges = { groups: PageGroup[]; pages: number[]; normalized: string }

/** Keep page numbers 1-based here; the PDF processing layer converts indices. */
export function parsePageRanges(expression: string, pageCount: number, mode: SplitMode): ParsedRanges {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) throw new RangeValidationError('Choose a PDF with at least one page first.')
  if (!expression.trim()) throw new RangeValidationError('Enter pages to select, for example 1-3 or 2,5,7-9.')
  const tokens = expression.split(',')
  if (mode === 'files' && tokens.length > MAX_SPLIT_FILES) throw new RangeValidationError(`Create at most ${MAX_SPLIT_FILES} separate PDFs at a time. Use fewer comma-separated groups.`)
  const seen = new Set<number>()
  const groups = tokens.map((token, index) => {
    const text = token.trim()
    if (!text) throw new RangeValidationError(`Group ${index + 1} is empty. Remove extra commas or enter a page range.`)
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(text)
    if (!match) throw new RangeValidationError(`Group ${index + 1} is invalid. Use positive whole page numbers or ranges such as 1-3.`)
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) throw new RangeValidationError(`Group ${index + 1} contains a page number that is too large. Use pages 1-${pageCount}.`)
    if (start < 1 || end < 1) throw new RangeValidationError('Page numbers start at 1. Replace zero with a valid page number.')
    if (start > end) throw new RangeValidationError(`Range ${start}-${end} is descending. Put the smaller page number first.`)
    if (end > pageCount) throw new RangeValidationError(`Page ${end} is outside this ${pageCount}-page PDF. Use pages 1-${pageCount}.`)
    const pages: number[] = []
    for (let page = start; page <= end; page += 1) {
      if (seen.has(page)) throw new RangeValidationError(`Page ${page} is selected more than once. Remove duplicate pages or overlapping ranges.`)
      seen.add(page)
      pages.push(page)
    }
    return { label: start === end ? `${start}` : `${start}-${end}`, pages }
  })
  return { groups, pages: groups.flatMap((group) => group.pages), normalized: groups.map((group) => group.label).join(',') }
}
