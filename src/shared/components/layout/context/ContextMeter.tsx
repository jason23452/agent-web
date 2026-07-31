import { useState } from "react"
import { Progress, ProgressIndicator, ProgressTrack } from "@/shared/components/ui/progress"
import { Spinner } from "@/shared/components/ui/spinner"
import type { ModelRateLimitUsage, TokenUsage } from "@/shared/types/workspace"

type ContextMeterProps = {
  rateLimitUsage?: ModelRateLimitUsage | null
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

function formatResetAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `Resets ${date.toLocaleString([], { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short" })}`
}

export function ContextMeter({ rateLimitUsage, usage }: ContextMeterProps) {
  const [quotaTab, setQuotaTab] = useState<"remaining" | "used">("remaining")
  const primary = usage[0]
  if (!primary) return null

  const usageProgressColor = "lab(15.204 0 -0.00000596046)"

  const percent = getUsagePercent(primary)
  const hasUsage = primary.limit > 0 && Boolean(primary.modelLabel)
  const spinnerRotation = `${Math.round(percent * 3.6)}deg`

  return (
    <div
      aria-describedby="context-token-popover"
      className="group relative hidden items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-ring sm:inline-flex"
      tabIndex={0}
      title={hasUsage ? `Context 使用量：${primary.label} ${formatToken(primary.used)}/${formatToken(primary.limit)}` : "尚無 context 使用量"}
    >
      <Spinner
        aria-hidden="true"
        className="size-3.5 animate-none transition-transform"
        style={{ transform: `rotate(${spinnerRotation})`, color: usageProgressColor }}
      />
      <span className="font-mono font-semibold text-xs">{percent}%</span>

      <div
        className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 translate-y-1 rounded-xl border bg-popover p-4 text-popover-foreground opacity-0 shadow-lg/5 transition-[opacity,translate] group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        id="context-token-popover"
        role="region"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <strong className="text-sm">Rate limits</strong>
          <span className="truncate font-mono text-muted-foreground text-xs">{rateLimitUsage?.providerID ?? primary.providerLabel ?? "Current model"}</span>
        </div>
        {rateLimitUsage?.fetchedAt ? (
          <p className="mb-3 text-muted-foreground text-xs">Last updated {new Date(rateLimitUsage.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        ) : null}
        <div className="mb-3 grid grid-cols-2 rounded-lg bg-muted p-1 text-xs">
          <button
            className={`rounded-md px-2 py-1.5 font-medium transition-colors ${quotaTab === "remaining" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setQuotaTab("remaining")}
            type="button"
          >
            剩餘用量
          </button>
          <button
            className={`rounded-md px-2 py-1.5 font-medium transition-colors ${quotaTab === "used" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setQuotaTab("used")}
            type="button"
          >
            已用用量
          </button>
        </div>
        {rateLimitUsage?.entries.length ? (
          <div className="grid gap-3 max-h-[250px] overflow-y-auto">
            {rateLimitUsage.entries.map((entry) => {
              const limit = entry.limit ?? 0
              const used = entry.used ?? (entry.remaining !== undefined && limit > 0 ? Math.max(limit - entry.remaining, 0) : 0)
              const remaining = entry.remaining ?? (limit > 0 ? Math.max(limit - used, 0) : undefined)
              const usedPercent = Math.round(entry.usedPercent ?? (limit > 0 ? (used / limit) * 100 : 0))
              const remainingPercent = Math.max(100 - usedPercent, 0)
              const hasMeterValue = entry.usedPercent !== undefined || limit > 0
              const value = hasMeterValue ? quotaTab === "remaining" ? remainingPercent : usedPercent : 0
              const usageLabel = entry.valueLabel ?? (quotaTab === "remaining"
                ? entry.usedPercent !== undefined
                  ? `${remainingPercent}% left`
                  : remaining !== undefined && limit > 0
                    ? `${formatToken(remaining)} / ${formatToken(limit)} left`
                    : remaining !== undefined
                      ? `${formatToken(remaining)} left`
                      : `${remainingPercent}% left`
                : entry.usedPercent !== undefined
                  ? `${usedPercent}% used`
                  : limit > 0
                    ? `${formatToken(used)} / ${formatToken(limit)} used`
                    : `${usedPercent}% used`)

              return (
                <div className="grid gap-1.5" key={`${entry.label}-${entry.resetAt ?? ""}`}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{entry.label}</span>
                    <span className="font-mono text-xs">{usageLabel}</span>
                  </div>
                  <Progress aria-label={`${entry.label} ${quotaTab} usage`} className="gap-0" max={100} value={value}>
                    <ProgressTrack className="h-1.5 bg-muted">
                      <ProgressIndicator
                        className="bg-black/0"
                        style={{ backgroundColor: usageProgressColor }}
                      />
                    </ProgressTrack>
                  </Progress>
                  {entry.resetAt ? <span className="text-muted-foreground text-xs">{formatResetAt(entry.resetAt)}</span> : null}
                </div>
              )
            })}
          </div>
        ) : rateLimitUsage?.error ? (
          <p className="mb-3 rounded-lg bg-muted/45 px-3 py-2 text-muted-foreground text-sm">
            {rateLimitUsage.error}
          </p>
        ) : (
          <p className="mb-3 rounded-lg bg-muted/45 px-3 py-2 text-muted-foreground text-sm">
            此模型尚無可用額度資料。
          </p>
        )}
        <div className="mt-3 grid gap-3 border-border/70 border-t pt-3">
            {usage.map((item) => {
              const itemPercent = getUsagePercent(item)

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
                    <ProgressIndicator
                      className="bg-black/0"
                      style={{ backgroundColor: usageProgressColor }}
                    />
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
