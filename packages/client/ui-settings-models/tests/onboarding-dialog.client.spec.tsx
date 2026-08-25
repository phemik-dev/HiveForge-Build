// @vitest-environment jsdom
/** First-run legacy-import prompt behavior. */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RpcResponse } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { LegacyImportDialog } from '../src/client/LegacyImportDialog.tsx'
import type { LegacyImportDialogProps } from '../src/client/LegacyImportDialog.tsx'
import type { ModelsSettingsState } from '../src/client/store.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  document.getElementById('root')?.remove()
})

let nextRpc = 0
function ok<T>(value: T): RpcResponse<T> {
  return { rpcId: `legacy-import-${nextRpc++}` as never, result: { ok: true, value } }
}
function fail<T>(message: string): RpcResponse<T> {
  return {
    rpcId: `legacy-import-${nextRpc++}` as never,
    result: { ok: false, error: { code: 'internal', message, details: {} } },
  }
}

function readyModels(overrides: Partial<ModelsSettingsState> = {}): ModelsSettingsState {
  return {
    status: 'ready',
    error: null,
    credentialError: null,
    writable: true,
    rows: [],
    namespaces: new Map(),
    ...overrides,
  }
}

function scopeSnapshot(overrides: Partial<SettingsScopeSnapshot<Record<string, unknown>>> = {}): SettingsScopeSnapshot<Record<string, unknown>> {
  return {
    status: 'ready',
    value: {},
    base: {},
    user: {},
    revision: 0,
    writable: true,
    mode: 'host',
    ...overrides,
  }
}

function stubScope(initial: SettingsScopeSnapshot<Record<string, unknown>>) {
  const store = createSnapshotStore(initial)
  const scope: SettingsScope<Record<string, unknown>> = {
    getSnapshot: () => store.getSnapshot(),
    subscribe: (listener) => store.subscribe(listener),
    set: () => Promise.resolve(),
    unset: () => Promise.resolve(),
  }
  return { scope, store }
}

function harness(options: {
  onboardingMode?: 'host' | 'memory'
  onboardingValue?: Record<string, unknown> | null
  models?: Partial<ModelsSettingsState>
  preview?: unknown
  previewError?: string
  previewReject?: string
  applyError?: string
  applyReject?: string
  markImportedReject?: boolean
  controllerLoadReject?: boolean
} = {}) {
  if (document.getElementById('root') === null) {
    const appRoot = document.createElement('div')
    appRoot.id = 'root'
    document.body.append(appRoot)
  }

  const modelsStore = createSnapshotStore<ModelsSettingsState>(readyModels(options.models))
  const scope = stubScope(scopeSnapshot({
    mode: options.onboardingMode ?? 'host',
    value: options.onboardingValue === null ? undefined : options.onboardingValue ?? {},
    status: (options.onboardingMode ?? 'host') === 'memory' ? 'unavailable' : 'ready',
    writable: (options.onboardingMode ?? 'host') !== 'memory',
  }))

  const controller = {
    store: modelsStore,
    load: vi.fn(() => options.controllerLoadReject === true
      ? Promise.reject(new Error('load failed'))
      : Promise.resolve()),
  }

  const complete = vi.fn()
  const unusedHook = (() => { throw new Error('unused standard hook') }) as never

  const api = {
    migration: {
      preview: vi.fn(() => {
        if (options.previewReject !== undefined) return Promise.reject(new Error(options.previewReject))
        if (options.previewError !== undefined) return Promise.resolve(fail(options.previewError))
        return Promise.resolve(ok(options.preview ?? {
          legacyHome: 'C:/Users/example/.dsh',
          settingsPath: 'C:/Users/example/.dsh/settings.yaml',
          credentialsPath: 'C:/Users/example/.dsh/.credentials.yaml',
          settings: { present: true, namespaces: ['llm-pi-ai'] },
          credentials: { present: true, refs: ['OPENAI_API_KEY'], recordCount: 0 },
        }))
      }),
      apply: vi.fn(() => {
        if (options.applyReject !== undefined) return Promise.reject(new Error(options.applyReject))
        if (options.applyError !== undefined) return Promise.resolve(fail(options.applyError))
        return Promise.resolve(ok({
          legacyHome: 'C:/Users/example/.dsh',
          settings: { imported: ['llm-pi-ai'], skipped: [] },
          credentials: { importedRefs: ['OPENAI_API_KEY'], skippedRefs: [], importedRecords: 0, skippedRecords: 0 },
        }))
      }),
    },
  }

  const onboardingActions = {
    dismiss: vi.fn(() => {
      scope.store.update((snapshot) => {
        snapshot.value = { ...(snapshot.value ?? {}), legacyImportDismissed: true }
      })
      return Promise.resolve()
    }),
    markImported: vi.fn(() => {
      scope.store.update((snapshot) => {
        snapshot.value = { ...(snapshot.value ?? {}), legacyImportCompleted: true }
      })
      return options.markImportedReject === true
        ? Promise.reject(new Error('write failed'))
        : Promise.resolve()
    }),
  }

  const props: LegacyImportDialogProps = {
    stepId: 'legacy-import',
    complete,
    openSection: vi.fn(),
    useSessions: unusedHook,
    useWorkspaces: unusedHook,
    controller: controller as never,
    useModels: bindSnapshotSelector(modelsStore),
    useOnboarding: bindSnapshotSelector(scope.scope),
    api: api as never,
    onboardingActions: onboardingActions as never,
    t: key => en[key],
  }

  return { props, complete, controller, api, onboardingActions, modelsStore, scope }
}

