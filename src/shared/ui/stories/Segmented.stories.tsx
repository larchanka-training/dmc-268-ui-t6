import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from 'antd'
import { useState } from 'react'

import { Segmented } from '../Segmented/Segmented'

const meta: Meta<typeof Segmented> = {
  title: 'Ant Design/Segmented',
  component: Segmented,
}

export default meta
type Story = StoryObj<typeof Segmented>

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

/** Two to four views of the same data. For a longer list use `Select`. */
export const Filter: Story = {
  render: () => (
    <Segmented
      aria-label="Фильтр репозиториев"
      defaultValue="all"
      options={[
        { value: 'all', label: 'Все (12)' },
        { value: 'active', label: 'Активные (7)' },
        { value: 'paused', label: 'На паузе (5)' },
      ]}
    />
  ),
}

export const Small: Story = {
  render: () => (
    <div style={row}>
      <Segmented
        aria-label="Вид диффа"
        defaultValue="unified"
        options={[
          { value: 'unified', label: 'Unified' },
          { value: 'split', label: 'Split' },
        ]}
        size="small"
      />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div style={row}>
      <Segmented
        aria-label="Недоступный фильтр репозиториев"
        defaultValue="all"
        disabled
        options={[
          { value: 'all', label: 'Все' },
          { value: 'active', label: 'Активные' },
        ]}
      />
      <Segmented
        aria-label="Фильтр с недоступным вариантом"
        defaultValue="all"
        options={[
          { value: 'all', label: 'Все' },
          { value: 'active', label: 'Активные', disabled: true },
          { value: 'paused', label: 'На паузе' },
        ]}
      />
    </div>
  ),
}

type FilterValue = 'all' | 'active' | 'paused'

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<FilterValue>('all')
    const [changes, setChanges] = useState(0)
    return (
      <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
        <Button>Перед фильтром</Button>
        <Segmented<FilterValue>
          aria-label="Управляемый фильтр репозиториев"
          onChange={(next) => {
            setValue(next)
            setChanges((count) => count + 1)
          }}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'active', label: 'Активные', disabled: true },
            { value: 'paused', label: 'На паузе' },
          ]}
          value={value}
        />
        <output aria-live="polite">
          Выбрано: {value}; изменений: {changes}
        </output>
        <Button>После фильтра</Button>
      </div>
    )
  },
}
