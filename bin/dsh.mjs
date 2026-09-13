#!/usr/bin/env node

/**
 * Launch the immutable HiveForge Harness runtime selected by this Git bootstrap.
 *
 * A Git install intentionally contains only this wrapper, not a pnpm workspace.
 * The first invocation downloads the release-built runtime into a user cache,
 * verifies its digest, atomically extracts it, and then delegates to its CLI.
 */

import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { access, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { x as extractTar } from 'tar'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(packageRoot, 'runtime-manifest.json')

/** Return a platform-appropriate persistent cache root. */
function cacheRoot() {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, 'HiveForge', 'dsh')
  }
  return join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'hiveforge', 'dsh')
}

/** Read and validate the runtime identity committed with this bootstrap. */
async function readManifest() {
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8'))
  const runtime = parsed.runtime
  if (runtime === null || typeof runtime !== 'object') throw new Error('runtime-manifest.json must contain a runtime object')
  const { version, url, sha256, entry } = runtime
  if (typeof version !== 'string' || version === '') throw new Error('runtime manifest has no runtime.version')
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('runtime manifest must provide an HTTPS runtime.url')
  if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('runtime manifest must provide a SHA-256 runtime.sha256')
  if (typeof entry !== 'string' || entry === '' || entry.startsWith('/') || entry.includes('..')) throw new Error('runtime manifest has an unsafe runtime.entry')
  return { version, url, sha256: sha256.toLowerCase(), entry }
}

/** Stream a file's SHA-256 digest without retaining a runtime archive in memory. */
async function digest(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

/** Download one immutable release archive. */
async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || response.body === null) throw new Error(`runtime download failed: HTTP ${String(response.status)}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
}

/** Return true only when a complete runtime already exists at the cache location. */
async function hasRuntime(directory, entry) {
  try {
    await access(join(directory, entry))
    return true
  } catch {
    return false
  }
}

/** Acquire and atomically publish the runtime selected by the manifest. */
async function ensureRuntime(runtime) {
  const cache = join(cacheRoot(), `${runtime.version}-${runtime.sha256.slice(0, 12)}`)
  if (await hasRuntime(cache, runtime.entry)) return join(cache, runtime.entry)

  await mkdir(cacheRoot(), { recursive: true })
  const staging = `${cache}.tmp-${process.pid}-${Date.now()}`
  const archive = join(cacheRoot(), `${runtime.sha256}.tgz`)
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  try {
    if (!existsSync(archive) || await digest(archive) !== runtime.sha256) {
      await rm(archive, { force: true })
      console.log(`dsh: downloading HiveForge Harness ${runtime.version}…`)
      await download(runtime.url, archive)
    }
    const actual = await digest(archive)
    if (actual !== runtime.sha256) throw new Error(`runtime SHA-256 mismatch: expected ${runtime.sha256}, received ${actual}`)

    await extractTar({ file: archive, cwd: staging, strict: true })
    if (!await hasRuntime(staging, runtime.entry)) throw new Error(`runtime archive does not contain ${runtime.entry}`)
    try {
      await rename(staging, cache)
    } catch (error) {
      if (!await hasRuntime(cache, runtime.entry)) throw error
    }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  return join(cache, runtime.entry)
}

try {
  const runtime = await readManifest()
  const entry = await ensureRuntime(runtime)
  const child = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit',
  })
  if (child.error !== undefined) throw child.error
  process.exit(child.status ?? 1)
} catch (error) {
  console.error(`dsh: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
