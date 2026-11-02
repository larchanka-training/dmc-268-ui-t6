import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  IconAnalytics,
  IconAudit,
  IconRepositories,
  IconReview,
  IconRuns,
  IconSettings,
  IconSidebar,
} from './icons'

const meta: Meta = { title: 'Свои компоненты/Icons' }

export default meta

const cell = { display: 'grid', gap: 8, justifyItems: 'center', fontSize: 12 } as const

/** Thin 16 px icons for navigation. Everything else comes from `@ant-design/icons`. */
export const Navigation: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, color: 'var(--rv-text-2)' }}>
      <span style={cell}>
        <IconRepositories />
        IconRepositories
      </span>
      <span style={cell}>
        <IconRuns />
        IconRuns
      </span>
      <span style={cell}>
        <IconAudit />
        IconAudit
      </span>
      <span style={cell}>
        <IconAnalytics />
        IconAnalytics
      </span>
      <span style={cell}>
        <IconReview />
        IconReview
      </span>
      <span style={cell}>
        <IconSidebar />
        IconSidebar
      </span>
      <span style={cell}>
        <IconSettings />
        IconSettings
      </span>
    </div>
  ),
}
