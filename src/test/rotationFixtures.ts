import { degrees, PDFDocument } from 'pdf-lib'

export async function rotationFixture(angles = [0, 90, 180, 270]): Promise<Uint8Array<ArrayBuffer>> {
  const document = await PDFDocument.create()
  for (const [index, angle] of angles.entries()) {
    const page = document.addPage([200 + 100 * index, 400 + 20 * index])
    page.setRotation(degrees(angle))
    page.drawText(`Rotation page ${index + 1}`, { x: 20, y: 200, size: 14 })
  }
  return new Uint8Array(await document.save({ addDefaultPage: false }))
}
