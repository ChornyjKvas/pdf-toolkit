import { describe, expect, it } from 'vitest'
import { RenderQueue } from './renderQueue'

describe('bounded rendering queue', () => {
  it('runs at most two jobs, including after a job fails', async () => {
    const queue = new RenderQueue(2)
    let active = 0; let peak = 0
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, index) => queue.run(async () => {
      active += 1; peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 2))
      active -= 1
      if (index === 3) throw new Error('synthetic thumbnail failure')
      return index
    }, new AbortController().signal)))
    expect(peak).toBe(2)
    expect(active).toBe(0)
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(11)
  })
  it('removes cancelled queued jobs before they start', async () => {
    const queue = new RenderQueue(1)
    let release: () => void = () => {}
    const first = queue.run(() => new Promise<void>((resolve) => { release = resolve }), new AbortController().signal)
    await Promise.resolve()
    const controller = new AbortController()
    let started = false
    const second = queue.run(async () => { started = true }, controller.signal)
    const assertion = expect(second).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort(); release()
    await assertion; await first
    expect(started).toBe(false)
  })
  it('rejects already-cancelled jobs', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(new RenderQueue().run(async () => {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
