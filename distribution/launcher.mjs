#!/usr/bin/env node
/** Product boundary: isolate HiveForge from any existing dsh installation. */

import { homedir } from 'node:os'
import { join } from 'node:path'

function defaultHiveForgeHome() {
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'HiveForge', 'state')
  }
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'HiveForge')
  return join(process.env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state'), 'hiveforge')
}

// Never inherit DSH_HOME: it may belong to DeepSeek Harness or another dsh
// distribution. HIVEFORGE_HOME is the only supported product override.
process.env.DSH_HOME = process.env.HIVEFORGE_HOME ?? defaultHiveForgeHome()

const args = process.argv.slice(2)
if (args[0] === 'web' && !args.some(argument => argument === '--port' || argument.startsWith('--port='))) {
  process.argv.push('--port', process.env.HIVEFORGE_WEB_PORT ?? '3081')
}

await import('./runtime/node_modules/@hiveforge-ai/dsh/lib/bin.js')
