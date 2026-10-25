'use client'

/* Repository settings, after src/pages/repositories/RepositorySettingsPage.tsx and its features. */
import {
  Breadcrumb,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
  Typography,
} from 'antd'
import { BranchesOutlined, RightOutlined } from '@ant-design/icons'
import { CodeBlock, PageHeader, Tag } from '../../../src/shared/ui'
import autoStyles from '../../../src/features/repository-settings/ui/AutoReviewSwitch.module.css'
import ragStyles from '../../../src/features/repository-settings/ui/RagSection.module.css'
import formStyles from '../../../src/features/repository-settings/ui/RepositorySettingsForm.module.css'
import rulesStyles from '../../../src/widgets/repository-rules/ui/RulesStatusPanel.module.css'
import { AppShell } from './app-shell'

const { Text } = Typography

const RULES = `# Review rules: acme/api

We check **security** and the API contract, not the formatting.

- Every handler validates its input.
- Database access goes through the repository layer.

\`\`\`review-ignore
dist/**
**/*.snap
pnpm-lock.yaml
\`\`\``
const IGNORED = ['dist/**', '**/*.snap', 'pnpm-lock.yaml']

const THRESHOLDS = [
  { value: 'all', label: 'All', levels: 'critical, high, medium, low, info' },
  { value: 'warning', label: 'Warn & Crit', levels: 'critical, high, medium, low' },
  { value: 'critical', label: 'Only Critical', levels: 'critical, high' },
]

export function SettingsScreen() {
  return (
    <AppShell active="/repositories">
      <Flex gap="middle" vertical>
        <Breadcrumb
          items={[{ title: <a href="#">Repositories</a> }, { title: 'Settings' }]}
          separator={<RightOutlined />}
        />
        <PageHeader
          actions={<Button>Review history</Button>}
          description="acme/api"
          title="Repository settings"
        />

        <section className={autoStyles.root}>
          <Flex align="center" gap={8}>
            <Switch checked />
            <Text strong>Automatic review</Text>
          </Flex>
          <Text type="secondary">
            When on, reviews run automatically for pull requests in this repository.
          </Text>
        </section>

        <section className={ragStyles.root}>
          <Flex align="center" gap={8}>
            <Switch checked />
            <Text strong>RAG</Text>
          </Flex>
          <Text type="secondary">
            Takes the links between the repository files into account, which makes the review more
            precise. May increase the cost. Only the code structure is stored, not its text.
          </Text>
          <Flex align="center" className={ragStyles.status} gap={8} wrap>
            <Text type="secondary">Index status:</Text>
            <Tag tone="success">Ready</Tag>
            <code className={ragStyles.sha}>4f1c2e9</code>
            <Text type="secondary">updated 2026-10-20 11:40:00</Text>
          </Flex>
        </section>

        <Form
          className={formStyles.form}
          initialValues={{
            waitForCi: 'auto',
            maxComments: 5,
            reviewEvent: 'REQUEST_CHANGES',
            branchFilter: 'main\nrelease/*',
            severityThreshold: 'warning',
          }}
          layout="vertical"
        >
          <Form.Item
            extra="SandboxEngine (deep analysis in a sandbox) arrives in phase 3"
            label="Analysis engine"
          >
            <Text>DiffEngine (fast syntax analysis)</Text>
          </Form.Item>
          <Form.Item label="CI waiting" name="waitForCi" rules={[{ required: true }]}>
            <Select
              options={[{ value: 'auto', label: 'Auto (wait for CI when the commit has checks)' }]}
            />
          </Form.Item>
          <Form.Item label="Comment limit (1..10)" name="maxComments" rules={[{ required: true }]}>
            <InputNumber className={formStyles.fullWidth} />
          </Form.Item>
          <Form.Item label="Verdict" name="reviewEvent" rules={[{ required: true }]}>
            <Select
              options={[{ value: 'REQUEST_CHANGES', label: 'Request changes (when blocking)' }]}
            />
          </Form.Item>
          <Form.Item
            extra="Masks of the pull request target branch, one per line (for example, main or release/*). Empty means all branches."
            label="Branch filter"
            name="branchFilter"
          >
            <Input.TextArea rows={4} spellCheck={false} />
          </Form.Item>
          <Form.Item
            extra="Publish findings at or above the chosen level."
            label="Severity threshold"
            name="severityThreshold"
          >
            <Radio.Group orientation="vertical">
              {THRESHOLDS.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label} <Text type="secondary">{`— ${option.levels}`}</Text>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <Flex className={formStyles.actions} gap={8}>
            <Button disabled type="primary">
              Save
            </Button>
            <Button disabled>Discard changes</Button>
          </Flex>
        </Form>

        <section className={rulesStyles.root}>
          <h2 className={rulesStyles.label}>Review rules</h2>
          <Flex gap={12} vertical>
            <Flex align="center" className={rulesStyles.meta} gap={8} wrap>
              <Tag tone="success">File found</Tag>
              <code>.review/rules.md</code>
              <Tag icon={<BranchesOutlined />} variant="outline">
                main
              </Tag>
              <code className={rulesStyles.sha}>3fa1c0d</code>
              <Text type="secondary">Checked: 2026-10-20 12:00:00</Text>
            </Flex>
            <div>
              <h3 className={rulesStyles.sublabel}>File text</h3>
              <div className={rulesStyles.scroll}>
                <CodeBlock>{RULES}</CodeBlock>
              </div>
            </div>
            <div>
              <h3 className={rulesStyles.sublabel}>Ignored paths</h3>
              <ul className={rulesStyles.list}>
                {IGNORED.map((mask) => (
                  <li key={mask}>
                    <code>{mask}</code>
                  </li>
                ))}
              </ul>
            </div>
          </Flex>
        </section>
      </Flex>
    </AppShell>
  )
}
