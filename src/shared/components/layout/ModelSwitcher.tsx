import { CheckIcon, ChevronDownIcon, CpuIcon, SearchIcon } from "lucide-react"
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

function matchesModelSearch(model: ModelOption, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return true

  return [model.providerName, model.providerID, model.name, model.id, model.variant]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(query))
}

export function ModelSwitcher({ activeModelKey, disabled = false, loading = false, models, onModelChange, variant = "topnav" }: ModelSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const activeModel = models.find((model) => model.key === activeModelKey) ?? models[0]
  const hasModels = models.length > 0
  const compact = variant === "topnav"
  const filteredModels = models.filter((model) => matchesModelSearch(model, search))
  const groupedModels = filteredModels.reduce<Array<{ providerID: string; providerName: string; models: ModelOption[] }>>((groups, model) => {
    const group = groups.find((item) => item.providerID === model.providerID)
    if (group) {
      group.models.push(model)
      return groups
    }

    return [...groups, { providerID: model.providerID, providerName: model.providerName, models: [model] }]
  }, [])

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
        onClick={() => setOpen((current) => {
          if (current) setSearch("")
          return !current
        })}
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
          <div className="sticky top-0 z-10 bg-popover p-1 pb-1.5">
            <label className="relative block">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="搜尋模型"
                autoComplete="off"
                className="h-9 w-full rounded-lg border border-input bg-background px-8 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜尋模型或供應商..."
                type="search"
                value={search}
              />
            </label>
          </div>
          {groupedModels.length === 0 && (
            <div className="px-3 py-4 text-center text-muted-foreground text-sm">找不到符合的模型</div>
          )}
          {groupedModels.map((group) => (
            <div className="grid gap-0.5" key={group.providerID}>
              <div className="sticky top-[2.875rem] z-[1] bg-popover px-2 py-1.5 font-semibold text-muted-foreground text-xs">
                {group.providerName}
              </div>
              {group.models.map((model) => {
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
                      setSearch("")
                    }}
                    role="option"
                    type="button"
                  >
                    <span>{selected && <CheckIcon aria-hidden="true" className="size-4" />}</span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate">{model.variant ?? model.name}</span>
                      <span className="truncate text-muted-foreground text-xs">{model.name} / {model.id}</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
