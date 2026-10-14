import { formatSize } from '../lib/pdf/files'

export type SelectedPdf = { id: number; file: File; pages?: number; error?: string }

export function MergeFileList({ files, disabled, onMove, onRemove }: {
  files: SelectedPdf[]
  disabled: boolean
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (id: number) => void
}) {
  return (
    <ol className="merge-files" aria-label="Selected PDFs in merge order">
      {files.map((entry, index) => (
        <li key={entry.id} className="merge-file">
          <span className="file-position" aria-hidden="true">{index + 1}</span>
          <div className="file-info"><strong>{entry.file.name}</strong><p>{formatSize(entry.file.size)} · {entry.error ? 'Not ready' : `${entry.pages} ${entry.pages === 1 ? 'page' : 'pages'}`}</p>{entry.error && <p className="file-error" role="alert">{entry.error}</p>}</div>
          <div className="file-actions">
            <button type="button" disabled={disabled || index === 0} aria-label={`Move up ${entry.file.name}, position ${index + 1}`} onClick={() => onMove(index, -1)}>↑ <span>Up</span></button>
            <button type="button" disabled={disabled || index === files.length - 1} aria-label={`Move down ${entry.file.name}, position ${index + 1}`} onClick={() => onMove(index, 1)}>↓ <span>Down</span></button>
            <button type="button" disabled={disabled} aria-label={`Remove ${entry.file.name}, position ${index + 1}`} onClick={() => onRemove(entry.id)}>Remove</button>
          </div>
        </li>
      ))}
    </ol>
  )
}
