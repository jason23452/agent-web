import {
  FolderIcon,
  HistoryIcon,
  PanelLeftCloseIcon,
  PlugZapIcon,
  SearchIcon,
  ServerIcon,
  SparklesIcon,
  HatGlasses,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/components/ui/input-group";
import { sessions } from "@/features/workspace/data/mockWorkspace";

type SessionSidebarProps = {
  activeProjectPath: string;
  onProjectChange: (path: string) => void;
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

const recentProjects = [
  { id: "test-web", name: "test-web", path: "/workspace/test-web/" },
  { id: "agent-web", name: "agent-web", path: "C:/Users/Bojii/Desktop/SDD/agent-web/" },
  { id: "build-example", name: "build-example", path: "C:/Users/Bojii/Desktop/SDD/build-example/" },
];

export function SessionSidebar({
  activeProjectPath,
  onProjectChange,
  open,
  onClose,
  onSelectSession,
}: SessionSidebarProps) {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const filteredProjects = recentProjects.filter((project) => {
    const keyword = projectSearch.trim().toLowerCase();
    if (!keyword) return true;
    return project.name.toLowerCase().includes(keyword) || project.path.toLowerCase().includes(keyword);
  });

  const filteredSessions = sessions.filter((session) => {
    const keyword = historySearch.trim().toLowerCase();
    if (!keyword) return true;
    return session.title.toLowerCase().includes(keyword) || session.meta.toLowerCase().includes(keyword);
  });

  return (
    <>
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
                  onClick={() => {
                    if (item.label === "專案") setProjectDialogOpen(true);
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
        className="min-h-0 flex-1"
        aria-labelledby="recent-sessions-title"
      >
        <div className="mb-2 grid gap-2 px-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-xs" id="recent-sessions-title">
              最近
            </h2>
            <Button
              aria-expanded={historySearchOpen}
              aria-label="搜尋對話"
              onClick={() => setHistorySearchOpen((current) => !current)}
              size="icon-xs"
              variant={historySearchOpen ? "secondary" : "ghost"}
            >
              <SearchIcon aria-hidden="true" />
            </Button>
          </div>

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
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="搜尋標題或標籤"
                  value={historySearch}
                />
                {historySearch && (
                  <InputGroupAddon align="inline-end">
                    <button
                      aria-label="清除搜尋"
                      className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setHistorySearch("")}
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
                  <Badge size="sm" variant={filteredSessions.length > 0 ? "info" : "warning"}>{filteredSessions.length} 筆</Badge>
                </div>
              )}
            </label>
          )}
        </div>
        <ul className="grid max-h-[calc(100dvh-250px)] gap-1 overflow-y-auto pr-1">
          {filteredSessions.map((session) => (
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
          {filteredSessions.length === 0 && (
            <li>
              <Empty className="rounded-lg border border-dashed bg-background px-3 py-7 md:py-7">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">沒有符合的紀錄</EmptyTitle>
                  <EmptyDescription className="text-xs">換個關鍵字搜尋標題或標籤。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </li>
          )}
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

      {projectDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label="打開項目"
            className="w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
          >
            <div className="flex h-14 items-center justify-between gap-4 border-border/70 border-b px-4">
              <h2 className="font-semibold text-base">打開項目</h2>
              <button
                aria-label="關閉打開項目"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setProjectDialogOpen(false)}
                type="button"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="p-3">
              <label className="relative block">
                <span className="sr-only">搜尋文件夾</span>
                <SearchIcon aria-hidden="true" className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <input
                  className="h-9 w-full rounded-md border-0 bg-muted/60 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted focus:ring-2 focus:ring-ring"
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="搜索文件夹"
                  value={projectSearch}
                />
              </label>

              <div className="mt-6 px-1">
                <p className="mb-3 font-semibold text-muted-foreground text-xs">最近項目</p>
                <ul className="grid min-h-28 gap-1">
                  {filteredProjects.map((project) => (
                    <li key={project.id}>
                      <button
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${project.path === activeProjectPath ? "bg-accent" : ""}`}
                        onClick={() => {
                          onProjectChange(project.path);
                          setProjectDialogOpen(false);
                          onClose();
                        }}
                        type="button"
                      >
                        <FolderIcon aria-hidden="true" className="size-4 shrink-0 text-foreground" />
                        <span className="min-w-0 truncate text-muted-foreground text-sm">
                          {project.path}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredProjects.length === 0 && (
                    <li className="px-2 py-8 text-center text-muted-foreground text-sm">找不到符合的項目</li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
