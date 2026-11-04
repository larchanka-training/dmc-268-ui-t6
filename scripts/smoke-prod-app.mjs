import { spawn } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:4173'
const viteCli = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const server = spawn(
  process.execPath,
  [viteCli, 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)
let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk
})

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) break
    try {
      const response = await fetch(origin)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await setTimeout(200)
  }
  throw new Error(`vite preview did not start: ${serverOutput}`)
}

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({ headless: true })
  for (const path of ['/', '/repositories']) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${origin}${path}`)
    try {
      await page.locator('#login-form h1').waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      const rootText = await page.locator('#root').textContent()
      throw new Error(
        `${path}: ${rootText?.trim() ? 'login screen did not render' : 'React root is empty'}${errors.length ? `; ${errors.join('; ')}` : ''}`,
      )
    }
    await page.waitForTimeout(200)
    if (errors.length) throw new Error(`${path}: ${errors.join('; ')}`)
    console.log(`smoke-prod-app: ${path} rendered without page errors`)
    await page.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
