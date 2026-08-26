/**
 * migration domain zod schemas (names derived from map keys).
 */

import { z } from 'zod'
import type {
  LegacyCredentialsPreview,
  LegacySettingsPreview,
  MigrationApplyValue,
  SkippedCredentialRef,
  SkippedSettingsNamespace,
} from './migration.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'

/** migration.preview request payload. */
export const migrationPreviewRequestSchema = z.object({
  legacyHome: z.string().min(1).optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'migration.preview'>>>

const legacySettingsPreviewSchema = z.object({
  present: z.boolean(),
  namespaces: z.array(z.string()),
  error: z.string().optional(),
}) satisfies z.ZodType<Wire<LegacySettingsPreview>>

const legacyCredentialsPreviewSchema = z.object({
  present: z.boolean(),
  refs: z.array(z.string()),
  recordCount: z.number().int().nonnegative(),
  error: z.string().optional(),
}) satisfies z.ZodType<Wire<LegacyCredentialsPreview>>

/** migration.preview response value. */
export const migrationPreviewValueSchema = z.object({
  legacyHome: z.string(),
  settingsPath: z.string(),
  credentialsPath: z.string(),
  settings: legacySettingsPreviewSchema,
  credentials: legacyCredentialsPreviewSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'migration.preview'>>>

/** migration.apply request payload. */
export const migrationApplyRequestSchema = z.object({
  legacyHome: z.string().min(1).optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'migration.apply'>>>

const skippedSettingsNamespaceSchema = z.object({
  ns: z.string(),
  reason: z.enum(['unregistered', 'invalid-namespace', 'invalid-section', 'rejected']),
}) satisfies z.ZodType<Wire<SkippedSettingsNamespace>>

const skippedCredentialRefSchema = z.object({
  ref: z.string(),
  reason: z.enum(['invalid-ref', 'locked', 'rejected']),
}) satisfies z.ZodType<Wire<SkippedCredentialRef>>

/** migration.apply response value. */
export const migrationApplyValueSchema = z.object({
  legacyHome: z.string(),
  settings: z.object({
    imported: z.array(z.string()),
    skipped: z.array(skippedSettingsNamespaceSchema),
    error: z.string().optional(),
  }),
  credentials: z.object({
    importedRefs: z.array(z.string()),
    skippedRefs: z.array(skippedCredentialRefSchema),
    importedRecords: z.number().int().nonnegative(),
    skippedRecords: z.number().int().nonnegative(),
    error: z.string().optional(),
  }),
}) satisfies z.ZodType<Wire<MigrationApplyValue>>
