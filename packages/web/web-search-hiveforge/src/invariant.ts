/**
 * Package-owned invariant companion for `@hiveforge-ai/dsh-web-search-hiveforge`.
 * @module @hiveforge-ai/dsh-web-search-hiveforge/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@hiveforge-ai/cordis'
import type { InvariantInstaller } from '@hiveforge-ai/dsh-invariants'

const PACKAGE_NAME = '@hiveforge-ai/dsh-web-search-hiveforge'

/** Cordis companion plugin name. */
export const name = 'web-search-hiveforge-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package emits a pre-dispatch log event but owns no
 * later authoritative dispatch event to relate it to. Exact envelope equality
 * is pinned at the provider boundary instead.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
