/**
 * Register a HiveForge-backed provider in `ctx.web`. It calls the Anthropic-compatible Messages API
 * with native `web_search_20250305`. The provider reuses `HIVEFORGE_API_KEY` but not
 * `HIVEFORGE_BASE_URL`, because search and chat-completions use different bases.
 * @module @hiveforge-ai/dsh-web-search-hiveforge
 */

import type { Context } from '@hiveforge-ai/cordis'
import z from '@hiveforge-ai/schemastery'
import type {} from '@hiveforge-ai/dsh-agent'
import { credentialRef } from '@hiveforge-ai/dsh-credentials'
import { installSettingsSection, settingsNamespace } from '@hiveforge-ai/dsh-settings'
import { launchEnvironmentOf } from '@hiveforge-ai/dsh-launch-environment'
import type {} from '@hiveforge-ai/dsh-session'
import type {} from '@hiveforge-ai/dsh-web'
import {
  HiveForgeSearchProvider,
  HIVEFORGE_DEFAULT_API_VERSION,
  HIVEFORGE_DEFAULT_BASE_URL,
  HIVEFORGE_DEFAULT_MAX_TOKENS,
  HIVEFORGE_DEFAULT_MAX_USES,
  HIVEFORGE_DEFAULT_MODEL,
} from './provider.ts'
import type { HiveForgeSearchProviderOptions } from './provider.ts'

export {
  HiveForgeSearchProvider,
  HIVEFORGE_DEFAULT_API_VERSION,
  HIVEFORGE_DEFAULT_BASE_URL,
  HIVEFORGE_DEFAULT_MAX_TOKENS,
  HIVEFORGE_DEFAULT_MAX_USES,
  HIVEFORGE_DEFAULT_MODEL,
  HIVEFORGE_PROVIDER_ID,
} from './provider.ts'
export type { HiveForgeSearchLlmRequest, HiveForgeSearchProviderOptions } from './provider.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-hiveforge'

/** The web seam this provider registers into. */
export const inject = ['web']

const DEFAULT_API_KEY_ENV = 'HIVEFORGE_API_KEY'

/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
  /** Literal HiveForge API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved for each search; defaults to `HIVEFORGE_API_KEY`. */
  apiKeyEnv?: string
  /** Anthropic-compatible endpoint base; `/messages` is appended. */
  baseURL?: string
  /** Anthropic-format model name. Defaults to `hiveforge-v4-flash`. */
  model?: string
  /** `anthropic-version` header value. Defaults to `2023-06-01`. */
  apiVersion?: string
  /** Upper bound on generated tokens for the Messages request. Defaults to 4096. */
  maxTokens?: number
  /** Maximum `web_search` server-tool uses per request. Defaults to 5. */
  maxUses?: number
}

export const Config: z<Config> = z.object({
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  // Declared here rather than only at the use site: a configuration surface
  // renders the resolved section, so a default the schema does not carry reads
  // there as no value at all.
  baseURL: z.string(),
  model: z.string().default(HIVEFORGE_DEFAULT_MODEL),
  apiVersion: z.string().default(HIVEFORGE_DEFAULT_API_VERSION),
  maxTokens: z.number().step(1).min(1).default(HIVEFORGE_DEFAULT_MAX_TOKENS),
  maxUses: z.number().step(1).min(1).default(HIVEFORGE_DEFAULT_MAX_USES),
})

/**
 * Environment variable naming this provider's endpoint. Deliberately distinct
 * from `$HIVEFORGE_BASE_URL`, which belongs to the chat-completions adapter:
 * search speaks the Anthropic-compatible Messages API, so one variable cannot
 * serve both.
 */
const SEARCH_BASE_URL_ENV = 'HIVEFORGE_SEARCH_BASE_URL'

/** Settings namespace carrying this provider's endpoint, model, and key reference. */
export const WEB_SEARCH_HIVEFORGE_SETTINGS_NAMESPACE = settingsNamespace('web-search-hiveforge')

/**
 * Project one resolved section into the options the provider serves its next
 * search with. Environment fallbacks stay here rather than in the provider:
 * every value it reads is already fully defaulted.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(ctx: Context, config: Config): HiveForgeSearchProviderOptions {
  const apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV)
  const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
    ? config.apiKey
    : undefined
  return {
    ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value
      // Without the seam the environment is the whole credential plane.
      const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv)
      return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined
    },
    apiKeyEnv,
    baseURL: config.baseURL
      ?? launchEnvironmentOf(ctx).get(SEARCH_BASE_URL_ENV)?.value
      ?? HIVEFORGE_DEFAULT_BASE_URL,
    model: config.model ?? HIVEFORGE_DEFAULT_MODEL,
    apiVersion: config.apiVersion ?? HIVEFORGE_DEFAULT_API_VERSION,
    maxTokens: config.maxTokens ?? HIVEFORGE_DEFAULT_MAX_TOKENS,
    maxUses: config.maxUses ?? HIVEFORGE_DEFAULT_MAX_USES,
    recordRequest: (request) => {
      ctx.get('agents')?.currentInitiator()?.session.append(
        'web/hiveforge-search-llm-request',
        request,
      )
    },
  }
}

/** Register the HiveForge search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  installSettingsSection(ctx, WEB_SEARCH_HIVEFORGE_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source
    },
    // The registration carries no resolved value: the provider projects the
    // section per search, so a committed change needs no re-registration.
    onChange: () => {},
  })
  ctx.web.registerSearchProvider(new HiveForgeSearchProvider(() => resolveOptions(ctx, current())))
}
