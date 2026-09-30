import { tokenize } from 'react-diff-view'
import type { HunkData, TokenizeOptions } from 'react-diff-view'
import { refractor } from 'refractor'
import javascript from 'refractor/javascript'
import json from 'refractor/json'
import markdown from 'refractor/markdown'
import tsx from 'refractor/tsx'
import typescript from 'refractor/typescript'

import { languageFromFilename } from '../../../entities/diff/lib/fileLanguage'

refractor.register(typescript)
refractor.register(tsx)
refractor.register(javascript)
refractor.register(markdown)
refractor.register(json)

export function tokensForHunks(
  filename: string,
  hunks: HunkData[],
): TokenizeOptions['tokens'] | undefined {
  const language = languageFromFilename(filename)
  if (language === null) {
    return undefined
  }

  try {
    return tokenize(hunks, {
      highlight: true,
      refractor,
      language,
    })
  } catch {
    return undefined
  }
}
