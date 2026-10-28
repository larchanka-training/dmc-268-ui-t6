// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '../../../features/theme'
import { i18n, LANGUAGE_STORAGE_KEY } from '../../../shared/i18n'
import { isMockMode } from '../../../shared/config/env'
import { AppSidebar } from './AppSidebar'

vi.mock('../../../shared/config/buildFlags', () => ({
  VITE_MOCKS_BUILD: false,
  mocksEnabledAtRuntime: (isMockMode: () => boolean) => isMockMode(),
}))

vi.mock('../../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/config/env')>()
  return {
    ...actual,
    isMockMode: vi.fn(),
  }
})

// The sidebar holds the user menu, which reads the current user through react-query.
function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('AppSidebar review navigation', () => {
  it('hides the Review item when not in mock mode', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    expect(screen.queryByText('Ревью')).toBeNull()
    expect(screen.getByText('Прогоны')).toBeTruthy()
  })

  it('shows Review and navigates to /review in mock mode', () => {
    vi.mocked(isMockMode).mockReturnValue(true)
    const onNavigate = vi.fn()
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Ревью'))
    expect(onNavigate).toHaveBeenCalledWith('/review')
  })

  it('folds from the toggle and unfolds from the logo without a separate row', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть меню' }))
    const expand = screen.getByRole('button', { name: 'Развернуть меню' })
    expect(screen.queryByRole('button', { name: 'Свернуть меню' })).toBeNull()
    fireEvent.click(expand)
    expect(screen.getByRole('button', { name: 'Свернуть меню' })).toBeTruthy()
  })

  it('keeps the keyboard focus on the sidebar button after folding and unfolding', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    const fold = screen.getByRole('button', { name: 'Свернуть меню' })
    fold.focus()
    fireEvent.click(fold)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Развернуть меню' }))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть меню' }))
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Свернуть меню' }))
    })
  })

  it('has no single-key shortcut: a bracket typed on the page leaves the sidebar as it is', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    // One press only: the old shortcut was a toggle, two presses would hide its return.
    fireEvent.keyDown(document.body, { key: '[', code: 'BracketLeft' })
    expect(screen.getByRole('button', { name: 'Свернуть меню' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Развернуть меню' })).toBeNull()
  })

  it('puts the navigation into a landmark and marks the current page', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs/42" onNavigate={vi.fn()} />)
    const nav = screen.getByRole('navigation', { name: 'Разделы' })
    expect(within(nav).getByText('Прогоны').getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByText('Репозитории').hasAttribute('aria-current')).toBe(false)
  })

  it('makes the brand a link to the repositories', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    const onNavigate = vi.fn()
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={onNavigate} />)
    const brand = screen.getByRole('link', { name: 'Reviewer' })
    expect(brand.getAttribute('href')).toBe('/repositories')
    fireEvent.click(brand)
    expect(onNavigate).toHaveBeenCalledWith('/repositories')
    onNavigate.mockClear()
    fireEvent.click(brand, { ctrlKey: true })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('offers the theme choice in the user menu and applies it', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    fireEvent.click(await screen.findByText('Тёмная'))
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
  })

  it('marks only the chosen theme as checked', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    const radios = await screen.findAllByRole('menuitemradio')
    expect(radios.map((radio) => [radio.textContent, radio.getAttribute('aria-checked')])).toEqual([
      ['Как в системе', 'false'],
      ['Светлая', 'true'],
      ['Тёмная', 'false'],
      // The language group follows the theme group; the suite runs in Russian.
      ['English', 'false'],
      ['Русский', 'true'],
    ])
  })

  it('applies "Как в системе" and resolves it to the theme of the operating system', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'dark', preference: 'dark' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    fireEvent.click(await screen.findByText('Как в системе'))
    expect(useThemeStore.getState().preference).toBe('system')
    // `src/test/setup.ts` answers every media query with "no match": the system theme is light.
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('returns the focus to the user button after a theme is chosen', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    const trigger = screen.getByLabelText('Меню пользователя')
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByText('Тёмная'))
    // Not within the same event: a key press that chose the item must not reach the button.
    expect(document.activeElement).not.toBe(trigger)
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger)
    })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('links Документация to the docs in a new tab, next to the theme choice', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    const link = await screen.findByRole('link', { name: 'Документация' })
    // Literal from the spec: the staging landing origin + /docs.
    expect(link.getAttribute('href')).toBe('https://staging.dmc268-t6.axyi.ru/docs')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(link.getAttribute('rel')).toContain('noopener')
    // Between the theme choice (menuitemradio) and "Выйти", in DOM order.
    const items = Array.from(
      document.querySelectorAll('[role="menuitem"], [role="menuitemradio"]'),
      (item) => item.textContent,
    )
    const docs = items.indexOf('Документация')
    expect(items.indexOf('Тёмная')).toBeLessThan(docs)
    expect(docs).toBeLessThan(items.indexOf('Выйти'))
  })

  it('opens the docs only through the link, never through window.open', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    const link = await screen.findByRole('link', { name: 'Документация' })
    // In a browser the focus sits on the link and Enter activates it natively (one tab).
    fireEvent.keyDown(link, { key: 'Enter', code: 'Enter', keyCode: 13 })
    const item = link.closest('[role="menuitem"]')
    if (item === null) throw new Error('the docs link is not inside a menu item')
    fireEvent.keyDown(item, { key: 'Enter', code: 'Enter', keyCode: 13 })
    fireEvent.click(link)
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })
})

