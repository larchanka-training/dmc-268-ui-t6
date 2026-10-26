'use client'

/*
 * A finished run, after src/pages/runs/RunDetailPage.tsx, src/widgets/run-inspector and
 * src/widgets/diff-viewer. The diff is rendered with react-diff-view and the app's diff styles.
 */
import { useMemo, type ReactNode } from 'react'
import { Breadcrumb, Button, Card, Collapse, Flex, Form, Input, Select, Typography } from 'antd'
import { FileOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Diff,
  Hunk,
  getChangeKey,
  parseDiff,
  tokenize,
  type ChangeData,
  type RenderGutter,
} from 'react-diff-view'
import 'react-diff-view/style/index.css'
import '../../../src/widgets/diff-viewer/ui/diff-theme.css'
import '../../../src/widgets/diff-viewer/ui/diff-layout.css'
import {
  CodeBlock,
  PageHeader,
  ProgressSteps,
  RowButton,
  Segmented,
  Tag,
  TraceTree,
  type TagProps,
} from '../../../src/shared/ui'
import { useDiffThemeStyle } from '../../../src/widgets/diff-viewer/lib/diffTheme'
import { refractorForDiffView } from '../../../src/widgets/diff-viewer/lib/refractorForDiffView'
import pageStyles from '../../../src/pages/runs/RunDetailPage.module.css'
import inspectorStyles from '../../../src/widgets/run-inspector/ui/RunInspector.module.css'
import headerStyles from '../../../src/widgets/run-inspector/ui/RunHeader.module.css'
import treeStyles from '../../../src/widgets/run-inspector/ui/ActionTree.module.css'
import filterStyles from '../../../src/features/finding-filters/ui/FindingFiltersBar.module.css'
import { AppShell } from './app-shell'

const { Text } = Typography

const PATCH = `diff --git a/src/api/users.ts b/src/api/users.ts
index 1a2b3c4..5d6e7f8 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -10,6 +10,8 @@ export const router = Router()
 
 router.get('/users/:id', async (req, res) => {
   const id = req.params.id
-  const user = await db.users.find(id)
+  const sql = \`SELECT * FROM users WHERE id = \${id}\`
+  const rows = await db.query(sql)
+  const user = rows[0]
   res.json(user)
 })
`

// Same tag look as SEVERITY_TAG in src/widgets/diff-viewer/ui/InlineComment.tsx.
type Severity = 'high' | 'medium'
const SEVERITY: Record<
  Severity,
  { label: string; tone: TagProps['tone']; variant: TagProps['variant'] }
> = {
  high: { label: 'High', tone: 'critical', variant: 'dot' },
  medium: { label: 'Medium', tone: 'high', variant: 'dot' },
}

const FINDINGS: readonly { line: number; severity: Severity; title: string }[] = [
  { line: 13, severity: 'high', title: 'SQL injection through string interpolation' },
  { line: 15, severity: 'medium', title: 'Unknown id returns 200 with an empty body' },
]

// The steps a fast run writes to its log (api process_run.py, review_context_stage.py,
// llm_call_trace.py, findings_post_processor.py, publish_run_review.py), in that order.
const ACTIONS: readonly (readonly [tool: string, time: string])[] = [
  ['policy.load', '<1 s'],
  ['vcs.fetch_diff', '1 s'],
  ['context.build', '<1 s'],
  ['llm.call', '19 s'],
  ['review.postprocess', '<1 s'],
  ['github.publish_review', '2 s'],
]
const SELECTED = 1
const TREE_DATA = ACTIONS.map(([tool, time], index) => ({
  key: `action-${String(index)}`,
  title: `#${String(index)} ${tool} (${time})`,
  isLeaf: true,
}))

const renderChangeGutter: RenderGutter = ({ change, renderDefault, wrapInAnchor }) => (
  <span className="diff-gutter-with-marker">
    <span className="diff-gutter-number">{wrapInAnchor(renderDefault())}</span>
    <span aria-hidden="true" className={`diff-change-marker diff-change-marker-${change.type}`}>
      {change.type === 'insert' ? '+' : change.type === 'delete' ? '-' : ''}
    </span>
  </span>
)
const renderUnifiedGutter: RenderGutter = (options) =>
  options.side === 'new'
    ? renderChangeGutter(options)
    : options.wrapInAnchor(options.renderDefault())

function newLineOf(change: ChangeData): number | null {
  if (change.type === 'insert') return change.lineNumber
  if (change.type === 'normal') return change.newLineNumber
  return null
}

