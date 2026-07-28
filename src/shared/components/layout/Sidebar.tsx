import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/shared/utils/cn"

type SidebarProps = ComponentPropsWithoutRef<"aside">

export function Sidebar({ className, ...props }: SidebarProps) {
  return <aside className={cn(className)} {...props} />
}
