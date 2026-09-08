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

  it('links authenticated visitors back into the award overview', () => {
    render(
      <MemoryRouter>
        <LandingPage authenticated />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Discover' })).toHaveAttribute('href', '/overview')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/overview')
    expect(screen.getByRole('link', { name: /Get Started/i })).toHaveAttribute('href', '/overview')
  })

  it('keeps the program icons without the removed track footer', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.queryByText('VALUE')).not.toBeInTheDocument()
    expect(screen.queryByText('SHIFT')).not.toBeInTheDocument()
    expect(screen.queryByText('UNITE')).not.toBeInTheDocument()
    expect(container.querySelector('.award-landing__tracks')).not.toBeInTheDocument()
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
    expect(video).toHaveAttribute('poster', '/media/tech-blue-poster.jpg')
    expect(video).not.toHaveClass('is-ready')
    expect(video?.querySelector('source')).toHaveAttribute(
      'src',
      '/media/tech-blue-loop.mp4',
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
