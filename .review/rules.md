```review-ignore
dist/**
build/**
coverage/**
node_modules/**
**/*.min.js
package-lock.json
pnpm-lock.yaml
yarn.lock
.git/**
storybook-static/**
```

# Code Review Rules

## Security and Trust Boundaries

- pattern: `src/**/*.{ts,tsx}`
- exclude: `dist/**,build/**`

1. All external and untrusted data (API responses, route params, query strings, user form submissions) must be validated (e.g., using Zod) before being consumed by business logic or stored in client state
2. Prevent XSS vulnerabilities: `dangerouslySetInnerHTML` is strictly prohibited unless sanitized via an approved DOM sanitizer (e.g., DOMPurify); external links must enforce `rel="noopener noreferrer"`, and dynamic URLs (`href`, `src`) must be validated against `javascript:` or untrusted protocol schemes
3. Secrets, private keys, auth tokens, and sensitive PII must never be hardcoded, stored in insecure local storage, logged to the browser console, or leaked to third-party telemetry/analytics
4. Network calls and external interactions must use configured base URLs, secure protocols (HTTPS), and centralized API/service clients rather than ad-hoc inline fetches

## Architecture and Contract Compatibility

- pattern: `src/**/*.{ts,tsx}`
- exclude: `dist/**,build/**`

1. Strict separation of concerns: UI components handle layout and presentation; data fetching, caching, and state synchronization live in custom hooks or state stores; API transport lives in dedicated client modules
2. Props, custom hook interfaces, and domain data models must be strictly typed in TypeScript without resorting to `any` or unchecked type assertions (`as unknown as ...`)
3. Component contracts must remain backward-compatible: changes to shared component props or hook return shapes must avoid breaking dependent consumers and document optional deprecation cycles
4. Exported components, hooks, utilities, and context providers must document their contract, expected children/slots, and side effects using JSDoc

## Reliability and Error Handling

- pattern: `src/**/*.{ts,tsx}`
- exclude: `dist/**,build/**`

1. Root layouts, route segments, and critical widgets must be wrapped in React Error Boundaries to prevent uncaught runtime errors from crashing the entire application into a white screen
2. Asynchronous operations must explicitly handle all lifecycle states (`idle`, `loading`, `error`, `empty`, `success`) and display clear, actionable user-facing feedback instead of raw errors or stack traces
3. Outbound fetch and subscription requests initiated in hooks must support cancellation on component unmount or dependency re-runs using `AbortController` / bounded timeouts
4. Resilient rendering: optional fields and nested hypermedia objects must use safe optional chaining and default fallbacks so missing fields degrade gracefully rather than throwing undefined access errors

## Code Quality and Surgical Changes

- pattern: `src/**/*.{ts,tsx}`
- exclude: `dist/**,build/**`

1. Code must represent the minimum solution that satisfies the feature requirements; speculative abstractions, premature component splits, and unneeded memoization (`useMemo`, `useCallback`) are prohibited
2. Strict adherence to React Hooks rules: hooks must never be called conditionally or inside loops, and dependency arrays must remain exhaustive and accurately declared
3. Code must compile under strict TypeScript (`strict: true`) with zero errors, zero compiler warnings, and no orphaned imports, dead variables, or commented-out JSX
4. Avoid anti-patterns that degrade UI performance or accessibility: do not use array index keys for dynamic lists, avoid unvirtualized unbounded lists, and ensure interactive elements have semantic HTML tags and accessible labels

## Testing and Verification Quality

- pattern: `src/**/*.{test,spec}.{ts,tsx}`
- exclude: `dist/**,build/**`

1. Every user-facing workflow, custom hook, and state transition branch must be covered by deterministic automated tests (e.g., React Testing Library / Vitest / Jest)
2. Tests must evaluate behavior from the user's perspective (querying by accessible roles, labels, text) rather than asserting against private component state or internal DOM structure
3. Tests must be completely isolated from live networks; all HTTP and API boundaries must be mocked or intercepted (e.g., using Mock Service Worker / MSW)
4. Tests must cover both happy paths and error paths: loading states, validation rejections, empty states, error boundaries, and network timeouts
```
