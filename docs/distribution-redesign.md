# Cross-platform product distribution redesign

## Status

Design approved for implementation on `agent/cross-platform-distribution`. The failed
`archive/git-bootstrap-attempt` is retained for evidence only and is not an implementation
base. Public `main` remains the clean full-source baseline until the clean-room matrix passes.

## Product contract

A released HiveForge Harness installation MUST:

1. require no system Node.js, npm, pnpm, compiler, or Git;
2. expose `dsh` (`dsh.exe` on Windows);
3. pass `dsh --version` from an unpacked path containing spaces;
4. start `dsh web --no-open` on loopback and serve a successful HTTP response;
5. carry the exact Web frontend and dynamically loaded Cordis package closure;
6. verify downloaded bytes before installation;
7. identify the immutable source commit and target platform in its manifest.

## Architecture

The release unit is one native bundle per target, built on that target's native runner.
The source of truth is a dependency-only pnpm deploy root for the product CLI, analogous
to `python/sdk-runtime/package.json`. The builder uses the established pipeline:

```
runtime closure verification
  -> official package/Web build
  -> pnpm deploy of the curated CLI closure
  -> materialize links and required whole-tree assets
  -> @yao-pkg/pkg --sea using @hiveforge-ai/dsh/lib/bin.js
  -> attach target-native sidecars
  -> archive, checksum, and clean-room smoke
```

The release workflow MUST NOT pack and reinstall every workspace package as an npm
tarball. npm/Git are optional bootstrap transports, never build systems on an end user's
machine.

## Initial supported target matrix

| Target | Native runner | Archive | Required sidecars |
|---|---|---|---|
| Windows x64 | `windows-2022` | `.zip` | ripgrep; any node-pty/runtime helper required by the built closure |
| Linux x64 | `ubuntu-22.04` | `.tar.gz` | ripgrep; target-built `pty.node` in the SEA closure |
| Linux arm64 | `ubuntu-24.04-arm` | `.tar.gz` | ripgrep; target-built `pty.node` in the SEA closure |
| macOS arm64 | `macos-14` | `.tar.gz` | ripgrep and node-pty spawn helper |

Windows support is a new implementation lane, not inferred from Linux/macOS success. It
must prove `@yao-pkg/pkg --sea`, node-pty/ConPTY, PowerShell subprocesses, the ACL sandbox,
paths containing spaces and non-ASCII user paths, and Web startup before release.

## Bundle layout

```
hiveforge/
  dsh[.exe]
  dsh-rg[.exe]
  dsh-spawn-helper          # only when required
  manifest.json
  LICENSE
  THIRD_PARTY_NOTICES.md
```

`manifest.json` records product version, target, source commit, executable and sidecar
SHA-256 values, and build workflow identity. A release-wide `SHA256SUMS` covers every
archive. Signing/attestation is added after deterministic unsigned artifacts are green.

## Installation UX

Primary, no-Node installers:

```powershell
irm https://github.com/phemik-dev/HiveForge-Build/releases/download/<tag>/install.ps1 | iex
```

```sh
curl -fsSL https://github.com/phemik-dev/HiveForge-Build/releases/download/<tag>/install.sh | sh
```

The scripts select OS/architecture, download an immutable bundle and `SHA256SUMS`, verify
the archive, extract to a versioned user-owned directory, atomically update a stable `dsh`
launcher, and run `dsh --version`.

A later npm wrapper may provide:

```sh
npm install --global @phemik-dev/hiveforge-harness
dsh web
```

It may only select, verify, cache, and launch the same native bundles. Git URL installation
is a secondary developer convenience and must use the same artifacts; it is not the
canonical product installer.

## Release gates

Every target build runs without a repository checkout in the acceptance phase:

1. verify archive SHA-256;
2. extract beneath a path containing spaces;
3. run `dsh --version`;
4. run `dsh web --no-open --port <assigned-port>`;
5. wait with a bounded readiness probe;
6. require HTTP 200 and expected HiveForge shell marker;
7. terminate and require clean process settlement;
8. verify no system Node/npm/pnpm/Git was used by the installed product.

The release publisher depends on every target's artifact and clean-room smoke. It creates
no tag or release when one lane is absent or red. `main` receives this pipeline only after
all initially supported targets pass on the review branch.

## Rollback and provenance

- Clean full-source baseline: `743531e17f3b4b352317b81744d453eba9c093d7`.
- Failed bootstrap experiment: `archive/git-bootstrap-attempt`.
- Original minimal GitHub main: `archive/original-empty-main`.

The redesign does not reuse the failed tarball assembler. Those refs remain read-only
recovery/evidence points.
