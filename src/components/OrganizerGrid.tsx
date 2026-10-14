import { useEffect, useState } from 'react'
import type { OrganizedPage } from '../lib/pdf/organize'
import { openPreview } from '../lib/preview/pdfPreview'
import type { PreviewSession } from '../lib/preview/pdfPreview'
import { PageThumbnail } from './PageThumbnail'

export const ORGANIZER_PAGE_SIZE = 6

export function OrganizerGrid({ file, pages, start, total, disabled, onMove, onRotate, onRemove }: {
  file: File; pages: OrganizedPage[]; start: number; total: number; disabled: boolean
  onMove: (index: number, direction: -1 | 1) => void; onRotate: (id: number, amount: number) => void; onRemove: (id: number) => void
}) {
  const [session, setSession] = useState<PreviewSession | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let active: PreviewSession | null = null
    void openPreview(file, controller.signal).then((opened) => {
      active = opened
      if (controller.signal.aborted) { void opened.destroy().catch(() => {}); return }
      setSession(opened)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => { controller.abort(); void active?.destroy().catch(() => {}) }
  }, [file])
  return <>
    {error && <p role="alert" className="merge-error">Thumbnails could not be loaded. You can still use the page controls and export. Try another PDF if previews are needed.</p>}
    <ol className="organizer-grid" aria-label="Pages in current order" start={start + 1}>
      {pages.map((page, offset) => {
        const index = start + offset
        return <li className="organizer-card" key={page.id} data-page-id={page.id}>
          <h2>Source page {page.id}</h2><p className="page-position">Position {index + 1} of {total} · Rotation added: {page.rotation}°</p>
          {session ? <PageThumbnail key={`${page.id}-${page.rotation}`} session={session} id={page.id} rotation={page.rotation} /> : <div className="thumbnail-frame"><p role={error ? undefined : 'status'}>{error ? `No preview for page ${page.id}` : `Loading page ${page.id} preview…`}</p></div>}
          <div className="page-controls">
            <button type="button" disabled={disabled || index === 0} aria-label={`Move source page ${page.id} earlier`} onClick={() => onMove(index, -1)}>← Earlier</button>
            <button type="button" disabled={disabled || index === total - 1} aria-label={`Move source page ${page.id} later`} onClick={() => onMove(index, 1)}>Later →</button>
            <button type="button" disabled={disabled} aria-label={`Rotate source page ${page.id} clockwise 90 degrees`} onClick={() => onRotate(page.id, 90)}>↻ 90°</button>
            <button type="button" disabled={disabled} aria-label={`Rotate source page ${page.id} counterclockwise 90 degrees`} onClick={() => onRotate(page.id, 270)}>↺ 90°</button>
            <button type="button" disabled={disabled || total === 1} aria-label={`Remove source page ${page.id}`} onClick={() => onRemove(page.id)}>Remove</button>
          </div>
        </li>
      })}
    </ol>
  </>
}
