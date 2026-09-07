import type { ReactElement } from 'react'

interface AwardLensProps {
  compact?: boolean
}

export function AwardLens({ compact = false }: AwardLensProps): ReactElement {
  return (
    <div className={`dp-award-lens${compact ? ' dp-award-lens--compact' : ''}`} aria-hidden="true">
      <div className="dp-award-lens__halo" />
      <div className="dp-award-lens__disc">
        <span className="dp-award-lens__year">2026</span>
        <span className="dp-award-lens__monogram">DP</span>
      </div>
    </div>
  )
}
