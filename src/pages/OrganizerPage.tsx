import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ORGANIZER_PAGE_SIZE, OrganizerGrid } from '../components/OrganizerGrid'
import { organizePdf, OrganizePdfError, originalPages } from '../lib/pdf/organize'
import type { OrganizedPage } from '../lib/pdf/organize'
import { formatSize, LARGE_SELECTION_BYTES, validateFile } from '../lib/pdf/files'
import { PdfMergeError } from '../lib/pdf/merge'
import { sourceBasename } from '../lib/pdf/split'

export default function OrganizerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sourceId, setSourceId] = useState(0)
  const [count, setCount] = useState<number | null>(null)
  const [pages, setPages] = useState<OrganizedPage[]>([])
  const [previous, setPrevious] = useState<OrganizedPage[] | null>(null)
  const [batch, setBatch] = useState(0)
  const [busy, setBusy] = useState<'checking' | 'exporting' | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)
  const locked = useRef(false)
  const operation = useRef(0)
  const urlRef = useRef<string | null>(null)
  const undoButton = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const movedFocus = useRef<{ id: number; direction: -1 | 1 } | null>(null)
  useEffect(() => {
    const moved = movedFocus.current
    if (!moved) return
    movedFocus.current = null
    const card = gridRef.current?.querySelector('[data-page-id="' + moved.id + '"]')
    const preferred = card?.querySelector<HTMLButtonElement>('button[data-move="' + moved.direction + '"]')
    const fallback = card?.querySelector<HTMLButtonElement>('button[data-move="' + -moved.direction + '"]')
    ;(preferred?.disabled ? fallback : preferred)?.focus()
  }, [pages])
  useEffect(() => () => { operation.current += 1; if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = null }, [])

  function invalidate() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null; setResult(null); setError('')
  }
  function resetSource() { invalidate(); setFile(null); setCount(null); setPages([]); setPrevious(null); setBatch(0) }
  async function choose(incoming: File[]) {
    if (!incoming.length || locked.current) return
    const token = ++operation.current
    resetSource()
    setSourceId(token)
    if (incoming.length !== 1) { setError('Choose exactly one source PDF. Drop one file at a time.'); return }
    locked.current = true; setBusy('checking'); setFile(incoming[0])
    try {
      const pageCount = await validateFile(incoming[0])
      if (token === operation.current) { setCount(pageCount); setPages(originalPages(pageCount)) }
    } catch (reason) { if (token === operation.current) setError(reason instanceof Error ? reason.message : 'Could not read this PDF.') }
    finally { if (token === operation.current) { locked.current = false; setBusy(null) } }
  }
  function edit(next: OrganizedPage[]) {
    if (locked.current || !next.length) return
    invalidate(); setPrevious(pages); setPages(next)
  }
  function move(index: number, direction: -1 | 1) {
    if (locked.current) return
    const target = index + direction
    if (target < 0 || target >= pages.length) return
    const reordered = [...pages]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    movedFocus.current = { id: pages[index].id, direction }
    edit(reordered)
    setBatch(Math.floor(target / ORGANIZER_PAGE_SIZE))
  }
  const changed = pages.length !== count || pages.some((page, index) => page.id !== index + 1 || page.rotation !== 0)
  const lastBatch = Math.max(0, Math.ceil(pages.length / ORGANIZER_PAGE_SIZE) - 1)
  const currentBatch = Math.min(batch, lastBatch)
  const start = currentBatch * ORGANIZER_PAGE_SIZE

  async function download() {
    if (!file || !pages.length || locked.current || busy) return
    locked.current = true; const token = ++operation.current
    invalidate(); setBusy('exporting')
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (token !== operation.current) return
      const output = await organizePdf(bytes, pages)
      if (token !== operation.current) return
      const url = URL.createObjectURL(new Blob([output], { type: 'application/pdf' }))
      urlRef.current = url
      const name = `${sourceBasename(file.name)}-organized.pdf`
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = name
      document.body.append(anchor)
      try { anchor.click() } finally { anchor.remove() }
      setResult({ url, name })
    } catch (reason) {
      if (token === operation.current) { invalidate(); setError(reason instanceof PdfMergeError || reason instanceof OrganizePdfError ? reason.message : 'Could not download this PDF. Try a smaller file or select it again.') }
    } finally { if (token === operation.current) { locked.current = false; setBusy(null) } }
  }

  return <section className="detail-page organizer-page" aria-labelledby="organizer-title">
    <Link className="back-link" to="/">← All tools</Link><p className="eyebrow">PDF TOOLKIT / 05</p><h1 id="organizer-title">Organize PDF</h1>
    <p className="detail-description">See your pages, put them in order, turn them, and remove the ones you don’t need.</p>
    <p className="merge-privacy">Previews and PDF processing happen on your device. No PDF content is sent to our servers.</p>
    <div className="merge-dropzone" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = locked.current ? 'none' : 'copy' }} onDrop={(event) => { event.preventDefault(); void choose(Array.from(event.dataTransfer.files)) }}>
      <label className="picker-label" htmlFor="organizer-file">Choose one PDF</label>
      <input id="organizer-file" type="file" accept=".pdf,application/pdf" disabled={!!busy} onChange={(event) => { const picked = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void choose(picked) }} aria-describedby="organizer-help" />
      <p id="organizer-help">Or drop one PDF here. Use Earlier and Later to move pages, including across page groups. Rotate and Remove act on the original source page shown. At least one page must remain.</p>
    </div>
    <p className="size-help">Above 50 MiB we show a warning, not a guaranteed safe maximum. Large or complex PDFs can use substantial memory and slow the browser. Encrypted PDFs are not supported.</p>
    {file && <div className="split-source"><strong>{file.name}</strong><p>{formatSize(file.size)} · {count !== null ? `${count} source ${count === 1 ? 'page' : 'pages'}` : busy === 'checking' ? 'Checking PDF…' : 'Not ready'}</p></div>}
    {file && file.size > LARGE_SELECTION_BYTES && <p className="merge-warning" role="status">Large file ({formatSize(file.size)}). Try a smaller PDF if previews or export run out of memory.</p>}
    {count !== null && <>
      <div className="organizer-toolbar"><p role="status">{pages.length} of {count} {count === 1 ? 'page' : 'pages'} kept · {changed ? 'Changes made' : 'Original layout'}</p>
        <button ref={undoButton} type="button" className="secondary-button" disabled={!previous || !!busy} onClick={() => { if (locked.current || !previous) return; invalidate(); setPages(previous); setPrevious(null) }}>Undo last edit</button>
        <button type="button" className="secondary-button" disabled={!changed || !!busy} onClick={() => { edit(originalPages(count)); setBatch(0) }}>Reset changes</button>
      </div>
      <nav className="organizer-pagination" aria-label="Page groups">
        <button type="button" disabled={currentBatch === 0 || !!busy} onClick={() => setBatch(currentBatch - 1)}>Previous pages</button>
        <span>Positions {start + 1}–{Math.min(start + ORGANIZER_PAGE_SIZE, pages.length)} of {pages.length}</span>
        <button type="button" disabled={currentBatch === lastBatch || !!busy} onClick={() => setBatch(currentBatch + 1)}>Next pages</button>
      </nav>
      <div ref={gridRef}><OrganizerGrid key={sourceId} file={file!} pages={pages.slice(start, start + ORGANIZER_PAGE_SIZE)} start={start} total={pages.length} disabled={!!busy} onMove={move} onRotate={(id, amount) => edit(pages.map((page) => page.id === id ? { ...page, rotation: (page.rotation + amount) % 360 } : page))} onRemove={(id) => { if (pages.length <= 1) return; edit(pages.filter((page) => page.id !== id)); setTimeout(() => undoButton.current?.focus(), 0) }} /></div>
    </>}
    <div className="merge-controls"><button className="primary-link" type="button" disabled={!pages.length || !!busy} onClick={() => void download()}>{busy === 'exporting' ? 'Preparing organized PDF…' : 'Download organized PDF'}</button>
      <button className="secondary-button" type="button" disabled={!file || !!busy} onClick={() => { if (locked.current) return; operation.current += 1; resetSource() }}>Clear PDF</button></div>
    <p className="merge-status" role="status">{busy === 'checking' ? 'Checking PDF on your device…' : busy === 'exporting' ? 'Creating your organized PDF… Please keep this page open.' : result ? 'PDF ready. If the download did not start, use the link below.' : 'Edits apply to this selected source. Undo restores the most recent edit; Reset changes restores every original page.'}</p>
    {error && <p className="merge-error" role="alert">{error}</p>}
    {result && <div className="merge-result"><a className="primary-link" href={result.url} download={result.name}>Download {result.name}</a></div>}
    <p className="size-help">Previews show six pages at a time. Use buttons for reordering; drag-to-reorder is not available. Editing can invalidate signatures and may not preserve advanced forms, bookmarks, or document metadata.</p>
  </section>
}
