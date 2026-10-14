export const tools = [
  { name: 'Merge PDF', path: '/merge-pdf', mark: '01', description: 'Bring multiple PDFs together in one document.', detail: 'Combine documents in the order you choose.' },
  { name: 'Split PDF', path: '/split-pdf', mark: '02', description: 'Take just the pages you need from a PDF.', detail: 'Extract individual pages or selected page ranges.' },
  { name: 'Rotate PDF', path: '/rotate-pdf', mark: '03', description: 'Give sideways pages the right perspective.', detail: 'Change the orientation of selected pages.' },
  { name: 'Delete Pages', path: '/delete-pdf', mark: '04', description: 'Keep the useful pages. Leave the rest behind.', detail: 'Remove unwanted pages from a document.' },
] as const

export type Tool = (typeof tools)[number]
