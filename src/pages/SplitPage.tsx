import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SplitOptions } from '../components/SplitOptions'
import { formatSize, LARGE_SELECTION_BYTES, validateFile } from '../lib/pdf/files'
import { PdfMergeError } from '../lib/pdf/merge'
import { parsePageRanges, RangeValidationError } from '../lib/pdf/ranges'
import type { ParsedRanges, SplitMode } from '../lib/pdf/ranges'
import { splitPdf } from '../lib/pdf/split'

type Download = { name: string; url: string; pages: number[] }

export function SplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [mode, setMode] = useState<SplitMode>('extract')
  const [expression, setExpression] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState<'checking' | 'processing' | null>(null)
  const [error, setError] = useState('')
  const [downloads, setDownloads] = useState<Download[]>([])
  const operation = useRef(0)
  const processing = useRef(false)
  const urls = useRef<string[]>([])

  useEffect(() => () => {
    operation.current += 1
    for (const url of urls.current) URL.revokeObjectURL(url)
    urls.current = []
  }, [])

  function invalidate() {
    for (const url of urls.current) URL.revokeObjectURL(url)
    urls.current = []
    setDownloads([])
    setError('')
  }

  function reset() {
    invalidate()
    setFile(null); setPageCount(null); setExpression(''); setTouched(false); setMode('extract')
  }

  async function chooseFiles(incoming: File[]) {
    if (!incoming.length || processing.current) return
    const token = ++operation.current
    reset()
    if (incoming.length !== 1) { setBusy(null); setError('Choose exactly one source PDF. Drop one file at a time.'); return }
    setFile(incoming[0])
    setBusy('checking')
    try {
      const count = await validateFile(incoming[0])
      if (token === operation.current) setPageCount(count)
    } catch (reason) {
      if (token === operation.current) setError(reason instanceof Error ? reason.message : 'Could not read this PDF. Try another file.')
    } finally {
      if (token === operation.current) setBusy(null)
    }
  }

  let selection: ParsedRanges | null = null
  let rangeError = ''
  if (pageCount !== null) {
    try { selection = parsePageRanges(expression, pageCount, mode) }
    catch (reason) { if (touched || expression.length > 0) rangeError = reason instanceof Error ? reason.message : 'Enter a valid page range.' }
  }
  const eligible = !!file && !!selection && !busy
  const summary = selection ? `${selection.pages.length} pages selected · ${mode === 'extract' ? '1 output PDF' : `${selection.groups.length} output PDFs`} · Order: ${selection.normalized}` : 'No valid page selection yet.'

  async function process() {
    if (!eligible || !file || processing.current) return
    processing.current = true
    const token = ++operation.current
    invalidate()
    setBusy('processing')
    const created: Download[] = []
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (token !== operation.current) return
      const outputs = await splitPdf(bytes, expression, mode, file.name)
      if (token !== operation.current) return
      for (const output of outputs) created.push({ name: output.name, pages: output.pages, url: URL.createObjectURL(new Blob([output.bytes], { type: 'application/pdf' })) })
      urls.current = created.map((download) => download.url)
      setDownloads(created)
    } catch (reason) {
      for (const download of created) URL.revokeObjectURL(download.url)
      if (token === operation.current) setError(reason instanceof PdfMergeError || reason instanceof RangeValidationError ? reason.message : 'Could not create the selected PDFs. Try fewer pages, a smaller file, or select it again.')
    } finally {
      if (token === operation.current) { processing.current = false; setBusy(null) }
    }
  }

  return (
    <section className="detail-page merge-page" aria-labelledby="split-title">
      <Link className="back-link" to="/">← All tools</Link>
      <p className="eyebrow">PDF TOOLKIT / 02</p><h1 id="split-title">Split PDF</h1>
      <p className="detail-description">Keep the pages you need. Extract them into one PDF or make a separate file for each page group.</p>
      <p className="merge-privacy">Processing happens on your device. No PDF content is sent to our servers.</p>
      <div className="merge-dropzone" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = processing.current ? 'none' : 'copy' }} onDrop={(event) => { event.preventDefault(); void chooseFiles(Array.from(event.dataTransfer.files)) }}>
        <label htmlFor="split-file" className="picker-label">Choose one PDF</label>
        <input id="split-file" type="file" accept=".pdf,application/pdf" disabled={busy === 'processing'} aria-describedby="split-file-help" onChange={(event) => { const picked = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void chooseFiles(picked) }} />
        <p id="split-file-help">Or drop one PDF here. Choosing a new file resets the page selection and all previous downloads.</p>
      </div>
      <p className="size-help">Large PDFs use extra memory. Above 50 MiB we show a warning, not a size cap. Large or complex files may fail, especially on mobile. Encrypted PDFs are not supported.</p>
      {file && <div className="split-source"><strong>{file.name}</strong><p>{formatSize(file.size)} · {pageCount !== null ? `${pageCount} pages` : busy === 'checking' ? 'Checking PDF…' : 'Not ready'}</p></div>}
      {file && file.size > LARGE_SELECTION_BYTES && <p className="merge-warning" role="status">Large file ({formatSize(file.size)}). Try a smaller PDF or fewer output groups if your browser slows down or runs out of memory.</p>}
      <SplitOptions mode={mode} expression={expression} disabled={pageCount === null || !!busy} error={rangeError} summary={summary} onMode={(value) => { if (processing.current) return; invalidate(); setMode(value) }} onExpression={(value) => { if (processing.current) return; invalidate(); setExpression(value); setTouched(true) }} onBlur={() => setTouched(true)} />
      <div className="merge-controls">
        <button type="button" className="primary-link" disabled={!eligible} onClick={() => void process()}>{busy === 'processing' ? 'Processing…' : mode === 'extract' ? 'Extract pages' : 'Create separate PDFs'}</button>
        <button type="button" className="secondary-button" disabled={!file || busy === 'processing'} onClick={() => { if (processing.current) return; operation.current += 1; reset(); setBusy(null) }}>Clear PDF</button>
      </div>
      <p className="merge-status" role="status">{busy === 'checking' ? 'Checking PDF on your device…' : busy === 'processing' ? 'Creating PDFs on your device… Please keep this page open.' : downloads.length ? `${downloads.length} ${downloads.length === 1 ? 'PDF is' : 'PDFs are'} ready. Download below.` : 'Choose a PDF and enter the pages you need.'}</p>
      {error && <p className="merge-error" role="alert">{error}</p>}
      {downloads.length > 0 && <section className="merge-result" aria-labelledby="split-downloads"><h2 id="split-downloads">Your downloads</h2><ul className="split-downloads">{downloads.map((download) => <li key={download.url}><a className="primary-link" href={download.url} download={download.name}>Download {download.name}</a><span>{download.pages.length} {download.pages.length === 1 ? 'page' : 'pages'} · Source pages {download.pages.join(', ')}</span></li>)}</ul><p>Download each PDF individually. ZIP downloads are not available yet. Changing the file, ranges, or mode clears these results.</p></section>}
    </section>
  )
}
