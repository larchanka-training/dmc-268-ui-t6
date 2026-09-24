import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import type { FC } from 'react'

import { useThemeStore } from '../model/store'

export interface ThemeToggleProps {
  size?: 'small' | 'middle' | 'large'
}

export const ThemeToggle: FC<ThemeToggleProps> = ({ size = 'middle' }) => {
  const mode = useThemeStore((state) => state.mode)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}>
      <Button
        aria-label="Переключить тему"
        icon={isDark ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggleTheme}
        size={size}
        type="text"
      />
    </Tooltip>
  )
}
