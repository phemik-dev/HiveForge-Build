import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@hiveforge-ai/dsh-client-modules',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
