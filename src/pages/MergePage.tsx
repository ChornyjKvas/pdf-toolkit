import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MergeFileList } from '../components/MergeFileList'
import type { SelectedPdf } from '../components/MergeFileList'
import { LARGE_SELECTION_BYTES, formatSize, validateFile } from '../lib/pdf/files'
import { mergePdfs, PdfMergeError } from '../lib/pdf/merge'

export function MergePage() {
  const [files, setFiles] = useState<SelectedPdf[]>([])
  const [busy, setBusy] = useState<'checking' | 'merging' | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; pages: number } | null>(null)
  const nextId = useRef(0)
  const operation = useRef(0)
  const locked = useRef(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => () => {
    operation.current += 1
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  function invalidateResult() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setResult(null)
    setError('')
  }

  async function addFiles(incoming: File[]) {
    if (!incoming.length || locked.current) return
    locked.current = true
    const token = ++operation.current
    invalidateResult()
    setBusy('checking')
    const additions: SelectedPdf[] = []
    try {
      for (const file of incoming) {
        const entry: SelectedPdf = { id: nextId.current++, file }
        try { entry.pages = await validateFile(file) }
        catch (reason) { entry.error = reason instanceof Error ? reason.message : 'Could not read this PDF. Try another file.' }
        if (operation.current !== token) return
        additions.push(entry)
      }
      setFiles((current) => [...current, ...additions])
    } finally {
      if (operation.current === token) { locked.current = false; setBusy(null) }
    }
  }

  function moveFile(index: number, direction: -1 | 1) {
    if (locked.current) return
    invalidateResult()
    setFiles((current) => {
      const reordered = [...current]
      const target = index + direction
      if (target < 0 || target >= reordered.length) return current
      ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
      return reordered
    })
  }

  const invalidCount = files.filter((entry) => entry.error).length
  const eligible = files.length >= 2 && invalidCount === 0 && !busy
  const totalBytes = files.reduce((sum, entry) => sum + entry.file.size, 0)
  const pageCount = files.reduce((sum, entry) => sum + (entry.pages ?? 0), 0)

  async function merge() {
    if (!eligible || locked.current) return
    locked.current = true
    const token = ++operation.current
    invalidateResult()
    setBusy('merging')
    try {
      // Give the browser a chance to paint the busy state before PDF work.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const inputs: Uint8Array[] = []
      for (const entry of files) {
        inputs.push(new Uint8Array(await entry.file.arrayBuffer()))
        if (operation.current !== token) return
      }
      const bytes = await mergePdfs(inputs)
      if (operation.current !== token) return
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      urlRef.current = url
      setResult({ url, pages: pageCount })
    } catch (reason) {
      if (operation.current === token) setError(reason instanceof PdfMergeError ? reason.message : 'Could not create the merged PDF. Try fewer or smaller files, or select them again.')
    } finally {
      if (operation.current === token) { locked.current = false; setBusy(null) }
    }
  }

  return (
    <section className="detail-page merge-page" aria-labelledby="merge-title">
      <Link className="back-link" to="/">← All tools</Link>
      <p className="eyebrow">PDF TOOLKIT / 01</p>
      <h1 id="merge-title">Merge PDF</h1>
      <p className="detail-description">Bring your documents together. Choose two or more PDFs, set their order, and download one file.</p>
      <p className="merge-privacy">Processing happens on your device. No PDF content is sent to our servers.</p>
      <div className="merge-dropzone" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy' }} onDrop={(event) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)) }}>
        <label htmlFor="pdf-files" className="picker-label">Choose PDF files</label>
        <input id="pdf-files" type="file" accept=".pdf,application/pdf" multiple disabled={!!busy} aria-describedby="picker-help size-help" onChange={(event) => { const picked = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void addFiles(picked) }} />
        <p id="picker-help">Or drop PDFs here. You can add more files, then use Up and Down to arrange them. Every page is included in the order shown.</p>
      </div>
      <p className="size-help" id="size-help">Large PDFs use extra memory. Above 50 MiB total, we show a warning; there is no fixed size cap. Very large or complex files may fail, especially on mobile. Encrypted PDFs are not supported.</p>
      {totalBytes > LARGE_SELECTION_BYTES && <p className="merge-warning" role="status">Large selection ({formatSize(totalBytes)}). Try smaller batches if your browser slows down or runs out of memory.</p>}
      <div className="merge-summary"><h2>Merge order</h2><span>{files.length} files · {pageCount} pages · {formatSize(totalBytes)}</span></div>
      {!files.length && <p className="empty-selection">No files selected. Choose at least two valid PDFs to get started.</p>}
      <MergeFileList files={files} disabled={!!busy} onMove={moveFile} onRemove={(id) => { if (locked.current) return; invalidateResult(); setFiles((current) => current.filter((entry) => entry.id !== id)) }} />
      {invalidCount > 0 && <p className="merge-error">Remove the files marked Not ready before merging.</p>}
      <div className="merge-controls">
        <button className="primary-link" type="button" disabled={!eligible} onClick={() => void merge()}>{busy === 'merging' ? 'Merging…' : 'Merge PDFs'}</button>
        <button className="secondary-button" type="button" disabled={!files.length || !!busy} onClick={() => { if (locked.current) return; invalidateResult(); setFiles([]) }}>Clear all</button>
      </div>
      <p className="merge-status" role="status" aria-live="polite">{busy === 'checking' ? 'Checking PDFs…' : busy === 'merging' ? 'Merging on your device… Please keep this page open.' : result ? `Merged PDF ready: ${result.pages} pages. Download it below.` : eligible ? 'Ready to merge. All pages will follow the order above.' : 'At least two valid PDFs are required.'}</p>
      {error && <p className="merge-error" role="alert">{error}</p>}
      {result && <div className="merge-result"><a className="primary-link" href={result.url} download="merged.pdf">Download merged.pdf <span aria-hidden="true">↓</span></a><p>This download matches the current list. Changing files or order clears it.</p></div>}
    </section>
  )
}
