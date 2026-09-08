import { useId, type ReactElement } from 'react'
import './AwardLens.css'

interface AwardLensProps {
  compact?: boolean
}

export function AwardLens({ compact = false }: AwardLensProps): ReactElement {
  const id = useId()
  if (!compact) {
    return (
      <div className="dp-pioneer-emblem" aria-hidden="true">
        <svg viewBox="0 0 440 480" fill="none" focusable="false">
          <defs>
            <linearGradient id={`${id}-frame`} x1="80" y1="60" x2="370" y2="390" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8a5c8e" />
              <stop offset="0.5" stopColor="#e4c6bd" />
              <stop offset="1" stopColor="#c49b59" />
            </linearGradient>
            <linearGradient id={`${id}-crystal`} x1="181" y1="119" x2="266" y2="321" gradientUnits="userSpaceOnUse">
              <stop stopColor="#eaddeb" />
              <stop offset="0.48" stopColor="#b08ab6" />
              <stop offset="1" stopColor="#694973" />
            </linearGradient>
            <linearGradient id={`${id}-base`} x1="145" y1="326" x2="291" y2="365" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f1e7dd" />
              <stop offset="1" stopColor="#c49b59" />
            </linearGradient>
          </defs>
          <path d="M220 30 389 127v195L220 420 51 322V127Z" fill="currentColor" fillOpacity="0.025" stroke={`url(#${id}-frame)`} strokeWidth="1.5" />
          <path d="m220 45 156 90v179l-156 91-156-91V135Z" stroke={`url(#${id}-frame)`} strokeOpacity="0.3" />
          <g stroke={`url(#${id}-frame)`} strokeWidth="1.5">
            <path d="M51 224h41l26 26v37M389 224h-41l-26 26v37M220 30v35" />
            <circle cx="118" cy="293" r="5" fill="#d56452" />
            <circle cx="322" cy="293" r="5" fill="#c49b59" />
            <circle cx="220" cy="71" r="4" fill="#8a5c8e" />
          </g>
          <text x="220" y="103" textAnchor="middle" className="dp-pioneer-emblem__year">2026</text>
          <g className="dp-pioneer-emblem__crystal">
            <path d="m139 204 39-23 42 131-39 23-42-24Z" fill="#dba193" />
            <path d="m139 204 42 25v106l-42-24Z" fill="#d56452" fillOpacity="0.65" />
            <path d="m181 229-3-48 42 131-39 23Z" fill="#f1d4ca" />
            <path d="m220 123 39 23v166l-39 23-39-23V146Z" fill={`url(#${id}-crystal)`} />
            <path d="m220 123 39 23-39 24-39-24Z" fill="#eee4ef" />
            <path d="M220 170v165l39-23V146Z" fill="#62406e" fillOpacity="0.36" />
            <path d="M220 170v142" stroke="#f5eaf8" strokeOpacity="0.7" />
            <path d="m262 203 39 23v85l-42 24-39-23Z" fill="#e8cd9f" />
            <path d="m262 203 39 23-42 24-39-23Z" fill="#f8e8cc" />
            <path d="m259 250 42-24v85l-42 24Z" fill="#c49b59" />
            <path d="m220 312 74 42-74 43-74-43Z" fill={`url(#${id}-base)`} />
            <path d="m146 354 74 23 74-23v13l-74 43-74-43Z" fill="#b48b58" />
            <path d="m146 344 74-42 74 42-74 43Z" fill="#f4e8dc" />
            <path d="m146 344 74 43 74-43v10l-74 43-74-43Z" fill={`url(#${id}-base)`} />
          </g>
          <text x="220" y="449" textAnchor="middle" className="dp-pioneer-emblem__title">DIGITAL PIONEER</text>
        </svg>
      </div>
    )
  }

  return (
    <div className="dp-nomination-mark" aria-hidden="true">
      <svg viewBox="0 0 300 220" fill="none" focusable="false">
        <defs>
          <linearGradient id={`${id}-signal`} x1="66" y1="33" x2="239" y2="185" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8a5c8e" />
            <stop offset="0.52" stopColor="#d56452" />
            <stop offset="1" stopColor="#c49b59" />
          </linearGradient>
          <linearGradient id={`${id}-glass`} x1="87" y1="49" x2="218" y2="175" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.94" />
            <stop offset="1" stopColor="#f3e8ed" stopOpacity="0.62" />
          </linearGradient>
          <filter id={`${id}-shadow`} x="36" y="18" width="228" height="198" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="16" stdDeviation="15" floodColor="#5b3e5c" floodOpacity="0.18" />
          </filter>
        </defs>

        <ellipse className="dp-nomination-mark__orbit" cx="150" cy="110" rx="119" ry="67" transform="rotate(-10 150 110)" />
        <path d="M42 126C75 177 164 201 246 148" stroke={`url(#${id}-signal)`} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
        <g filter={`url(#${id}-shadow)`}>
          <path d="M102 31 218 63l-20 126-116-32 20-126Z" fill={`url(#${id}-glass)`} stroke="white" strokeWidth="1.5" />
          <path d="m102 31 116 32-7 42-116-32 7-42Z" fill={`url(#${id}-signal)`} fillOpacity="0.16" />
          <path d="m108 50 90 25-14 91-90-25 14-91Z" stroke={`url(#${id}-signal)`} strokeOpacity="0.48" />
        </g>

        <text x="151" y="129" textAnchor="middle" className="dp-nomination-mark__monogram" transform="rotate(15 151 129)">DP</text>
        <text x="157" y="77" textAnchor="middle" className="dp-nomination-mark__year" transform="rotate(15 157 77)">2026</text>
        <g fill={`url(#${id}-signal)`}>
          <rect x="229" y="49" width="11" height="11" rx="2" transform="rotate(15 229 49)" />
          <rect x="246" y="62" width="8" height="8" rx="1.5" transform="rotate(15 246 62)" opacity="0.72" />
          <rect x="257" y="78" width="5" height="5" rx="1" transform="rotate(15 257 78)" opacity="0.48" />
        </g>
      </svg>
    </div>
  )
}
