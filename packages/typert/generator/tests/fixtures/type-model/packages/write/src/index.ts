import { Service } from '@hiveforge-ai/cordis'

/** Service whose public annotations are intentionally absent. */
export class WritableService extends Service {
  value = 1

  echo(input = 'value') {
    return input
  }
}

declare module '@hiveforge-ai/cordis' {
  interface Context {
    writable: WritableService
  }
}

export default WritableService
