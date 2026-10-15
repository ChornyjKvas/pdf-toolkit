export type ToolCategory = 'edit' | 'convert'
export type ToolIconName = 'merge' | 'split' | 'rotate' | 'delete' | 'organize' | 'convert'
export type Tool = {
  id: string
  name: string
  path: `/${string}`
  mark: string
  description: string
  detail: string
  category: ToolCategory
  available: boolean
  icon: ToolIconName
}

export const tools = [
  { id: 'merge', name: 'Merge PDF', path: '/merge-pdf', mark: '01', description: 'Combine files into one PDF.', detail: 'Combine documents in the order you choose.', category: 'edit', available: true, icon: 'merge' },
  { id: 'split', name: 'Split PDF', path: '/split-pdf', mark: '02', description: 'Extract the pages you need.', detail: 'Extract individual pages or selected page ranges.', category: 'edit', available: true, icon: 'split' },
  { id: 'rotate', name: 'Rotate PDF', path: '/rotate-pdf', mark: '03', description: 'Turn pages the right way.', detail: 'Change the orientation of selected pages.', category: 'edit', available: true, icon: 'rotate' },
  { id: 'delete', name: 'Delete Pages', path: '/delete-pdf', mark: '04', description: 'Remove unwanted pages.', detail: 'Remove unwanted pages from a document.', category: 'edit', available: true, icon: 'delete' },
  { id: 'organize', name: 'Organize PDF', path: '/organize-pdf', mark: '05', description: 'Reorder, rotate, and remove pages.', detail: 'Arrange a single PDF visually before downloading.', category: 'edit', available: true, icon: 'organize' },
] as const satisfies readonly Tool[]

export function getAvailableTools(catalog: readonly Tool[] = tools): Tool[] {
  return catalog.filter((tool) => tool.available)
}