describe('LegacyImportDialog', () => {
  it('renders when the shell root is absent', async () => {
    const h = harness()
    document.getElementById('root')!.remove()
    render(<LegacyImportDialog {...h.props} />)
    expect(await screen.findByRole('dialog', { name: en.legacyImportTitle })).toBeTruthy()
  })

  it('loads a modal, inerts the product, and cannot be dismissed implicitly', async () => {
    const h = harness()
    render(<LegacyImportDialog {...h.props} />)
    expect(await screen.findByRole('dialog', { name: en.legacyImportTitle })).toBeTruthy()
    expect(document.getElementById('root')?.inert).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[class*="mask"]')!)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(h.complete).not.toHaveBeenCalled()
  })

  it('completes immediately when a provider is already usable', async () => {
    const h = harness({
      models: {
        rows: [{
          entry: {
            provider: 'native',
            displayName: 'Native',
            settingsNs: '',
            settingsPath: [],
            active: true,
          },
          configured: true,
          removable: false,
          apiKeyEnv: undefined,
          credential: undefined,
        }],
      },
    })
    render(<LegacyImportDialog {...h.props} />)
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
    expect(h.api.migration.preview).not.toHaveBeenCalled()
  })

  it('completes when the Models join is unavailable', async () => {
    const h = harness({ models: { status: 'error', error: 'models unavailable', rows: [] } })
    render(<LegacyImportDialog {...h.props} />)
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
    expect(h.api.migration.preview).not.toHaveBeenCalled()
  })

  it('starts loading when Models is idle, then previews once ready', async () => {
    const h = harness({ models: { status: 'idle', rows: [] } })
    render(<LegacyImportDialog {...h.props} />)
    await waitFor(() => { expect(h.controller.load).toHaveBeenCalledOnce() })
    await act(async () => {
      h.modelsStore.update((s) => { s.status = 'ready'; s.error = null })
    })
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(h.api.migration.preview).toHaveBeenCalledOnce()
  })

  it('completes silently when the preview finds nothing to import', async () => {
    const h = harness({
      preview: {
        legacyHome: 'C:/Users/example/.dsh',
        settingsPath: 'C:/Users/example/.dsh/settings.yaml',
        credentialsPath: 'C:/Users/example/.dsh/.credentials.yaml',
        settings: { present: false, namespaces: [] },
        credentials: { present: false, refs: [], recordCount: 0 },
      },
    })
    render(<LegacyImportDialog {...h.props} />)
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reports preview failures and allows skipping', async () => {
    const h = harness({ previewError: 'preview unavailable' })
    render(<LegacyImportDialog {...h.props} />)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('preview unavailable')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: en.legacyImportSkip }))
    await waitFor(() => { expect(h.onboardingActions.dismiss).toHaveBeenCalledOnce() })
    expect(h.complete).toHaveBeenCalledOnce()
  })

  it('reports a transport failure while previewing legacy state', async () => {
    const h = harness({ previewReject: 'transport down' })
    render(<LegacyImportDialog {...h.props} />)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('transport down')).toBeTruthy()
  })

  it('imports on demand and then completes', async () => {
    const h = harness()
    render(<LegacyImportDialog {...h.props} />)
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: en.legacyImportImport }))
    await waitFor(() => { expect(h.api.migration.apply).toHaveBeenCalledOnce() })
    await waitFor(() => { expect(h.onboardingActions.markImported).toHaveBeenCalledOnce() })
    await waitFor(() => { expect(h.controller.load).toHaveBeenCalled() })
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
  })

  it('keeps the modal open and reports refused imports', async () => {
    const h = harness({ applyError: 'import refused' })
    render(<LegacyImportDialog {...h.props} />)
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: en.legacyImportImport }))
    expect(await screen.findByText('import refused')).toBeTruthy()
    expect(h.onboardingActions.markImported).not.toHaveBeenCalled()
    expect(h.complete).not.toHaveBeenCalled()
  })

  it('reports a transport rejection while importing', async () => {
    const h = harness({ applyReject: 'connection lost' })
    render(<LegacyImportDialog {...h.props} />)
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: en.legacyImportImport }))
    expect(await screen.findByText('connection lost')).toBeTruthy()
    expect(h.onboardingActions.markImported).not.toHaveBeenCalled()
    expect(h.complete).not.toHaveBeenCalled()
  })

  it('still completes when the onboarding marker write and refresh fail', async () => {
    const h = harness({ markImportedReject: true, controllerLoadReject: true })
    render(<LegacyImportDialog {...h.props} />)
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: en.legacyImportImport }))
    await waitFor(() => { expect(h.onboardingActions.markImported).toHaveBeenCalledOnce() })
    await waitFor(() => { expect(h.controller.load).toHaveBeenCalledOnce() })
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
  })

  it('skips onboarding in memory mode (remote browser)', async () => {
    const h = harness({ onboardingMode: 'memory' })
    render(<LegacyImportDialog {...h.props} />)
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
    expect(h.api.migration.preview).not.toHaveBeenCalled()
  })

  it('skips when the user previously dismissed the prompt', async () => {
    const h = harness({ onboardingValue: { legacyImportDismissed: true } })
    render(<LegacyImportDialog {...h.props} />)
    await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
    expect(h.api.migration.preview).not.toHaveBeenCalled()
  })

  it('disables import when a legacy document cannot be parsed', async () => {
    const h = harness({
      preview: {
        legacyHome: 'C:/Users/example/.dsh',
        settingsPath: 'C:/Users/example/.dsh/settings.yaml',
        credentialsPath: 'C:/Users/example/.dsh/.credentials.yaml',
        settings: { present: true, namespaces: [], error: 'invalid settings.yaml' },
        credentials: { present: true, refs: [], recordCount: 0 },
      },
    })
    render(<LegacyImportDialog {...h.props} />)
    await screen.findByRole('dialog')

    const importButton = screen.getByRole<HTMLButtonElement>('button', { name: en.legacyImportImport })
    expect(importButton.disabled).toBe(true)
    expect(screen.getByText(en.legacyImportCannotImport)).toBeTruthy()
  })

  it('treats an absent onboarding section as "not dismissed"', async () => {
    const h = harness({ onboardingValue: null })
    render(<LegacyImportDialog {...h.props} />)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(h.api.migration.preview).toHaveBeenCalledOnce()
  })
})
