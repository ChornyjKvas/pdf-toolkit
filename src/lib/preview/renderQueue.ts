export class RenderQueue {
  private active = 0
  private pending: Array<() => void> = []
  constructor(privateLimit = 2) { this.limit = privateLimit }
  private readonly limit: number

  run<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let started = false
      const abort = () => {
        if (!started) {
          this.pending = this.pending.filter((job) => job !== start)
          signal.removeEventListener('abort', abort)
          reject(new DOMException('Preview cancelled', 'AbortError'))
        }
      }
      const start = () => {
        if (signal.aborted) { abort(); return }
        started = true
        this.active += 1
        Promise.resolve().then(task).then(resolve, reject).finally(() => {
          this.active -= 1
          signal.removeEventListener('abort', abort)
          this.drain()
        })
      }
      if (signal.aborted) { abort(); return }
      signal.addEventListener('abort', abort, { once: true })
      this.pending.push(start)
      this.drain()
    })
  }

  private drain() {
    while (this.active < this.limit && this.pending.length) this.pending.shift()?.()
  }
}
