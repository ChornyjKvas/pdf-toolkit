import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DeletePagesOptions } from '../components/DeletePagesOptions'
import { deletePages, DeletePagesError, getDeletionPlan } from '../lib/pdf/deletePages'
import type { DeletionPlan } from '../lib/pdf/deletePages'
import { formatSize, LARGE_SELECTION_BYTES, validateFile } from '../lib/pdf/files'
import { PdfMergeError } from '../lib/pdf/merge'
import { RangeValidationError } from '../lib/pdf/ranges'
import { sourceBasename } from '../lib/pdf/split'

export function DeletePagesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [expression, setExpression] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState<'checking' | 'processing' | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ name: string; url: string; remaining: number } | null>(null)
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
    setResult(null); setError('')
  }

  function reset() { invalidate(); setFile(null); setPageCount(null); setExpression(''); setTouched(false) }

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

  let plan: DeletionPlan | null = null
  let rangeError = ''
  if (pageCount !== null) {
    try { plan = getDeletionPlan(expression, pageCount) }
    catch (reason) { if (touched || expression.length > 0) rangeError = reason instanceof Error ? reason.message : 'Enter a valid page selection.' }
  }
  const eligible = !!file && !!plan && !busy
  const summary = plan ? `Delete ${plan.deletedPages.length} ${plan.deletedPages.length === 1 ? 'page' : 'pages'}; keep ${plan.retainedPages.length} ${plan.retainedPages.length === 1 ? 'page' : 'pages'}.` : 'Choose a PDF and select one or more pages to delete.'

  async function process() {
    if (!eligible || !file || !plan || locked.current) return
    locked.current = true
    const token = ++operation.current
    invalidate(); setBusy('processing')
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (token !== operation.current) return
      const output = await deletePages(bytes, expression)
      if (token !== operation.current) return
      const url = URL.createObjectURL(new Blob([output], { type: 'application/pdf' }))
      urlRef.current = url
      setResult({ name: `${sourceBasename(file.name)}-pages-removed.pdf`, url, remaining: plan.retainedPages.length })
    } catch (reason) {
      if (token === operation.current) setError(reason instanceof PdfMergeError || reason instanceof RangeValidationError || reason instanceof DeletePagesError ? reason.message : 'Could not create the edited PDF. Try a smaller file or select it again.')
    } finally {
      if (token === operation.current) { locked.current = false; setBusy(null) }
    }
  }

  return (
    <section className="detail-page merge-page" aria-labelledby="delete-title">
      <Link className="back-link" to="/">← All tools</Link>
      <p className="eyebrow">PDF TOOLKIT / 04</p><h1 id="delete-title">Delete Pages</h1>
      <p className="detail-description">Keep the useful pages. Choose the pages to remove and download a new PDF with the rest in their original order.</p>
      <p className="merge-privacy">Processing happens on your device. No PDF content is sent to our servers.</p>
      <div className="merge-dropzone" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = locked.current ? 'none' : 'copy' }} onDrop={(event) => { event.preventDefault(); void chooseFiles(Array.from(event.dataTransfer.files)) }}>
        <label htmlFor="delete-file" className="picker-label">Choose one PDF</label>
        <input id="delete-file" type="file" accept=".pdf,application/pdf" disabled={!!busy} aria-describedby="delete-file-help" onChange={(event) => { const picked = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void chooseFiles(picked) }} />
        <p id="delete-file-help">Or drop one PDF here. Replacing or clearing the file resets the page selection and previous download. Each operation starts from your selected source.</p>
      </div>
      <p className="size-help">Large PDFs use extra memory. Above 50 MiB we show a warning, not a size cap. Large or complex files may fail, especially on mobile. Encrypted PDFs are not supported.</p>
      {file && <div className="split-source"><strong>{file.name}</strong><p>{formatSize(file.size)} · {pageCount !== null ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : busy === 'checking' ? 'Checking PDF…' : 'Not ready'}</p></div>}
      {file && file.size > LARGE_SELECTION_BYTES && <p className="merge-warning" role="status">Large file ({formatSize(file.size)}). Try a smaller PDF if your browser slows down or runs out of memory.</p>}
      <DeletePagesOptions expression={expression} disabled={pageCount === null || !!busy} error={rangeError} summary={summary} onExpression={(value) => { if (locked.current) return; invalidate(); setExpression(value); setTouched(true) }} onBlur={() => setTouched(true)} />
      <div className="merge-controls">
        <button type="button" className="primary-link" disabled={!eligible} onClick={() => void process()}>{busy === 'processing' ? 'Removing pages…' : 'Delete pages'}</button>
        <button type="button" className="secondary-button" disabled={!file || !!busy} onClick={() => { if (locked.current) return; operation.current += 1; reset() }}>Clear PDF</button>
      </div>
      <p className="merge-status" role="status">{busy === 'checking' ? 'Checking PDF on your device…' : busy === 'processing' ? 'Removing pages on your device… Please keep this page open.' : result ? `Edited PDF ready: ${result.remaining} ${result.remaining === 1 ? 'page' : 'pages'} remaining. Download below.` : 'Select at least one page to remove, keeping at least one page.'}</p>
      {error && <p className="merge-error" role="alert">{error}</p>}
      {result && <div className="merge-result"><a className="primary-link" href={result.url} download={result.name}>Download {result.name}</a><p>Retained pages keep their original order. Changing the source or page selection clears this result.</p></div>}
    </section>
  )
}
