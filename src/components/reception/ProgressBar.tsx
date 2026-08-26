interface ProgressBarProps {
  percent: number
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  return (
    <div className="w-full h-1 bg-mt-linen rounded-full overflow-hidden">
      <div
        className="h-full bg-mt-rose transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
