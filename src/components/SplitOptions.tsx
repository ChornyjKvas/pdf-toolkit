import type { SplitMode } from '../lib/pdf/ranges'
import { MAX_SPLIT_FILES } from '../lib/pdf/ranges'

export function SplitOptions({ mode, expression, disabled, error, summary, onMode, onExpression, onBlur }: {
  mode: SplitMode; expression: string; disabled: boolean; error: string; summary: string
  onMode: (mode: SplitMode) => void; onExpression: (value: string) => void; onBlur: () => void
}) {
  return (
    <div className="split-options">
      <fieldset disabled={disabled}>
        <legend>Choose an output mode</legend>
        <label className="split-mode"><input type="radio" name="split-mode" checked={mode === 'extract'} onChange={() => onMode('extract')} /><span><strong>Extract pages to one PDF</strong><span>Combine every selected page into one PDF, in the exact order you enter.</span></span></label>
        <label className="split-mode"><input type="radio" name="split-mode" checked={mode === 'files'} onChange={() => onMode('files')} /><span><strong>Split into separate files</strong><span>Each comma-separated group becomes its own PDF. Up to {MAX_SPLIT_FILES} files per operation.</span></span></label>
      </fieldset>
      <label className="range-label" htmlFor="page-ranges">{mode === 'extract' ? 'Pages to extract' : 'Page groups to split'}</label>
      <input id="page-ranges" className="range-input" type="text" disabled={disabled} value={expression} onChange={(event) => onExpression(event.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-describedby={`range-help range-summary${error ? ' range-error' : ''}`} placeholder={mode === 'extract' ? 'e.g. 1-3,6' : 'e.g. 1-3,4-5,6'} autoComplete="off" spellCheck={false} />
      <p className="size-help" id="range-help">{mode === 'extract' ? 'Examples: 1-3 · 2,5,7-9 · 5,2-3. The last example makes one PDF with pages 5,2,3 in that order.' : 'Example: 1-3,4-5,6 makes three PDFs: pages 1-3, pages 4-5, and page 6. Each comma starts a new file.'} Spaces are allowed. Page numbers start at 1; duplicate and overlapping selections are not allowed.</p>
      <p id="range-summary" className="selection-summary" role="status">{summary}</p>
      {error && <p id="range-error" className="merge-error" role="alert">{error}</p>}
    </div>
  )
}
