/**
 * Assemble the complete, already-packed HiveForge runtime used by the tiny
 * Git-install bootstrap package. The archive contains a clean npm consumer's
 * installed package graph; it is deliberately not a source checkout.
 */

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'
import { c as createTar } from 'tar'
import { packedIdentity } from './tarball.ts'

function run(command: string, args: readonly string[], cwd: string): void {
  // Windows exposes npm as a PowerShell shim in this release environment, while
  // Linux runners expose a normal `npm` executable on PATH.
  const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  const useWindowsNpmCli = process.platform === 'win32' && command === 'npm'
  const executable = useWindowsNpmCli ? process.execPath : command
  const invocation = useWindowsNpmCli ? [npmCli, ...args] : args
  const result = spawnSync(executable, invocation, { cwd, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with ${String(result.status)}`)
}

async function packedDependencies(directories: readonly string[], tarballs: string): Promise<Record<string, string>> {
  const dependencies: Record<string, string> = {}
  await mkdir(tarballs)
  for (const directory of directories) {
    for (const file of (await readdir(directory)).filter(name => name.endsWith('.tgz')).sort()) {
      const tarball = join(directory, file)
      const packed = packedIdentity(tarball)
      await copyFile(tarball, join(tarballs, file))
      dependencies[packed.name] = `file:../tarballs/${file}`
    }
  }
  return dependencies
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      from: { type: 'string', multiple: true },
      out: { type: 'string' },
      url: { type: 'string' },
      manifest: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  })
  if (values.help) {
    console.log('usage: assemble-git-runtime.ts --from <packed directory> [--from ...] --out <archive.tgz> [--url <release asset URL> --manifest <runtime-manifest.json>]')
    return
  }
  if (values.from === undefined || values.from.length === 0 || values.out === undefined) {
    throw new Error('usage: assemble-git-runtime.ts --from <packed directory> [--from ...] --out <directory> [--url <release asset URL> --manifest <runtime-manifest.json>]')
  }

  const root = process.cwd()
  const sourceDirectories = values.from.map(directory => resolve(root, directory))
  const output = resolve(root, values.out)
  const staging = await mkdtemp(join(tmpdir(), 'hiveforge-git-runtime-'))
  const runtime = join(staging, 'runtime')
  const tarballs = join(staging, 'tarballs')
  try {
    const dependencies = await packedDependencies(sourceDirectories, tarballs)
    const cli = dependencies['@hiveforge-ai/dsh']
    if (cli === undefined) throw new Error('packed inputs do not contain @hiveforge-ai/dsh')
    await mkdir(runtime)
    await writeFile(join(runtime, 'package.json'), `${JSON.stringify({
      name: 'hiveforge-git-runtime',
      version: '0.0.0',
      private: true,
      dependencies,
    }, null, 2)}\n`)
    // npm 11 can crash while resolving this deliberately large graph of local
    // tarballs (`edgesOut` null). pnpm owns the source workspace and resolves
    // the same file graph deterministically on the Linux release runner.
    run('pnpm', ['install', '--prod', '--no-frozen-lockfile', '--omit=optional'], runtime)

    const cliManifest = JSON.parse(await readFile(join(runtime, 'node_modules', '@hiveforge-ai', 'dsh', 'package.json'), 'utf8')) as { version: string }
    const entry = join(runtime, 'node_modules', '@hiveforge-ai', 'dsh', 'lib', 'bin.js')
    await readFile(entry)

    await rm(output, { recursive: true, force: true })
    await mkdir(resolve(output, '..'), { recursive: true })
    await createTar({ cwd: staging, file: output, gzip: true }, ['runtime'])
    const hash = await sha256(output)
    const archiveName = basename(output)
    console.log(`git runtime: ${archiveName} (${cliManifest.version}), sha256 ${hash}`)

    if ((values.url === undefined) !== (values.manifest === undefined)) {
      throw new Error('--url and --manifest must be supplied together')
    }
    if (values.url !== undefined && values.manifest !== undefined) {
      await writeFile(resolve(root, values.manifest), `${JSON.stringify({
        runtime: {
          version: cliManifest.version,
          url: values.url,
          sha256: hash,
          entry: 'runtime/node_modules/@hiveforge-ai/dsh/lib/bin.js',
        },
      }, null, 2)}\n`)
    }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

await main()
