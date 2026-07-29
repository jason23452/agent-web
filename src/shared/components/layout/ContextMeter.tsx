import { Progress, ProgressIndicator, ProgressTrack } from "@/shared/components/ui/progress"
import { Spinner } from "@/shared/components/ui/spinner"
import type { TokenUsage } from "@/shared/types/workspace"

type ContextMeterProps = {
  usage: TokenUsage[]
}

function formatToken(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}

function getUsagePercent(item: TokenUsage) {
  if (item.limit <= 0) return 0
  return Math.round(Math.min((item.used / item.limit) * 100, 100))
}

function getUsageClasses(percent: number) {
  if (percent >= 95) {
    return {
      indicator: "bg-destructive",
      text: "text-destructive",
    }
  }

  if (percent >= 78) {
    return {
      indicator: "bg-warning",
      text: "text-warning",
    }
  }

  return {
    indicator: "bg-success",
    text: "text-success",
  }
}

export function ContextMeter({ usage }: ContextMeterProps) {
  const primary = usage[0]
  if (!primary) return null

  const percent = getUsagePercent(primary)
  const usageClasses = getUsageClasses(percent)
  const spinnerRotation = `${Math.round(percent * 3.6)}deg`

  return (
    <div
      aria-describedby="context-token-popover"
      className="group relative hidden items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring sm:inline-flex"
      tabIndex={0}
      title={`Token 使用量：${primary.label} ${formatToken(primary.used)}/${formatToken(primary.limit)}`}
    >
      <Spinner
        aria-hidden="true"
        className={`size-3.5 animate-none transition-transform ${usageClasses.text}`}
        style={{ transform: `rotate(${spinnerRotation})` }}
      />
      <span className="font-mono font-semibold text-xs">{percent}%</span>

      <div
        className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 translate-y-1 rounded-xl border bg-popover p-4 text-popover-foreground opacity-0 shadow-lg/5 transition-[opacity,translate] group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        id="context-token-popover"
        role="region"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <strong className="text-sm">Context tokens</strong>
          <span className="font-mono text-muted-foreground text-xs">OpenAI</span>
        </div>
        <div className="grid gap-3">
          {usage.map((item) => {
            const itemPercent = getUsagePercent(item)
            const itemClasses = getUsageClasses(itemPercent)

            return (
              <div className="grid gap-1.5" key={item.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono text-xs">
                    {formatToken(item.used)} / {formatToken(item.limit)}
                  </span>
                </div>
                <Progress
                  aria-label={`${item.label} token usage`}
                  className="gap-0"
                  getAriaValueText={() => `${itemPercent}%`}
                  max={100}
                  value={itemPercent}
                >
                  <ProgressTrack className="h-1.5 bg-muted">
                    <ProgressIndicator className={itemClasses.indicator} />
                  </ProgressTrack>
                </Progress>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
