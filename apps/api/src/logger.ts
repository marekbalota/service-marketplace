import Elysia from 'elysia'

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`

export const logger = new Elysia({ name: 'logger' })
  .derive({ as: 'global' }, () => ({ startTime: Date.now() }))
  .onAfterHandle({ as: 'global' }, ({ request, set, startTime }) => {
    const status = set.status ?? 200
    const ms = Date.now() - startTime
    console.log(`${green(request.method)} ${new URL(request.url).pathname} ${status} ${dim(`${ms}ms`)}`)
  })
  .onError({ as: 'global' }, ({ request, error, code }) => {
    const status = 'status' in error ? error.status : 500
    const message = error instanceof Error ? error.message : String(error)
    console.error(`${red(request.method)} ${new URL(request.url).pathname} ${red(String(status))} [${code}] ${message}`)
  })
