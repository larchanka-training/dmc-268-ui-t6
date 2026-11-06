// Smoke test of the built UI image in the two ways it runs (docs/CICD.md §3): behind the edge proxy
// with no API_UPSTREAM, and in a compose stack with /api/* proxied to a backend on its network.
//   node scripts/smoke-image.mjs <image>
// Needs docker and Node 20+. Built-in modules only: the CI job that runs it installs nothing.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { promisify } from 'node:util'

const image = process.argv[2]
if (!image) {
  console.error('usage: node scripts/smoke-image.mjs <image>')
  process.exit(2)
}

const API_UPSTREAM = 'http://backend:8000'
const STUB_IMAGE = 'node:24-alpine'
const TIMEOUT_MS = 30_000

// Answers every request with what it received, as 401 JSON. /api/stream sends one event and holds
// the second until /api/release, so a buffering proxy delivers nothing and the read times out.
const STUB = String.raw`
const held = []
require('node:http').createServer((req, res) => {
  if (req.url === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.write('data: first\n\n')
    held.push(res)
    return
  }
  const body = []
  req.on('data', (chunk) => body.push(chunk))
  req.on('end', () => {
    if (req.url === '/api/release') for (const stream of held.splice(0)) stream.end('data: second\n\n')
    res.writeHead(401, { 'Content-Type': 'application/json', 'Set-Cookie': 'stub=1; Path=/api/auth' })
    res.end(JSON.stringify({
      detail: 'stub',
      instance: process.env.INSTANCE,
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion,
      headers: req.headers,
      body: Buffer.concat(body).toString(),
    }))
  })
}).listen(8000)
`

const runId = randomBytes(4).toString('hex')
const network = `smoke-image-${runId}`
const containers = new Set()
const execFileAsync = promisify(execFile)

async function docker(...args) {
  const { stdout } = await execFileAsync('docker', args)
  return stdout.trim()
}

async function until(what, probe) {
  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    const result = await probe()
    if (result) return result
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`timed out waiting for ${what}`)
}

async function run(...args) {
  const name = `smoke-image-${runId}-${containers.size + 1}`
  containers.add(name)
  await docker('run', '-d', '--name', name, '--network', network, ...args)
  return name
}

async function startUi(env = {}) {
  const envArgs = Object.entries(env).flatMap(([key, value]) => ['-e', `${key}=${value}`])
  const name = await run('-p', '127.0.0.1::8080', ...envArgs, image)
  const origin = `http://${await docker('port', name, '8080/tcp')}`
  await until(`${name} to become healthy`, async () => {
    const status = await docker('inspect', '--format', '{{.State.Health.Status}}', name)
    return status === 'healthy'
  })
  return { name, origin }
}

function startStub(instance) {
  return run(
    '--network-alias',
    'backend',
    '-e',
    `INSTANCE=${instance}`,
    STUB_IMAGE,
    'node',
    '-e',
    STUB,
  )
}

function isHtml(response) {
  return response.headers.get('content-type')?.startsWith('text/html')
}

async function proxied(origin, instance) {
  return until(`the API stub ${instance} behind ${origin}`, async () => {
    const response = await fetch(`${origin}/api/runs?x=1`)
    if (response.status !== 401) return null
    const body = await response.json()
    return body.instance === instance ? { response, body } : null
  })
}

const scenarios = []
function scenario(title, body) {
  scenarios.push({ title, body })
}

let compose
let firstStub

scenario('without API_UPSTREAM the image serves the UI and only the UI', async () => {
  const { origin } = await startUi()

  const health = await fetch(`${origin}/health`)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).service, 'dmc-268-ui')

  const index = await fetch(`${origin}/`)
  assert.equal(index.status, 200)
  assert.ok(isHtml(index))
  assert.match(index.headers.get('content-security-policy'), /connect-src 'self'/)
  const page = await index.text()

  const route = await fetch(`${origin}/runs/1`)
  assert.equal(route.status, 200)
  assert.equal(await route.text(), page)

  // Unchanged SPA fallback: behind the edge proxy /api/* never reaches this nginx.
  const api = await fetch(`${origin}/api/runs`)
  assert.equal(api.status, 200)
  assert.equal(await api.text(), page)
})

scenario('with API_UPSTREAM the image starts before its backend exists', async () => {
  compose = await startUi({ API_UPSTREAM })

  const api = await fetch(`${compose.origin}/api/runs`)
  assert.equal(api.status, 502)

  const index = await fetch(`${compose.origin}/`)
  assert.equal(index.status, 200)
  assert.ok(isHtml(index))
})

scenario('/api/* reaches the backend as it reaches it behind the edge proxy', async () => {
  firstStub = await startStub('a')
  const { response, body } = await proxied(compose.origin, 'a')
  assert.match(response.headers.get('content-type'), /^application\/json/)
  assert.equal(body.url, '/api/runs?x=1')
  assert.equal(body.httpVersion, '1.1')
  assert.equal(body.headers.host, new URL(compose.origin).host)
  assert.ok(body.headers['x-forwarded-for'])
  assert.equal(body.headers['x-forwarded-proto'], 'http')

  const encoded = await (await fetch(`${compose.origin}/api/repos/a%2Fb`)).json()
  assert.equal(encoded.url, '/api/repos/a%2Fb')

  const post = await fetch(`${compose.origin}/api/echo`, { method: 'POST', body: 'payload' })
  assert.equal(post.status, 401)
  assert.match(post.headers.get('set-cookie'), /^stub=1; Path=\/api\/auth/)
  const echoed = await post.json()
  assert.equal(echoed.method, 'POST')
  assert.equal(echoed.body, 'payload')
})

scenario('an SSE event reaches the client before the stream ends', async () => {
  const response = await fetch(`${compose.origin}/api/stream`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /^text\/event-stream/)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  assert.match(decoder.decode((await reader.read()).value), /first/)
  await fetch(`${compose.origin}/api/release`, { method: 'POST' })
  assert.match(decoder.decode((await reader.read()).value), /second/)
})

scenario('a recreated backend is found at its new address without a UI restart', async () => {
  // Started while the old one is alive, so the new container cannot get the same address.
  await startStub('b')
  await docker('rm', '-f', firstStub)
  await proxied(compose.origin, 'b')
})

scenario('an API_UPSTREAM that is not http(s)://host[:port] stops the container', async () => {
  for (const value of [`${API_UPSTREAM}/`, `${API_UPSTREAM}/api`, 'backend:8000']) {
    const name = await run('-e', `API_UPSTREAM=${value}`, image)
    await until(`${name} to stop on API_UPSTREAM=${value}`, async () => {
      const status = await docker('inspect', '--format', '{{.State.Status}}', name)
      return status === 'exited'
    })
    assert.notEqual(await docker('inspect', '--format', '{{.State.ExitCode}}', name), '0')
    const { stderr } = await execFileAsync('docker', ['logs', name])
    assert.match(stderr, /ERROR: API_UPSTREAM/)
  }
})

let failed = 0
await docker('network', 'create', network)
try {
  for (const { title, body } of scenarios) {
    try {
      await body()
      console.log(`ok   ${title}`)
    } catch (error) {
      failed += 1
      console.error(`FAIL ${title}\n     ${error.message}`)
    }
  }
} finally {
  if (containers.size > 0) await docker('rm', '-f', ...containers)
  await docker('network', 'rm', network)
}
process.exit(failed > 0 ? 1 : 0)
