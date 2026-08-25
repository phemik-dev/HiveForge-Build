/**
 * migration domain contract: secret-safe import of legacy settings and credentials.
 *
 * The legacy source is a folder path (defaults to the prior default harness home).
 * Preview responses must never include secret values. Apply performs the import
 * entirely on the Host.
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** Preview of a legacy settings document (namespaces only; values never returned). */
export interface LegacySettingsPreview {
  /** Whether a settings document exists at the probed path. */
  present: boolean
  /** Top-level namespace keys in the legacy document (order preserved from Object.keys). */
  namespaces: string[]
  /** Safe parse/read failure text; never includes source lines or secret values. */
  error?: string
}

/** Preview of a legacy credentials document (refs and record counts; values never returned). */
export interface LegacyCredentialsPreview {
  /** Whether a credentials document exists at the probed path. */
  present: boolean
  /** Stored credential reference names (values never returned). */
  refs: string[]
  /** Number of stored credential records (values never returned). */
  recordCount: number
  /** Safe parse/read failure text; never includes source lines or secret values. */
  error?: string
}

/** Result of `migration.preview`. */
export interface MigrationPreviewValue {
  /** Legacy folder probed. */
  legacyHome: string
  /** Resolved legacy settings document path the Host inspected. */
  settingsPath: string
  /** Resolved legacy credentials document path the Host inspected. */
  credentialsPath: string
  /** Settings preview. */
  settings: LegacySettingsPreview
  /** Credentials preview. */
  credentials: LegacyCredentialsPreview
}

/** One skipped settings namespace in an apply operation. */
export interface SkippedSettingsNamespace {
  ns: string
  reason: 'unregistered' | 'invalid-namespace' | 'invalid-section' | 'rejected'
}

/** One skipped credential ref in an apply operation. */
export interface SkippedCredentialRef {
  ref: string
  reason: 'invalid-ref' | 'locked' | 'rejected'
}

/** Result of `migration.apply`. */
export interface MigrationApplyValue {
  legacyHome: string
  settings: {
    imported: string[]
    skipped: SkippedSettingsNamespace[]
    /** Safe parse/read failure text; never includes source lines or secret values. */
    error?: string
  }
  credentials: {
    importedRefs: string[]
    skippedRefs: SkippedCredentialRef[]
    importedRecords: number
    skippedRecords: number
    /** Safe parse/read failure text; never includes source lines or secret values. */
    error?: string
  }
}

/** Migration-domain unary methods (the map keys migration.* of RpcMethodMap). */
export interface MigrationApi {
  /** Preview legacy documents without returning any secret values. */
  preview(request: RpcRequest<{ legacyHome?: string }>): Promise<RpcResponse<MigrationPreviewValue>>
  /** Import legacy settings + credentials into the current writable stores. */
  apply(request: RpcRequest<{ legacyHome?: string }>): Promise<RpcResponse<MigrationApplyValue>>
}
