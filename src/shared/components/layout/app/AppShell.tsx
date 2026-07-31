import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/shared/utils/cn"

type AppShellProps = {
  ariaLabel?: string
  aside?: ReactNode
  asideOpen?: boolean
  children: ReactNode
  className?: string
  composer?: ReactNode
  loading?: boolean
  loadingLabel?: string
  mainClassName?: string
  onCloseAside?: () => void
  onCloseSidebar?: () => void
  sidebar?: ReactNode
  sidebarOpen?: boolean
  topNav?: ReactNode
}

export function AppShell({
  ariaLabel = "Application",
  aside,
  asideOpen = false,
  children,
  className,
  composer,
  loading = false,
  loadingLabel = "Loading...",
  mainClassName,
  onCloseAside,
  onCloseSidebar,
  sidebar,
  sidebarOpen = false,
  topNav,
}: AppShellProps) {
  const hasAside = Boolean(aside)
  const hasComposer = Boolean(composer)
  const hasSidebar = Boolean(sidebar)

  const mainRows =
    topNav && hasComposer
      ? "grid-rows-[auto_minmax(0,1fr)_auto]"
      : topNav
        ? "grid-rows-[auto_minmax(0,1fr)]"
        : hasComposer
          ? "grid-rows-[minmax(0,1fr)_auto]"
          : "grid-rows-[minmax(0,1fr)]"

  return (
    <section
      aria-label={ariaLabel}
      aria-busy={loading}
      className={cn(
        "min-h-dvh bg-muted/40 text-foreground",
        hasSidebar && !hasAside && "min-[761px]:grid min-[761px]:grid-cols-[240px_minmax(0,1fr)]",
        hasSidebar && hasAside && "min-[761px]:grid min-[761px]:grid-cols-[240px_minmax(0,1fr)] min-[1181px]:grid-cols-[260px_minmax(0,1fr)_332px]",
        !hasSidebar && hasAside && "min-[1181px]:grid min-[1181px]:grid-cols-[minmax(0,1fr)_332px]",
        !hasSidebar && !hasAside && "grid",
        className,
      )}
    >
      {sidebar}
      <div
        className={cn(
          "grid min-h-dvh min-w-0 bg-background",
          mainRows,
          mainClassName,
        )}
        data-region="app-main"
      >
        {topNav}
        {children}
        {composer}
      </div>
      {aside}

      {sidebarOpen && onCloseSidebar && (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-background min-[761px]:hidden"
          onClick={onCloseSidebar}
          type="button"
        />
      )}
      {asideOpen && onCloseAside && (
        <button
          aria-label="Close side panel overlay"
          className="fixed inset-0 z-30 bg-background min-[1181px]:hidden"
          onClick={onCloseAside}
          type="button"
        />
      )}
      {loading && <AppLayoutLoadingOverlay label={loadingLabel} />}
    </section>
  )
}

function AppLayoutLoadingOverlay({ label }: { label: string }) {
  return createPortal(
    <div
      aria-live="polite"
      className="fixed inset-0 grid place-items-center bg-background/72 backdrop-blur-sm"
      role="status"
      style={{ zIndex: 2147483647 }}
    >
      <div className="grid min-w-60 gap-3 rounded-2xl border bg-background px-5 py-4 text-center shadow-lg/10">
        <span
          aria-hidden="true"
          className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
        <span className="font-medium text-sm">{label}</span>
        <span className="text-muted-foreground text-xs">請稍候，完成前不要關閉頁面。</span>
      </div>
    </div>,
    document.body,
  )
}
