// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../../../shared/i18n'
import { RepositoryBadgeSection, type RepositoryBadgeSectionProps } from './RepositoryBadgeSection'

const originalClipboard = navigator.clipboard

function renderBadgeSection(props: Partial<RepositoryBadgeSectionProps> = {}) {
  return render(
    <App>
      <RepositoryBadgeSection
        fullName="larchanka-training/dmc-268-ui-t6"
        provider="github"
        {...props}
      />
    </App>,
  )
}

describe('RepositoryBadgeSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  })

  describe('rendering by provider', () => {
    it('renders nothing for non-github providers', () => {
      const { container } = renderBadgeSection({ provider: 'bitbucket' })
      expect(container.firstChild?.firstChild).toBeNull()
      expect(screen.queryByText('Бейдж для README')).toBeNull()

      const { container: gitlabContainer } = renderBadgeSection({ provider: 'gitlab' })
      expect(gitlabContainer.firstChild?.firstChild).toBeNull()
      expect(screen.queryByText('Бейдж для README')).toBeNull()
    })

    it('renders badge block for github provider', () => {
      renderBadgeSection({ provider: 'github', fullName: 'my-org/my-repo' })

      expect(screen.getByText('Бейдж для README')).toBeTruthy()
      expect(
        screen.getByText(/Бейдж показывает статус только для публичных репозиториев/),
      ).toBeTruthy()

      const img = screen.getByRole('img', { name: 'Бейдж для README' })
      expect(img).toBeTruthy()
      expect(img.getAttribute('src')).toBe('/api/badges/github/my-org/my-repo.svg')

      const snippetBox = screen.getByRole('region', { name: 'Markdown-сниппет' })
      expect(snippetBox).toBeTruthy()
      expect(snippetBox.textContent).toBe(
        `![Reviewer](${window.location.origin}/api/badges/github/my-org/my-repo.svg)`,
      )

      expect(screen.getByRole('button', { name: 'Копировать' })).toBeTruthy()
    })
  })

  describe('fallback on broken preview', () => {
    it('shows «Превью недоступно» when image fails to load while snippet remains accessible', () => {
      renderBadgeSection({ provider: 'github', fullName: 'my-org/my-repo' })

      const img = screen.getByRole('img', { name: 'Бейдж для README' })
      fireEvent.error(img)

      expect(screen.queryByRole('img', { name: 'Бейдж для README' })).toBeNull()
      expect(screen.getByText('Превью недоступно')).toBeTruthy()

      const snippetBox = screen.getByRole('region', { name: 'Markdown-сниппет' })
      expect(snippetBox.textContent).toBe(
        `![Reviewer](${window.location.origin}/api/badges/github/my-org/my-repo.svg)`,
      )
      expect(screen.getByRole('button', { name: 'Копировать' })).toBeTruthy()
    })
  })

  describe('copying snippet to clipboard', () => {
    it('copies snippet and shows success notice on click', async () => {
      const clipboardWrite = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: clipboardWrite },
      })

      renderBadgeSection({ provider: 'github', fullName: 'org/repo' })

      const copyButton = screen.getByRole('button', { name: 'Копировать' })
      fireEvent.click(copyButton)

      expect(clipboardWrite).toHaveBeenCalledTimes(1)
      expect(clipboardWrite).toHaveBeenCalledWith(
        `![Reviewer](${window.location.origin}/api/badges/github/org/repo.svg)`,
      )
      await waitFor(() => {
        expect(screen.getByText('Сниппет скопирован в буфер обмена')).toBeTruthy()
      })
    })

    it('shows error notice when clipboard write fails', async () => {
      const clipboardWrite = vi
        .fn<(value: string) => Promise<void>>()
        .mockRejectedValue(new Error('Permission denied'))
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: clipboardWrite },
      })

      renderBadgeSection({ provider: 'github', fullName: 'org/repo' })

      const copyButton = screen.getByRole('button', { name: 'Копировать' })
      fireEvent.click(copyButton)

      expect(clipboardWrite).toHaveBeenCalledTimes(1)
      await waitFor(() => {
        expect(screen.getByText('Не удалось скопировать в буфер обмена')).toBeTruthy()
      })
    })
  })

  describe('English locale', () => {
    it('renders all texts in English when locale is en', async () => {
      await i18n.changeLanguage('en')

      renderBadgeSection({ provider: 'github', fullName: 'my-org/my-repo' })

      expect(screen.getByText('README badge')).toBeTruthy()
      expect(
        screen.getByText(/The badge displays the status of public repositories only/),
      ).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Markdown snippet' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()

      const img = screen.getByRole('img', { name: 'README badge' })
      fireEvent.error(img)
      expect(screen.getByText('Preview unavailable')).toBeTruthy()
    })
  })
})
