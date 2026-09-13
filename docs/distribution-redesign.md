# Cross-platform product distribution redesign

## Status

Implemented on `agent/cross-platform-distribution`. The failed `archive/git-bootstrap-attempt` is retained for evidence only and is not an implementation base. Public `main` was held at the clean full-source baseline until the clean-room matrix passed.

## Product contract

A released HiveForge Harness installation MUST:

1. require no system Node.js, npm, pnpm, compiler, or Git;
2. expose `dsh` (`dsh.cmd` on Windows);
3. pass `dsh --version` from an unpacked path containing spaces;
4. start `dsh web --no-open` on loopback and serve a successful HTTP response;
5. carry the exact Web frontend and dynamically loaded Cordis package closure;
6. verify downloaded bytes before installation;
7. identify the immutable source commit and target platform in its manifest.

## Architecture

The release unit is one native bundle per target, built on that target's native runner. The source of truth is a generated dependency-only pnpm deploy root for the product CLI, analogous to `python/sdk-runtime/package.json`. The builder uses this pipeline:

```
runtime closure verification
  -> official package/Web build
  -> pnpm deploy of the generated CLI closure
  -> materialize links and required package assets
  -> include the target-native Node executable
  -> create platform launcher
  -> archive, checksum, and clean-room smoke
```

The release workflow MUST NOT pack and reinstall every workspace package as an npm tarball. npm/Git are optional bootstrap transports, never build systems on an end user's machine.

## Initial supported target matrix

| Target | Native runner | Archive | Runtime |
|---|---|---|---|
| Windows x64 | `windows-2022` | `.zip` | bundled Node x64 plus the host-native dependency closure |
| Linux x64 | `ubuntu-22.04` | `.tar.gz` | bundled Node x64 plus the host-native dependency closure |
| Linux arm64 | `ubuntu-24.04-arm` | `.tar.gz` | bundled Node arm64 plus the host-native dependency closure |
| macOS arm64 | `macos-14` | `.tar.gz` | bundled Node arm64 plus the host-native dependency closure |

Windows is an explicit native lane, not inferred from Linux/macOS success. Its acceptance test proves the runtime on Windows x64, including Web startup from a path containing spaces.

## Bundle layout

```
hiveforge/
  dsh                    # Unix launcher
  dsh.cmd                # Windows launcher
  node / node.exe
  runtime/
    node_modules/
    package.json
  manifest.json
  LICENSE
  THIRD_PARTY_NOTICES.md
```

`manifest.json` records product version, target, source commit, launcher, bundled Node executable, and its SHA-256 value. A release-wide `SHA256SUMS` covers every archive. Signing/attestation is added after deterministic unsigned artifacts are green.

## Installation UX

Primary, no-Node installers:

```powershell
irm https://github.com/phemik-dev/HiveForge-Build/releases/latest/download/install.ps1 | iex
```

```sh
curl -fsSL https://github.com/phemik-dev/HiveForge-Build/releases/latest/download/install.sh | sh
```

The scripts select OS/architecture, download an immutable bundle and checksum, verify the archive, extract to a versioned user-owned directory, atomically update a stable `dsh` launcher, and run `dsh --version`.

A later npm wrapper may provide:

```sh
npm install --global @phemik-dev/hiveforge-harness
dsh web
```

It may only select, verify, cache, and launch the same native bundles. Git URL installation is a secondary developer convenience and must use the same artifacts; it is not the canonical product installer.

## Release gates

Every target build runs without a repository checkout in the acceptance phase:

1. verify archive SHA-256;
2. extract beneath a path containing spaces;
3. run `dsh --version`;
4. run `dsh web --no-open --port <assigned-port>`;
5. wait with a bounded readiness probe;
6. require HTTP 200 and an HTML shell;
7. terminate and require clean process settlement;
8. install through the platform installer from local release assets;
9. verify no system Node/npm/pnpm/Git is used by the installed product.

The release publisher depends on every target's artifact, archive smoke, and installer smoke. It creates no release when one lane is absent or red.

## Rollback and provenance

- Clean full-source baseline: `743531e17f3b4b352317b81744d453eba9c093d7`.
- Failed bootstrap experiment: `archive/git-bootstrap-attempt`.
- Original minimal GitHub main: `archive/original-empty-main`.

The redesign does not reuse the failed tarball assembler. Those refs remain read-only recovery/evidence points.
