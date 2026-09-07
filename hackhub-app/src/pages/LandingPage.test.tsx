import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('links sign in and the primary call to action to the login route', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /Get Started/i })).toHaveAttribute('href', '/login')
  })

  it('shows the three award tracks', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('VALUE')).toBeInTheDocument()
    expect(screen.getByText('SHIFT')).toBeInTheDocument()
    expect(screen.getByText('UNITE')).toBeInTheDocument()
    expect(container.querySelectorAll('.award-landing__track-marks svg')).toHaveLength(3)
  })

  it('shows the immediate fallback before fading in the loaded video', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('preload', 'auto')
    expect(video).toHaveAttribute('poster', '/media/award-landing-poster.webp')
    expect(video).not.toHaveClass('is-ready')
    expect(video?.querySelector('source')).toHaveAttribute(
      'src',
      '/media/award-landing-bg.mp4',
    )

    fireEvent.loadedData(video as HTMLVideoElement)
    expect(video).toHaveClass('is-ready')
  })

  it('opens and closes the mobile navigation', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })
})
