export interface SamplePatch {
  filename: string
  patch: string
}

const PATCH_A_LINES = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,4 +1,5 @@',
  ' line one',
  '-line two',
  '+line 2',
  '+line 2b',
  ' line three',
  ' line four',
  '@@ -10,3 +11,3 @@',
  ' ten',
  '-eleven',
  '+11',
  ' twelve',
]

export const SAMPLE_PATCH_A: SamplePatch = {
  filename: 'src/a.ts',
  patch: `${PATCH_A_LINES.join('\n')}\n`,
}

const PATCH_B_LINES = [
  'diff --git a/README.md b/README.md',
  'index 3333333..4444444 100644',
  '--- a/README.md',
  '+++ b/README.md',
  '@@ -1,2 +1,3 @@',
  ' # Title',
  '+New line',
  ' text',
]

export const SAMPLE_PATCH_B: SamplePatch = {
  filename: 'README.md',
  patch: `${PATCH_B_LINES.join('\n')}\n`,
}

export const SAMPLE_PATCHES: SamplePatch[] = [SAMPLE_PATCH_A, SAMPLE_PATCH_B]

// 13 "new-side" lines of src/a.ts after applying SAMPLE_PATCH_A (used by T4 for the
// load-more context slice) — the brief's own count comment ("12") undercounts by one;
// this list is authoritative at 13 entries.
export const SAMPLE_FILE_A_LINES: string[] = [
  'line one',
  'line 2',
  'line 2b',
  'line three',
  'line four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  '11',
  'twelve',
]
