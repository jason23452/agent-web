import {
  HatGlasses,
  HistoryIcon,
  PanelLeftCloseIcon,
  PlugZapIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { Sidebar } from "@/shared/components/layout/app/Sidebar";
import type { AppSidebarSession } from "./types";

const navItems = [
  { icon: SparklesIcon, key: "new", label: "新對話" },
  { icon: HistoryIcon, key: "projects", label: "專案" },
  { icon: ServerIcon, key: "mcp", label: "MCP Server" },
  { icon: PlugZapIcon, key: "plugins", label: "外掛/技能" },
  { icon: HatGlasses, key: "agents", label: "智能體/工具" },
];

type AppSidebarPanelProps = {
  activeSessionId?: string | null;
  filteredSessions: AppSidebarSession[];
  historySearch: string;
  historySearchOpen: boolean;
  onAgentsOpen: () => void;
  onClose: () => void;
  onCreateSession: () => void;
  onHistorySearchChange: (value: string) => void;
  onHistorySearchToggle: () => void;
  onMcpOpen: () => void;
  onPluginSkillOpen: () => void;
  onProjectOpen: () => void;
  onSelectSession: (sessionId: string) => void;
  onUserSettingsOpen: () => void;
  open: boolean;
  sessionsError?: string | null;
  sessionsLoading?: boolean;
};

export function AppSidebarPanel({
  activeSessionId,
  filteredSessions,
  historySearch,
  historySearchOpen,
  onAgentsOpen,
  onClose,
  onCreateSession,
  onHistorySearchChange,
  onHistorySearchToggle,
  onMcpOpen,
  onPluginSkillOpen,
  onProjectOpen,
  onSelectSession,
  onUserSettingsOpen,
  open,
  sessionsError,
  sessionsLoading = false,
}: AppSidebarPanelProps) {
  return (
    <Sidebar
      className={`z-40 grid min-h-dvh min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 border-border border-r bg-background px-2.5 py-4 transition-transform max-[760px]:fixed max-[760px]:inset-y-0 max-[760px]:left-0 max-[760px]:w-[min(300px,88vw)] max-[760px]:shadow-[20px_0_50px_rgb(15_23_42_/_12%)] min-[761px]:static min-[761px]:translate-x-0 ${open ? "max-[760px]:translate-x-0" : "max-[760px]:-translate-x-full"}`}
      data-region="session-sidebar"
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="font-semibold text-lg tracking-[-0.02em]">AICaht</div>
        <Button
          aria-label="收合側欄"
          className="bg-background max-[760px]:inline-flex min-[761px]:hidden"
          onClick={onClose}
          size="icon"
          variant="outline"
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
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.key === "new" ? "bg-accent text-accent-foreground" : "text-foreground"}`}
                  disabled={item.key === "new" && sessionsLoading}
                  onClick={() => {
                    if (item.key === "new") onCreateSession();
                    if (item.key === "projects") onProjectOpen();
                    if (item.key === "mcp") onMcpOpen();
                    if (item.key === "plugins") onPluginSkillOpen();
                    if (item.key === "agents") onAgentsOpen();
                  }}
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
        className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]"
        aria-labelledby="recent-sessions-title"
      >
        <div className="mb-2 grid gap-2 px-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-xs" id="recent-sessions-title">
              最近
            </h2>
            <div className="flex items-center gap-1.5">
              {sessionsLoading && (
                <span className="text-muted-foreground text-[11px]">同步中</span>
              )}
              <Button
                aria-expanded={historySearchOpen}
                aria-label="搜尋對話"
                onClick={onHistorySearchToggle}
                size="icon-xs"
                variant={historySearchOpen ? "secondary" : "ghost"}
              >
                <SearchIcon aria-hidden="true" />
              </Button>
            </div>
          </div>

          {sessionsError && (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/8 px-2 py-1.5 text-destructive-foreground text-[11px]"
              role="alert"
            >
              {sessionsError}
            </div>
          )}

          {historySearchOpen && (
            <label className="block">
              <span className="sr-only">搜尋最近對話</span>
              <InputGroup data-size="sm">
                <InputGroupAddon>
                  <SearchIcon aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  autoFocus
                  aria-label="搜尋最近對話"
                  onChange={(event) =>
                    onHistorySearchChange(event.target.value)
                  }
                  placeholder="搜尋標題或標籤"
                  value={historySearch}
                />
                {historySearch && (
                  <InputGroupAddon align="inline-end">
                    <button
                      aria-label="清除搜尋"
                      className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onHistorySearchChange("")}
                      type="button"
                    >
                      <XIcon aria-hidden="true" className="size-3.5" />
                    </button>
                  </InputGroupAddon>
                )}
              </InputGroup>
              {historySearch && (
                <div className="mt-1.5 flex items-center justify-between gap-2 text-muted-foreground text-[11px]">
                  <span className="truncate">搜尋「{historySearch}」</span>
                  <Badge
                    size="sm"
                    variant={filteredSessions.length > 0 ? "info" : "warning"}
                  >
                    {filteredSessions.length} 筆
                  </Badge>
                </div>
              )}
            </label>
          )}
        </div>
        <ul className="grid min-h-0 auto-rows-max content-start gap-1 overflow-y-auto pr-1 pb-2">
          {filteredSessions.map((session) => (
            <li key={session.id}>
              <button
                className={`grid w-full gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeSessionId === session.id ? "bg-accent" : ""}`}
                onClick={() => onSelectSession(session.id)}
                type="button"
              >
                <span className="truncate text-sm">{session.title}</span>
                <span className="font-mono text-muted-foreground text-xs">
                  {session.meta}
                </span>
              </button>
            </li>
          ))}
          {sessionsLoading && filteredSessions.length === 0 && (
            <li className="px-3 py-6 text-center text-muted-foreground text-xs">
              正在讀取專案對話...
            </li>
          )}
          {!sessionsLoading && filteredSessions.length === 0 && (
            <li>
              <Empty className="rounded-lg border border-dashed bg-background px-3 py-7 md:py-7">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">沒有符合的紀錄</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    {historySearch
                      ? "換個關鍵字搜尋標題或標籤。"
                      : "送出第一則訊息並建立真實 session 後，才會出現在最近。"}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </li>
          )}
        </ul>
      </section>

      <div className="shrink-0 border-border/70 border-t px-2 pt-3">
        <button
          aria-label="開啟使用者設定"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onUserSettingsOpen}
          type="button"
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-bold text-xs">
            吳
          </div>
          <div className="grid min-w-0 flex-1 gap-0">
            <strong className="truncate font-semibold text-sm">仲書 吳</strong>
            <span className="truncate text-muted-foreground text-xs">
              Pro · Agent API 待接
            </span>
          </div>
          <SettingsIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </div>
    </Sidebar>
  );
}
