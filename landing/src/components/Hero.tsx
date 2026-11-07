import { useState } from 'react'

import { getAppUrl } from '../lib/appUrl'
import { buildAgentInstruction } from '../lib/agentInstruction'
import { HeroGlass } from './HeroGlass'
import { ReviewDemo } from './ReviewDemo'
import { cx } from '../lib/cx'
import styles from './Hero.module.css'

export function Hero() {
  const [copyStatus, setCopyStatus] = useState('')
  const instruction = buildAgentInstruction(import.meta.env.VITE_GITHUB_APP_SLUG, getAppUrl())

  async function copyInstruction() {
    if (instruction === null) return
    try {
      await navigator.clipboard.writeText(instruction)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Select the text to copy')
    }
  }

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.backdrop} aria-hidden="true">
        <HeroGlass textSelector="#hero-text" />
        <div className={styles.grain} />
        <div className={styles.fade} />
      </div>

      <div id="hero-text" className={cx('container', styles.content)}>
        <h1 id="hero-title" className={styles.title}>
          Less reviewing.
          <br />
          More shipping.
        </h1>
        <p className={styles.subtitle}>
          Your code, your rules. Let AI handle the reviews while you focus on building.
        </p>
        <a href={getAppUrl()} className={styles.cta}>
          Try it now
        </a>
        {instruction !== null && (
          <div className={styles.agentSetup}>
            <label htmlFor="agent-setup-instruction" className={styles.agentLabel}>
              Prefer your coding agent? Give it this instruction.
            </label>
            <div className={styles.agentRow}>
              <input
                id="agent-setup-instruction"
                aria-label="Agent setup instruction"
                className={styles.agentInput}
                readOnly
                value={instruction}
                onFocus={(event) => {
                  event.currentTarget.select()
                }}
              />
              <button
                type="button"
                aria-label="Copy agent setup instruction"
                className={styles.agentCopy}
                onClick={() => {
                  void copyInstruction()
                }}
              >
                Copy
              </button>
            </div>
            <span className={styles.agentStatus} role="status">
              {copyStatus}
            </span>
          </div>
        )}
      </div>

      <div className={cx('container', styles.demoWrap)}>
        <div className={styles.demoGlow} aria-hidden="true" />
        <div className={styles.demo}>
          <div className={styles.frame}>
            <ReviewDemo />
          </div>
        </div>
      </div>
    </section>
  )
}
