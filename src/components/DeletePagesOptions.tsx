export function DeletePagesOptions({ expression, disabled, error, summary, onExpression, onBlur }: {
  expression: string; disabled: boolean; error: string; summary: string
  onExpression: (value: string) => void; onBlur: () => void
}) {
  return (
    <div className="split-options">
      <label className="range-label" htmlFor="delete-ranges">Pages to delete</label>
      <input id="delete-ranges" className="range-input" type="text" value={expression} disabled={disabled} onChange={(event) => onExpression(event.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-describedby={`delete-help delete-summary${error ? ' delete-range-error' : ''}`} placeholder="e.g. 2,4-6 or 1-3" autoComplete="off" spellCheck={false} />
      <p className="size-help" id="delete-help">Page numbers start at 1. Spaces around commas and hyphens are allowed. Duplicate, overlapping, or descending ranges are not. At least one page must remain. Retained pages keep their original order.</p>
      <p id="delete-summary" className="selection-summary" role="status">{summary}</p>
      {error && <p id="delete-range-error" className="merge-error" role="alert">{error}</p>}
    </div>
  )
}
