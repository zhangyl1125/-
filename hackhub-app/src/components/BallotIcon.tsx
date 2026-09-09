/** A checked ballot entering a ballot box. */
export function BallotIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="ballot-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m8 3 10 3-3 10-10-3z" />
      <path d="m9 8 1 2 4-2M4 12H2v10h20V12h-3M7 17h10" />
    </svg>
  )
}
