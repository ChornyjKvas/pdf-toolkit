import { describe, expect, it } from 'vitest'
import { getAvailableTools, tools } from './tools'
import type { Tool } from './tools'

describe('tool availability', () => {
  it('keeps unimplemented conversion entries out of actionable tools', () => {
    const planned: Tool = { ...tools[0], id: 'planned-conversion', name: 'Planned conversion', path: '/planned-conversion', category: 'convert', available: false, icon: 'convert' }
    expect(getAvailableTools([...tools, planned])).toEqual(tools)
    expect(getAvailableTools([planned])).toEqual([])
  })
})
