import { degrees, PDFDocument, PDFHexString } from 'pdf-lib'

export async function syntheticPdf(widths: number[], rotation = 0): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await PDFDocument.create()
  for (const width of widths) {
    const page = pdf.addPage([width, 400])
    page.setRotation(degrees(rotation))
    page.drawText(`Synthetic page ${width}`, { x: 20, y: 200, size: 14 })
  }
  return new Uint8Array(await pdf.save({ addDefaultPage: false }))
}

/** Synthetic encryption dictionary exercises rejection without personal files. */
export async function encryptedPdf(): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await PDFDocument.create()
  pdf.addPage()
  pdf.context.trailerInfo.Encrypt = pdf.context.register(pdf.context.obj({
    Filter: 'Standard', V: 1, R: 2, P: -4,
    O: PDFHexString.of('00'.repeat(32)), U: PDFHexString.of('00'.repeat(32)),
  }))
  return new Uint8Array(await pdf.save())
}

export function pdfFile(name: string, bytes: Uint8Array<ArrayBuffer>, type = 'application/pdf'): File {
  const file = new File([bytes], name, { type })
  // jsdom File lacks arrayBuffer; the browser has this native API.
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.slice().buffer, configurable: true })
  return file
}
