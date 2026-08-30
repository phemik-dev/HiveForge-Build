# @hiveforge-ai/dsh-client-locale

English | [中文](README.zh.md)

Locale plugin: LocaleRuntime — the `en`/`zh` preference stored as `locale.preference` in `$DSH_HOME/settings.yaml`; when that explicit Host value is absent, every fresh browser starts in English regardless of `navigator.language`. The Host read runs after plugin activation so an unavailable settings service cannot block the page; an explicit stored preference replaces the English default live. Existing profiles that explicitly store `zh` remain Chinese until the user selects **English** under **Settings → General → Language**. Remote browsers retain only a process-local selection because the settings API is loopback-only. `locale/change` fires on switches, and the plugin points `<html lang>` at the active locale (`zh-CN`/`en`) on activation and on every switch. The service also owns the ns×locale dictionary registry (typed `register(ns, {zh, en})` checked against `LocaleNamespaceMap`, `bind(ns)`→`TranslateNS<ns>`; lookup chain ns → common → en → key), implements the slot system's `LocaleFace`, and installs itself through `ctx.slots.installLocale`, backing the framework-injected `t` standard seat (`Translate`/`TranslateNS` are ui-slots types; import them from there — this package only re-exports for dictionary owners' convenience). The [Host-backed preferences decision](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.md) owns the persistence boundary.

## Model Experience

None, as the locale registry serves browser UI copy; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Some primitives keep inline English copy** — Settings rows, the sidebar, question composer, and model select use locale seats; cordis-free primitives use English defaults that callers may override.
- **Registry-held text reads its translation once** — copy captured at registration time outside the slot render path (e.g. the `/model` command description in the command registry) keeps the language it was registered under until re-registration; slot-rendered copy follows switches live.
