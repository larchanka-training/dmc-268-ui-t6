import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { MOCK_SCALE, MOCK_SHOTS, SCREEN_SPECS } from '../components/dashboard/mock-names.ts'
import { resolveInside, serveStatic } from './shoot-mockups.mjs'

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
  throw new Error(
    `Unsupported WebP format ${format} in ${filePath}: only lossy VP8 is expected for mockups`,
  )
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
    // Shots are captured at MOCK_SCALE pixel density per docs-site/README.md
    assert.equal(
      dims.width,
      entry.width * MOCK_SCALE,
      `Pixel width mismatch for ${shot.name}: expected ${entry.width * MOCK_SCALE}, got ${dims.width}`,
    )
    assert.equal(
      dims.height,
      entry.height * MOCK_SCALE,
      `Pixel height mismatch for ${shot.name}: expected ${entry.height * MOCK_SCALE}, got ${dims.height}`,
    )
  }
})

test('resolveInside rejects directory traversal and allows legitimate filenames', () => {
  const baseDir = path.resolve(ROOT, 'out')

  // null inside
  assert.equal(resolveInside(baseDir, null), null)

  // Directory traversal escaping attempts
  assert.equal(resolveInside(baseDir, '../x'), null)
  // `\` is a separator only on Windows; on POSIX `..\x` is an ordinary file name inside baseDir.
  assert.equal(
    resolveInside(baseDir, '..\\x'),
    path.sep === '\\' ? null : path.resolve(baseDir, '..\\x'),
  )
  assert.equal(resolveInside(baseDir, '..'), null)
  assert.equal(resolveInside(baseDir, 'a/../../x'), null)

  // `path.isAbsolute(rel)` prevents escaping via Windows drive letters or absolute paths
  if (path.sep === '\\') {
    assert.equal(resolveInside(baseDir, 'C:\\escaped'), null)
  }

  // Legitimate file with '..' prefix that does not escape
  const fooTarget = resolveInside(baseDir, '..foo')
  assert.equal(fooTarget, path.resolve(baseDir, '..foo'))

  // Legitimate subpath
  const subTarget = resolveInside(baseDir, 'docs/index.html')
  assert.equal(subTarget, path.resolve(baseDir, 'docs', 'index.html'))
})

test('serveStatic handles directory traversal as 404 and malformed URI as 400', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'servestatic-test-'))
  const server = await serveStatic(tmpDir, '/docs', 0)
  const port = server.address().port
  try {
    const resTraversal = await fetch(`http://127.0.0.1:${port}/docs/..%2f..%2fx`)
    assert.equal(resTraversal.status, 404)

    const resMalformed = await fetch(`http://127.0.0.1:${port}/docs/%E0%A4%A`)
    assert.equal(resMalformed.status, 400)
  } finally {
    server.close()
    await rm(tmpDir, { recursive: true, force: true })
  }
})

// Static config guard (real HTTP 308 precedence is verified against the built nginx container).
test('docs nginx keeps /docs/mockups/ prefix without ^~ (config guard)', () => {
  const nginx = readFileSync(path.join(REPO_ROOT, 'docker', 'docs', 'nginx.conf'), 'utf8')
  assert.doesNotMatch(nginx, /location\s+\^~\s+\/docs\/mockups\//)
  assert.match(nginx, /location\s+\/docs\/mockups\/\s*\{/)
  assert.match(nginx, /location\s+~\s+\^\/docs\/\(\.\+\)\/\$\s*\{\s*return\s+308\s+\/docs\/\$1;/s)
})
