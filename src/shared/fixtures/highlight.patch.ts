import type { SamplePatch } from './sample.patch'

// Real code (not pseudo-code) so the demo run exercises every syntax-highlight
// token class a reviewer sees: keyword, string, comment, number, function, ...
// Each patch is one hunk starting at line 1, so no "load more" gap is rendered.

const RETRY_TS_LINES = [
  'diff --git a/src/utils/retry.ts b/src/utils/retry.ts',
  'index 5555555..6666666 100644',
  '--- a/src/utils/retry.ts',
  '+++ b/src/utils/retry.ts',
  '@@ -1,9 +1,13 @@',
  '-// Run an async task once.',
  '-export async function retry<T>(task: () => Promise<T>): Promise<T> {',
  '-  try {',
  '-    return await task()',
  '-  } catch (error) {',
  "-    console.log('task failed', error)",
  '-    throw error',
  '+// Retry an async task with a fixed attempt budget.',
  '+export async function retry<T>(task: () => Promise<T>, attempts = 3): Promise<T> {',
  '+  let lastError: unknown',
  '+  for (let attempt = 1; attempt <= attempts; attempt += 1) {',
  '+    try {',
  '+      return await task()',
  '+    } catch (error) {',
  '+      lastError = error',
  "+      console.warn('task failed, attempt', attempt)",
  '+    }',
  '   }',
  '+  throw lastError',
  ' }',
]

export const HIGHLIGHT_PATCH_TS: SamplePatch = {
  filename: 'src/utils/retry.ts',
  patch: `${RETRY_TS_LINES.join('\n')}\n`,
}

const NOTIFY_PY_LINES = [
  'diff --git a/app/notify.py b/app/notify.py',
  'index 7777777..8888888 100644',
  '--- a/app/notify.py',
  '+++ b/app/notify.py',
  '@@ -1,8 +1,17 @@',
  '+"""Send review notifications to repository owners."""',
  ' import logging',
  ' ',
  ' logger = logging.getLogger(__name__)',
  ' ',
  ' ',
  '-def notify(user, message):',
  '-    send(user.email, message)',
  '-    return True',
  '+def notify(user, message, retries=3):',
  '+    # Skip owners who muted notifications.',
  '+    if not user.enabled:',
  '+        return False',
  '+    for attempt in range(retries):',
  '+        try:',
  '+            send(user.email, message)',
  '+            return True',
  '+        except ConnectionError:',
  '+            logger.warning("notify failed on attempt %d", attempt)',
  '+    return False',
]

export const HIGHLIGHT_PATCH_PY: SamplePatch = {
  filename: 'app/notify.py',
  patch: `${NOTIFY_PY_LINES.join('\n')}\n`,
}

export const HIGHLIGHT_PATCHES: SamplePatch[] = [HIGHLIGHT_PATCH_TS, HIGHLIGHT_PATCH_PY]
