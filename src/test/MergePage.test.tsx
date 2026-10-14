import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import * as pdf from '../lib/pdf/merge'
import { encryptedPdf, pdfFile, syntheticPdf } from './pdfFixtures'

let urlSequence = 0
const createUrl = vi.fn<(blob: Blob) => string>(() => `blob:synthetic-${++urlSequence}`)
const revokeUrl = vi.fn()

beforeEach(() => {
  createUrl.mockClear()
  revokeUrl.mockClear()
  Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true })
})
afterEach(() => vi.restoreAllMocks())

function openMerge() {
  return render(<MemoryRouter initialEntries={['/merge-pdf']}><App /></MemoryRouter>)
}

async function selectFiles(files: File[]) {
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(screen.getByLabelText('Choose PDF files'), files)
  await waitFor(() => expect(screen.getByLabelText('Choose PDF files')).toBeEnabled())
  return user
}

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

describe('Merge PDF UI', () => {
  it('offers a multi-file picker, instructions, privacy and memory guidance', () => {
    openMerge()
    expect(screen.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible()
    expect(screen.getByLabelText('Choose PDF files')).toHaveAttribute('multiple')
    expect(screen.getByText(/Or drop PDFs here/)).toBeVisible()
    expect(screen.getByText(/Above 50 MiB total/)).toBeVisible()
    expect(screen.getByText(/No PDF content is sent to our servers/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled()
  })

  it('allows appending, moving and removing files; only enables an eligible merge', async () => {
    openMerge()
    const a = pdfFile('first.pdf', await syntheticPdf([200]))
    const b = pdfFile('second.pdf', await syntheticPdf([300]))
    const user = await selectFiles([a])
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled()
    await selectFiles([b])
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Move up first.pdf/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Move up second.pdf/ }))
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByText('second.pdf')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Move down second.pdf/ }))
    expect(within(screen.getAllByRole('listitem')[0]).getByText('first.pdf')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Remove first.pdf/ }))
    expect(screen.queryByText('first.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('downloads actual merged PDF bytes in visible order and invalidates results on reorder, append, removal and clear', async () => {
    openMerge()
    const a = pdfFile('first.pdf', await syntheticPdf([200, 210]))
    const b = pdfFile('second.pdf', await syntheticPdf([500]))
    const user = await selectFiles([a, b])
    await user.click(screen.getByRole('button', { name: /Move up second.pdf/ }))
    async function produce() {
      await user.click(screen.getByRole('button', { name: 'Merge PDFs' }))
      return screen.findByRole('link', { name: 'Download merged.pdf' })
    }
    const download = await produce()
    expect(download).toHaveAttribute('download', 'merged.pdf')
    const firstUrl = download.getAttribute('href')
    const blob = createUrl.mock.calls[0][0]
    expect(blob.type).toBe('application/pdf')
    const output = await PDFDocument.load(await readBlob(blob))
    expect(output.getPages().map((page) => page.getWidth())).toEqual([500, 200, 210])
    await user.click(screen.getByRole('button', { name: /Move down second.pdf/ }))
    expect(screen.queryByRole('link', { name: 'Download merged.pdf' })).not.toBeInTheDocument()
    expect(revokeUrl).toHaveBeenCalledWith(firstUrl)
    await produce()
    await selectFiles([pdfFile('third.pdf', await syntheticPdf([600]))])
    expect(screen.queryByRole('link', { name: 'Download merged.pdf' })).not.toBeInTheDocument()
    await produce()
    await user.click(screen.getByRole('button', { name: /Remove third.pdf/ }))
    expect(screen.queryByRole('link', { name: 'Download merged.pdf' })).not.toBeInTheDocument()
    await produce()
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.queryByRole('link', { name: 'Download merged.pdf' })).not.toBeInTheDocument()
    expect(revokeUrl).toHaveBeenCalledTimes(4)
  })

  it('shows errors for empty, non-PDF, malformed, encrypted and zero-page files', async () => {
    openMerge()
    await selectFiles([
      pdfFile('empty.pdf', new Uint8Array()),
      pdfFile('notes.txt', new TextEncoder().encode('hello'), 'text/plain'),
      pdfFile('broken.pdf', new TextEncoder().encode('not a pdf')),
      pdfFile('protected.pdf', await encryptedPdf()),
      pdfFile('no-pages.pdf', await syntheticPdf([])),
      pdfFile('valid.pdf', await syntheticPdf([200])),
      pdfFile('also-valid.pdf', await syntheticPdf([300])),
    ])
    expect(screen.getByText(/This file is empty/)).toBeVisible()
    expect(screen.getByText(/Other file types are not supported/)).toBeVisible()
    expect(screen.getByText(/It may be malformed or unsupported/)).toBeVisible()
    expect(screen.getByText(/Encrypted or password-protected PDFs are not supported/)).toBeVisible()
    expect(screen.getByText(/This PDF has no pages/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled()
  })

  it('accepts dropped PDFs and shows a warning for a large selection', async () => {
    openMerge()
    const a = pdfFile('large.pdf', await syntheticPdf([200]))
    Object.defineProperty(a, 'size', { value: 51 * 1024 * 1024 })
    const b = pdfFile('small.pdf', await syntheticPdf([300]))
    fireEvent.drop(screen.getByText(/Or drop PDFs here/).parentElement!, { dataTransfer: { files: [a, b] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeEnabled())
    expect(screen.getByText(/Large selection/)).toBeVisible()
  })

  it('reports file read failure without enabling a merge', async () => {
    openMerge()
    const file = pdfFile('unreadable.pdf', await syntheticPdf([200]))
    Object.defineProperty(file, 'arrayBuffer', { value: async () => { throw new Error('simulated device read failure') } })
    await selectFiles([file])
    expect(screen.getByText(/Could not read this file from your device/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled()
  })

  it('locks controls while merging, shows failure, and allows a successful retry', async () => {
    openMerge()
    const bytes = await syntheticPdf([200])
    const user = await selectFiles([pdfFile('a.pdf', bytes), pdfFile('b.pdf', bytes)])
    let rejectMerge: (error: Error) => void = () => {}
    const mergeSpy = vi.spyOn(pdf, 'mergePdfs').mockImplementationOnce(() => new Promise((_, reject) => { rejectMerge = reject }))
    await user.click(screen.getByRole('button', { name: 'Merge PDFs' }))
    await waitFor(() => expect(mergeSpy).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Merging…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled()
    expect(screen.getByLabelText('Choose PDF files')).toBeDisabled()
    rejectMerge(new Error('simulated memory failure'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not create the merged PDF/)
    expect(screen.queryByRole('link', { name: 'Download merged.pdf' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Merge PDFs' }))
    expect(await screen.findByRole('link', { name: 'Download merged.pdf' })).toBeVisible()
  })

  it('revokes the download URL on unmount', async () => {
    const view = openMerge()
    const bytes = await syntheticPdf([200])
    const user = await selectFiles([pdfFile('a.pdf', bytes), pdfFile('b.pdf', bytes)])
    await user.click(screen.getByRole('button', { name: 'Merge PDFs' }))
    const link = await screen.findByRole('link', { name: 'Download merged.pdf' })
    const url = link.getAttribute('href')
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith(url)
  })

  it('does not publish a late result after leaving the merge page', async () => {
    const view = openMerge()
    const bytes = await syntheticPdf([200])
    const user = await selectFiles([pdfFile('a.pdf', bytes), pdfFile('b.pdf', bytes)])
    let resolveMerge: (bytes: Uint8Array<ArrayBuffer>) => void = () => {}
    vi.spyOn(pdf, 'mergePdfs').mockImplementationOnce(() => new Promise((resolve) => { resolveMerge = resolve }))
    await user.click(screen.getByRole('button', { name: 'Merge PDFs' }))
    await waitFor(() => expect(pdf.mergePdfs).toHaveBeenCalled())
    view.unmount()
    resolveMerge(bytes)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(createUrl).not.toHaveBeenCalled()
  })
})
