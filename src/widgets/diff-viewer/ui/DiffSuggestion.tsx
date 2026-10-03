import type { JSX } from 'react'

interface DiffSuggestionProps {
  removedLines: string[]
  addedText: string
}

export function DiffSuggestion(props: DiffSuggestionProps): JSX.Element | null {
  const { removedLines, addedText } = props
  const addedLines = addedText.length > 0 ? addedText.split('\n') : []
  if (removedLines.length === 0 && addedLines.length === 0) {
    return null
  }

  return (
    <div className="diff-suggestion" data-testid="diff-suggestion">
      <table className="diff diff-unified">
        <tbody>
          {removedLines.map((line, index) => (
            <tr className="diff-line diff-line-delete" key={`d-${String(index)}`}>
              <td className="diff-code diff-code-delete">
                <span>{line}</span>
              </td>
            </tr>
          ))}
          {addedLines.map((line, index) => (
            <tr className="diff-line diff-line-insert" key={`i-${String(index)}`}>
              <td className="diff-code diff-code-insert">
                <span>{line}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
