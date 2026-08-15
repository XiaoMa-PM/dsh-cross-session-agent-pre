import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

const expectedFiles = [
  'AGENTS.md',
  'CHANGELOG.md',
  'LICENSE',
  'NOTICE.md',
  'PRIVACY.md',
  'README.en.md',
  'README.md',
  'SECURITY.md',
  'TDD_CONTRACT.md',
  'cordis.patch.yml',
  'docs/architecture-v2.md',
  'docs/assets/message-header-navigation.jpg',
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
