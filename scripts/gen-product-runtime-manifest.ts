/** Generate the explicit workspace closure deployed by the self-contained dsh product bundle. */

import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

interface Manifest {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const root = resolve(import.meta.dirname, '..')
const outputPath = resolve(root, 'distribution/cli-runtime/package.json')

function readManifest(path: string): Manifest {
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest
}

function generatedManifest(): Record<string, unknown> {
  const rootManifest = readManifest(resolve(root, 'package.json'))
  const workspace = new Map<string, Manifest>()
  for (const path of globSync(['vendor/*/package.json', 'packages/*/*/package.json', 'apps/*/package.json'], { cwd: root })) {
    const manifest = readManifest(resolve(root, path))
    if (manifest.name !== undefined) workspace.set(manifest.name, manifest)
  }

  const cli = workspace.get('@hiveforge-ai/dsh')
  if (cli === undefined) throw new Error('gen-product-runtime-manifest: @hiveforge-ai/dsh is absent')
  const included = new Set<string>(['@hiveforge-ai/dsh'])
  const queue = ['@hiveforge-ai/dsh']
  for (let index = 0; index < queue.length; index += 1) {
    const name = queue[index]
    if (name === undefined) continue
    const manifest = workspace.get(name)
    if (manifest === undefined) continue
    const requiredPeers = Object.fromEntries(Object.entries(manifest.peerDependencies ?? {})
      .filter(([peer]) => manifest.peerDependenciesMeta?.[peer]?.optional !== true))
    const edges = { ...manifest.dependencies, ...manifest.optionalDependencies, ...requiredPeers }
    for (const dependency of Object.keys(edges).sort()) {
      if (!workspace.has(dependency) || included.has(dependency)) continue
      included.add(dependency)
      queue.push(dependency)
    }
  }

  return {
    name: '@hiveforge-ai/dsh-product-runtime',
    description: 'Generated dependency-only deploy root for the self-contained dsh product bundle',
    version: rootManifest.version,
    private: true,
    type: 'module',
    dependencies: Object.fromEntries([...included].sort().map(name => [name, 'workspace:^'])),
  }
}

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } })
const expected = `${JSON.stringify(generatedManifest(), null, 2)}\n`
if (values.check) {
  if (readFileSync(outputPath, 'utf8') !== expected) {
    console.error('gen-product-runtime-manifest: distribution/cli-runtime/package.json is stale; run pnpm run gen-product-runtime-manifest')
    process.exitCode = 1
  }
} else {
  writeFileSync(outputPath, expected)
  console.log('gen-product-runtime-manifest: wrote distribution/cli-runtime/package.json')
}
