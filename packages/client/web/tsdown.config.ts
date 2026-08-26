import { staticLinked } from '../tsdown.client.ts'

export default staticLinked(
  '@hiveforge-ai/dsh-client-web',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
