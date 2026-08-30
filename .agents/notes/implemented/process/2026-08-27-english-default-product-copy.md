# Agent Note: English-default product and documentation copy

Status: implemented

English | [中文](2026-08-27-english-default-product-copy.zh.md)

## Problem

HiveForge shipped complete English and Chinese locale resources, but a fresh browser could select Chinese from `navigator.language`, some cordis-free primitives carried Chinese fallback text, shipped preset metadata was Chinese, and the documentation website placed Chinese at the root route. English screens could therefore expose Chinese text even when no user selected Chinese.

## Decision

English is the default and canonical maintained language for product copy and documentation. A missing locale preference resolves to English regardless of browser language; an explicitly stored `zh` preference remains authoritative until the user changes it. English dictionaries define the maintained key set, and reviewed Chinese dictionaries remain optional resources with matching keys.

The documentation website publishes English at `/` and Chinese under `/zh/`. Documentation pairs and their sidecar consistency records remain mandatory; this changes maintenance direction, not the pairing or preservation mechanism described by [the bilingual documentation decision](2026-07-02-bilingual-docs-and-pairing-gate.md).

Active first-party fallback text, comments, docstrings, shipped preset metadata, and unsuffixed documentation use English. Chinese locale dictionaries, `.zh.md` counterparts, multilingual fixtures, user content, required legal text, archived notes, generated output, and third-party sources retain their original language where appropriate.

## Alternatives considered

- **Follow the browser language on a fresh profile.** Rejected because a Chinese-language browser would select Chinese without an explicit user choice, contradicting the English-default requirement.
- **Delete Chinese resources.** Rejected because Chinese remains a supported optional locale and multilingual test coverage is intentional.
- **Rewrite every Han-character match.** Rejected because legal and historical text, user content, test fixtures, generated files, and third-party material are not active English product prose.

## Consequences

Fresh profiles open in English. Existing profiles with `locale.preference: zh` continue in Chinese and can switch explicitly through Settings → General → Language. English documentation URLs use the root site tree, while Chinese documentation uses `/zh/`. Reviewers classify residual Han-character matches instead of treating a raw character count as a correctness test.

## Verification

Locale tests cover a Chinese-language browser with no saved preference and an explicit stored Chinese preference. Browser tests seed `zh` for intentional Chinese lanes and exercise a clean Chinese-language browser against the English UI. Locale parity, targeted GUI tests, documentation projection tests, translation pairing, documentation checks, and the repository build validate the affected paths.
