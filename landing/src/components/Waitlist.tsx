import { useId, useRef, useState, type SubmitEvent } from 'react'

import { BRAND_NAME } from '../brand'
import { isValidEmail } from '../lib/email'
import { joinWaitlist, type JoinResult } from '../lib/waitlist'
import { Reveal } from './Reveal'
import styles from './Waitlist.module.css'

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; result: JoinResult }
  | { kind: 'error'; message: string }

const INVALID_EMAIL = 'Enter a valid email address, like you@company.com.'
const REQUEST_FAILED = 'Something went wrong on our side. Please try again in a moment.'

export function Waitlist() {
  const inputId = useId()
  const messageId = useId()
  const inFlight = useRef(false)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const invalid = touched && !isValidEmail(email)
  const submitting = status.kind === 'submitting'

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (inFlight.current || !isValidEmail(email)) return
    inFlight.current = true
    setStatus({ kind: 'submitting' })
    try {
      const result = await joinWaitlist(email)
      setStatus({ kind: 'success', result })
    } catch {
      setStatus({ kind: 'error', message: REQUEST_FAILED })
    } finally {
      inFlight.current = false
    }
  }

  const message = invalid
    ? INVALID_EMAIL
    : status.kind === 'error'
      ? status.message
      : 'No spam. Just one email when your invite is ready.'

  return (
    <section id="waitlist" className={styles.section} aria-labelledby="waitlist-title">
      <div className="container">
        <Reveal className={styles.panel}>
          <div className={styles.glow} aria-hidden="true" />
          <h2 id="waitlist-title" className={styles.title}>
            Be first to review smarter.
          </h2>
          <p className={styles.lead}>
            We’re getting ready to launch. Join the waitlist and be among the first to try{' '}
            {BRAND_NAME}.
          </p>

          {status.kind === 'success' ? (
            <div className={styles.success} role="status">
              <span className={styles.successIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className={styles.successTitle}>
                  {status.result === 'joined'
                    ? 'You’re on the list.'
                    : 'You’re already on the list.'}
                </p>
                <p className={styles.successText}>
                  We’ll email {email.trim()} when your invite is ready.
                </p>
              </div>
            </div>
          ) : (
            <form
              className={styles.form}
              noValidate
              onSubmit={(event) => {
                void onSubmit(event)
              }}
            >
              <label htmlFor={inputId} className={styles.label}>
                Email
              </label>
              <div className={styles.row}>
                <input
                  id={inputId}
                  className={styles.input}
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  maxLength={254}
                  required
                  aria-invalid={invalid}
                  aria-describedby={messageId}
                  disabled={submitting}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (status.kind === 'error') setStatus({ kind: 'idle' })
                  }}
                  onBlur={() => {
                    if (email.trim() !== '') setTouched(true)
                  }}
                />
                <button type="submit" className={styles.button} disabled={submitting}>
                  {submitting && <span className={styles.spinner} aria-hidden="true" />}
                  {submitting ? 'Joining…' : 'Join waitlist'}
                </button>
              </div>
              <p
                id={messageId}
                className={styles.message}
                data-tone={invalid || status.kind === 'error' ? 'error' : 'hint'}
                role={invalid || status.kind === 'error' ? 'alert' : undefined}
              >
                {message}
              </p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
