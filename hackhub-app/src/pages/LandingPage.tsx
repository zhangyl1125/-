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
import './LandingPage.css'

const entryPoints = [
  { label: 'Discover', to: '/login?redirect=/' },
  { label: 'Nominate', to: '/login?redirect=/nominate' },
  { label: 'Vote', to: '/login?redirect=/projects' },
] as const

const tracks = [
  { code: 'V', name: 'VALUE', label: 'Customer value', icon: IconHeartHandshake },
  { code: 'S', name: 'SHIFT', label: 'Innovation breakthrough', icon: IconBulb },
  { code: 'U', name: 'UNITE', label: 'Collaboration to win', icon: IconUsersGroup },
] as const

const landingVideoSrc = '/media/award-landing-bg.mp4'
const landingPosterSrc = '/media/award-landing-poster.webp'

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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
      <div className="award-landing__backdrop" aria-hidden="true">
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

        <Link className="award-landing__sign-in" to="/login">
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
            <Link className="award-landing__mobile-sign-in" to="/login" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          </nav>
        </>
      ) : null}

      <main className="award-landing__hero">
        <div className="award-landing__program-mark award-landing__reveal" style={{ '--delay': '80ms' } as CSSProperties}>
          <div className="award-landing__track-marks" aria-hidden="true">
            {tracks.map(({ name, icon: TrackIcon }) => (
              <span key={name} title={name}>
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
          to="/login"
        >
          <span>Get Started</span>
        </Link>
      </main>

      <footer className="award-landing__tracks" aria-label="Award categories">
        {tracks.map((track, index) => (
          <div
            className="award-landing__track award-landing__reveal"
            style={{ '--delay': `${560 + index * 80}ms` } as CSSProperties}
            key={track.name}
          >
            <span className="award-landing__track-code" aria-hidden="true">{track.code}</span>
            <span className="award-landing__track-copy">
              <strong>{track.name}</strong>
              <span>{track.label}</span>
            </span>
          </div>
        ))}
      </footer>
    </div>
  )
}
