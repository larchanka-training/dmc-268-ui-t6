import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { MOCK_NAMES, MOCK_SHOTS, SCREEN_SPECS } from '../components/dashboard/mock-names.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(ROOT, '..')

test('mockup catalog matches screens manifest, dimensions, and rendered public images', () => {
  const shotNames = MOCK_SHOTS.map((shot) => shot.name)
  assert.deepEqual(shotNames, [...MOCK_NAMES])
  assert.equal(new Set(shotNames).size, shotNames.length)

  const manifestPath = path.join(ROOT, 'components', 'mockups', 'screens.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert.deepEqual(Object.keys(manifest).sort(), [...MOCK_NAMES].sort())

  const screenHeights = new Map(SCREEN_SPECS.map((spec) => [spec.name, spec.height]))
  for (const shot of MOCK_SHOTS) {
    const entry = manifest[shot.name]
    assert.ok(entry && typeof entry.src === 'string' && entry.src.startsWith('/screens/'))
    assert.equal(entry.width, shot.width, `Width mismatch in screens.json for ${shot.name}`)
    const expectedHeight = screenHeights.get(shot.name)
    if (expectedHeight !== undefined) {
      assert.equal(entry.height, expectedHeight, `Height mismatch in screens.json for ${shot.name}`)
    } else {
      assert.ok(
        Number.isInteger(entry.height) && entry.height > 0,
        `Invalid measured snippet height in screens.json for ${shot.name}`,
      )
    }
    const asset = path.join(ROOT, 'public', entry.src.replace(/^\/+/, ''))
    assert.ok(existsSync(asset), `Missing generated image for ${shot.name}: ${asset}`)
  }
})

// Static config guard (real HTTP 308 precedence is verified against the built nginx container).
test('docs nginx keeps /docs/mockups/ prefix without ^~ so 308 trailing-slash regex matches first', () => {
  const nginx = readFileSync(path.join(REPO_ROOT, 'docker', 'docs', 'nginx.conf'), 'utf8')
  assert.doesNotMatch(nginx, /location\s+\^~\s+\/docs\/mockups\//)
  assert.match(nginx, /location\s+\/docs\/mockups\/\s*\{/)
  assert.match(nginx, /location\s+~\s+\^\/docs\/\(\.\+\)\/\$\s*\{\s*return\s+308\s+\/docs\/\$1;/s)
})
