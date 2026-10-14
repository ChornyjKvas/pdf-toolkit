import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as splitter from '../lib/pdf/split'
import { encryptedPdf, pdfFile, syntheticPdf } from './pdfFixtures'

let sequence = 0
const createUrl = vi.fn<(blob: Blob) => string>(() => `blob:split-${++sequence}`)
const revokeUrl = vi.fn()
beforeEach(() => {
  createUrl.mockClear(); revokeUrl.mockClear()
  Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true })
})
afterEach(() => vi.restoreAllMocks())

function openSplit() { return render(<MemoryRouter initialEntries={['/split-pdf']}><App /></MemoryRouter>) }
const extractButton = () => screen.getByRole('button', { name: 'Extract pages' })
const ranges = () => screen.getByLabelText('Pages to extract')

async function select(file?: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(screen.getByLabelText('Choose one PDF'), file ?? pdfFile('source.pdf', await syntheticPdf([101, 102, 103, 104, 105, 106])))
  await waitFor(() => expect(screen.queryByText('Checking PDF on your device…')).not.toBeInTheDocument())
  return user
}

function blobBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob) })
}

describe('Split PDF UI', () => {
  it('renders one-file picker, explicit modes, range guidance, and disabled empty action', () => {
    openSplit()
    expect(screen.getByRole('heading', { name: 'Split PDF', level: 1 })).toBeVisible()
    expect(screen.getByLabelText('Choose one PDF')).not.toHaveAttribute('multiple')
    expect(screen.getByRole('radio', { name: /Extract pages to one PDF/ })).toBeChecked()
    expect(ranges()).toBeDisabled()
    expect(extractButton()).toBeDisabled()
  })

  it('inspects a source and shows inline errors and ordered selection summary', async () => {
    openSplit()
    const user = await select()
    expect(screen.getByText('source.pdf')).toBeVisible()
    expect(screen.getByText(/6 pages/)).toBeVisible()
    expect(extractButton()).toBeDisabled()
    await user.type(ranges(), '5,2-3')
    expect(screen.getByText('3 pages selected · 1 output PDF · Order: 5,2-3')).toBeVisible()
    expect(extractButton()).toBeEnabled()
    await user.clear(ranges()); await user.type(ranges(), '1-3,3')
    expect(screen.getByRole('alert')).toHaveTextContent('Page 3 is selected more than once')
    expect(ranges()).toHaveAttribute('aria-invalid', 'true')
    expect(extractButton()).toBeDisabled()
  })

  it('downloads one real extraction, invalidates on edit, and revokes on reprocessing and unmount', async () => {
    const view = openSplit()
    const user = await select()
    await user.type(ranges(), '5,2-3')
    await user.click(extractButton())
    const link = await screen.findByRole('link', { name: 'Download source-extracted.pdf' })
    expect(link).toHaveAttribute('download', 'source-extracted.pdf')
    const doc = await PDFDocument.load(await blobBytes(createUrl.mock.calls[0][0]))
    expect(doc.getPages().map((page) => page.getWidth())).toEqual([105, 102, 103])
    const firstUrl = link.getAttribute('href')
    await user.click(extractButton())
    await waitFor(() => expect(createUrl).toHaveBeenCalledTimes(2))
    expect(revokeUrl).toHaveBeenCalledWith(firstUrl)
    await user.clear(ranges())
    expect(screen.queryByRole('link', { name: 'Download source-extracted.pdf' })).not.toBeInTheDocument()
    expect(revokeUrl).toHaveBeenCalledTimes(2)
    await user.type(ranges(), '1')
    await user.click(extractButton())
    const final = await screen.findByRole('link', { name: 'Download source-extracted.pdf' })
    const lastUrl = final.getAttribute('href')
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith(lastUrl)
  })

  it('creates valid individual PDFs, updates mode help, and cleans up every URL on mode change and clear', async () => {
    openSplit()
    const user = await select()
    await user.click(screen.getByRole('radio', { name: /Split into separate files/ }))
    expect(screen.getByText(/Each comma starts a new file/)).toBeVisible()
    await user.type(screen.getByLabelText('Page groups to split'), '1-3,4-5,6')
    expect(screen.getByText(/6 pages selected · 3 output PDFs/)).toBeVisible()
    async function produce() { await user.click(screen.getByRole('button', { name: 'Create separate PDFs' })); await screen.findByRole('link', { name: 'Download source-pages-6.pdf' }) }
    await produce()
    expect(screen.getAllByRole('link', { name: /Download source-pages-/ })).toHaveLength(3)
    const contents = await Promise.all(createUrl.mock.calls.map(async ([blob]) => (await PDFDocument.load(await blobBytes(blob))).getPages().map((page) => page.getWidth())))
    expect(contents).toEqual([[101, 102, 103], [104, 105], [106]])
    expect(screen.getByText(/ZIP downloads are not available yet/)).toBeVisible()
    await user.click(screen.getByRole('radio', { name: /Extract pages to one PDF/ }))
    expect(revokeUrl).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('heading', { name: 'Your downloads' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Split into separate files/ }))
    await produce()
    await user.click(screen.getByRole('button', { name: 'Clear PDF' }))
    expect(revokeUrl).toHaveBeenCalledTimes(6)
    expect(screen.queryByText('source.pdf')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Pages to extract')).toHaveValue('')
  })

  it('resets ranges, errors, mode and previous output on source replacement', async () => {
    openSplit()
    const user = await select()
    await user.type(ranges(), '1-2'); await user.click(extractButton())
    await screen.findByRole('link', { name: 'Download source-extracted.pdf' })
    await select(pdfFile('replacement.pdf', await syntheticPdf([300])))
    expect(revokeUrl).toHaveBeenCalledTimes(1)
    expect(ranges()).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your downloads' })).not.toBeInTheDocument()
    expect(screen.getByText('replacement.pdf')).toBeVisible()
    expect(extractButton()).toBeDisabled()
  })

  it('rejects non-PDF, empty, malformed, zero-page and encrypted files', async () => {
    openSplit()
    const cases = [
      [pdfFile('empty.pdf', new Uint8Array()), /This file is empty/],
      [pdfFile('note.txt', new TextEncoder().encode('hello'), 'text/plain'), /Other file types/],
      [pdfFile('broken.pdf', new TextEncoder().encode('not pdf')), /malformed or unsupported/],
      [pdfFile('zero.pdf', await syntheticPdf([])), /no pages/],
      [pdfFile('encrypted.pdf', await encryptedPdf()), /password-protected PDFs are not supported/],
    ] as const
    for (const [file, message] of cases) {
      await select(file)
      expect(screen.getByRole('alert')).toHaveTextContent(message)
      expect(extractButton()).toBeDisabled()
    }
  })

  it('accepts one dropped file, rejects multiple, and shows the large-file warning', async () => {
    openSplit()
    const a = pdfFile('large.pdf', await syntheticPdf([200]))
    Object.defineProperty(a, 'size', { value: 51 * 1024 * 1024 })
    const dropzone = screen.getByText(/Or drop one PDF here/).parentElement!
    fireEvent.drop(dropzone, { dataTransfer: { files: [a] } })
    await waitFor(() => expect(ranges()).toBeEnabled())
    expect(screen.getByText(/Large file/)).toBeVisible()
    fireEvent.drop(dropzone, { dataTransfer: { files: [a, a] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Choose exactly one source PDF')
    expect(extractButton()).toBeDisabled()
  })

  it('blocks more than 30 groups before processing', async () => {
    openSplit()
    const user = await select(pdfFile('many.pdf', await syntheticPdf(Array.from({ length: 31 }, (_, index) => index + 100))))
    await user.click(screen.getByRole('radio', { name: /Split into separate files/ }))
    await user.type(screen.getByLabelText('Page groups to split'), Array.from({ length: 31 }, (_, index) => index + 1).join(','))
    expect(screen.getByRole('alert')).toHaveTextContent('at most 30')
    expect(screen.getByRole('button', { name: 'Create separate PDFs' })).toBeDisabled()
  })

  it('locks conflicting actions while processing, reports failure and supports retry', async () => {
    openSplit()
    const user = await select()
    await user.type(ranges(), '1-2')
    let rejectSplit: (error: Error) => void = () => {}
    const spy = vi.spyOn(splitter, 'splitPdf').mockImplementationOnce(() => new Promise((_, reject) => { rejectSplit = reject }))
    await user.click(extractButton())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled()
    expect(screen.getByLabelText('Choose one PDF')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear PDF' })).toBeDisabled()
    expect(ranges()).toBeDisabled()
    rejectSplit(new Error('synthetic output failure'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the selected PDFs')
    expect(createUrl).not.toHaveBeenCalled()
    await user.click(extractButton())
    expect(await screen.findByRole('link', { name: 'Download source-extracted.pdf' })).toBeVisible()
  })

  it('revokes partially allocated URLs and never publishes partial success', async () => {
    openSplit()
    const user = await select()
    await user.click(screen.getByRole('radio', { name: /Split into separate files/ }))
    await user.type(screen.getByLabelText('Page groups to split'), '1,2')
    createUrl.mockImplementationOnce(() => 'blob:partial').mockImplementationOnce(() => { throw new Error('allocation failure') })
    await user.click(screen.getByRole('button', { name: 'Create separate PDFs' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the selected PDFs')
    expect(revokeUrl).toHaveBeenCalledWith('blob:partial')
    expect(screen.queryByRole('heading', { name: 'Your downloads' })).not.toBeInTheDocument()
  })

  it('revokes every multi-output URL when unmounted', async () => {
    const view = openSplit()
    const user = await select()
    await user.click(screen.getByRole('radio', { name: /Split into separate files/ }))
    await user.type(screen.getByLabelText('Page groups to split'), '1,2')
    await user.click(screen.getByRole('button', { name: 'Create separate PDFs' }))
    await screen.findByRole('link', { name: 'Download source-pages-2.pdf' })
    const links = screen.getAllByRole('link', { name: /Download source-pages-/ }).map((link) => link.getAttribute('href'))
    view.unmount()
    for (const link of links) expect(revokeUrl).toHaveBeenCalledWith(link)
  })

  it('ignores late validation after source replacement and clearing', async () => {
    openSplit()
    const user = userEvent.setup()
    const old = pdfFile('old.pdf', await syntheticPdf([200]))
    let resolveRead: (bytes: ArrayBuffer) => void = () => {}
    Object.defineProperty(old, 'arrayBuffer', { value: () => new Promise<ArrayBuffer>((resolve) => { resolveRead = resolve }) })
    await user.upload(screen.getByLabelText('Choose one PDF'), old)
    expect(screen.getByText('Checking PDF on your device…')).toBeVisible()
    await select(pdfFile('new.pdf', await syntheticPdf([300, 310])))
    resolveRead((await syntheticPdf([200])).buffer)
    await waitFor(() => expect(screen.getByText('new.pdf')).toBeVisible())
    expect(screen.queryByText('old.pdf')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear PDF' }))
    expect(ranges()).toHaveValue('')
    expect(ranges()).toBeDisabled()
  })

  it('suppresses a late processing completion after leaving the page', async () => {
    const view = openSplit()
    const user = await select()
    await user.type(ranges(), '1')
    let resolveOutput: (outputs: splitter.SplitOutput[]) => void = () => {}
    const spy = vi.spyOn(splitter, 'splitPdf').mockImplementationOnce(() => new Promise((resolve) => { resolveOutput = resolve }))
    await user.click(extractButton())
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    view.unmount()
    resolveOutput([{ name: 'late.pdf', pages: [1], bytes: await syntheticPdf([200]) }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(createUrl).not.toHaveBeenCalled()
  })
})
