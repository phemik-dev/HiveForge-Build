import { describe, expect, it } from 'vitest'
import {
  HiveForgeSearchProvider,
  HIVEFORGE_DEFAULT_API_VERSION,
  HIVEFORGE_DEFAULT_BASE_URL,
  HIVEFORGE_DEFAULT_MAX_TOKENS,
  HIVEFORGE_DEFAULT_MAX_USES,
  HIVEFORGE_DEFAULT_MODEL,
} from '@hiveforge-ai/dsh-web-search-hiveforge'

/** Construct the provider over a fixed options value; production passes a live thunk. */
import type { HiveForgeSearchProviderOptions } from '@hiveforge-ai/dsh-web-search-hiveforge'

const searchProvider = (options: HiveForgeSearchProviderOptions): HiveForgeSearchProvider =>
  new HiveForgeSearchProvider(() => options)

/**
 * Disabled real-API probe for the HiveForge search provider. The live endpoint
 * can complete without structured source blocks, so this is not a reliable
 * merge signal. Its body remains because mocks cannot confirm the wire shape.
 */
const apiKey = process.env.HIVEFORGE_API_KEY
const maybe = apiKey !== undefined && apiKey.length > 0 ? describe : describe.skip

maybe('HiveForgeSearchProvider real API', () => {
  it.skip('returns citeable sources for a live query via native web_search', async () => {
    const provider = searchProvider({
      apiKey: apiKey!,
      baseURL: process.env.HIVEFORGE_SEARCH_BASE_URL ?? HIVEFORGE_DEFAULT_BASE_URL,
      model: process.env.HIVEFORGE_SEARCH_MODEL ?? HIVEFORGE_DEFAULT_MODEL,
      apiVersion: HIVEFORGE_DEFAULT_API_VERSION,
      maxTokens: HIVEFORGE_DEFAULT_MAX_TOKENS,
      maxUses: HIVEFORGE_DEFAULT_MAX_USES,
    })
    const result = await provider.search({ query: 'What is HiveForge Harness?', maxResults: 5 })
    expect(result.sources.length).toBeGreaterThan(0)
    for (const source of result.sources) expect(source.url).toMatch(/^https?:\/\//)
  }, 60_000)
})
