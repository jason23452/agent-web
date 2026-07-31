import type { ReactNode } from "react"
import { cn } from "@/shared/utils/cn"

type TopNavProps = {
  center?: ReactNode
  className?: string
  end?: ReactNode
  start?: ReactNode
}

export function TopNav({ center, className, end, start }: TopNavProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-border/70 border-b bg-background/90 px-3 backdrop-blur-xl sm:px-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">{start}</div>
      {center}
      <div className="flex items-center justify-end gap-2">{end}</div>
    </header>
  )
}
