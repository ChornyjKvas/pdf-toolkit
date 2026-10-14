import type { RotationDegrees } from '../lib/pdf/rotate'

export function RotateOptions({ mode, expression, angle, disabled, error, summary, onMode, onExpression, onAngle, onBlur }: {
  mode: 'all' | 'selected'; expression: string; angle: RotationDegrees; disabled: boolean; error: string; summary: string
  onMode: (mode: 'all' | 'selected') => void; onExpression: (value: string) => void; onAngle: (angle: RotationDegrees) => void; onBlur: () => void
}) {
  return (
    <div className="split-options">
      <fieldset disabled={disabled}>
        <legend>Which pages?</legend>
        <label className="split-mode"><input type="radio" name="rotate-mode" checked={mode === 'all'} onChange={() => onMode('all')} /><span><strong>All pages</strong><span>Apply the rotation to every page in the document.</span></span></label>
        <label className="split-mode"><input type="radio" name="rotate-mode" checked={mode === 'selected'} onChange={() => onMode('selected')} /><span><strong>Selected pages</strong><span>Rotate only the page numbers or ranges you enter.</span></span></label>
      </fieldset>
      {mode === 'selected' && <>
        <label className="range-label" htmlFor="rotate-ranges">Pages to rotate</label>
        <input id="rotate-ranges" className="range-input" type="text" disabled={disabled} value={expression} onChange={(event) => onExpression(event.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-describedby={`rotate-help rotate-summary${error ? ' rotate-range-error' : ''}`} placeholder="e.g. 1,3-5 or 5,2-3" autoComplete="off" spellCheck={false} />
        <p className="size-help" id="rotate-help">Page numbers start at 1. Spaces are allowed; duplicates and overlapping ranges are not. Your selection chooses which pages rotate. The downloaded PDF keeps every page in its original order.</p>
      </>}
      <fieldset disabled={disabled} className="rotation-directions">
        <legend>Rotation to apply</legend>
        <label><input type="radio" name="rotation-angle" checked={angle === 90} onChange={() => onAngle(90)} />90° clockwise</label>
        <label><input type="radio" name="rotation-angle" checked={angle === 180} onChange={() => onAngle(180)} />180°</label>
        <label><input type="radio" name="rotation-angle" checked={angle === 270} onChange={() => onAngle(270)} />90° counterclockwise</label>
      </fieldset>
      <p className="size-help">Rotation is added to each page’s existing angle. For example, a page at 90° rotated 90° counterclockwise ends at 0°. A new operation always starts from your original source file.</p>
      <p id="rotate-summary" className="selection-summary" role="status">{summary}</p>
      {error && <p id="rotate-range-error" className="merge-error" role="alert">{error}</p>}
    </div>
  )
}
