import { CheckIcon, ChevronDownIcon, CpuIcon } from "lucide-react"
import { useState } from "react"
import type { ModelOption } from "@/shared/types/workspace"

type ModelSwitcherProps = {
  activeModelKey: string | null
  disabled?: boolean
  loading?: boolean
  models: ModelOption[]
  onModelChange: (modelKey: string) => void
  variant?: "topnav" | "composer"
}

function formatLimit(limit: number | undefined) {
  if (!limit) return null
  if (limit >= 1_000_000) return `${Math.round(limit / 1_000_000)}M ctx`
  if (limit >= 1_000) return `${Math.round(limit / 1_000)}K ctx`
  return `${limit} ctx`
}

export function ModelSwitcher({ activeModelKey, disabled = false, loading = false, models, onModelChange, variant = "topnav" }: ModelSwitcherProps) {
  const [open, setOpen] = useState(false)
  const activeModel = models.find((model) => model.key === activeModelKey) ?? models[0]
  const hasModels = models.length > 0
  const compact = variant === "topnav"

  return (
    <div
      className="relative min-w-0 "
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={compact
          ? "inline-flex min-h-9 max-w-56 items-center gap-1.5 rounded-lg px-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          : "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        }
        disabled={disabled || loading || !hasModels}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CpuIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">
          {loading ? "讀取模型..." : activeModel ? activeModel.variant ?? activeModel.name : "沒有可用模型"}
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
      {open && (
        <div
          aria-label="可選模型"
          className={compact
            ? "absolute right-0 top-[calc(100%+0.35rem)] z-50 w-80 max-w-[calc(100vw-1rem)] rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg/5 max-h-[400px] overflow-auto"
            : "absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg/5 max-h-[400px] overflow-auto"
          }
          role="listbox"
        >
          {models.map((model) => {
            const selected = model.key === activeModel?.key
            const limit = formatLimit(model.contextLimit)

            return (
              <button
                aria-selected={selected}
                className={`grid min-h-10 w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent ${selected ? "bg-accent font-semibold" : ""}`}
                key={model.key}
                onClick={() => {
                  onModelChange(model.key)
                  setOpen(false)
                }}
                role="option"
                type="button"
              >
                <span>{selected && <CheckIcon aria-hidden="true" className="size-4" />}</span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate">{model.variant ?? model.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{model.providerName} / {model.name} / {model.id}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {model.status && model.status !== "active" && (
                    <span className="rounded-md border px-1.5 py-0.5 text-muted-foreground text-[10px] uppercase">{model.status}</span>
                  )}
                  {limit && <span className="rounded-md border px-1.5 py-0.5 text-muted-foreground text-[10px]">{limit}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