describe('AppSidebar language switch', () => {
  it('names the group in English and each option in its own language, whatever the current one', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    expect(await screen.findByText('Language')).toBeTruthy()
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeTruthy()
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toBeTruthy()
  })

  it('switches the interface to English at once and remembers the choice', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    localStorage.clear()
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    expect(screen.getByText('Прогоны')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'English' }))
    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    // No reload: the sidebar is already in English.
    expect(await screen.findByText('Runs')).toBeTruthy()
    expect(screen.getByText('Repositories')).toBeTruthy()
    expect(screen.queryByText('Прогоны')).toBeNull()
    fireEvent.click(screen.getByLabelText('User menu'))
    expect(
      (await screen.findByRole('menuitemradio', { name: 'English' })).getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen.getByRole('menuitemradio', { name: 'Русский' }).getAttribute('aria-checked'),
    ).toBe('false')
    expect(screen.getByText('Theme')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Documentation' })).toBeTruthy()

    // And back to Russian from the same menu. The storage key is spelled out: renaming it would
    // silently drop the choice users already saved.
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Русский' }))
    expect(i18n.language).toBe('ru')
    expect(localStorage.getItem('dmc_language')).toBe('ru')
    expect(await screen.findByText('Прогоны')).toBeTruthy()
    expect(screen.queryByText('Runs')).toBeNull()
    localStorage.clear()
  })
})

describe('AppSidebar tooltips', () => {
  function tooltipTexts(): (string | null)[] {
    return [...document.querySelectorAll('.ant-tooltip')].map((tooltip) => tooltip.textContent)
  }

  /** Hovers an element and gives an Ant Design tooltip time to open. */
  async function hover(element: Element): Promise<void> {
    fireEvent.mouseEnter(element)
    fireEvent.mouseOver(element)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  it('shows no tooltip over a profile menu item, whose label is always visible', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    // Folded: Ant Design then treats every menu inside the sidebar as folded, the profile menu too.
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть меню' }))
    // Positive control: in this run a tooltip does open in time over a folded navigation item.
    const runs = screen.getByRole('menuitem', { name: 'Прогоны' })
    await hover(runs)
    await waitFor(() => {
      expect(tooltipTexts()).toContain('Прогоны')
    })
    fireEvent.mouseLeave(runs)

    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    const docs = await screen.findByRole('link', { name: 'Документация' })
    const item = docs.closest('[role="menuitem"]')
    if (item === null) throw new Error('the docs link is not inside a menu item')
    await hover(item)
    const theme = screen.getByText('Тёмная').closest('[role="menuitemradio"]')
    if (theme === null) throw new Error('the theme option is not a menu item')
    await hover(theme)
    expect(tooltipTexts()).not.toContain('Документация')
    expect(tooltipTexts()).not.toContain('Тёмная')
  })

  it('keeps the tooltip of a folded navigation item, whose label is hidden', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть меню' }))
    const runs = screen.getByRole('menuitem', { name: 'Прогоны' })
    await hover(runs)
    await waitFor(() => {
      expect(document.querySelector('.ant-tooltip')?.textContent).toBe('Прогоны')
    })
  })
})
