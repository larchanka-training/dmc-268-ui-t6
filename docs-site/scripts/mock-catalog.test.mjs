import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { MOCK_SHOTS, SCREEN_SPECS } from '../components/dashboard/mock-names.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(ROOT, '..')

function readWebpDimensions(filePath) {
  const buf = readFileSync(filePath)
  if (
    buf.length < 30 ||
    buf.toString('latin1', 0, 4) !== 'RIFF' ||
    buf.toString('latin1', 8, 12) !== 'WEBP'
  ) {
    throw new Error(`Invalid WebP file: ${filePath}`)
  }
  const format = buf.toString('latin1', 12, 16)
  if (format === 'VP8 ') {
    const width = buf.readUInt16LE(26) & 0x3fff
    const height = buf.readUInt16LE(28) & 0x3fff
    return { width, height }
  }
  if (format === 'VP8L') {
    const b1 = buf[21]
    const b2 = buf[22]
    const b3 = buf[23]
    const b4 = buf[24]
    const width = 1 + (((b2 & 0x3f) << 8) | b1)
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
    return { width, height }
  }
  if (format === 'VP8X') {
    const width = 1 + buf.readUIntLE(24, 3)
    const height = 1 + buf.readUIntLE(27, 3)
    return { width, height }
  }
  throw new Error(`Unsupported WebP format ${format} in ${filePath}`)
}

test('mockup catalog matches screens manifest, dimensions, and rendered public images', () => {
  const shotNames = MOCK_SHOTS.map((shot) => shot.name)
  assert.equal(new Set(shotNames).size, shotNames.length, 'Duplicate names in MOCK_SHOTS')

  const manifestPath = path.join(ROOT, 'components', 'mockups', 'screens.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert.deepEqual(Object.keys(manifest).sort(), [...shotNames].sort())

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
    const dims = readWebpDimensions(asset)
    // Shots are captured at 2x pixel density per docs-site/README.md (deviceScaleFactor = 2)
    assert.equal(
      dims.width,
      entry.width * 2,
      `Pixel width mismatch for ${shot.name}: expected ${entry.width * 2}, got ${dims.width}`,
    )
    assert.equal(
      dims.height,
      entry.height * 2,
      `Pixel height mismatch for ${shot.name}: expected ${entry.height * 2}, got ${dims.height}`,
    )
  }
})

// Static config guard (real HTTP 308 precedence is verified against the built nginx container).
test('docs nginx keeps /docs/mockups/ prefix without ^~ (config guard)', () => {
  const nginx = readFileSync(path.join(REPO_ROOT, 'docker', 'docs', 'nginx.conf'), 'utf8')
  assert.doesNotMatch(nginx, /location\s+\^~\s+\/docs\/mockups\//)
  assert.match(nginx, /location\s+\/docs\/mockups\/\s*\{/)
  assert.match(nginx, /location\s+~\s+\^\/docs\/\(\.\+\)\/\$\s*\{\s*return\s+308\s+\/docs\/\$1;/s)
})
