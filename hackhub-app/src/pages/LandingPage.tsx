import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  IconArrowUpRight,
  IconBulb,
  IconHeartHandshake,
  IconMenu2,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { AwardBrand } from '../components/Layout/AwardBrand'
import { useTechBackground } from '../hooks/useTechBackground'
import './LandingPage.css'

const programIcons = [
  { label: 'Customer value', icon: IconHeartHandshake },
  { label: 'Innovation breakthrough', icon: IconBulb },
  { label: 'Collaboration to win', icon: IconUsersGroup },
] as const

const landingVideoSrc = '/media/tech-blue-loop.mp4'
const landingPosterSrc = '/media/tech-blue-poster.jpg'

export function LandingPage({ authenticated = false }: { authenticated?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const entryPoints = [
    { label: 'Discover', to: authenticated ? '/overview' : '/login?redirect=/overview' },
    { label: 'Nominate', to: authenticated ? '/nominate' : '/login?redirect=/nominate' },
    { label: 'Vote', to: authenticated ? '/projects' : '/login?redirect=/projects' },
  ] as const
  const startPath = authenticated ? '/overview' : '/login'

  useTechBackground(backdropRef, videoRef)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const startVideo = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setVideoReady(true)
        void video.play().catch(() => {
          // The preloaded poster remains visible if the browser blocks autoplay.
        })
      }
    }

    startVideo()
    video.addEventListener('loadeddata', startVideo)
    return () => video.removeEventListener('loadeddata', startVideo)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <div className="award-landing" id="landing-top">
      <div ref={backdropRef} className="award-landing__backdrop" aria-hidden="true">
        <video
          ref={videoRef}
          className={videoReady ? 'is-ready' : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={landingPosterSrc}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
        >
          <source src={landingVideoSrc} type="video/mp4" />
        </video>
      </div>

      <header className="award-landing__header">
        <AwardBrand inverse />

        <nav className="award-landing__nav" aria-label="Main navigation">
          {entryPoints.map((item, index) => (
            <Link
              className={index === 0 ? 'award-landing__nav-link is-active' : 'award-landing__nav-link'}
              to={item.to}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className="award-landing__sign-in" to={startPath}>
          Sign in
          <IconArrowUpRight aria-hidden="true" size={15} stroke={1.8} />
        </Link>

        <button
          className="award-landing__menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="award-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <IconX aria-hidden="true" /> : <IconMenu2 aria-hidden="true" />}
        </button>
      </header>

      {menuOpen ? (
        <>
          <button
            className="award-landing__menu-scrim"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="award-landing__mobile-menu" id="award-mobile-menu" aria-label="Mobile navigation">
            {entryPoints.map((item) => (
              <Link to={item.to} key={item.label} onClick={() => setMenuOpen(false)}>
                {item.label}
                <IconArrowUpRight aria-hidden="true" size={17} />
              </Link>
            ))}
            <Link className="award-landing__mobile-sign-in" to={startPath} onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          </nav>
        </>
      ) : null}

      <main className="award-landing__hero">
        <div className="award-landing__program-mark award-landing__reveal" style={{ '--delay': '80ms' } as CSSProperties}>
          <div className="award-landing__track-marks" aria-hidden="true">
            {programIcons.map(({ label, icon: TrackIcon }) => (
              <span key={label} title={label}>
                <TrackIcon size={17} stroke={1.7} />
              </span>
            ))}
          </div>
          <span>Digital Pioneer Award · 2026</span>
        </div>

        <h1 className="award-landing__headline">
          <span>Recognize the work</span>
          <span>that moves us forward.</span>
        </h1>

        <p className="award-landing__subhead award-landing__reveal" style={{ '--delay': '360ms' } as CSSProperties}>
          Nominate the people turning customer insight, bold ideas, and shared effort into meaningful progress.
        </p>

        <Link
          className="award-landing__cta award-landing__reveal"
          style={{ '--delay': '470ms' } as CSSProperties}
          to={startPath}
        >
          <span>Get Started</span>
        </Link>
      </main>

    </div>
  )
}
