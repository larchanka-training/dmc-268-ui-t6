import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { Logo } from '@/components/logo'
import { appName } from './shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <Logo size={20} />
          {appName}
          <span className="rounded-md border border-fd-border px-1.5 py-px text-[11px] font-medium text-fd-muted-foreground">
            Docs
          </span>
        </span>
      ),
    },
    // Dark only: the switch is hidden and next-themes is forced to dark in app/layout.tsx.
    themeSwitch: { enabled: false },
  }
}
