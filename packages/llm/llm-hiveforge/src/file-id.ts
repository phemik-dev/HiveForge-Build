/** HiveForge Files API identifiers. @module dsh-llm-hiveforge/file-id */

import type { Branded } from '@hiveforge-ai/dsh-brand'

/** Opaque identifier returned by the HiveForge Files API. */
export type HiveForgeFileId = Branded<'HiveForgeFileId'>

/**
 * Brand a provider-returned file identifier after wire validation.
 * @param id - non-empty Files API identifier.
 * @returns the same string with its provider identity attached at type level.
 */
export function HiveForgeFileId(id: string): HiveForgeFileId {
  return id as HiveForgeFileId
}

/** Non-secret digest identifying one endpoint and API-key file namespace. */
export type HiveForgeFileScope = Branded<'HiveForgeFileScope'>

/**
 * Brand a locally derived namespace digest.
 * @param scope - SHA-256 digest of endpoint and API key.
 * @returns the same string with namespace identity attached at type level.
 */
export function HiveForgeFileScope(scope: string): HiveForgeFileScope {
  return scope as HiveForgeFileScope
}
