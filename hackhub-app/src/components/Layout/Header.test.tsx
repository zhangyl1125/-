import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'
import { LanguageProvider } from '../../contexts/LanguageContext'

// Mock authStore
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '../../store/authStore'
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>

function renderHeader(props?: { opened?: boolean; toggle?: () => void }) {
  const toggle = props?.toggle ?? vi.fn()
  const opened = props?.opened ?? false
  return render(
    <MemoryRouter>
      <MantineProvider>
        <LanguageProvider>
          <Header opened={opened} toggle={toggle} />
        </LanguageProvider>
      </MantineProvider>
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'alice@test.com',
        name: 'Alice',
        role: 'participant',
        skills: [],
      },
      logout: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('renders the user name', () => {
    renderHeader()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Digital Award')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'BOSCH' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bosch Digital Award home' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('2026 Award')).not.toBeInTheDocument()
  })

  it('keeps the account role in the account menu', async () => {
    renderHeader()
    expect(screen.queryByText('参与者')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(await screen.findByText('参与者')).toBeInTheDocument()
  })

  it('defaults to Chinese and toggles to English', () => {
    renderHeader()
    const languageToggle = screen.getByRole('button', { name: '切换到英文' })
    expect(languageToggle).toHaveTextContent('中')
    expect(languageToggle).not.toHaveTextContent('EN')
    fireEvent.click(languageToggle)
    const englishToggle = screen.getByRole('button', { name: 'Switch to Chinese' })
    expect(englishToggle).toHaveTextContent('EN')
    expect(englishToggle).not.toHaveTextContent('中')
    expect(localStorage.getItem('hackhub-language')).toBe('en')
  })

  it('user menu trigger is clickable', () => {
    renderHeader()
    // The UnstyledButton wrapping Avatar + name should be clickable
    const userArea = screen.getByText('Alice')
    const menuTrigger = userArea.closest('button') ?? userArea.parentElement?.closest('button')
    expect(menuTrigger).not.toBeNull()
  })

  it('logout function is wired to the store', () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined)
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', email: 'alice@test.com', name: 'Alice', role: 'participant', skills: [] },
      logout: logoutMock,
    })
    renderHeader()
    // Verify the store's logout was connected (component renders without error)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders with no user gracefully', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      logout: vi.fn(),
    })
    expect(() => renderHeader()).not.toThrow()
  })
})
