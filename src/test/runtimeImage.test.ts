import { describe, expect, it } from 'vitest'

// No @types/node here: load `fs` untyped to read the Dockerfiles and the workflow.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

/** ui#343: the six nginx CVEs are fixed in 1.30.7-r0. A tag below that patch fails. */
const MIN_NGINX: readonly [number, number, number] = [1, 30, 7]

const RUNTIME_DOCKERFILES = ['Dockerfile', 'landing/Dockerfile', 'docs-site/Dockerfile'] as const

const IMAGE = 'nginx/nginx-unprivileged:'

function runtimeBase(file: string, dockerfile: string): string {
  const froms = [...dockerfile.matchAll(/^FROM\s+(\S+)\s+AS\s+runtime\s*$/gm)].map(
    (match) => match[1] ?? '',
  )
  expect(froms, `${file} has one runtime stage`).toHaveLength(1)
  return froms[0] ?? ''
}

/** `1.30.8-alpine-slim` is 1.30.8. `1.30-alpine` is 1.30.0 — below the fix. */
function nginxVersion(tag: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-|$)/.exec(tag)
  expect(match, `runtime tag ${tag} names an nginx version`).not.toBeNull()
  return [
    Number(match?.[1] ?? 0),
    Number(match?.[2] ?? 0),
    match?.[3] === undefined ? 0 : Number(match[3]),
  ]
}

function atLeast(version: readonly number[], minimum: readonly number[]): boolean {
  const length = Math.max(version.length, minimum.length)
  for (let index = 0; index < length; index += 1) {
    const left = version[index] ?? 0
    const right = minimum[index] ?? 0
    if (left !== right) {
      return left > right
    }
  }
  return true
}

describe('runtime nginx base', () => {
  it('pins every runtime image to nginx/nginx-unprivileged at 1.30.7 or newer', () => {
    for (const file of RUNTIME_DOCKERFILES) {
      const base = runtimeBase(file, readFileSync(file, 'utf8'))
      expect(base.startsWith(IMAGE), file).toBe(true)
      const tag = base.slice(IMAGE.length)
      expect(tag.includes('-alpine'), `${file} stays on an alpine variant`).toBe(true)
      expect(atLeast(nginxVersion(tag), MIN_NGINX), `${file} ${tag}`).toBe(true)
    }
  })

  it('keeps the docker-scan Trivy threshold on all three images', () => {
    const workflow = readFileSync('.github/workflows/ci-cd.yml', 'utf8')
    const scan = workflow.split(/^ {2}docker-scan:\r?$/m)[1]?.split(/^ {2}push-image:\r?$/m)[0]
    expect(scan, 'docker-scan job is present').toBeDefined()
    const body = scan ?? ''
    expect(body.match(/uses: aquasecurity\/trivy-action@/g)).toHaveLength(3)
    expect(body.match(/severity: CRITICAL,HIGH/g)).toHaveLength(3)
    expect(body.match(/exit-code: '1'/g)).toHaveLength(3)
    expect(body.match(/ignore-unfixed: true/g)).toHaveLength(3)
  })
})
