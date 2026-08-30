// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const INDEX = fileURLToPath(new URL('../index.html', import.meta.url))

describe('web index.html metadata', () => {
  it('carries the non-rendered HiveForge Easter egg meta tag', async () => {
    const html = await readFile(INDEX, 'utf8')
    expect(html).toContain('<meta name="hiveforge-easter-egg" content="Re Gata Pele!" />')
  })
})
