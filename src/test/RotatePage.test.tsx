import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as rotation from '../lib/pdf/rotate'
import { encryptedPdf, pdfFile, syntheticPdf } from './pdfFixtures'
import { rotationFixture } from './rotationFixtures'

let sequence = 0
const createUrl = vi.fn<(blob: Blob) => string>(() => `blob:rotation-${++sequence}`)
const revokeUrl = vi.fn()
beforeEach(() => {
  createUrl.mockClear(); revokeUrl.mockClear()
  Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true })
})
afterEach(() => vi.restoreAllMocks())
function openRotate() { return render(<MemoryRouter initialEntries={['/rotate-pdf']}><App /></MemoryRouter>) }
const rotateButton = () => screen.getByRole('button', { name: 'Rotate PDF' })
async function select(file?: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(screen.getByLabelText('Choose one PDF'), file ?? pdfFile('source.pdf', await rotationFixture()))
  await waitFor(() => expect(screen.getByLabelText('Choose one PDF')).toBeEnabled())
  return user
}
function blobBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob) })
}

describe('Rotate PDF UI', () => {
  it('offers one-file picker, all-pages default, directions, instructions and privacy', () => {
    openRotate()
    expect(screen.getByRole('heading', { name: 'Rotate PDF', level: 1 })).toBeVisible()
    expect(screen.getByLabelText('Choose one PDF')).not.toHaveAttribute('multiple')
    expect(screen.getByRole('radio', { name: /All pages/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '90° clockwise' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '180°' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '90° counterclockwise' })).toBeDisabled()
    expect(screen.getByText(/No PDF content is sent to our servers/)).toBeVisible()
    expect(rotateButton()).toBeDisabled()
  })

  it('enables all-pages rotation after actual parsing and validates selected page ranges', async () => {
    openRotate()
    const user = await select()
    expect(screen.getByText('source.pdf')).toBeVisible()
    expect(screen.getByText(/All 4 pages selected/)).toBeVisible()
    expect(rotateButton()).toBeEnabled()
    await user.click(screen.getByRole('radio', { name: /Selected pages/ }))
    expect(rotateButton()).toBeDisabled()
    const input = screen.getByLabelText('Pages to rotate')
    await user.type(input, '4,2-3')
    expect(screen.getByText(/3 pages selected · Targets: 4,2-3/)).toBeVisible()
    expect(rotateButton()).toBeEnabled()
    await user.clear(input); await user.type(input, '1,1')
    expect(screen.getByRole('alert')).toHaveTextContent('selected more than once')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(rotateButton()).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /All pages/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(rotateButton()).toBeEnabled()
  })

  it('downloads valid relative rotation bytes without changing page count/order', async () => {
    openRotate()
    const user = await select()
    await user.click(screen.getByRole('radio', { name: '90° counterclockwise' }))
    await user.click(rotateButton())
    const link = await screen.findByRole('link', { name: 'Download source-rotated.pdf' })
    expect(link).toHaveAttribute('download', 'source-rotated.pdf')
    const blob = createUrl.mock.calls[0][0]
    expect(blob.type).toBe('application/pdf')
    const document = await PDFDocument.load(await blobBytes(blob))
    expect(document.getPageCount()).toBe(4)
    expect(document.getPages().map((page) => page.getRotation().angle)).toEqual([270, 0, 90, 180])
    expect(document.getPages().map((page) => page.getWidth())).toEqual([200, 300, 400, 500])
  })

  it('rotates selected targets only with the chosen direction', async () => {
    openRotate()
    const user = await select()
    await user.click(screen.getByRole('radio', { name: /Selected pages/ }))
    await user.type(screen.getByLabelText('Pages to rotate'), '4,2')
    await user.click(screen.getByRole('radio', { name: '180°' }))
    await user.click(rotateButton())
    await screen.findByRole('link', { name: 'Download source-rotated.pdf' })
    const document = await PDFDocument.load(await blobBytes(createUrl.mock.calls[0][0]))
    expect(document.getPages().map((page) => page.getRotation().angle)).toEqual([0, 270, 180, 90])
  })

  it('revokes and hides stale URLs on direction, mode, range edits, repeated processing, replacement and clear', async () => {
    openRotate()
    const user = await select()
    async function produce() { await user.click(rotateButton()); await screen.findByRole('link', { name: 'Download source-rotated.pdf' }) }
    await produce()
    await user.click(screen.getByRole('radio', { name: '180°' }))
    expect(screen.queryByRole('link', { name: 'Download source-rotated.pdf' })).not.toBeInTheDocument()
    await produce()
    await user.click(screen.getByRole('radio', { name: /Selected pages/ }))
    expect(revokeUrl).toHaveBeenCalledTimes(2)
    await user.type(screen.getByLabelText('Pages to rotate'), '1')
    await produce()
    await user.type(screen.getByLabelText('Pages to rotate'), ',2')
    expect(revokeUrl).toHaveBeenCalledTimes(3)
    await produce(); await produce()
    expect(revokeUrl).toHaveBeenCalledTimes(4)
    await select(pdfFile('new.pdf', await syntheticPdf([200])))
    expect(revokeUrl).toHaveBeenCalledTimes(5)
    expect(screen.getByRole('radio', { name: /All pages/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '90° clockwise' })).toBeChecked()
    expect(screen.queryByLabelText('Pages to rotate')).not.toBeInTheDocument()
    await user.click(rotateButton())
    await screen.findByRole('link', { name: 'Download new-rotated.pdf' })
    await user.click(screen.getByRole('button', { name: 'Clear PDF' }))
    expect(revokeUrl).toHaveBeenCalledTimes(6)
    expect(screen.queryByText('new.pdf')).not.toBeInTheDocument()
    expect(rotateButton()).toBeDisabled()
  })

  it('rejects invalid sources and displays helpful validation errors', async () => {
    openRotate()
    const cases = [
      [pdfFile('empty.pdf', new Uint8Array()), /This file is empty/],
      [pdfFile('note.txt', new TextEncoder().encode('hello'), 'text/plain'), /Other file types/],
      [pdfFile('broken.pdf', new TextEncoder().encode('not PDF')), /malformed or unsupported/],
      [pdfFile('zero.pdf', await syntheticPdf([])), /no pages/],
      [pdfFile('protected.pdf', await encryptedPdf()), /password-protected PDFs are not supported/],
    ] as const
    for (const [file, message] of cases) {
      await select(file)
      expect(screen.getByRole('alert')).toHaveTextContent(message)
      expect(rotateButton()).toBeDisabled()
    }
  })

  it('supports dropping one source, rejects multiple, and warns above 50 MiB', async () => {
    openRotate()
    const file = pdfFile('large.pdf', await rotationFixture())
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 })
    const dropzone = screen.getByText(/Or drop one PDF here/).parentElement!
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(rotateButton()).toBeEnabled())
    expect(screen.getByText(/Large file/)).toBeVisible()
    fireEvent.drop(dropzone, { dataTransfer: { files: [file, file] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Choose exactly one source PDF')
    expect(rotateButton()).toBeDisabled()
  })

  it('disables conflicting actions during validation and ignores its late completion after navigation', async () => {
    const view = openRotate()
    const user = userEvent.setup()
    const file = pdfFile('pending.pdf', await rotationFixture())
    let finish: (bytes: ArrayBuffer) => void = () => {}
    Object.defineProperty(file, 'arrayBuffer', { value: () => new Promise<ArrayBuffer>((resolve) => { finish = resolve }) })
    await user.upload(screen.getByLabelText('Choose one PDF'), file)
    expect(screen.getByLabelText('Choose one PDF')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear PDF' })).toBeDisabled()
    expect(rotateButton()).toBeDisabled()
    view.unmount()
    finish((await rotationFixture()).buffer)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(createUrl).not.toHaveBeenCalled()
  })

  it('locks controls and prevents repeated processing, then handles failure and retry', async () => {
    openRotate()
    const user = await select()
    let fail: (error: Error) => void = () => {}
    const spy = vi.spyOn(rotation, 'rotatePdf').mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
    await user.click(rotateButton())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    const busyButton = screen.getByRole('button', { name: 'Rotating…' })
    expect(busyButton).toBeDisabled()
    expect(screen.getByLabelText('Choose one PDF')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear PDF' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '180°' })).toBeDisabled()
    fireEvent.click(busyButton)
    expect(spy).toHaveBeenCalledTimes(1)
    fail(new rotation.RotatePdfError('Could not rotate this PDF. Try a smaller file.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not rotate this PDF')
    expect(createUrl).not.toHaveBeenCalled()
    await user.click(rotateButton())
    expect(await screen.findByRole('link', { name: 'Download source-rotated.pdf' })).toBeVisible()
  })

  it('handles a device read failure during output generation without a download', async () => {
    openRotate()
    const file = pdfFile('source.pdf', await rotationFixture())
    const user = await select(file)
    Object.defineProperty(file, 'arrayBuffer', { value: async () => { throw new Error('synthetic device failure') } })
    await user.click(rotateButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the rotated PDF')
    expect(createUrl).not.toHaveBeenCalled()
  })

  it('revokes an existing URL on unmount', async () => {
    const view = openRotate()
    const user = await select()
    await user.click(rotateButton())
    const link = await screen.findByRole('link', { name: 'Download source-rotated.pdf' })
    const url = link.getAttribute('href')
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith(url)
  })

  it('suppresses a late operation after navigating away and selecting a new source', async () => {
    const view = openRotate()
    const user = await select()
    let finish: (bytes: Uint8Array<ArrayBuffer>) => void = () => {}
    const spy = vi.spyOn(rotation, 'rotatePdf').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    await user.click(rotateButton())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    view.unmount()
    openRotate()
    await select(pdfFile('replacement.pdf', await syntheticPdf([400])))
    finish(await rotationFixture())
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(createUrl).not.toHaveBeenCalled()
    expect(screen.getByText('replacement.pdf')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Download .*rotated.pdf/ })).not.toBeInTheDocument()
  })
})
