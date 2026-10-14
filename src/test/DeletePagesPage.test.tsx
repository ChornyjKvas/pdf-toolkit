import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as deletion from '../lib/pdf/deletePages'
import { encryptedPdf, pdfFile, syntheticPdf } from './pdfFixtures'
import { rotationFixture } from './rotationFixtures'

let sequence = 0
const createUrl = vi.fn<(blob: Blob) => string>(() => `blob:deletion-${++sequence}`)
const revokeUrl = vi.fn()
beforeEach(() => {
  createUrl.mockClear(); revokeUrl.mockClear()
  Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true })
})
afterEach(() => vi.restoreAllMocks())
const fixture = () => rotationFixture([0, 90, 180, 270, 90])
function openDelete() { return render(<MemoryRouter initialEntries={['/delete-pdf']}><App /></MemoryRouter>) }
const action = () => screen.getByRole('button', { name: 'Delete pages' })
const input = () => screen.getByLabelText('Pages to delete')
async function select(file?: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(screen.getByLabelText('Choose one PDF'), file ?? pdfFile('source.pdf', await fixture()))
  await waitFor(() => expect(screen.getByLabelText('Choose one PDF')).toBeEnabled())
  return user
}
function blobBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob) })
}

describe('Delete Pages UI', () => {
  it('shows a single-source picker and accessible page selection with disabled empty action', () => {
    openDelete()
    expect(screen.getByRole('heading', { name: 'Delete Pages', level: 1 })).toBeVisible()
    expect(screen.getByLabelText('Choose one PDF')).not.toHaveAttribute('multiple')
    expect(input()).toBeDisabled()
    expect(action()).toBeDisabled()
    expect(screen.getByText(/No PDF content is sent to our servers/)).toBeVisible()
  })

  it('shows file details, live counts, inline validation, and recovery from all-page selection', async () => {
    openDelete()
    const user = await select()
    expect(screen.getByText('source.pdf')).toBeVisible()
    expect(screen.getByText(/5 pages/)).toBeVisible()
    expect(action()).toBeDisabled()
    await user.type(input(), '2,4')
    expect(input()).toHaveFocus()
    expect(screen.getByText('Delete 2 pages; keep 3 pages.')).toBeVisible()
    expect(action()).toBeEnabled()
    await user.clear(input()); await user.type(input(), '1-5')
    expect(screen.getByRole('alert')).toHaveTextContent('At least one page must remain')
    expect(action()).toBeDisabled()
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(createUrl).not.toHaveBeenCalled()
    await user.clear(input()); await user.type(input(), '1-4')
    expect(screen.getByText('Delete 4 pages; keep 1 page.')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(action()).toBeEnabled()
    await user.clear(input()); await user.type(input(), '2,2')
    expect(screen.getByRole('alert')).toHaveTextContent('selected more than once')
    expect(action()).toBeDisabled()
  })

  it('downloads valid retained pages and always reprocesses the original source', async () => {
    openDelete()
    const user = await select()
    await user.type(input(), '2,4')
    await user.click(action())
    const link = await screen.findByRole('link', { name: 'Download source-pages-removed.pdf' })
    expect(link).toHaveAttribute('download', 'source-pages-removed.pdf')
    expect(createUrl.mock.calls[0][0].type).toBe('application/pdf')
    const first = await PDFDocument.load(await blobBytes(createUrl.mock.calls[0][0]))
    expect(first.getPages().map((page) => [page.getWidth(), page.getRotation().angle])).toEqual([[200, 0], [400, 180], [600, 90]])
    await user.clear(input()); await user.type(input(), '1')
    expect(screen.queryByRole('link', { name: 'Download source-pages-removed.pdf' })).not.toBeInTheDocument()
    await user.click(action())
    await screen.findByRole('link', { name: 'Download source-pages-removed.pdf' })
    const second = await PDFDocument.load(await blobBytes(createUrl.mock.calls[1][0]))
    expect(second.getPages().map((page) => page.getWidth())).toEqual([300, 400, 500, 600])
  })

  it('invalidates results and revokes URLs on edits, repeat processing, replacement, and clear', async () => {
    openDelete()
    const user = await select()
    await user.type(input(), '2')
    async function produce() { await user.click(action()); await screen.findByRole('link', { name: 'Download source-pages-removed.pdf' }) }
    await produce(); await produce()
    expect(revokeUrl).toHaveBeenCalledTimes(1)
    await user.type(input(), ',4')
    expect(revokeUrl).toHaveBeenCalledTimes(2)
    await produce()
    await select(pdfFile('replacement.pdf', await syntheticPdf([200, 300])))
    expect(revokeUrl).toHaveBeenCalledTimes(3)
    expect(input()).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(action()).toBeDisabled()
    await user.type(input(), '1'); await user.click(action())
    await screen.findByRole('link', { name: 'Download replacement-pages-removed.pdf' })
    await user.click(screen.getByRole('button', { name: 'Clear PDF' }))
    expect(revokeUrl).toHaveBeenCalledTimes(4)
    expect(screen.queryByText('replacement.pdf')).not.toBeInTheDocument()
    expect(input()).toHaveValue('')
    expect(input()).toBeDisabled()
  })

  it('invalidates a successful result when an empty or all-page selection is entered', async () => {
    openDelete()
    const user = await select()
    await user.type(input(), '2'); await user.click(action())
    await screen.findByRole('link', { name: 'Download source-pages-removed.pdf' })
    await user.clear(input())
    expect(action()).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Download source-pages-removed.pdf' })).not.toBeInTheDocument()
    await user.type(input(), '1-5')
    expect(screen.getByRole('alert')).toHaveTextContent('At least one page must remain')
    expect(action()).toBeDisabled()
  })

  it('rejects non-PDF, empty, malformed, encrypted and zero-page sources', async () => {
    openDelete()
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
      expect(action()).toBeDisabled()
    }
  })

  it('protects a valid one-page PDF from all-page deletion', async () => {
    openDelete()
    const user = await select(pdfFile('one.pdf', await syntheticPdf([200])))
    await user.type(input(), '1')
    expect(screen.getByRole('alert')).toHaveTextContent('At least one page must remain')
    expect(action()).toBeDisabled()
    expect(createUrl).not.toHaveBeenCalled()
  })

  it('supports one dropped file, rejects multiple, and warns above 50 MiB', async () => {
    openDelete()
    const file = pdfFile('large.pdf', await fixture())
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 })
    const dropzone = screen.getByText(/Or drop one PDF here/).parentElement!
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(input()).toBeEnabled())
    expect(screen.getByText(/Large file/)).toBeVisible()
    fireEvent.drop(dropzone, { dataTransfer: { files: [file, file] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Choose exactly one source PDF')
    expect(action()).toBeDisabled()
  })

  it('locks validation controls and ignores late validation after navigation', async () => {
    const view = openDelete()
    const file = pdfFile('pending.pdf', await fixture())
    let finish: (bytes: ArrayBuffer) => void = () => {}
    Object.defineProperty(file, 'arrayBuffer', { value: () => new Promise<ArrayBuffer>((resolve) => { finish = resolve }) })
    await userEvent.setup().upload(screen.getByLabelText('Choose one PDF'), file)
    expect(screen.getByLabelText('Choose one PDF')).toBeDisabled()
    expect(input()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear PDF' })).toBeDisabled()
    view.unmount()
    finish((await fixture()).buffer)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(createUrl).not.toHaveBeenCalled()
  })

  it('prevents duplicate processing, handles failure, and allows a retry', async () => {
    openDelete()
    const user = await select()
    await user.type(input(), '2')
    let fail: (error: Error) => void = () => {}
    const spy = vi.spyOn(deletion, 'deletePages').mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
    await user.click(action())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    const busyButton = screen.getByRole('button', { name: 'Removing pages…' })
    expect(busyButton).toBeDisabled()
    expect(screen.getByLabelText('Choose one PDF')).toBeDisabled()
    expect(input()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear PDF' })).toBeDisabled()
    fireEvent.click(busyButton)
    expect(spy).toHaveBeenCalledTimes(1)
    fail(new deletion.DeletePagesError('Could not remove the selected pages. Try a smaller PDF.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove the selected pages')
    expect(createUrl).not.toHaveBeenCalled()
    await user.click(action())
    expect(await screen.findByRole('link', { name: 'Download source-pages-removed.pdf' })).toBeVisible()
  })

  it('handles a source read failure during processing without output', async () => {
    openDelete()
    const file = pdfFile('source.pdf', await fixture())
    const user = await select(file)
    await user.type(input(), '2')
    Object.defineProperty(file, 'arrayBuffer', { value: async () => { throw new Error('synthetic device failure') } })
    await user.click(action())
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the edited PDF')
    expect(createUrl).not.toHaveBeenCalled()
  })

  it('revokes a successful result on unmount', async () => {
    const view = openDelete()
    const user = await select()
    await user.type(input(), '2'); await user.click(action())
    const link = await screen.findByRole('link', { name: 'Download source-pages-removed.pdf' })
    const url = link.getAttribute('href')
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith(url)
  })

  it('suppresses late processing completion after navigation and replacement', async () => {
    const view = openDelete()
    const user = await select()
    await user.type(input(), '2')
    let finish: (bytes: Uint8Array<ArrayBuffer>) => void = () => {}
    const spy = vi.spyOn(deletion, 'deletePages').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    await user.click(action())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    view.unmount()
    openDelete()
    await select(pdfFile('replacement.pdf', await syntheticPdf([200, 300])))
    finish(await syntheticPdf([400]))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(createUrl).not.toHaveBeenCalled()
    expect(screen.getByText('replacement.pdf')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Download .*pages-removed.pdf/ })).not.toBeInTheDocument()
  })
})
