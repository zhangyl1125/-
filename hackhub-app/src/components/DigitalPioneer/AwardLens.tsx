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
            <linearGradient id={`${id}-glass`} x1="122" y1="120" x2="313" y2="346" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d9f4ff" />
              <stop offset="0.48" stopColor="#69bce8" />
              <stop offset="1" stopColor="#1e5797" />
            </linearGradient>
            <linearGradient id={`${id}-base`} x1="155" y1="350" x2="294" y2="405" gradientUnits="userSpaceOnUse">
              <stop stopColor="#78bfe5" />
              <stop offset="1" stopColor="#244876" />
            </linearGradient>
          </defs>
          <g stroke="#548fbd" strokeOpacity="0.35" strokeWidth="1.5">
            <circle cx="220" cy="231" r="173" />
            <ellipse cx="220" cy="231" rx="194" ry="72" transform="rotate(-28 220 231)" />
            <path d="M52 155h43l25 25M388 300h-47l-31-31M100 360l40-40M333 95l-36 36" />
          </g>
          <g fill="#3486bb">
            <circle cx="52" cy="155" r="5" />
            <circle cx="388" cy="300" r="5" />
            <circle cx="333" cy="95" r="5" />
          </g>
          <text x="220" y="77" textAnchor="middle" className="dp-pioneer-emblem__year">2026</text>
          <g className="dp-pioneer-emblem__crystal">
            <path d="M144 146H96v43c0 47 34 78 79 81M296 146h48v43c0 47-34 78-79 81" stroke="#4685b5" strokeWidth="14" strokeLinejoin="round" />
            <path d="M143 123h154v82c0 52-30 89-77 110-47-21-77-58-77-110Z" fill={`url(#${id}-glass)`} stroke="#c7ebfa" strokeWidth="2" />
            <path d="m143 123 77 55 77-55-77 192Z" fill="#aee5fb" fillOpacity="0.45" />
            <path d="M220 178v137c47-21 77-58 77-110v-82Z" fill="#15538d" fillOpacity="0.26" />
            <path d="m220 174 11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3Z" fill="#f0fbff" />
            <path d="M207 309h26v45h-26Z" fill="#377cb0" />
            <path d="m220 341 68 35-68 35-68-35Z" fill="#c7e6f6" />
            <path d="m152 376 68 35 68-35v16l-68 35-68-35Z" fill={`url(#${id}-base)`} />
            <path d="M151 129h138" stroke="white" strokeOpacity="0.7" strokeWidth="2" />
          </g>
          <text x="220" y="465" textAnchor="middle" className="dp-pioneer-emblem__title">DIGITAL PIONEER</text>
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
