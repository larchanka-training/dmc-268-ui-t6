import { Steps } from 'antd'
import type { JSX, ReactNode } from 'react'

import { useTranslation } from '../../i18n'
import { cx } from '../lib/cx'
import styles from './ProgressSteps.module.css'

export type ProgressStepState = 'wait' | 'process' | 'finish' | 'error' | 'stopped'

export interface ProgressStep {
  key: string
  title: ReactNode
  state: ProgressStepState
  /** One line under the title: an error code, the reason of a stop. */
  note?: ReactNode
}

export interface ProgressStepsProps {
  steps: ProgressStep[]
  className?: string
}

/** Ant Design has no `stopped` status: a stopped step is a waiting one with its own mark. */
const ANTD_STATUS = {
  wait: 'wait',
  process: 'process',
  finish: 'finish',
  error: 'error',
  stopped: 'wait',
} as const

function Glyph(props: { state: ProgressStepState; index: number }): JSX.Element {
  const { state, index } = props
  switch (state) {
    case 'finish':
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 12 12">
          <path d="m2.5 6.2 2.3 2.3 4.7-5" />
        </svg>
      )
    case 'error':
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 12 12">
          <path d="m3.2 3.2 5.6 5.6M8.8 3.2 3.2 8.8" />
        </svg>
      )
    case 'stopped':
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 12 12">
          <path d="M3 6h6" />
        </svg>
      )
    case 'wait':
    case 'process':
      return <>{index + 1}</>
  }
}

/**
 * The stages of a process in one row: Ant Design `Steps` with the marks of the design system.
 * Every mark is the same thin 20px ring; the state is told by the glyph inside and by the colour
 * of the ring, never by a filled circle. The title keeps the text colour in every state but
 * waiting. The step in progress, a failed or a stopped one is the current step of Ant Design;
 * with every step waiting or finished there is none.
 */
export function ProgressSteps(props: ProgressStepsProps): JSX.Element {
  const { steps, className } = props
  const { t } = useTranslation()
  const active = steps.findIndex(
    (step) => step.state === 'process' || step.state === 'error' || step.state === 'stopped',
  )
  return (
    <Steps
      className={cx(styles.steps, className)}
      current={active === -1 ? steps.length : active}
      items={steps.map((step, index) => ({
        key: step.key,
        title: (
          <span className={styles.title} data-state={step.state}>
            {step.title}
          </span>
        ),
        content:
          step.note === undefined ? undefined : <span className={styles.note}>{step.note}</span>,
        status: ANTD_STATUS[step.state],
        icon: (
          <span
            // What a screen reader says for the mark: the state, which the ring and glyph only show.
            aria-label={t(`common.progress.${step.state}`)}
            className={styles.mark}
            data-state={step.state}
            role="img"
          >
            <Glyph index={index} state={step.state} />
          </span>
        ),
      }))}
      size="small"
    />
  )
}
