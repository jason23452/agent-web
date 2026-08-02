import { useState, type DragEvent } from "react"
import {
  BotIcon,
  BoxIcon,
  BracesIcon,
  Clock3Icon,
  CommandIcon,
  FlagIcon,
  GitBranchIcon,
  GripVerticalIcon,
  MessageSquareTextIcon,
  PlugZapIcon,
  RotateCwIcon,
  SearchIcon,
  SparklesIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import type { WorkflowPaletteItem, WorkflowResourceCatalog } from "@/features/workflows/types"
import { buildPaletteItems, scopeLabel } from "@/features/workflows/workflowUtils"

const TYPE_ICONS = {
  "trigger.manual": FlagIcon,
  "trigger.schedule": Clock3Icon,
  "trigger.webhook": ZapIcon,
  "resource.agent": BotIcon,
  "resource.command": CommandIcon,
  "resource.skill": SparklesIcon,
  "resource.tool": WrenchIcon,
  "resource.mcp": PlugZapIcon,
  "resource.plugin": BoxIcon,
  "action.prompt": MessageSquareTextIcon,
  "action.command": BracesIcon,
  "action.restart": RotateCwIcon,
  "action.approval": FlagIcon,
  "action.shell": CommandIcon,
  "flow.condition": GitBranchIcon,
  "flow.merge": GitBranchIcon,
} as const

const CATEGORY_ORDER = ["Command", "Agent", "Skill", "Tool", "MCP", "Plugin"]

type WorkflowPaletteProps = {
  catalog: WorkflowResourceCatalog | null
  error: string | null
  loading: boolean
  onAdd: (item: WorkflowPaletteItem) => void
}

export function WorkflowPalette({ catalog, error, loading, onAdd }: WorkflowPaletteProps) {
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<"all" | "project" | "global">("all")
  const items = catalog ? buildPaletteItems(catalog.resources) : []
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-Hant")
  const filteredItems = items.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      item.label.toLocaleLowerCase("zh-Hant").includes(normalizedQuery) ||
      item.description.toLocaleLowerCase("zh-Hant").includes(normalizedQuery) ||
      item.type.includes(normalizedQuery)
    const matchesScope = scope === "all" || !item.resource || (item.resource.scope ?? "project") === scope
    return matchesQuery && matchesScope
  })

  function startDrag(event: DragEvent<HTMLButtonElement>, item: WorkflowPaletteItem) {
    if (item.disabled) return
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("application/agent-system-workflow-node", JSON.stringify(item))
  }

  return (
    <section aria-labelledby="workflow-palette-title" className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="grid gap-3 border-border border-b p-4">
        <div>
          <h2 className="font-semibold text-sm" id="workflow-palette-title">新增節點</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">選取既有資源，或建立 managed draft 後在畫布配置。</p>
        </div>
        <div className="relative">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="搜尋節點與資源" className="pl-7" onChange={(event) => setQuery(event.target.value)} placeholder="搜尋 command、agent、tool..." type="search" value={query} />
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          資源範圍
          <select
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setScope(event.target.value as typeof scope)}
            value={scope}
          >
            <option value="all">全部範圍</option>
            <option value="project">目前專案</option>
            <option value="global">全域資源</option>
          </select>
        </label>
        {loading && <p aria-live="polite" className="text-muted-foreground text-xs">正在同步 OpenCode 資源...</p>}
        {error && <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs" role="alert">動態資源載入失敗：{error}</p>}
      </div>

      <div className="overflow-y-auto p-3">
        {CATEGORY_ORDER.map((category) => {
          const categoryItems = filteredItems.filter((item) => item.category === category)
          if (!categoryItems.length) return null
          return (
            <section className="mb-4" key={category}>
              <h3 className="mb-1.5 px-1 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]">{category}</h3>
              <div className="grid gap-1.5">
                {categoryItems.map((item) => {
                  const Icon = TYPE_ICONS[item.type]
                  return (
                    <button
                      aria-label={`${item.disabled ? "尚未支援" : "新增"} ${item.label}`}
                      className="group flex min-h-14 w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left outline-none transition-colors hover:border-border hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={item.disabled}
                      draggable={!item.disabled}
                      key={item.key}
                      onClick={() => onAdd(item)}
                      onDragStart={(event) => startDrag(event, item)}
                      type="button"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background shadow-xs">
                        <Icon aria-hidden="true" className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <strong className="truncate font-medium text-xs">{item.label}</strong>
                          {!item.resource && item.resourceMode === "managed" && <Badge size="sm" variant="outline">建立</Badge>}
                          {item.disabled && <Badge size="sm" variant="secondary">未來</Badge>}
                          {item.resource?.inherited && <Badge size="sm" variant="info">繼承</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {item.resource?.scope ? `${scopeLabel(item.resource.scope)} · ` : ""}{item.description}
                        </span>
                      </span>
                      <GripVerticalIcon aria-hidden="true" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
        {!filteredItems.length && !loading && !error && (
          <div className="grid place-items-center gap-2 px-4 py-12 text-center">
            <SearchIcon aria-hidden="true" className="size-5 text-muted-foreground" />
            <p className="font-medium text-sm">找不到符合的節點</p>
            <p className="text-muted-foreground text-xs">調整關鍵字或資源範圍後再試一次。</p>
          </div>
        )}
        {loading && !filteredItems.length && <p className="px-4 py-12 text-center text-muted-foreground text-xs">正在載入目前專案的 OpenCode 資源...</p>}
        {error && !filteredItems.length && <p className="px-4 py-12 text-center text-muted-foreground text-xs">目前無法顯示 OpenCode 資源。</p>}
      </div>
    </section>
  )
}
