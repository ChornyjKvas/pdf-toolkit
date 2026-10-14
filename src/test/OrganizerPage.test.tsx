import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from 'pdf-lib'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreviewSession } from '../lib/preview/pdfPreview'

const preview = vi.hoisted(() => ({ open: vi.fn(), render: vi.fn(), destroy: vi.fn() }))
vi.mock('../lib/preview/pdfPreview', () => ({ openPreview: preview.open }))
import OrganizerPage from '../pages/OrganizerPage'
import App from '../App'
import * as organizer from '../lib/pdf/organize'
import { encryptedPdf, pdfFile, syntheticPdf } from './pdfFixtures'
import { rotationFixture } from './rotationFixtures'

let sequence = 0
const createUrl = vi.fn<(blob: Blob) => string>(() => `blob:organizer-${++sequence}`)
const revokeUrl = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  preview.destroy.mockResolvedValue(undefined)
  preview.render.mockImplementation(async (_id, _angle, canvas, signal, onStart) => { if (signal.aborted) return; onStart(); canvas.width = 100; canvas.height = 150 })
  preview.open.mockResolvedValue({ render: preview.render, destroy: preview.destroy })
  Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())
function open() { return render(<MemoryRouter><OrganizerPage /></MemoryRouter>) }
const action = () => screen.getByRole('button', { name: 'Download organized PDF' })
const card = (id: number) => screen.getByRole('heading', { name: `Source page ${id}` }).closest('li')!
async function select(file?: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(screen.getByLabelText('Choose one PDF'), file ?? pdfFile('source.pdf', await rotationFixture([0, 90, 180, 270, 90])))
  await waitFor(() => expect(action()).toBeEnabled())
  return user
}
function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob) })
}
describe('visual organizer', () => {
  it('loads the hash-compatible organizer route and offers one PDF picker', async () => {
    render(<MemoryRouter initialEntries={['/organize-pdf']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Organize PDF', level: 1 })).toBeVisible()
    expect(screen.getByLabelText('Choose one PDF')).not.toHaveAttribute('multiple')
    expect(action()).toBeDisabled()
  })
  it('renders stable source identities, original positions, and preview loading/ready states', async () => {
    open()
    let finish: () => void = () => {}
    preview.render.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve }))
    await select(pdfFile('one.pdf', await syntheticPdf([200])))
    expect(screen.getByText('Loading page 1 preview…')).toBeVisible()
    await waitFor(() => expect(preview.render).toHaveBeenCalled())
    finish()
    expect(await screen.findByRole('img', { name: 'Preview of source page 1' })).toBeVisible()
    expect(within(card(1)).getByText(/Position 1 of 1/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove source page 1' })).toBeDisabled()
  })
  it('exports nontrivial edits in actual visual order with relative rotation', async () => {
    open(); const user = await select()
    for (let index = 0; index < 3; index += 1) await user.click(screen.getByRole('button', { name: 'Move source page 4 earlier' }))
    await user.click(screen.getByRole('button', { name: 'Rotate source page 4 clockwise 90 degrees' }))
    await user.click(screen.getByRole('button', { name: 'Remove source page 2' }))
    expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('data-page-id'))).toEqual(['4', '1', '3', '5'])
    await user.click(action())
    const link = await screen.findByRole('link', { name: 'Download source-organized.pdf' })
    expect(link).toHaveAttribute('download', 'source-organized.pdf')
    const output = await PDFDocument.load(await readBlob(createUrl.mock.calls[0][0]))
    expect(output.getPages().map((page) => page.getWidth())).toEqual([500, 200, 400, 600])
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([0, 0, 180, 90])
  })
  it('supports keyboard movement, counterclockwise rotation, undo of removal and reset', async () => {
    open(); const user = await select()
    const earlier = screen.getByRole('button', { name: 'Move source page 2 earlier' })
    earlier.focus(); await user.keyboard('{Enter}')
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-page-id', '2')
    await user.click(screen.getByRole('button', { name: 'Rotate source page 2 counterclockwise 90 degrees' }))
    expect(within(card(2)).getByText(/Rotation added: 270°/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Remove source page 2' }))
    expect(screen.queryByRole('heading', { name: 'Source page 2' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo last edit' }))
    expect(within(card(2)).getByText(/Rotation added: 270°/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reset changes' }))
    expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('data-page-id'))).toEqual(['1', '2', '3', '4', '5'])
    expect(screen.getByText(/Original layout/)).toBeVisible()
  })
  it('never removes the final page', async () => {
    open(); const user = await select()
    for (const id of [1, 2, 3, 4]) await user.click(screen.getByRole('button', { name: `Remove source page ${id}` }))
    expect(screen.getByRole('button', { name: 'Remove source page 5' })).toBeDisabled()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(action()).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Undo last edit' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
  it('bounds a 120-page PDF to six canvases and frees off-batch canvases', async () => {
    open(); const user = await select(pdfFile('long.pdf', await syntheticPdf(Array.from({ length: 120 }, (_, index) => 200 + index))))
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(6))
    const old = Array.from(document.querySelectorAll('canvas'))
    expect(old).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Move source page 6 later' }))
    expect(screen.getByRole('heading', { name: 'Source page 6' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Previous pages' }))
    expect(screen.getByRole('heading', { name: 'Source page 7' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Next pages' }))
    await waitFor(() => expect(screen.getByRole('img', { name: 'Preview of source page 6' })).toBeVisible())
    expect(document.querySelectorAll('canvas')).toHaveLength(6)
    for (const canvas of old) expect(canvas.width).toBe(0)
    expect(preview.open).toHaveBeenCalledTimes(1)
  })
  it('isolates individual thumbnail errors and permits export', async () => {
    open()
    preview.render.mockImplementation(async (id, _angle, _canvas, _signal, onStart) => { onStart(); if (id === 2) throw new Error('synthetic thumbnail failure') })
    await select()
    expect(await screen.findByText(/Preview failed for source page 2/)).toBeVisible()
    expect(await screen.findByRole('img', { name: 'Preview of source page 1' })).toBeVisible()
    expect(action()).toBeEnabled()
  })
  it('offers clear fallbacks when the preview document cannot load', async () => {
    open(); preview.open.mockRejectedValueOnce(new Error('synthetic preview load failure'))
    await select()
    expect(await screen.findByText(/Thumbnails could not be loaded/)).toBeVisible()
    expect(action()).toBeEnabled()
  })
  it('invalidates downloads on edits, undo/reset, re-export, replacement and clear', async () => {
    open(); const user = await select()
    async function produce() { await user.click(action()); await screen.findByRole('link', { name: 'Download source-organized.pdf' }) }
    await produce(); await produce()
    expect(revokeUrl).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Move source page 2 earlier' }))
    expect(revokeUrl).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('link', { name: 'Download source-organized.pdf' })).not.toBeInTheDocument()
    await produce(); await user.click(screen.getByRole('button', { name: 'Undo last edit' }))
    expect(revokeUrl).toHaveBeenCalledTimes(3)
    await user.click(screen.getByRole('button', { name: 'Rotate source page 1 clockwise 90 degrees' }))
    await produce(); await user.click(screen.getByRole('button', { name: 'Reset changes' }))
    expect(revokeUrl).toHaveBeenCalledTimes(4)
    await produce(); await select(pdfFile('new.pdf', await syntheticPdf([200])))
    expect(revokeUrl).toHaveBeenCalledTimes(5)
    await user.click(action()); await screen.findByRole('link', { name: 'Download new-organized.pdf' })
    await user.click(screen.getByRole('button', { name: 'Clear PDF' }))
    expect(revokeUrl).toHaveBeenCalledTimes(6)
    expect(preview.destroy).toHaveBeenCalled()
    expect(document.querySelectorAll('canvas')).toHaveLength(0)
  })
  it('rejects invalid sources and multiple dropped files', async () => {
    open(); const user = userEvent.setup({ applyAccept: false })
    for (const file of [pdfFile('empty.pdf', new Uint8Array()), pdfFile('bad.pdf', new TextEncoder().encode('not pdf')), pdfFile('zero.pdf', await syntheticPdf([])), pdfFile('encrypted.pdf', await encryptedPdf()), pdfFile('notes.txt', new TextEncoder().encode('text'), 'text/plain')]) {
      await user.upload(screen.getByLabelText('Choose one PDF'), file)
      await waitFor(() => expect(screen.getByLabelText('Choose one PDF')).toBeEnabled())
      expect(screen.getByRole('alert')).toBeVisible(); expect(action()).toBeDisabled()
    }
    const file = pdfFile('valid.pdf', await syntheticPdf([200]))
    fireEvent.drop(screen.getByText(/Or drop one PDF here/).parentElement!, { dataTransfer: { files: [file, file] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Choose exactly one')
  })
  it('locks busy controls, refuses duplicate exports and supports retry after failure', async () => {
    open(); const user = await select()
    let fail: (error: Error) => void = () => {}
    const spy = vi.spyOn(organizer, 'organizePdf').mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
    await user.click(action()); await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    const preparing = screen.getByRole('button', { name: 'Preparing organized PDF…' })
    expect(preparing).toBeDisabled(); expect(screen.getByLabelText('Choose one PDF')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove source page 1' })).toBeDisabled()
    fireEvent.click(preparing); expect(spy).toHaveBeenCalledTimes(1)
    fail(new organizer.OrganizePdfError('Could not organize this PDF.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not organize')
    expect(createUrl).not.toHaveBeenCalled()
    await user.click(action()); expect(await screen.findByRole('link', { name: 'Download source-organized.pdf' })).toBeVisible()
  })
  it('cancels old thumbnails on same-name replacement and destroys/revokes on unmount', async () => {
    const view = open()
    let finish: () => void = () => {}
    let signal: AbortSignal | undefined
    preview.render.mockImplementationOnce((_id, _angle, _canvas, incomingSignal) => { signal = incomingSignal; return new Promise<void>((resolve) => { finish = resolve }) })
    const user = await select(pdfFile('same.pdf', await syntheticPdf([200])))
    await waitFor(() => expect(signal).toBeDefined())
    await select(pdfFile('same.pdf', await syntheticPdf([300, 400])))
    expect(signal!.aborted).toBe(true)
    finish()
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
    await user.click(action()); const link = await screen.findByRole('link', { name: 'Download same-organized.pdf' })
    const url = link.getAttribute('href'); view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith(url); expect(preview.destroy).toHaveBeenCalled()
  })
  it('destroys a preview that resolves after navigation and suppresses a late export', async () => {
    const view = open()
    let finishPreview: (session: PreviewSession) => void = () => {}
    preview.open.mockImplementationOnce(() => new Promise((resolve) => { finishPreview = resolve }))
    const user = await select()
    let finishExport: (bytes: Uint8Array<ArrayBuffer>) => void = () => {}
    const spy = vi.spyOn(organizer, 'organizePdf').mockImplementationOnce(() => new Promise((resolve) => { finishExport = resolve }))
    await user.click(action()); await waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    view.unmount()
    finishPreview({ render: preview.render, destroy: preview.destroy })
    finishExport(await syntheticPdf([200]))
    await waitFor(() => expect(preview.destroy).toHaveBeenCalled())
    expect(createUrl).not.toHaveBeenCalled()
  })
})

