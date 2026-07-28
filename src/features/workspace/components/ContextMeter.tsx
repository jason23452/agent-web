import type { TokenUsage } from "@/features/workspace/types/workspace"

type ContextMeterProps = {
  usage: TokenUsage[]
}

function formatToken(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}

export function ContextMeter({ usage }: ContextMeterProps) {
  const primary = usage[0]!
  const pct = Math.round((primary.used / primary.limit) * 100)
  const circumference = 47.12
  const offset = circumference * (1 - Math.min(pct, 100) / 100)
  const stateClass = pct >= 95 ? "text-destructive" : pct >= 78 ? "text-warning" : "text-success"

  return (
    <div
      aria-describedby="context-token-popover"
      className="group relative hidden items-center gap-1 rounded-full border border-border/70 bg-background px-1.5 py-1 focus-within:ring-2 focus-within:ring-ring sm:inline-flex"
      tabIndex={0}
      title={`Token 用量：${primary.label} ${formatToken(primary.used)}/${formatToken(primary.limit)}`}
    >
      <span
        aria-label="Session context 使用量"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={pct}
        className="relative grid size-5 shrink-0 place-items-center"
        role="meter"
      >
        <svg aria-hidden="true" className="absolute inset-0 size-5 -rotate-90" viewBox="0 0 20 20">
          <circle className="fill-none stroke-muted" cx="10" cy="10" r="7.5" strokeWidth="2.5" />
          <circle
            className={`fill-none stroke-current transition-[stroke-dashoffset] ${stateClass}`}
            cx="10"
            cy="10"
            r="7.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
        <span aria-hidden="true" className={`size-1.5 rounded-full ${pct >= 95 ? "bg-destructive" : pct >= 78 ? "bg-warning" : "bg-success"}`} />
      </span>
      <span className="font-mono font-semibold text-xs">{pct}%</span>

      <div
        className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 translate-y-1 rounded-xl border bg-popover p-4 text-popover-foreground opacity-0 shadow-lg/5 transition-[opacity,translate] group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        id="context-token-popover"
        role="region"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <strong className="text-sm">目前供應商 token</strong>
          <span className="font-mono text-muted-foreground text-xs">OpenAI</span>
        </div>
        <div className="grid gap-3">
          {usage.map((item) => {
            const itemPct = Math.min((item.used / item.limit) * 100, 100)
            return (
              <div className="grid gap-1.5" key={item.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono text-xs">{formatToken(item.used)} / {formatToken(item.limit)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${itemPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
