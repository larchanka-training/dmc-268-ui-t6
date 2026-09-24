// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConnectRepositoryModal } from './ConnectRepositoryModal'

describe('ConnectRepositoryModal', () => {
  it('renders modal when open', () => {
    const handleClose = vi.fn()
    const handleSuccess = vi.fn()

    render(<ConnectRepositoryModal onClose={handleClose} onSuccess={handleSuccess} open={true} />)

    expect(screen.getByText('Подключение нового репозитория')).toBeDefined()
    expect(screen.getByPlaceholderText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
  })
})
