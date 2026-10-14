import { useEffect, useRef, useState } from 'react'
import type { PreviewSession } from '../lib/preview/pdfPreview'

export function PageThumbnail({ session, id, rotation }: { session: PreviewSession; id: number; rotation: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'queued' | 'rendering' | 'ready' | 'error'>('queued')
  useEffect(() => {
    const target = canvas.current!
    const controller = new AbortController()
    void session.render(id, rotation, target, controller.signal, () => { if (!controller.signal.aborted) setState('rendering') }).then(() => {
      if (!controller.signal.aborted) setState('ready')
    }).catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => { controller.abort(); target.width = 0; target.height = 0 }
  }, [session, id, rotation])
  return <div className="thumbnail-frame" data-render-state={state}>
    <canvas ref={canvas} aria-label={`Preview of source page ${id}`} role="img" hidden={state !== 'ready'} />
    {(state === 'queued' || state === 'rendering') && <p role="status">Loading page {id} preview…</p>}
    {state === 'error' && <p role="alert">Preview failed for source page {id}. You can still arrange and export the validated pages.</p>}
  </div>
}
