import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from './LandingPage'

const state = vi.hoisted(() => ({ user: null as null | { id: string; name: string; role: string }, judge: false }))
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: state.user, logout: vi.fn() }) }))
vi.mock('../hooks/useAwardAccess', () => ({ useAwardAccess: () => ({ canReview: state.user?.role === 'admin' || state.judge, canManage: state.user?.role === 'admin' }) }))
vi.mock('../hooks/useTechBackground', () => ({ useTechBackground: vi.fn() }))

const renderPage = (path = '/') => render(<MantineProvider env="test"><MemoryRouter initialEntries={[path]}><LandingPage><p>Original overview content</p></LandingPage></MemoryRouter></MantineProvider>)

beforeEach(() => {
  state.user = null
  state.judge = false
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('LandingPage', () => {
  it('opens all three sections without a login gate and embeds overview below the hero', () => {
    renderPage()
    expect(screen.getByRole('link', { name: '概览' })).toHaveAttribute('href', '/#overview')
    expect(screen.getByRole('link', { name: '个人提名' })).toHaveAttribute('href', '/nominate')
    expect(screen.getByRole('link', { name: '浏览与投票' })).toHaveAttribute('href', '/projects')
    expect(screen.getByRole('link', { name: /Get Started/ })).toHaveAttribute('href', '/#overview')
    fireEvent.click(screen.getByRole('link', { name: /Get Started/ }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    expect(screen.getByText('Original overview content').closest('main')).toHaveAttribute('id', 'overview')
    expect(screen.queryByRole('link', { name: /Sign in/ })).not.toBeInTheDocument()
  })

  it('marks the selected module and hides the home hero on module routes', () => {
    renderPage('/projects')
    expect(screen.getByRole('link', { name: '浏览与投票' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('heading', { name: '2026 BDCN Digital Pioneer Award' })).not.toBeInTheDocument()
  })

  it.each([
    ['participant', false, false], ['participant', true, true], ['admin', false, true],
  ])('shows review access for role %s with assignment %s', async (role, judge, visible) => {
    state.user = { id: 'u1', name: 'Associate', role }
    state.judge = judge
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Associate' }))
    await waitFor(() => expect(Boolean(screen.queryByRole('menuitem', { name: /评选管理|组委会评分/ }))).toBe(visible))
    await waitFor(() => expect(Boolean(screen.queryByRole('menuitem', { name: '用户管理' }))).toBe(role === 'admin'))
  })

  it('retains the reference background with immediate poster and loaded video', () => {
    const { container } = renderPage()
    const video = container.querySelector('video')!
    expect(video).toHaveAttribute('poster', '/media/tech-blue-poster.jpg')
    expect(video.querySelector('source')).toHaveAttribute('src', '/media/tech-blue-loop.mp4')
    fireEvent.loadedData(video)
    expect(video).toHaveClass('is-ready')
    expect(container.querySelectorAll('.award-landing__track-marks svg')).toHaveLength(3)
  })

  it('opens and closes mobile navigation', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })
})
