/** Legacy settings import step (first-run onboarding). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient, RpcResult } from '@hiveforge-ai/dsh-api-remotes/client'
import type { SnapshotStore, SettingsScope } from '@hiveforge-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@hiveforge-ai/dsh-client-ui-slots'
import { Button } from '@hiveforge-ai/dsh-client-ui-primitives'
import type { ModelsSettingsState, ModelsSettingsStore, OnboardingReadiness } from './store.ts'
import { onboardingReadiness } from './store.ts'
import type { en } from './locales.ts'
import { OnboardingModal } from './OnboardingModal.tsx'
import css from './LegacyImportDialog.module.css'

/** ui-onboarding section as a map (all fields optional). */
type OnboardingSection = Record<string, unknown>

/** Registration-side dependencies of {@link LegacyImportDialog}. */
export interface LegacyImportInjected {
  hooks: {
    /** Shared Models-page join state, bound by the slot renderer. */
    models: SnapshotStore<ModelsSettingsState>
    /** Durable onboarding settings scope (loopback) or memory-mode scope (remote). */
    onboarding: SettingsScope<OnboardingSection>
  }
  /** Shared Models-page join controller. */
  controller: ModelsSettingsStore
  /** Migration domain API. */
  api: Pick<IApiClient, 'migration'>
  /** Persist onboarding markers (best-effort). */
  onboardingActions: {
    dismiss(): Promise<void>
    markImported(): Promise<void>
  }
  /** Feature copy. */
  t: (key: keyof typeof en) => string
}

/** Slot owner props plus the feature's injected dependencies. */
export type LegacyImportDialogProps =
  PropsRuntime<'settings.onboarding'> & InjectFace<LegacyImportInjected>


function onboardingFlag(section: OnboardingSection | undefined, key: string): boolean {
  if (section === undefined) return false
  return section[key] === true
}

function isUnavailable(readiness: OnboardingReadiness): boolean {
  return readiness.kind === 'unavailable'
}

/**
 * Offer to import legacy settings and stored API keys when no provider is usable.
 * @param props - settings-shell owner state and Models/migration dependencies.
 * @returns the onboarding modal or null when onboarding needs no intervention.
 */
export function LegacyImportDialog(props: LegacyImportDialogProps): ReactNode {
  const { complete, controller, useModels, useOnboarding, api, onboardingActions, t } = props
  const models = useModels(snapshot => snapshot)
  const onboarding = useOnboarding(snapshot => snapshot)
  const finished = useRef(false)

  const finish = useCallback((): void => {
    if (finished.current) return
    finished.current = true
    complete()
  }, [complete])

  useEffect(() => {
    if (models.status === 'idle') void controller.load()
  }, [controller, models.status])

  const readiness = useMemo(() => onboardingReadiness(models), [models])

  const dismissed = onboardingFlag(onboarding.value, 'legacyImportDismissed')
  const imported = onboardingFlag(onboarding.value, 'legacyImportCompleted')

  // Any provider-ready state ends onboarding; any non-host onboarding scope (remote browser)
  // cannot perform Host filesystem import.
  useEffect(() => {
    if (finished.current) return
    if (readiness.kind === 'provider-ready' || isUnavailable(readiness)) {
      finish()
      return
    }
    if (onboarding.mode === 'memory') {
      finish()
      return
    }
    if (dismissed || imported) {
      finish()
    }
  }, [dismissed, finish, imported, onboarding.mode, readiness])

  const [preview, setPreview] = useState<null | {
    legacyHome: string
    settings: { present: boolean; namespaces: string[]; error?: string }
    credentials: { present: boolean; refs: string[]; recordCount: number; error?: string }
  }>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Load the preview once we know onboarding is relevant.
  useEffect(() => {
    if (finished.current) return
    if (preview !== null || previewError !== null) return
    if (readiness.kind !== 'provider-missing') return
    if (onboarding.mode !== 'host') return
    if (dismissed || imported) return

    void (async () => {
      try {
        const response = await api.migration.preview({})
        const result: RpcResult<unknown> = response.result
        if (!result.ok) {
          setPreviewError(result.error.message)
          return
        }
        setPreview(result.value as never)
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : String(error))
      }
    })()
  }, [api.migration, dismissed, imported, onboarding.mode, preview, previewError, readiness.kind])

  // If the preview says there's nothing to import, complete silently.
  useEffect(() => {
    if (finished.current) return
    if (preview === null) return
    if (!preview.settings.present && !preview.credentials.present) finish()
  }, [finish, preview])

  if (preview === null && previewError === null) return null

  if (previewError !== null) {
    return (
      <OnboardingModal title={t('legacyImportTitle')} focusTitle>
        <p className={css.description}>{t('legacyImportPreviewFailed')}</p>
        <p className={css.error} role="alert">{previewError}</p>
        <div className={css.actions}>
          <Button
            variant="outline"
            className={css.secondary}
            onClick={() => { void onboardingActions.dismiss().finally(() => finish()) }}
          >
            {t('legacyImportSkip')}
          </Button>
        </div>
      </OnboardingModal>
    )
  }

  if (preview === null) return null

  const hasAnything = preview.settings.present || preview.credentials.present
  if (!hasAnything) return null

  const settingsLine = preview.settings.present
    ? preview.settings.error === undefined
      ? t('legacyImportSettingsFound').replace('{count}', String(preview.settings.namespaces.length))
      : t('legacyImportSettingsFoundWithError')
    : t('legacyImportSettingsMissing')

  const credentialsLine = preview.credentials.present
    ? preview.credentials.error === undefined
      ? t('legacyImportCredentialsFound')
        .replace('{refs}', String(preview.credentials.refs.length))
        .replace('{records}', String(preview.credentials.recordCount))
      : t('legacyImportCredentialsFoundWithError')
    : t('legacyImportCredentialsMissing')

  const canImport = preview.settings.error === undefined && preview.credentials.error === undefined

  const importNow = async (): Promise<void> => {
    /* v8 ignore next -- defensive re-entry: the UI disables import while importing */
    if (importing) return
    setImportError(null)
    setImporting(true)
    try {
      const response = await api.migration.apply({ legacyHome: preview.legacyHome })
      if (!response.result.ok) {
        setImportError(response.result.error.message)
        return
      }
      // Best-effort marker; even if it fails, refresh and close.
      await onboardingActions.markImported().catch(() => undefined)
      await controller.load().catch(() => undefined)
      finish()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error))
    } finally {
      setImporting(false)
    }
  }

  return (
    <OnboardingModal title={t('legacyImportTitle')} focusTitle>
      <p className={css.description}>
        {t('legacyImportDescription').replace('{path}', preview.legacyHome)}
      </p>
      <ul className={css.summary}>
        <li>{settingsLine}</li>
        <li>{credentialsLine}</li>
      </ul>
      {importError === null ? null : <p className={css.error} role="alert">{importError}</p>}
      <div className={css.actions}>
        <Button
          variant="outline"
          className={css.secondary}
          disabled={importing}
          onClick={() => { void onboardingActions.dismiss().finally(() => finish()) }}
        >
          {t('legacyImportSkip')}
        </Button>
        <Button
          variant="primary"
          className={css.primary}
          disabled={!canImport || importing}
          onClick={() => { void importNow() }}
        >
          {importing ? t('legacyImportImporting') : t('legacyImportImport')}
        </Button>
      </div>
      {canImport ? null : (
        <p className={css.note}>
          {t('legacyImportCannotImport')}
        </p>
      )}
    </OnboardingModal>
  )
}