function Meta({ items }: { items: { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <dl className={headerStyles.metadata}>
      {items.map((item) => (
        <div
          className={`${headerStyles.item} ${item.wide ? headerStyles.wide : ''}`}
          key={item.label}
        >
          <dt className={headerStyles.label}>{item.label}</dt>
          <dd className={headerStyles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function FileDiff() {
  const theme = useDiffThemeStyle()
  const hunks = useMemo(() => parseDiff(PATCH).at(0)?.hunks ?? [], [])
  const tokens = useMemo(
    () =>
      tokenize(hunks, { highlight: true, refractor: refractorForDiffView, language: 'typescript' }),
    [hunks],
  )
  const widgets: Record<string, ReactNode> = {}
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      const finding = FINDINGS.find((item) => item.line === newLineOf(change))
      if (finding === undefined) continue
      const tag = SEVERITY[finding.severity]
      widgets[getChangeKey(change)] = (
        <div className="inline-comment">
          <RowButton className="inline-comment-row">
            <Tag tone={tag.tone} variant={tag.variant}>
              {tag.label}
            </Tag>
            <Text className="inline-comment-title" strong>
              {finding.title}
            </Text>
            <Text className="inline-comment-range" type="secondary">
              {`L${String(finding.line)}`}
            </Text>
          </RowButton>
        </div>
      )
    }
  }
  return (
    <div className={theme.className} style={theme.style}>
      <div className="diff-file">
        <div className="diff-file-head">
          <FileOutlined />
          <Text className="diff-file-name" strong>
            src/api/users.ts
          </Text>
          <Segmented
            aria-label="Diff view"
            options={[
              { label: 'Unified', value: 'unified' },
              { label: 'Split', value: 'split' },
            ]}
            size="small"
            value="unified"
          />
        </div>
        <Diff
          className="diff-with-change-markers"
          diffType="modify"
          hunks={hunks}
          renderGutter={renderUnifiedGutter}
          tokens={tokens}
          viewType="unified"
          widgets={widgets}
        >
          {(items) => items.map((hunk) => <Hunk hunk={hunk} key={hunk.content} />)}
        </Diff>
      </div>
    </div>
  )
}

export function RunDetailScreen() {
  return (
    <AppShell active="/runs">
      <div className={pageStyles.page}>
        <Breadcrumb
          items={[{ title: <a href="#">Runs</a> }, { title: 'PR #142' }]}
          separator={<RightOutlined />}
        />
        <PageHeader
          actions={<Button type="primary">Restart</Button>}
          description="feat: add user lookup endpoint"
          title="Run for PR #142"
        />
        <section className={inspectorStyles.root}>
          <Card>
            <Meta
              items={[
                { label: 'Repository', value: 'acme/api' },
                { label: 'PR', value: <a href="#">#142 feat: add user lookup endpoint</a> },
                { label: 'Commit', value: <code className={headerStyles.commit}>5d6e7f8</code> },
                { label: 'Author', value: 'maria' },
                { label: 'Branches', value: 'feat/user-lookup → main' },
                { label: 'Engine', value: 'fast' },
                { label: 'Model', value: 'mistral-small-4' },
                {
                  label: 'Status',
                  value: (
                    <Flex gap={6} wrap>
                      <Tag tone="success">succeeded</Tag>
                      <Tag tone="danger" variant="solid">
                        Blocking
                      </Tag>
                    </Flex>
                  ),
                },
                {
                  label: 'Findings',
                  wide: true,
                  value: (
                    <Flex gap={4} wrap>
                      <Tag variant="outline">critical: 0</Tag>
                      <Tag variant="outline">high: 1</Tag>
                      <Tag variant="outline">medium: 1</Tag>
                      <Tag variant="outline">low: 0</Tag>
                      <Tag variant="outline">info: 0</Tag>
                    </Flex>
                  ),
                },
                { label: 'Created', value: '2026-10-20 11:49:00' },
                { label: 'Started', value: '2026-10-20 11:50:00' },
                { label: 'Duration', value: '24 s' },
                { label: 'Attempt', value: '1' },
                { label: 'Actions', value: '6' },
                { label: 'Error', value: '—' },
              ]}
            />
          </Card>
          <ProgressSteps
            steps={[
              { key: 'context', title: 'Collecting context', state: 'finish' },
              { key: 'analysis', title: 'Model analysis', state: 'finish' },
              { key: 'publish', title: 'Publishing', state: 'finish' },
            ]}
          />
          <div className={inspectorStyles.columns}>
            <section className={inspectorStyles.trace}>
              <h2 className={inspectorStyles.label}>Review session</h2>
              <div className={treeStyles.root}>
                <TraceTree selectedKeys={[`action-${String(SELECTED)}`]} treeData={TREE_DATA} />
                <Collapse
                  defaultActiveKey={['request', 'response']}
                  items={[
                    {
                      key: 'request',
                      label: 'request',
                      children: (
                        <CodeBlock>
                          {
                            '{\n  "pr_number": 142,\n  "head_sha": "5d6e7f8",\n  "base_sha": "1a2b3c4"\n}'
                          }
                        </CodeBlock>
                      ),
                    },
                    {
                      key: 'response',
                      label: 'response',
                      children: (
                        <CodeBlock>
                          {
                            '{\n  "files": [\n    {\n      "filename": "src/api/users.ts",\n      "status": "modified",\n      "additions": 3,\n      "deletions": 1,\n      "too_large": false\n    }\n  ]\n}'
                          }
                        </CodeBlock>
                      ),
                    },
                  ]}
                />
              </div>
            </section>
            <section className={pageStyles.diff}>
              <h2 className={pageStyles.label}>Diff and findings</h2>
              <Form className={filterStyles.bar} layout="inline">
                <Form.Item className={filterStyles.files} label="Files">
                  <Select mode="multiple" placeholder="All files" />
                </Form.Item>
                <Form.Item className={filterStyles.severity} label="Severity">
                  <Select mode="multiple" placeholder="All levels" />
                </Form.Item>
                <Form.Item className={filterStyles.search} label="Search">
                  <Input placeholder="Text, rule" prefix={<SearchOutlined />} />
                </Form.Item>
                <Flex align="center" className={filterStyles.summary} gap="small">
                  <Text type="secondary">Showing 2 of 2 findings</Text>
                  <Button disabled>Reset filters</Button>
                </Flex>
              </Form>
              <FileDiff />
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
