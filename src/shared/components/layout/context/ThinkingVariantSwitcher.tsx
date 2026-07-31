import { CheckIcon, ChevronDownIcon, CogIcon } from "lucide-react"
import { useState } from "react"
import type { ThinkingVariantOption } from "@/shared/types/workspace"

type ThinkingVariantSwitcherProps = {
  activeVariantKey: string
  onVariantChange: (variantKey: string) => void
  variants: ThinkingVariantOption[]
}

export function ThinkingVariantSwitcher({ activeVariantKey, onVariantChange, variants }: ThinkingVariantSwitcherProps) {
  const [open, setOpen] = useState(false)
  const activeVariant = variants.find((variant) => variant.key === activeVariantKey) ?? variants[0]

  if (variants.length === 0) return null

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-2 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CogIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{activeVariant?.label ?? "Default"}</span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
      {open && (
        <div
          aria-label="Thinking variants"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-44 overflow-hidden rounded-xl border bg-popover py-1 text-popover-foreground shadow-lg/5"
          role="listbox"
        >
          <div className="px-3 py-1.5 font-semibold text-muted-foreground text-xs">Thinking</div>
          {variants.map((variant) => {
            const selected = variant.key === activeVariant?.key

            return (
              <button
                aria-selected={selected}
                className={`grid min-h-8 w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-2 px-3 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent ${selected ? "font-semibold" : ""}`}
                key={variant.key}
                onClick={() => {
                  onVariantChange(variant.key)
                  setOpen(false)
                }}
                role="option"
                type="button"
              >
                <span className="truncate">{variant.label}</span>
                {selected && <CheckIcon aria-hidden="true" className="size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
