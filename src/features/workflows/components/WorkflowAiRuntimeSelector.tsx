import { CpuIcon } from "lucide-react"
import { ModelSwitcher } from "@/shared/components/layout/app/ModelSwitcher"
import type { ModelOption } from "@/shared/types/workspace"
import type { ThinkingVariantOption } from "@/shared/types/workspace"

export function WorkflowAiRuntimeSelector({ disabled, modelOptions, selectedModelKey, selectedVariant, thinkingVariants, onModelChange, onVariantChange }: {
  disabled?: boolean
  modelOptions: ModelOption[]
  selectedModelKey: string | null
  selectedVariant: string
  thinkingVariants: ThinkingVariantOption[]
  onModelChange: (modelKey: string) => void
  onVariantChange: (variant: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-2.5">
      <div className="grid min-w-48 gap-1">
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><CpuIcon aria-hidden="true" className="size-3.5" />執行模型</span>
        <ModelSwitcher activeModelKey={selectedModelKey} disabled={disabled} models={modelOptions} onModelChange={onModelChange} variant="composer" />
      </div>
      {thinkingVariants.length > 0 && (
        <label className="grid min-w-32 gap-1 text-[11px] font-medium text-muted-foreground">
          變體
          <select aria-label="AI 變體" className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={disabled} onChange={(event) => onVariantChange(event.target.value)} value={selectedVariant}>
            {thinkingVariants.map((variant) => <option key={variant.key} value={variant.key}>{variant.label}</option>)}
          </select>
        </label>
      )}
      {modelOptions.length === 0 && <span className="text-[11px] text-muted-foreground">未取得可選模型，將使用 workflow-test 預設模型。</span>}
    </div>
  )
}
