import { inspectPdf, PdfMergeError } from './merge'

export const LARGE_SELECTION_BYTES = 50 * 1024 * 1024

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

export async function validateFile(file: File): Promise<number> {
  if (file.size === 0) throw new PdfMergeError('empty', 'This file is empty. Choose a PDF with at least one page.')
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new PdfMergeError('invalid', 'Choose a PDF file (.pdf). Other file types are not supported.')
  if (typeof file.arrayBuffer !== 'function') throw new Error('This browser cannot read local files. Try an up-to-date browser.')
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this file from your device. Select it again, or try a smaller file.')
  }
  return inspectPdf(bytes)
}
