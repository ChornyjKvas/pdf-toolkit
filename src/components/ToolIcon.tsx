import type { ToolIconName } from '../lib/tools'

const paths: Record<ToolIconName, string> = {
  merge: 'M8 3H3v14h5M8 7h8l5 5v9H8zM16 7v5h5M12 16h5m-2.5-2.5v5',
  split: 'M9 3H4v18h5M15 3h5v18h-5M12 3v3m0 3v3m0 3v3m0 3h0',
  rotate: 'M3 10a9 9 0 1 1 2 8M3 4v6h6M10 8h6v9h-6z',
  delete: 'M14 3H5v18h14V8zM14 3v5h5M9 12l6 6m0-6-6 6',
  organize: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  convert: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
}

export function ToolIcon({ name }: { name: ToolIconName }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
