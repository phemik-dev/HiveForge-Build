#!/usr/bin/env node
/** Build one host-native, self-contained dsh product directory. */

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { chmod, copyFile, cp, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { pnpmInvocation } from './pnpm-invocation.ts'

const root = resolve(import.meta.dirname, '..')
const DEPLOY_ROOT = '@hiveforge-ai/dsh-product-runtime'
const CLI_ENTRY = 'node_modules/@hiveforge-ai/dsh/lib/bin.js'
const WEB_ENTRY = 'node_modules/@hiveforge-ai/dsh-web-frontend/dist/index.html'

type ProductPlatform = 'windows' | 'linux' | 'macos'
type ProductArch = 'x64' | 'arm64'

interface ProductTarget {
  readonly platform: ProductPlatform
  readonly arch: ProductArch
  readonly id: string
}

function hostTarget(): ProductTarget {
  const platform: ProductPlatform | undefined = process.platform === 'win32'
    ? 'windows'
    : process.platform === 'linux'
      ? 'linux'
      : process.platform === 'darwin'
        ? 'macos'
        : undefined
  const arch: ProductArch | undefined = process.arch === 'x64' || process.arch === 'arm64' ? process.arch : undefined
  if (platform === undefined || arch === undefined) {
    throw new Error(`build-product-runtime: unsupported host ${process.platform}-${process.arch}`)
  }
  return { platform, arch, id: `${platform}-${arch}` }
}

function run(command: string, args: readonly string[], cwd = root): void {
  const result = spawnSync(command, [...args], { cwd, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
}

function runPnpm(args: readonly string[], cwd = root): void {
  const invocation = pnpmInvocation(args)
  run(invocation.command, invocation.args, cwd)
}

async function restoreDirectWorkspacePackages(runtime: string): Promise<void> {
  const manifest = JSON.parse(await readFile(join(runtime, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const sourceNodeModules = resolve(root, 'distribution/cli-runtime/node_modules')
  for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) {
    const destination = join(runtime, 'node_modules', dependency)
    if (existsSync(destination)) continue
    const source = join(sourceNodeModules, dependency)
    if (!existsSync(source)) throw new Error(`build-product-runtime: deployed dependency ${dependency} is missing from source and target`)
    const nestedNodeModules = join(source, 'node_modules')
    await mkdir(resolve(destination, '..'), { recursive: true })
    await cp(source, destination, {
      recursive: true,
      dereference: true,
      filter: path => path !== nestedNodeModules && !path.startsWith(nestedNodeModules + sep),
    })
  }
}

async function findSymlink(directory: string): Promise<string | undefined> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    const metadata = await lstat(path)
    if (metadata.isSymbolicLink()) return path
    if (metadata.isDirectory()) {
      const nested = await findSymlink(path)
      if (nested !== undefined) return nested
    }
  }
  return undefined
}

/** Materialize the deploy links exactly once while keeping dependencies root-flat. */
async function materializeLinks(directory: string): Promise<void> {
  const nodeModules = join(directory, 'node_modules')
  let remaining = await findSymlink(nodeModules)
  while (remaining !== undefined) {
    const segments = remaining.slice(nodeModules.length + 1).split(sep)
    const binIndex = segments.lastIndexOf('.bin')
    if (binIndex >= 0) {
      await rm(join(nodeModules, ...segments.slice(0, binIndex + 1)), { recursive: true, force: true })
      remaining = await findSymlink(nodeModules)
      continue
    }
    const source = await realpath(remaining)
    const nestedNodeModules = join(source, 'node_modules')
    await rm(remaining, { recursive: true, force: true })
    await cp(source, remaining, {
      recursive: true,
      dereference: true,
      filter: path => path !== nestedNodeModules && !path.startsWith(nestedNodeModules + sep),
    })
    remaining = await findSymlink(nodeModules)
  }
}

async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) {
    if (!Buffer.isBuffer(chunk)) throw new Error(`build-product-runtime: non-buffer data while hashing ${path}`)
    hash.update(chunk)
  }
  return hash.digest('hex')
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string', default: 'dist-product' },
      'skip-build': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  })
  const target = hostTarget()
  const output = resolve(root, values.out, target.id, 'hiveforge')
  const runtime = join(output, 'runtime')
  const nodeName = target.platform === 'windows' ? 'node.exe' : 'node'
  const nodePath = join(output, nodeName)

  if (!values['skip-build']) runPnpm(['run', 'build:official'])
  await rm(resolve(root, values.out, target.id), { recursive: true, force: true })
  await mkdir(output, { recursive: true })

  runPnpm([
    '--filter', DEPLOY_ROOT,
    'deploy', '--legacy', '--prod',
    '--config.node-linker=hoisted',
    '--config.auto-install-peers=false',
    '--config.link-workspace-packages=true',
    runtime,
  ])
  await restoreDirectWorkspacePackages(runtime)
  await materializeLinks(runtime)
  // The hoisted, link-free root is the runtime. The virtual store is duplicate
  // package-manager state and must not inflate or influence the shipped bundle.
  await rm(join(runtime, 'node_modules', '.pnpm'), { recursive: true, force: true })
  await rm(join(runtime, 'node_modules', '.modules.yaml'), { force: true })

  const cli = join(runtime, CLI_ENTRY)
  const web = join(runtime, WEB_ENTRY)
  if (!existsSync(cli)) throw new Error(`build-product-runtime: deployed CLI missing at ${cli}`)
  if (!existsSync(web)) throw new Error(`build-product-runtime: deployed Web frontend missing at ${web}`)

  await copyFile(process.execPath, nodePath)
  if (target.platform !== 'windows') await chmod(nodePath, 0o755)
  await copyFile(resolve(root, 'LICENSE'), join(output, 'LICENSE'))
  await copyFile(resolve(root, 'THIRD_PARTY_NOTICES.md'), join(output, 'THIRD_PARTY_NOTICES.md'))

  if (target.platform === 'windows') {
    await writeFile(join(output, 'dsh.cmd'), '@echo off\r\n"%~dp0node.exe" "%~dp0runtime\\node_modules\\@hiveforge-ai\\dsh\\lib\\bin.js" %*\r\n')
  } else {
    const launcher = join(output, 'dsh')
    await writeFile(launcher, '#!/bin/sh\nset -eu\nHERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec "$HERE/node" "$HERE/runtime/node_modules/@hiveforge-ai/dsh/lib/bin.js" "$@"\n')
    await chmod(launcher, 0o755)
  }

  const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as { version?: unknown }
  if (typeof rootManifest.version !== 'string') throw new Error('build-product-runtime: root package has no version')
  const manifest = {
    product: 'HiveForge Harness',
    version: rootManifest.version,
    target: target.id,
    entry: target.platform === 'windows' ? 'dsh.cmd' : 'dsh',
    node: nodeName,
    sha256: { [nodeName]: await sha256(nodePath) },
  }
  await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  const result = spawnSync(nodePath, [cli, '--version'], { cwd: output, encoding: 'utf8' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0 || result.stdout.trim() !== rootManifest.version) {
    throw new Error(`build-product-runtime: packaged CLI smoke failed (${String(result.status)}): ${result.stdout}${result.stderr}`)
  }
  console.log(`build-product-runtime: ${target.id} ready at ${output}`)
}

await main()
