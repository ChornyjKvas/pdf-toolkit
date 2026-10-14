import type { PDFDocument } from 'pdf-lib'

export type PdfErrorCode = 'too-few' | 'empty' | 'invalid' | 'encrypted' | 'no-pages' | 'processing'

export class PdfMergeError extends Error {
  readonly code: PdfErrorCode

  constructor(code: PdfErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'PdfMergeError'
  }
}

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (!bytes.byteLength) throw new PdfMergeError('empty', 'This file is empty. Choose a PDF with at least one page.')
  try {
    const { PDFDocument } = await import('pdf-lib')
    const document = await PDFDocument.load(bytes, { throwOnInvalidObject: true, updateMetadata: false })
    if (document.getPageCount() === 0) throw new PdfMergeError('no-pages', 'This PDF has no pages. Choose a PDF with at least one page.')
    return document
  } catch (error) {
    if (error instanceof PdfMergeError) throw error
    // pdf-lib 1.17.1's compiled Error subclasses do not retain their prototype.
    const encrypted = error instanceof Error && error.message.startsWith('Input document to `PDFDocument.load` is encrypted.')
    if (encrypted) throw new PdfMergeError('encrypted', 'Encrypted or password-protected PDFs are not supported. Choose an unencrypted copy.')
    throw new PdfMergeError('invalid', 'This PDF could not be read. It may be malformed or unsupported. Choose another PDF.')
  }
}

export async function inspectPdf(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount()
}

/** Copy pages in source order. No file access, network requests, or logging. */
export async function mergePdfs(inputs: readonly Uint8Array[]): Promise<Uint8Array<ArrayBuffer>> {
  if (inputs.length < 2) throw new PdfMergeError('too-few', 'Choose at least two valid PDFs to merge.')
  try {
    const { PDFDocument } = await import('pdf-lib')
    const output = await PDFDocument.create()
    for (let index = 0; index < inputs.length; index += 1) {
      let source: PDFDocument
      try {
        source = await loadPdf(inputs[index])
      } catch (error) {
        if (error instanceof PdfMergeError) throw new PdfMergeError(error.code, `PDF ${index + 1}: ${error.message}`)
        throw error
      }
      const pages = await output.copyPages(source, source.getPageIndices())
      for (const page of pages) output.addPage(page)
    }
    const bytes = await output.save({ addDefaultPage: false })
    // Own the ArrayBuffer so it can be used as a browser BlobPart.
    return new Uint8Array(bytes)
  } catch (error) {
    if (error instanceof PdfMergeError) throw error
    throw new PdfMergeError('processing', 'Could not merge these PDFs. Try fewer or smaller files, or different unencrypted copies.')
  }
}
