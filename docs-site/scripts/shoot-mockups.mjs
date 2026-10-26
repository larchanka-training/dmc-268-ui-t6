#!/usr/bin/env node
/* global document -- the page.evaluate callbacks run in the browser */
/*
 * Takes the pictures of the dashboard mockups that the docs pages show.
 *
 * Every /mockups/<name> page is opened in Chromium at 2x pixel density and saved as
 * public/screens/<name>.webp; the CSS size of each picture goes to
 * components/mockups/screens.json, so the docs can reserve the space before the picture loads.
 *
 * Requires Playwright (`playwright` or `playwright-core`), found through NODE_PATH, and a
 * Chromium or Chrome binary. Neither is a dependency of this package, so `pnpm install` stays
 * light; install Playwright anywhere and point NODE_PATH to its node_modules.
 *
 * Usage (from the repository root):
 *   pnpm --dir docs-site shots                        # builds the site, starts it, shoots, stops it
 *   BASE_URL=http://localhost:3000 pnpm --dir docs-site shots   # uses a running server
 *
 * Environment:
 *   NODE_PATH        folders searched for `playwright` (it is not a dependency of this package)
 *   CHROME_PATH      Chromium or Chrome binary; default /usr/bin/google-chrome if present
 *   BASE_URL         a running docs server; when unset the script builds and starts its own
 *   PORT             port of the server the script starts (default 3917)
 *   SKIP_BUILD=1     start the existing .next build without building again
 *
 * WebP encoding uses `sharp`, which Next.js already installs; without it the PNG is kept.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'screens')
const MANIFEST = path.join(ROOT, 'components', 'mockups', 'screens.json')
const SCALE = 2
const WEBP_QUALITY = 90

/**
 * What to shoot. A screen is a whole dashboard page at a laptop width and a fixed height; a
 * snippet is one settings block at the width of its docs card, its height measured on the page.
 * The names must match components/dashboard/mock-names.ts.
 */
const SHOTS = [
  { name: 'runs', width: 1280, height: 712 },
  { name: 'run-detail', width: 1280, height: 1120 },
  { name: 'settings-auto-review', width: 560 },
  { name: 'settings-rag', width: 560 },
  { name: 'settings-review-options', width: 560 },
  { name: 'settings-branches-severity', width: 560 },
  { name: 'settings-rules', width: 640 },
]

const require = createRequire(import.meta.url)

/** Resolves a package from this folder, NODE_PATH, or the folder Next.js is installed in. */
function load(name, extraFrom = []) {
  const paths = [
    ROOT,
    ...(process.env.NODE_PATH ?? '').split(path.delimiter).filter(Boolean),
    ...extraFrom,
  ]
  try {
    return require(require.resolve(name, { paths }))
  } catch {
    return null
  }
}

function nextDir() {
  try {
    return path.dirname(require.resolve('next/package.json', { paths: [ROOT] }))
  } catch {
    return null
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit' })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${String(code)}`))
    })
  })
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No server at ${url} after ${String(timeoutMs / 1000)} s`)
}

/** Starts `next start` on its own port; returns the base URL and a stop function. */
async function startServer() {
  const port = process.env.PORT ?? '3917'
  if (process.env.SKIP_BUILD !== '1') await run('pnpm', ['exec', 'next', 'build'])
  const child = spawn('pnpm', ['exec', 'next', 'start', '-H', '127.0.0.1', '-p', port], {
    cwd: ROOT,
    stdio: 'inherit',
    detached: true,
  })
  const baseUrl = `http://127.0.0.1:${port}`
  const stop = () => {
    // The whole process group: pnpm and the next server it started.
    if (child.pid !== undefined && child.exitCode === null) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        // already gone
      }
    }
  }
  try {
    await waitForServer(`${baseUrl}/mockups/runs`)
  } catch (error) {
    stop()
    throw error
  }
  return { baseUrl, stop }
}

async function main() {
  const playwright = load('playwright') ?? load('playwright-core')
  if (playwright === null) {
    throw new Error(
      'playwright is not installed here. Set NODE_PATH to a node_modules folder that has it, ' +
        'for example NODE_PATH=/path/to/node_modules.',
    )
  }
  const next = nextDir()
  const sharp = load('sharp', next === null ? [] : [next])
  if (sharp === null) console.warn('sharp not found: pictures stay PNG.')

  const executablePath =
    process.env.CHROME_PATH ??
    (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)

  let server = null
  let baseUrl = process.env.BASE_URL
  if (baseUrl === undefined) {
    server = await startServer()
    baseUrl = server.baseUrl
  }

  const manifest = {}
  let browser = null
  try {
    browser = await playwright.chromium.launch({ executablePath })
    await mkdir(OUT_DIR, { recursive: true })
    for (const shot of SHOTS) {
      const page = await browser.newPage({
        viewport: { width: shot.width, height: shot.height ?? 800 },
        deviceScaleFactor: SCALE,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      })
      await page.goto(`${baseUrl}/mockups/${shot.name}`, { waitUntil: 'networkidle' })
      // The mockups render on the client and then set data-mock-ready on <body> (mock-screen.tsx);
      // wait for that and the fonts, then a moment for layout to settle.
      await page.waitForFunction(() => document.body.dataset.mockReady === 'true')
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(400)

      let height = shot.height
      if (height === undefined) {
        // The lowest edge of anything on the page: the snippet with its padding.
        height = await page.evaluate(() => {
          let bottom = 0
          for (const element of document.body.querySelectorAll('*')) {
            bottom = Math.max(bottom, element.getBoundingClientRect().bottom)
          }
          return Math.ceil(bottom)
        })
        if (height <= 0) throw new Error(`/mockups/${shot.name} rendered nothing`)
        await page.setViewportSize({ width: shot.width, height })
        await page.waitForTimeout(200)
      }

      const png = await page.screenshot({
        clip: { x: 0, y: 0, width: shot.width, height },
        animations: 'disabled',
      })
      await page.close()

      let file
      if (sharp === null) {
        file = `${shot.name}.png`
        await writeFile(path.join(OUT_DIR, file), png)
      } else {
        file = `${shot.name}.webp`
        await sharp(png)
          .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
          .toFile(path.join(OUT_DIR, file))
        await rm(path.join(OUT_DIR, `${shot.name}.png`), { force: true })
      }
      const { size } = await stat(path.join(OUT_DIR, file))
      manifest[shot.name] = { src: `/screens/${file}`, width: shot.width, height }
      console.log(
        `${file}  ${String(shot.width)}x${String(height)}  ${(size / 1024).toFixed(1)} KB`,
      )
    }
  } finally {
    await browser?.close()
    server?.stop()
  }

  const json = `${JSON.stringify(manifest, null, 2)}\n`
  const previous = existsSync(MANIFEST) ? await readFile(MANIFEST, 'utf8') : ''
  if (json !== previous) await writeFile(MANIFEST, json)
  console.log(`Wrote ${path.relative(ROOT, MANIFEST)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
