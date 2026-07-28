import {
  HistoryIcon,
  PanelLeftCloseIcon,
  PlugZapIcon,
  SearchIcon,
  ServerIcon,
  SparklesIcon,
  HatGlasses,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { sessions } from "@/features/workspace/data/mockWorkspace";

type SessionSidebarProps = {
  open: boolean;
  onClose: () => void;
  onSelectSession: () => void;
};

const navItems = [
  { icon: SparklesIcon, label: "新對話", active: true },
  { icon: HistoryIcon, label: "專案" },
  { icon: ServerIcon, label: "MCP Server" },
  { icon: PlugZapIcon, label: "外掛/技能" },
  { icon: HatGlasses, label: "智能體" },
];

export function SessionSidebar({
  open,
  onClose,
  onSelectSession,
}: SessionSidebarProps) {
  return (
    <aside
      className={`z-40 flex min-h-dvh flex-col gap-4 border-border border-r bg-muted/35 px-2.5 py-4 transition-transform max-[760px]:fixed max-[760px]:inset-y-0 max-[760px]:left-0 max-[760px]:w-[min(300px,88vw)] max-[760px]:shadow-[20px_0_50px_rgb(15_23_42_/_12%)] min-[761px]:static min-[761px]:translate-x-0 ${open ? "max-[760px]:translate-x-0" : "max-[760px]:-translate-x-full"}`}
      data-region="session-sidebar"
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="font-semibold text-lg tracking-[-0.02em]">AICaht</div>
        <Button
          aria-label="收合側欄"
          className="max-[760px]:inline-flex min-[761px]:hidden"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <PanelLeftCloseIcon aria-hidden="true" />
        </Button>
      </div>

      <nav aria-label="主要功能">
        <ul className="grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.active ? "bg-accent text-accent-foreground" : "text-foreground"}`}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        className="min-h-0 flex-1"
        aria-labelledby="recent-sessions-title"
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <h2 className="font-semibold text-xs" id="recent-sessions-title">
            最近
          </h2>
          <Button aria-label="搜尋對話" size="icon-xs" variant="ghost">
            <SearchIcon aria-hidden="true" />
          </Button>
        </div>
        <ul className="grid max-h-[calc(100dvh-250px)] gap-1 overflow-y-auto pr-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                className="grid w-full gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring first:bg-accent"
                onClick={onSelectSession}
                type="button"
              >
                <span className="truncate text-sm">{session.title}</span>
                <span className="font-mono text-muted-foreground text-xs">
                  {session.meta}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex items-center gap-3 border-border/70 border-t px-2 pt-3">
        <div className="grid size-8 place-items-center rounded-full bg-accent font-bold text-xs">
          吳
        </div>
        <div className="grid min-w-0 gap-0">
          <strong className="truncate font-semibold text-sm">仲書 吳</strong>
          <span className="truncate text-muted-foreground text-xs">
            Pro · Agent API 待接
          </span>
        </div>
      </div>
    </aside>
  );
}
