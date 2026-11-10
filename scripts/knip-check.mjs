// ui#175: dead-code gate. Runs knip and compares its findings with the committed baseline
// (knip-baseline.json): a finding that is not in the baseline fails, and so does a baseline entry
// that no longer matches a finding. `--update` rewrites the baseline from the current findings.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(ROOT, 'knip-baseline.json')
const KNIP_BIN = join(ROOT, 'node_modules', 'knip', 'bin', 'knip.js')
const NON_ISSUE_KEYS = new Set(['file', 'owners'])

function symbolOf(type, item) {
  if (Array.isArray(item)) return item.map((entry) => entry.name).join('|')
  if (type === 'files') return item.name
  return item.namespace ? `${item.namespace}.${item.name}` : item.name
}

const byKey = (a, b) =>
  a.type.localeCompare(b.type, 'en') ||
  a.file.localeCompare(b.file, 'en') ||
  a.symbol.localeCompare(b.symbol, 'en')

/** Flatten a `knip --reporter json` report into a sorted list of { type, file, symbol }. */
export function toFindings(report) {
  const findings = []
  for (const issue of report.issues) {
    for (const [type, items] of Object.entries(issue)) {
      if (NON_ISSUE_KEYS.has(type) || !Array.isArray(items)) continue
      for (const item of items) {
        findings.push({ type, file: issue.file, symbol: symbolOf(type, item) })
      }
    }
  }
  return findings.sort(byKey)
}

const keyOf = ({ type, file, symbol }) => JSON.stringify([type, file, symbol])

/** `added`: findings not in the baseline; `stale`: baseline entries that match no finding. */
export function compareFindings(current, baseline) {
  const baselineKeys = new Set(baseline.map(keyOf))
  const currentKeys = new Set(current.map(keyOf))
  return {
    added: current.filter((finding) => !baselineKeys.has(keyOf(finding))),
    stale: baseline.filter((finding) => !currentKeys.has(keyOf(finding))),
  }
}

const format = ({ type, file, symbol }) => `  ${type} ${file} ${symbol}`

function runKnip() {
  const run = spawnSync(
    process.execPath,
    [KNIP_BIN, '--reporter', 'json', '--no-exit-code', '--no-progress'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  if (run.status !== 0) {
    process.stderr.write(run.stderr)
    process.exit(run.status ?? 2)
  }
  try {
    return JSON.parse(run.stdout)
  } catch {
    process.stderr.write(`knip printed no JSON report.\n${run.stderr}`)
    process.exit(2)
  }
}

function main() {
  const current = toFindings(runKnip())
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))

  if (process.argv.includes('--update')) {
    const next = { reason: baseline.reason, findings: current }
    writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`)
    console.log(`knip baseline updated: ${current.length} findings`)
    return
  }

  const { added, stale } = compareFindings(current, baseline.findings)
  if (added.length > 0) {
    console.error(`New dead code (${added.length}):\n${added.map(format).join('\n')}`)
    console.error(
      'Remove the dead code; a baseline entry needs a reason in the PR body (`pnpm lint:dead --update`).',
    )
  }
  if (stale.length > 0) {
    console.error(`Stale baseline entries (${stale.length}):\n${stale.map(format).join('\n')}`)
    console.error('Remove these entries (`pnpm lint:dead --update`).')
  }
  if (added.length > 0 || stale.length > 0) process.exit(1)
  console.log(`knip: no new dead code (baseline: ${baseline.findings.length} findings)`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
