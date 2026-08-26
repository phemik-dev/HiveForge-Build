/** Pure first-run readiness projection over the shared Models join. */
import { describe, expect, it } from 'vitest'
import type { CredentialView } from '@hiveforge-ai/dsh-api-remotes/client'
import type { ModelsSettingsState, ProviderRow } from '../src/client/store.ts'
import { onboardingReadiness, providerUsable } from '../src/client/store.ts'

const missingCredential: CredentialView = { configured: false, writable: true }

function keyProvider(overrides: Partial<ProviderRow> = {}): ProviderRow {
  return {
    entry: {
      provider: 'alpha',
      displayName: 'Alpha',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'alpha'],
      active: true,
    },
    configured: true,
    removable: true,
    apiKeyEnv: 'ALPHA_API_KEY',
    credential: missingCredential,
    ...overrides,
  }
}

function nativeProvider(overrides: Partial<ProviderRow> = {}): ProviderRow {
  return {
    entry: {
      provider: 'native',
      displayName: 'Native',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'native'],
      active: true,
    },
    configured: true,
    removable: true,
    apiKeyEnv: undefined,
    credential: undefined,
    ...overrides,
  }
}

function state(overrides: Partial<ModelsSettingsState> = {}): ModelsSettingsState {
  return {
    status: 'ready',
    error: null,
    credentialError: null,
    writable: true,
    rows: [keyProvider()],
    namespaces: new Map(),
    ...overrides,
  }
}

describe('providerUsable', () => {
  it('requires a registered route and a stored key for every named reference', () => {
    expect(providerUsable(keyProvider({ credential: { configured: true, source: 'file', writable: true } }))).toBe(true)
    expect(providerUsable(keyProvider({ entry: { ...keyProvider().entry, active: false } }))).toBe(false)
    expect(providerUsable(keyProvider({ credential: missingCredential }))).toBe(false)
    expect(providerUsable(keyProvider({ credential: undefined }))).toBe(false)
  })

  it('treats a reference-free registered route as provider-native authentication', () => {
    expect(providerUsable(nativeProvider())).toBe(true)
  })
})

describe('onboardingReadiness', () => {
  it('waits for the first join', () => {
    expect(onboardingReadiness(state({ status: 'idle', rows: [] }))).toEqual({ kind: 'loading' })
    expect(onboardingReadiness(state({ status: 'loading', rows: [] }))).toEqual({ kind: 'loading' })
  })

  it('ends onboarding once any provider can serve requests', () => {
    expect(onboardingReadiness(state({ rows: [nativeProvider()] }))).toEqual({ kind: 'provider-ready' })
    expect(onboardingReadiness(state({
      rows: [keyProvider({ credential: { configured: true, source: 'env', writable: false } })],
    }))).toEqual({ kind: 'provider-ready' })
  })

  it('offers onboarding when no provider is usable', () => {
    expect(onboardingReadiness(state({ rows: [keyProvider()] }))).toEqual({ kind: 'provider-missing' })
    expect(onboardingReadiness(state({ rows: [] }))).toEqual({ kind: 'provider-missing' })
  })

  it('turns missing capabilities into diagnostics that never block the product', () => {
    expect(onboardingReadiness(state({ status: 'error', error: 'settings down' }))).toEqual({
      kind: 'unavailable',
      reason: 'load-failed',
    })
    expect(onboardingReadiness(state({
      credentialError: 'credentials service is absent',
      rows: [keyProvider({ credential: undefined })],
    }))).toEqual({
      kind: 'unavailable',
      reason: 'credentials-unavailable',
    })
    // A reference-free route still reads as usable even when credential introspection is down.
    expect(onboardingReadiness(state({
      credentialError: 'credentials service is absent',
      rows: [nativeProvider()],
    }))).toEqual({ kind: 'provider-ready' })
    expect(onboardingReadiness(state({ writable: false, rows: [keyProvider()] }))).toEqual({
      kind: 'unavailable',
      reason: 'settings-read-only',
    })
  })
})
