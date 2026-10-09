// INPUT: npm package dry-run manifest.
// OUTPUT: Exact distributable runtime and Claude plugin allowlist.
// POS: Release artifact boundary contract.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

const expectedFiles = [
  '.claude-plugin/marketplace.json',
  'AGENTS.md',
  'CHANGELOG.md',
  'LICENSE',
  'NOTICE.md',
  'PRIVACY.md',
  'README.en.md',
  'README.md',
  'SECURITY.md',
  'TDD_CONTRACT.md',
  'claude-plugin/.claude-plugin/plugin.json',
  'claude-plugin/.mcp.json',
  'claude-plugin/AGENTS.md',
  'claude-plugin/hooks/AGENTS.md',
  'claude-plugin/hooks/hooks.json',
  'claude-plugin/hooks/register.mjs',
  'claude-plugin/lib/AGENTS.md',
  'claude-plugin/lib/local.mjs',
  'claude-plugin/server.mjs',
  'cordis.patch.yml',
  'docs/architecture-v2.md',
  'docs/assets/message-header-navigation.jpg',
  'lib/AGENTS.md',
  'lib/claude-bridge-settings.js',
  'lib/claude-bridge.js',
  'lib/client.js',
  'lib/index.js',
  'lib/peer-context.js',
  'package.json',
]

test('npm 发布包只包含完整的运行时文件', () => {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const output = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'pnpm.cmd pack --dry-run --json'], { encoding: 'utf8' })
    : execFileSync(command, ['pack', '--dry-run', '--json'], { encoding: 'utf8' })
  const { files } = JSON.parse(output)

  assert.deepEqual(files.map(({ path }) => path).sort(), expectedFiles)
})
