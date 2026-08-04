import {
  ArchiveIcon,
  CornerDownRightIcon,
  HatGlasses,
  GitBranchIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PlugZapIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
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
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/shared/components/ui/menu";
import { Sidebar } from "@/shared/components/layout/app/Sidebar";
import type { AppSidebarSession } from "@/shared/types/app-sidebar";

const navItems = [
  { icon: SparklesIcon, key: "new", label: "新對話" },
  { icon: HistoryIcon, key: "projects", label: "專案" },
  { icon: ServerIcon, key: "mcp", label: "MCP Server" },
  { icon: PlugZapIcon, key: "plugins", label: "外掛/技能" },
  { icon: HatGlasses, key: "agents", label: "智能體/工具/Commands" },
  { icon: GitBranchIcon, key: "workflows", label: "Workflow" },
];

type AppSidebarPanelProps = {
  activeSessionId?: string | null;
  filteredSessions: AppSidebarSession[];
  historySearch: string;
  historySearchOpen: boolean;
  onAgentsOpen: () => void;
  onArchiveSession: (sessionId: string) => Promise<void>;
  onClose: () => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onHistorySearchChange: (value: string) => void;
  onHistorySearchToggle: () => void;
  onMcpOpen: () => void;
  onPluginSkillOpen: () => void;
  onProjectOpen: () => void;
  onSelectSession: (sessionId: string) => void;
  onUserSettingsOpen: () => void;
  onWorkflowOpen: () => void;
  open: boolean;
  sessionsError?: string | null;
  sessionsLoading?: boolean;
  workspaceActive: boolean;
};

export function AppSidebarPanel({
  activeSessionId,
  filteredSessions,
  historySearch,
  historySearchOpen,
  onAgentsOpen,
  onArchiveSession,
  onClose,
  onCreateSession,
  onDeleteSession,
  onHistorySearchChange,
  onHistorySearchToggle,
  onMcpOpen,
  onPluginSkillOpen,
  onProjectOpen,
  onSelectSession,
  onUserSettingsOpen,
  onWorkflowOpen,
  open,
  sessionsError,
  sessionsLoading = false,
  workspaceActive,
}: AppSidebarPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<AppSidebarSession | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [sessionActionID, setSessionActionID] = useState<string | null>(null);
  const displayedSessionsError = sessionActionError ?? sessionsError;

  async function archiveSession(session: AppSidebarSession) {
    setSessionActionError(null);
    setSessionActionID(session.id);
    try {
      await onArchiveSession(session.id);
    } catch (error) {
      setSessionActionError(error instanceof Error ? error.message : "歸檔對話失敗。");
    } finally {
      setSessionActionID(null);
    }
  }

  async function deleteSession() {
    if (!deleteTarget) return;
    setSessionActionError(null);
    setSessionActionID(deleteTarget.id);
    try {
      await onDeleteSession(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setSessionActionError(error instanceof Error ? error.message : "刪除對話失敗。");
    } finally {
      setSessionActionID(null);
    }
  }

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
                  disabled={(item.key === "new" && sessionsLoading) || (item.key === "workflows" && !workspaceActive)}
                  onClick={() => {
                    if (item.key === "new") onCreateSession();
                    if (item.key === "projects") onProjectOpen();
                    if (item.key === "mcp") onMcpOpen();
                    if (item.key === "plugins") onPluginSkillOpen();
                    if (item.key === "agents") onAgentsOpen();
                    if (item.key === "workflows") onWorkflowOpen();
                  }}
                  title={item.key === "workflows" && !workspaceActive ? "請先開啟一個 workspace" : undefined}
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

          {displayedSessionsError && (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/8 px-2 py-1.5 text-destructive-foreground text-[11px]"
              role="alert"
            >
              {displayedSessionsError}
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
          {filteredSessions.map((session) => {
            const depth = Math.min(session.depth ?? 0, 3);
            const childSession = depth > 0;
            const active = activeSessionId === session.id;

            return (
              <li
                className="min-w-0"
                key={session.id}
                style={depth > 0 ? { paddingInlineStart: `${depth * 12}px` } : undefined}
              >
                <div className={`group/session flex min-w-0 items-center rounded-lg transition-colors hover:bg-accent focus-within:bg-accent ${active ? "bg-accent" : ""}`}>
                  <button
                    aria-current={active ? "page" : undefined}
                    className={`grid min-w-0 flex-1 gap-0.5 rounded-lg py-2 pl-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${session.parentID ? "pr-3" : "pr-1"}`}
                    onClick={() => onSelectSession(session.id)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-sm">
                      {childSession && <CornerDownRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="truncate">{session.title}</span>
                    </span>
                    <span className="truncate font-mono text-muted-foreground text-xs">
                      {session.meta}
                    </span>
                  </button>
                  {!session.parentID && (
                    <Menu>
                      <MenuTrigger
                        aria-label={`${session.title} 操作`}
                        className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={sessionActionID === session.id}
                      >
                        <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                      </MenuTrigger>
                      <MenuPopup align="end" className="min-w-36">
                        <MenuItem onClick={() => void archiveSession(session)}>
                          <ArchiveIcon aria-hidden="true" />
                          歸檔
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          onClick={() => {
                            setSessionActionError(null);
                            setDeleteTarget(session);
                          }}
                          variant="destructive"
                        >
                          <Trash2Icon aria-hidden="true" />
                          刪除
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  )}
                </div>
              </li>
            );
          })}
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

      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !sessionActionID) setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>永久刪除對話？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」的訊息與歷史紀錄將永久刪除且無法復原{deleteTarget && !deleteTarget.parentID ? "，其子 agent 對話也會一併刪除" : ""}。
            </AlertDialogDescription>
            {sessionActionError && <p className="text-destructive text-sm" role="alert">{sessionActionError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button disabled={Boolean(sessionActionID)} variant="outline" />}>取消</AlertDialogClose>
            <Button loading={sessionActionID === deleteTarget?.id} onClick={() => void deleteSession()} variant="destructive">
              確認刪除
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Sidebar>
  );
}
