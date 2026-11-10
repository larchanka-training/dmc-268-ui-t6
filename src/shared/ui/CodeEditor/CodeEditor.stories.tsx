import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type JSX } from 'react'

import { CodeEditor, type CodeEditorProps } from './CodeEditor'

const PYTHON = `import os


def read_token(name: str = "API_TOKEN") -> str:
    # The value is never logged.
    token = os.environ[name]
    return token.strip() if len(token) > 8 else ""
`

const RULES = `# Security

Never log a token.

# Style

- Use **short** names, see \`docs/style.md\`.
`

const SAMPLES: { fileName: string; value: string }[] = [
  {
    fileName: 'token.ts',
    value: `export type Token = { value: string }\n\nexport const empty: Token = { value: '' } // none\n`,
  },
  {
    fileName: 'Token.tsx',
    value: `export function Token(props: { value: string }): JSX.Element {\n  return <code title="token">{props.value}</code>\n}\n`,
  },
  {
    fileName: 'token.js',
    value: `const pattern = /^[a-z]+$/\n\nexport function isToken(value) {\n  return pattern.test(value) && value.length > 8\n}\n`,
  },
  { fileName: '.review/rules.md', value: RULES },
  {
    fileName: 'token.diff',
    value: `--- a/token.py\n+++ b/token.py\n@@ -1,2 +1,2 @@\n-token = "secret"\n+token = os.environ["API_TOKEN"]\n print("ok")\n`,
  },
]

function focusEditor({ canvasElement }: { canvasElement: HTMLElement }): void {
  canvasElement.querySelector<HTMLElement>('[role="textbox"]')?.focus()
}

/** Keeps the text, as a screen does. */
function Editable(props: CodeEditorProps): JSX.Element {
  const [value, setValue] = useState(props.value)
  return <CodeEditor {...props} value={value} onChange={setValue} />
}

const meta: Meta<typeof CodeEditor> = {
  title: 'Свои компоненты/CodeEditor',
  component: CodeEditor,
  args: { 'aria-label': 'Код', fileName: 'token.py', value: PYTHON },
  // A new `value` in Controls starts the text anew, as a screen does when it loads another file.
  render: (args) => <Editable key={args.value} {...args} />,
}

export default meta
type Story = StoryObj<typeof CodeEditor>

export const Default: Story = {}

/** The focus of a field (DESIGN_SYSTEM §7). Tab leaves the editor: no key is bound to it. */
export const Focus: Story = { play: focusEditor }

/** The text can be selected and copied, and the field stays in the Tab order. */
export const ReadOnly: Story = { args: { readOnly: true } }

/** A message with a column, and one with a line only. */
export const ErrorLine: Story = {
  args: {
    diagnostics: [
      { line: 4, column: 5, message: 'Неизвестное имя: read_token' },
      { line: 7, column: null, message: 'Строка длиннее лимита' },
    ],
  },
}

/** The border stays red, so the halo in the colour of the focus is what shows it. */
export const ErrorLineFocus: Story = { ...ErrorLine, play: focusEditor }

/** A rules file refused with no text: the message has no line to stand on. */
export const ErrorWithoutText: Story = {
  args: {
    fileName: '.review/rules.md',
    value: '',
    diagnostics: [{ line: null, column: null, message: 'Файл больше 64 КиБ' }],
  },
}

export const HighlightedLines: Story = { args: { highlightedLines: [4, 6] } }

const REVIEW_IGNORE = '```review-ignore\n\n```'

/**
 * Type `# ` or ```` ``` ```` at the start of a line, or press Ctrl-Space on an empty one. Enter
 * takes a completion, Escape closes the list, Tab still leaves the editor.
 */
export const Completions: Story = {
  args: {
    fileName: '.review/rules.md',
    value: RULES,
    completions: [
      { label: '# Security', insert: '# Security' },
      { label: '# Performance', insert: '# Performance' },
      { label: '# Style', insert: '# Style' },
      {
        label: '```review-ignore',
        insert: REVIEW_IGNORE,
        cursor: REVIEW_IGNORE.indexOf('\n') + 1,
        detail: 'paths',
      },
    ],
  },
}

export const Languages: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {SAMPLES.map((sample) => (
        <Editable
          key={sample.fileName}
          aria-label={sample.fileName}
          fileName={sample.fileName}
          value={sample.value}
        />
      ))}
    </div>
  ),
}
