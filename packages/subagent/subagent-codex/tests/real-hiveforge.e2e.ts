import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { Context } from '@hiveforge-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Agent } from '@hiveforge-ai/dsh-agent'
import SubagentRuntime from '@hiveforge-ai/dsh-subagent'
import type { SubprocessHandle } from '@hiveforge-ai/dsh-subprocess'
import LocalSubprocessRuntime from '@hiveforge-ai/dsh-subprocess-local'
import * as codex from '../src/index.ts'
import {
  startHiveForgeResponsesBridge,
  type HiveForgeResponsesBridge,
} from './hiveforge-responses-bridge.ts'

const execFileAsync = promisify(execFile)
const codexPackageJson = createRequire(import.meta.url).resolve('@openai/codex/package.json')
const codexPackage = JSON.parse(readFileSync(
  codexPackageJson,
  'utf8',
)) as { version: string; bin: { codex: string } }
const codexEntry = resolve(dirname(codexPackageJson), codexPackage.bin.codex)

const roots: string[] = []
const contexts: Context[] = []
const bridges: HiveForgeResponsesBridge[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(bridges.splice(0).map(bridge => bridge.close()))
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function expectQuiescent(handles: readonly SubprocessHandle[]): Promise<void> {
  expect(handles.length).toBeGreaterThan(0)
  for (const handle of handles) {
    await expect(handle.waitForExit()).resolves.toBe(true)
    await expect(handle.done).resolves.toHaveProperty('exitCode')
  }
}

describe.skipIf(!process.env.HIVEFORGE_API_KEY)(
  'Codex provider with real HiveForge API',
  () => {
    it('returns one unique nonce through the production provider and real Codex', async () => {
      const apiKey = process.env.HIVEFORGE_API_KEY
      if (apiKey === undefined) throw new Error('e2e ran without HIVEFORGE_API_KEY')
      const root = mkdtempSync(join(tmpdir(), 'dsh-codex-hiveforge-e2e-'))
      roots.push(root)
      const workspace = join(root, 'workspace')
      const codexHome = join(root, 'codex-home')
      mkdirSync(workspace)
      mkdirSync(codexHome)
      const nonce = `DSH_CODEX_HIVEFORGE_${randomUUID()}`
      const bridge = await startHiveForgeResponsesBridge(nonce)
      bridges.push(bridge)
      writeFileSync(join(codexHome, 'config.toml'), [
        'model = "hiveforge-v4-flash"',
        'model_provider = "hiveforge-e2e"',
        'approval_policy = "never"',
        'sandbox_mode = "read-only"',
        'disable_response_storage = true',
        'check_for_update_on_startup = false',
        '',
        '[model_providers.hiveforge-e2e]',
        'name = "HiveForge E2E bridge"',
        `base_url = "${bridge.baseUrl}"`,
        'env_key = "HIVEFORGE_API_KEY"',
        'wire_api = "responses"',
        'requires_openai_auth = false',
        '',
        '[analytics]',
        'enabled = false',
        '',
      ].join('\n'))
      const env = {
        HIVEFORGE_API_KEY: apiKey,
        CODEX_HOME: codexHome,
        HOME: root,
        XDG_CONFIG_HOME: join(root, 'xdg-config'),
        PATH: root,
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        ALL_PROXY: '',
        NO_PROXY: '127.0.0.1,localhost',
      }
      const ctx = new Context()
      contexts.push(ctx)
      await ctx.plugin(SubagentRuntime)
      await ctx.plugin(LocalSubprocessRuntime)
      const handles: SubprocessHandle[] = []
      const spawn = ctx.subprocess.spawn.bind(ctx.subprocess)
      vi.spyOn(ctx.subprocess, 'spawn').mockImplementation((spec) => {
        const handle = spawn(spec)
        handles.push(handle)
        return handle
      })
      await ctx.plugin(codex, { env, disposeGraceMs: 2_000 })
      const version = await execFileAsync(process.execPath, [codexEntry, '--version'], {
        env: { ...process.env, ...env },
      })
      expect(codexPackage.version).toBe('0.147.0')
      expect(version.stdout.trim()).toBe('codex-cli 0.147.0')

      const parent = {
        id: 'hiveforge-e2e-parent',
        session: { header: { cwd: workspace } },
      } as unknown as Agent
      const run = await ctx.subagents.start('codex', {
        prompt: [{
          type: 'text',
          text: `Reply with exactly ${nonce} and nothing else. Do not use tools.`,
        }],
        parent,
        signal: new AbortController().signal,
      })
      const result = await run.result
      await run.dispose()

      expect(result.stopReason).toBe('completed')
      const text = result.output
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim()
      expect(text).toBe(nonce)
      expect(bridge.completedRequests).toBe(1)
      await expectQuiescent(handles)
    }, 180_000)
  },
)
