#!/usr/bin/env node
/** Clean-room smoke for an unpacked self-contained dsh product directory. */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { bundle: { type: 'string', default: process.env.DSH_PRODUCT_BUNDLE } } })
if (values.bundle === undefined) throw new Error('usage: smoke-product-runtime.ts --bundle <hiveforge directory>')

const source = resolve(values.bundle)
const parent = await mkdtemp(join(tmpdir(), 'HiveForge Product Smoke '))
const bundle = join(parent, 'HiveForge Runtime With Spaces')
const home = join(parent, 'User Home With Spaces')

function command(args: readonly string[]): { executable: string; args: string[] } {
  if (process.platform === 'win32') {
    return {
      executable: join(bundle, 'node.exe'),
      args: [join(bundle, 'runtime', 'node_modules', '@hiveforge-ai', 'dsh', 'lib', 'bin.js'), ...args],
    }
  }
  return { executable: join(bundle, 'dsh'), args: [...args] }
}

let webChild: ChildProcess | undefined

async function stopWebChild(): Promise<void> {
  const child = webChild
  if (child === undefined || child.exitCode !== null) return
  if (process.platform === 'win32' && child.pid !== undefined) {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { encoding: 'utf8' })
  } else {
    child.kill('SIGTERM')
  }
  await new Promise<void>((resolveExit) => {
    const timer = setTimeout(resolveExit, 10_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolveExit()
    })
  })
}

try {
  await cp(source, bundle, { recursive: true, dereference: true })
  const environment = { ...process.env, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1' }
  const versionCommand = command(['--version'])
  const version = spawnSync(versionCommand.executable, versionCommand.args, {
    cwd: parent,
    env: environment,
    encoding: 'utf8',
  })
  if (version.error !== undefined) throw version.error
  if (version.status !== 0 || version.stdout.trim() === '') {
    throw new Error(`product smoke: --version failed (${String(version.status)}): ${version.stdout}${version.stderr}`)
  }

  const webCommand = command(['web', '--no-open', '--host', '127.0.0.1', '--port', '0'])
  const child = spawn(webCommand.executable, webCommand.args, {
    cwd: parent,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  webChild = child
  let output = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => { output += chunk })
  child.stderr.on('data', (chunk: string) => { output += chunk })

  const deadline = Date.now() + 30_000
  let response: Response | undefined
  while (Date.now() < deadline) {
    const url = output.match(/http:\/\/127\.0\.0\.1:\d+/u)?.[0]
    if (url !== undefined) {
      try {
        response = await fetch(url)
        if (response.ok) break
      } catch {
        // The ready line and socket publication can cross by a few milliseconds.
      }
    }
    if (child.exitCode !== null) throw new Error(`product smoke: dsh web exited early (${String(child.exitCode)}):\n${output}`)
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  }
  if (response?.ok !== true) throw new Error(`product smoke: Web endpoint did not become ready:\n${output}`)
  const html = await response.text()
  if (!html.includes('<!doctype html>') && !html.includes('<!DOCTYPE html>')) {
    throw new Error('product smoke: Web endpoint did not return an HTML document')
  }
  await stopWebChild()
  console.log(`product smoke: ${version.stdout.trim()} served Web successfully from a path containing spaces`)
} finally {
  await stopWebChild()
  await rm(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })
}
