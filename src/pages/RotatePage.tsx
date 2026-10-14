import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateOptions } from '../components/RotateOptions'
import { formatSize, LARGE_SELECTION_BYTES, validateFile } from '../lib/pdf/files'
import { PdfMergeError } from '../lib/pdf/merge'
import { parsePageRanges, RangeValidationError } from '../lib/pdf/ranges'
import { rotatePdf, RotatePdfError } from '../lib/pdf/rotate'
import type { RotationDegrees } from '../lib/pdf/rotate'
import { sourceBasename } from '../lib/pdf/split'

export function RotatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [mode, setMode] = useState<'all' | 'selected'>('all')
  const [angle, setAngle] = useState<RotationDegrees>(90)
  const [expression, setExpression] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState<'checking' | 'processing' | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ name: string; url: string } | null>(null)
  const operation = useRef(0)
  const locked = useRef(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => () => {
    operation.current += 1
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  function invalidate() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setResult(null)
    setError('')
  }

  function reset() {
    invalidate(); setFile(null); setPageCount(null); setMode('all'); setAngle(90); setExpression(''); setTouched(false)
  }

  async function chooseFiles(incoming: File[]) {
    if (!incoming.length || locked.current) return
    const token = ++operation.current
    reset()
    if (incoming.length !== 1) { setError('Choose exactly one source PDF. Drop one file at a time.'); return }
    locked.current = true
    setFile(incoming[0]); setBusy('checking')
    try {
      const count = await validateFile(incoming[0])
      if (token === operation.current) setPageCount(count)
    } catch (reason) {
      if (token === operation.current) setError(reason instanceof Error ? reason.message : 'Could not read this PDF. Try another file.')
    } finally {
      if (token === operation.current) { locked.current = false; setBusy(null) }
    }
  }

  let selectedCount = mode === 'all' ? pageCount ?? 0 : 0
  let normalized = ''
  let rangeError = ''
  if (pageCount !== null && mode === 'selected') {
    try { const selection = parsePageRanges(expression, pageCount, 'extract'); selectedCount = selection.pages.length; normalized = selection.normalized }
    catch (reason) { if (touched || expression.length > 0) rangeError = reason instanceof Error ? reason.message : 'Enter a valid page selection.' }
  }
  const eligible = !!file && selectedCount > 0 && !rangeError && !busy
  const summary = pageCount === null ? 'Choose a PDF to select pages.' : mode === 'all' ? `All ${pageCount} ${pageCount === 1 ? 'page' : 'pages'} selected. Original page order is preserved.` : selectedCount ? `${selectedCount} ${selectedCount === 1 ? 'page' : 'pages'} selected · Targets: ${normalized}. Original page order is preserved.` : 'Enter a valid selection of pages to rotate.'

  async function process() {
    if (!eligible || !file || locked.current) return
    locked.current = true
    const token = ++operation.current
    invalidate(); setBusy('processing')
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (token !== operation.current) return
      const output = await rotatePdf(bytes, mode === 'all' ? { mode: 'all' } : { mode: 'selected', expression }, angle)
      if (token !== operation.current) return
      const url = URL.createObjectURL(new Blob([output], { type: 'application/pdf' }))
      urlRef.current = url
      setResult({ name: `${sourceBasename(file.name)}-rotated.pdf`, url })
    } catch (reason) {
      if (token === operation.current) setError(reason instanceof PdfMergeError || reason instanceof RangeValidationError || reason instanceof RotatePdfError ? reason.message : 'Could not create the rotated PDF. Try a smaller file or select it again.')
    } finally {
      if (token === operation.current) { locked.current = false; setBusy(null) }
    }
  }

  return (
    <section className="detail-page merge-page" aria-labelledby="rotate-title">
      <Link className="back-link" to="/">← All tools</Link>
      <p className="eyebrow">PDF TOOLKIT / 03</p><h1 id="rotate-title">Rotate PDF</h1>
      <p className="detail-description">Turn pages the right way. Rotate every page or just the pages you choose, then download the complete PDF.</p>
      <p className="merge-privacy">Processing happens on your device. No PDF content is sent to our servers.</p>
      <div className="merge-dropzone" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = locked.current ? 'none' : 'copy' }} onDrop={(event) => { event.preventDefault(); void chooseFiles(Array.from(event.dataTransfer.files)) }}>
        <label htmlFor="rotate-file" className="picker-label">Choose one PDF</label>
        <input id="rotate-file" type="file" accept=".pdf,application/pdf" disabled={!!busy} aria-describedby="rotate-file-help" onChange={(event) => { const picked = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void chooseFiles(picked) }} />
        <p id="rotate-file-help">Or drop one PDF here. Replacing or clearing the file resets the options and previous download.</p>
      </div>
      <p className="size-help">Large PDFs use extra memory. Above 50 MiB we show a warning, not a size cap. Large or complex files may fail, especially on mobile. Encrypted PDFs are not supported.</p>
      {file && <div className="split-source"><strong>{file.name}</strong><p>{formatSize(file.size)} · {pageCount !== null ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : busy === 'checking' ? 'Checking PDF…' : 'Not ready'}</p></div>}
      {file && file.size > LARGE_SELECTION_BYTES && <p className="merge-warning" role="status">Large file ({formatSize(file.size)}). Try a smaller PDF if your browser slows down or runs out of memory.</p>}
      <RotateOptions mode={mode} expression={expression} angle={angle} disabled={pageCount === null || !!busy} error={rangeError} summary={summary} onMode={(value) => { if (locked.current) return; invalidate(); setMode(value) }} onExpression={(value) => { if (locked.current) return; invalidate(); setExpression(value); setTouched(true) }} onAngle={(value) => { if (locked.current) return; invalidate(); setAngle(value) }} onBlur={() => setTouched(true)} />
      <div className="merge-controls">
        <button type="button" className="primary-link" disabled={!eligible} onClick={() => void process()}>{busy === 'processing' ? 'Rotating…' : 'Rotate PDF'}</button>
        <button type="button" className="secondary-button" disabled={!file || !!busy} onClick={() => { if (locked.current) return; operation.current += 1; reset() }}>Clear PDF</button>
      </div>
      <p className="merge-status" role="status">{busy === 'checking' ? 'Checking PDF on your device…' : busy === 'processing' ? 'Rotating on your device… Please keep this page open.' : result ? 'Rotated PDF ready. Download below.' : 'Choose a PDF and rotation options to get started.'}</p>
      {error && <p className="merge-error" role="alert">{error}</p>}
      {result && <div className="merge-result"><a className="primary-link" href={result.url} download={result.name}>Download {result.name}</a><p>The complete PDF keeps its original page order. Changing the source or options clears this result.</p></div>}
    </section>
  )
}
