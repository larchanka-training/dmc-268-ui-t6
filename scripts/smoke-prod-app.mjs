import { spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:4173'
const assetsDir = fileURLToPath(new URL('../dist/assets/', import.meta.url))
const viteCli = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))

function staticImports(source) {
  const imports = []
  let offset = 0
  while (source.startsWith('import', offset)) {
    const end = source.indexOf(';', offset)
    const statement = source.slice(offset, end + 1)
    const target = /^import(?:[^;]*?from)?["']\.\/([^"']+\.js)["'];$/.exec(statement)?.[1]
    if (!target) throw new Error(`Unexpected vendor import: ${statement.slice(0, 100)}`)
    imports.push(target)
    offset = end + 1
  }
  return imports
}

async function checkVendorImports() {
  const assets = await readdir(assetsDir)
  const buildFlags = assets.filter((name) => /^buildFlags-[^/]+\.js$/.test(name))
  if (buildFlags.length !== 1) throw new Error('Expected one buildFlags chunk')
  if (staticImports(await readFile(`${assetsDir}/${buildFlags[0]}`, 'utf8')).length > 0) {
    throw new Error('buildFlags chunk must be import-free')
  }
  for (const file of assets.filter((name) => /^vendor-[^/]+\.js$/.test(name))) {
    for (const target of staticImports(await readFile(`${assetsDir}/${file}`, 'utf8'))) {
      if (target === buildFlags[0] || /^vendor-[^/]+\.js$/.test(target)) continue
      throw new Error(`${file} statically imports app chunk ${target}`)
    }
  }
}

await checkVendorImports()

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

function waitForPreview() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      finish(new Error(`vite preview did not become ready: ${serverOutput}`))
    }, 10_000)
    const onOutput = () => {
      if (/Local:\s+http:\/\/127\.0\.0\.1:4173\//.test(serverOutput)) finish()
    }
    const onExit = (code) => {
      finish(new Error(`vite preview exited before ready (${code}): ${serverOutput}`))
    }
    const onError = (error) => {
      finish(error)
    }
    const finish = (error) => {
      clearTimeout(timeout)
      server.stdout.off('data', onOutput)
      server.off('exit', onExit)
      server.off('error', onError)
      if (error) reject(error)
      else resolve()
    }
    server.stdout.on('data', onOutput)
    server.once('exit', onExit)
    server.once('error', onError)
    onOutput()
    if (server.exitCode !== null) onExit(server.exitCode)
  })
}

let browser
try {
  await waitForPreview()
  browser = await chromium.launch({ headless: true })
  const loginPage = await browser.newPage()
  const loginErrors = []
  loginPage.on('pageerror', (error) => loginErrors.push(error.message))
  await loginPage.goto(origin)
  try {
    await loginPage.locator('#login-form h1').waitFor({ state: 'visible', timeout: 5000 })
  } catch {
    const rootText = await loginPage.locator('#root').textContent()
    throw new Error(
      `/: ${rootText?.trim() ? 'login screen did not render' : 'React root is empty'}${loginErrors.length ? `; ${loginErrors.join('; ')}` : ''}`,
    )
  }
  await loginPage.waitForTimeout(200)
  if (loginErrors.length) throw new Error(`/: ${loginErrors.join('; ')}`)
  console.log('smoke-prod-app: / rendered login without page errors')
  await loginPage.close()

  const repositoriesPage = await browser.newPage()
  const repositoryErrors = []
  const fixtureRequests = { refresh: 0, me: 0, repos: 0 }
  repositoriesPage.on('pageerror', (error) => repositoryErrors.push(error.message))
  await repositoriesPage.route('**/api/auth/refresh', async (route) => {
    fixtureRequests.refresh += 1
    await route.fulfill({
      json: { accessToken: 'smoke-token', tokenType: 'Bearer', expiresIn: 900 },
    })
  })
  await repositoriesPage.route('**/api/auth/me', async (route) => {
    fixtureRequests.me += 1
    await route.fulfill({
      json: { id: 1, login: 'smoke-user', name: 'Smoke User', avatarUrl: null, workspaces: [] },
    })
  })
  await repositoriesPage.route('**/api/repos', async (route) => {
    fixtureRequests.repos += 1
    await route.fulfill({ json: [] })
  })
  await repositoriesPage.goto(`${origin}/repositories`)
  try {
    await repositoriesPage.getByRole('heading', { name: 'Repositories', exact: true }).waitFor({
      state: 'visible',
      timeout: 5000,
    })
    await repositoriesPage.getByText('Nothing connected yet').waitFor({ state: 'visible' })
  } catch {
    const rootText = await repositoriesPage.locator('#root').textContent()
    throw new Error(
      `/repositories: ${rootText?.trim() ? 'repositories page did not render' : 'React root is empty'}${repositoryErrors.length ? `; ${repositoryErrors.join('; ')}` : ''}`,
    )
  }
  await repositoriesPage.waitForTimeout(200)
  if (repositoryErrors.length) throw new Error(`/repositories: ${repositoryErrors.join('; ')}`)
  if (repositoriesPage.url() !== `${origin}/repositories`) {
    throw new Error(`/repositories: redirected to ${repositoriesPage.url()}`)
  }
  if (await repositoriesPage.getByText('Something went wrong', { exact: true }).count()) {
    throw new Error('/repositories: route error boundary rendered')
  }
  if (Object.values(fixtureRequests).some((count) => count === 0)) {
    throw new Error(`/repositories: missing fixture requests ${JSON.stringify(fixtureRequests)}`)
  }
  console.log('smoke-prod-app: /repositories rendered authenticated page without page errors')
  await repositoriesPage.close()
} finally {
  await browser?.close()
  server.kill()
}
