const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  md: 'markdown',
  json: 'json',
  css: 'css',
  py: 'python',
  go: 'go',
  rs: 'rust',
  yaml: 'yaml',
  yml: 'yaml',
}

export function languageFromFilename(filename: string): string | null {
  const base = filename.split('/').pop() ?? filename
  const dot = base.lastIndexOf('.')
  if (dot <= 0) {
    return null
  }
  return EXT_TO_LANG[base.slice(dot + 1).toLowerCase()] ?? null
}
