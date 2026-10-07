import { z } from 'zod'

// CSP `script-src 'self'` blocks zod's JIT probe (`new Function('')`), one violation per load.
// First import of main.tsx. Refs #74.
z.config({ jitless: true })
