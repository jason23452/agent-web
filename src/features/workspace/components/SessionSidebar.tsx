import {
  ArrowLeftIcon,
  CheckIcon,
  FolderIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PlugZapIcon,
  PlusIcon,
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
import { Input } from "@/shared/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/components/ui/input-group";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/shared/components/ui/menu";
import { Textarea } from "@/shared/components/ui/textarea";
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
  { icon: HatGlasses, label: "智能體/工具" },
];

const recentProjects = [
  { id: "test-web", name: "test-web", path: "/workspace/test-web/" },
  { id: "agent-web", name: "agent-web", path: "C:/Users/Bojii/Desktop/SDD/agent-web/" },
  { id: "build-example", name: "build-example", path: "C:/Users/Bojii/Desktop/SDD/build-example/" },
];

type McpServer = {
  id: string;
  url: string;
  name: string;
  username: string;
  password: string;
  version: string;
  isDefault: boolean;
};

type McpDialogView = "list" | "add" | "edit";

type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  scope: "system" | "custom";
};

type AgentDialogView = "list" | "mode" | "form" | "yaml";
type AgentEditMode = "add" | "edit";
type AgentToolTab = "agents" | "tools";

const initialMcpServers: McpServer[] = [
  {
    id: "lan-mcp",
    url: "http://192.168.1.104:8787",
    name: "Localhost",
    username: "",
    password: "",
    version: "v1.16.2",
    isDefault: true,
  },
];

const emptyMcpForm = {
  url: "http://localhost:4096",
  name: "Localhost",
  username: "opencode",
  password: "",
};

const agentDefinitions: AgentDefinition[] = [
  {
    id: "build",
    name: "build",
    description: "The default agent. Executes tools based on configured permissions.",
    scope: "system",
  },
  {
    id: "explore",
    name: "explore",
    description: "Fast agent specialized for exploring codebases and answering repository questions.",
    scope: "system",
  },
  {
    id: "general",
    name: "general",
    description: "General-purpose agent for researching complex questions and executing multi-step tasks.",
    scope: "system",
  },
  {
    id: "plan",
    name: "plan",
    description: "Plan mode. Disallows all edit tools.",
    scope: "system",
  },
  {
    id: "docs-implement",
    name: "Docs Implement",
    description: "掃描 docs 中需求實作的文件，平行派 subagent 實作，完成後更新狀態。",
    scope: "custom",
  },
  {
    id: "docs-plan",
    name: "Docs Plan",
    description: "像內建 plan 一樣規劃工作，但可在 docs 新增或修改規劃文件並標記。",
    scope: "custom",
  },
];

const toolDefinitions = [
  { id: "read", name: "read", description: "Read files from the current workspace.", category: "Files" },
  { id: "grep", name: "grep", description: "Search file contents using regular expressions.", category: "Search" },
  { id: "glob", name: "glob", description: "Find files by path pattern across the workspace.", category: "Search" },
  { id: "bash", name: "bash", description: "Run approved terminal commands for verification and development tasks.", category: "Runtime" },
  { id: "apply-patch", name: "apply_patch", description: "Apply precise file edits through patch operations.", category: "Edit" },
  { id: "task", name: "task", description: "Launch subagents for larger exploration or implementation work.", category: "Agent" },
];

const emptyAgentForm = {
  name: "",
  description: "",
};

function agentToYaml(agent: Pick<AgentDefinition, "name" | "description">) {
  return `name: ${agent.name || "my-agent"}\ndescription: ${agent.description || "Describe when this agent should be used."}\nmode: subagent\ntools:\n  - read\n  - grep\n  - glob\npermissions:\n  edit: allow\n`;
}

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
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpDialogView, setMcpDialogView] = useState<McpDialogView>("list");
  const [mcpSearch, setMcpSearch] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>(initialMcpServers);
  const [editingMcpId, setEditingMcpId] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState(emptyMcpForm);
  const [agentsDialogOpen, setAgentsDialogOpen] = useState(false);
  const [agentDialogView, setAgentDialogView] = useState<AgentDialogView>("list");
  const [agentEditMode, setAgentEditMode] = useState<AgentEditMode>("add");
  const [agentToolTab, setAgentToolTab] = useState<AgentToolTab>("agents");
  const [agents, setAgents] = useState<AgentDefinition[]>(agentDefinitions);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentYaml, setAgentYaml] = useState(agentToYaml(emptyAgentForm));

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

  const filteredMcpServers = mcpServers.filter((server) => {
    const keyword = mcpSearch.trim().toLowerCase();
    if (!keyword) return true;
    return server.url.toLowerCase().includes(keyword) || server.name.toLowerCase().includes(keyword) || server.username.toLowerCase().includes(keyword);
  });

  function openMcpList() {
    setMcpDialogView("list");
    setMcpDialogOpen(true);
  }

  function openAddMcpServer() {
    setEditingMcpId(null);
    setMcpForm(emptyMcpForm);
    setMcpDialogView("add");
  }

  function openEditMcpServer(server: McpServer) {
    setEditingMcpId(server.id);
    setMcpForm({
      url: server.url,
      name: server.name,
      username: server.username,
      password: server.password,
    });
    setMcpDialogView("edit");
  }

  function submitMcpServer() {
    if (!mcpForm.url.trim()) return;

    if (mcpDialogView === "edit" && editingMcpId) {
      setMcpServers((current) => current.map((server) => server.id === editingMcpId ? { ...server, ...mcpForm } : server));
    } else {
      setMcpServers((current) => [
        ...current,
        {
          id: `mcp-${Date.now()}`,
          ...mcpForm,
          version: "v1.16.2",
          isDefault: current.length === 0,
        },
      ]);
    }

    setMcpDialogView("list");
  }

  function setDefaultMcpServer(serverId: string) {
    setMcpServers((current) => current.map((server) => ({ ...server, isDefault: server.id === serverId })));
  }

  function deleteMcpServer(serverId: string) {
    setMcpServers((current) => {
      const next = current.filter((server) => server.id !== serverId);
      if (next.some((server) => server.isDefault) || next.length === 0) return next;
      return next.map((server, index) => ({ ...server, isDefault: index === 0 }));
    });
  }

  function openAgentsList() {
    setAgentDialogView("list");
    setAgentToolTab("agents");
    setAgentsDialogOpen(true);
  }

  function openAddAgentMode() {
    setAgentEditMode("add");
    setEditingAgentId(null);
    setAgentForm(emptyAgentForm);
    setAgentYaml(agentToYaml(emptyAgentForm));
    setAgentDialogView("mode");
  }

  function openEditAgentMode(agent: AgentDefinition) {
    setAgentEditMode("edit");
    setEditingAgentId(agent.id);
    setAgentForm({ name: agent.name, description: agent.description });
    setAgentYaml(agentToYaml(agent));
    setAgentDialogView("mode");
  }

  function openAgentEditor(view: "form" | "yaml") {
    setAgentDialogView(view);
  }

  function submitAgentConfig() {
    const fallbackName = agentEditMode === "add" ? "custom-agent" : "agent";
    const yamlName = agentYaml.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const yamlDescription = agentYaml.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    const nextAgent = {
      id: editingAgentId ?? `agent-${Date.now()}`,
      name: agentDialogView === "yaml" ? yamlName || fallbackName : agentForm.name.trim() || fallbackName,
      description: agentDialogView === "yaml" ? yamlDescription || "透過 YAML 新增的 opencode agent。" : agentForm.description.trim() || "透過介面新增的 opencode agent。",
      scope: "custom" as const,
    };

    setAgents((current) => {
      if (agentEditMode === "edit" && editingAgentId) {
        return current.map((agent) => agent.id === editingAgentId ? nextAgent : agent);
      }

      return [...current, nextAgent];
    });
    setAgentDialogView("list");
  }

  function deleteAgent(agentId: string) {
    setAgents((current) => current.filter((agent) => agent.id !== agentId));
  }

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
                    if (item.label === "MCP Server") openMcpList();
                    if (item.label === "智能體/工具") openAgentsList();
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

      {mcpDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label={mcpDialogView === "list" ? "服務器" : mcpDialogView === "add" ? "添加服務器" : "編輯服務器"}
            className="w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
          >
            <div className="flex h-14 items-center justify-between gap-4 px-5">
              <div className="flex min-w-0 items-center gap-2">
                {mcpDialogView !== "list" && (
                  <button
                    aria-label="返回服務器列表"
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setMcpDialogView("list")}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                  </button>
                )}
                <h2 className="truncate font-semibold text-base">
                  {mcpDialogView === "list" ? "服務器" : mcpDialogView === "add" ? "添加服務器" : "編輯服務器"}
                </h2>
              </div>
              <button
                aria-label="關閉服務器"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setMcpDialogOpen(false)}
                type="button"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </button>
            </div>

            {mcpDialogView === "list" ? (
              <div className="grid gap-4 px-6 pb-6">
                <InputGroup data-size="sm">
                  <InputGroupAddon>
                    <SearchIcon aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="搜索服務器"
                    onChange={(event) => setMcpSearch(event.target.value)}
                    placeholder="搜索服務器"
                    value={mcpSearch}
                  />
                  {mcpSearch && (
                    <InputGroupAddon align="inline-end">
                      <button
                        aria-label="清除服務器搜尋"
                        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setMcpSearch("")}
                        type="button"
                      >
                        <XIcon aria-hidden="true" className="size-3.5" />
                      </button>
                    </InputGroupAddon>
                  )}
                </InputGroup>

                <ul className="grid min-h-24 gap-2">
                  {filteredMcpServers.map((server) => (
                    <li key={server.id}>
                      <div className="flex items-center gap-3 rounded-lg bg-muted/55 px-4 py-3">
                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-green-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-semibold text-sm">{server.url.replace(/^https?:\/\//, "")}</span>
                            <span className="shrink-0 text-muted-foreground text-xs">{server.version}</span>
                          </div>
                          <p className="mt-0.5 truncate text-muted-foreground text-sm">{server.username || "無用戶名"}</p>
                        </div>
                        {server.isDefault && <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
                        <Menu>
                          <MenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                          </MenuTrigger>
                          <MenuPopup align="end" className="min-w-32">
                            <MenuItem onClick={() => openEditMcpServer(server)}>編輯</MenuItem>
                            <MenuItem onClick={() => setDefaultMcpServer(server.id)}>設為默認</MenuItem>
                            <MenuSeparator />
                            <MenuItem onClick={() => deleteMcpServer(server.id)} variant="destructive">刪除</MenuItem>
                          </MenuPopup>
                        </Menu>
                      </div>
                    </li>
                  ))}
                  {filteredMcpServers.length === 0 && (
                    <li>
                      <Empty className="rounded-lg border border-dashed bg-background px-3 py-8 md:py-8">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ServerIcon aria-hidden="true" />
                          </EmptyMedia>
                          <EmptyTitle className="text-sm">沒有符合的服務器</EmptyTitle>
                          <EmptyDescription className="text-xs">請換個關鍵字或新增服務器。</EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </li>
                  )}
                </ul>

                <div>
                  <Button onClick={openAddMcpServer} size="sm" variant="outline">
                    <PlusIcon aria-hidden="true" />
                    添加服務器
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 px-6 pb-6">
                <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
                  <label className="grid gap-2 text-muted-foreground text-sm">
                    服務器 URL
                    <Input
                      aria-label="服務器 URL"
                      onChange={(event) => setMcpForm((current) => ({ ...current, url: event.target.value }))}
                      placeholder="http://localhost:4096"
                      value={mcpForm.url}
                    />
                  </label>
                  <label className="grid gap-2 text-muted-foreground text-sm">
                    服務器名稱（可選）
                    <Input
                      aria-label="服務器名稱"
                      onChange={(event) => setMcpForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Localhost"
                      value={mcpForm.name}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-muted-foreground text-sm">
                      用戶名（可選）
                      <Input
                        aria-label="用戶名"
                        onChange={(event) => setMcpForm((current) => ({ ...current, username: event.target.value }))}
                        placeholder="用戶名"
                        value={mcpForm.username}
                      />
                    </label>
                    <label className="grid gap-2 text-muted-foreground text-sm">
                      密碼（可選）
                      <Input
                        aria-label="密碼"
                        onChange={(event) => setMcpForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="密碼"
                        type="password"
                        value={mcpForm.password}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Button disabled={!mcpForm.url.trim()} onClick={submitMcpServer}>
                    {mcpDialogView === "add" ? "添加服務器" : "保存"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {agentsDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label="Agents"
            className="w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
          >
            <div className="flex h-14 items-center justify-between gap-4 px-5">
              <div className="flex min-w-0 items-center gap-2">
                {agentDialogView !== "list" && (
                  <button
                    aria-label="返回智能體/工具列表"
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setAgentDialogView(agentDialogView === "mode" ? "list" : "mode")}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-base">
                    {agentDialogView === "list" ? "智能體/工具" : agentDialogView === "mode" ? (agentEditMode === "add" ? "新增 Agent" : "編輯 Agent") : agentDialogView === "form" ? "介面設定 Agent" : "YAML 設定 Agent"}
                  </h2>
                  <p className="mt-0.5 text-muted-foreground text-xs">{agentDialogView === "list" ? `Total ${agentToolTab === "agents" ? agents.length : toolDefinitions.length}` : "opencode agent YAML 設定"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label="新增 Agent"
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={openAddAgentMode}
                  type="button"
                >
                  <PlusIcon aria-hidden="true" className="size-4" />
                </button>
                <button
                  aria-label="關閉 Agents"
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setAgentsDialogOpen(false)}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            {agentDialogView === "list" && (
              <div className="grid max-h-[min(70dvh,560px)] gap-5 overflow-y-auto px-6 pb-6">
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
                  <button
                    className={`h-8 rounded-md font-medium text-sm transition ${agentToolTab === "agents" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setAgentToolTab("agents")}
                    type="button"
                  >
                    智能體
                  </button>
                  <button
                    className={`h-8 rounded-md font-medium text-sm transition ${agentToolTab === "tools" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setAgentToolTab("tools")}
                    type="button"
                  >
                    工具
                  </button>
                </div>

                {agentToolTab === "agents" && (
                  <>
                <section aria-labelledby="built-in-agents-title">
                  <h3 className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide" id="built-in-agents-title">Built-in Agents</h3>
                  <ul className="grid gap-1">
                    {agents.filter((agent) => agent.scope === "system").map((agent) => (
                      <li key={agent.id}>
                        <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-semibold text-sm">{agent.name}</span>
                              <Badge size="sm" variant="info">system</Badge>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{agent.description}</p>
                          </div>
                          <Menu>
                            <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                            </MenuTrigger>
                            <MenuPopup align="end" className="min-w-36">
                              <MenuItem>查看設定</MenuItem>
                              <MenuItem>複製名稱</MenuItem>
                            </MenuPopup>
                          </Menu>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="custom-agents-title">
                  <h3 className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide" id="custom-agents-title">Custom Agents</h3>
                  <ul className="grid gap-1">
                    {agents.filter((agent) => agent.scope === "custom").map((agent) => (
                      <li key={agent.id}>
                        <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-semibold text-sm">{agent.name}</span>
                              <Badge size="sm" variant="success">custom</Badge>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{agent.description}</p>
                          </div>
                          <Menu>
                            <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                            </MenuTrigger>
                            <MenuPopup align="end" className="min-w-36">
                              <MenuItem onClick={() => openEditAgentMode(agent)}>編輯</MenuItem>
                              <MenuItem>複製</MenuItem>
                              <MenuSeparator />
                              <MenuItem onClick={() => deleteAgent(agent.id)} variant="destructive">刪除</MenuItem>
                            </MenuPopup>
                          </Menu>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                  </>
                )}

                {agentToolTab === "tools" && (
                  <section aria-labelledby="available-tools-title">
                    <h3 className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide" id="available-tools-title">Available Tools</h3>
                    <ul className="grid gap-1">
                      {toolDefinitions.map((tool) => (
                        <li key={tool.id}>
                          <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-semibold text-sm">{tool.name}</span>
                                <Badge size="sm" variant="outline">{tool.category}</Badge>
                              </div>
                              <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{tool.description}</p>
                            </div>
                            <Menu>
                              <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                              </MenuTrigger>
                              <MenuPopup align="end" className="min-w-36">
                                <MenuItem>查看工具說明</MenuItem>
                                <MenuItem>複製工具名稱</MenuItem>
                              </MenuPopup>
                            </Menu>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {agentDialogView === "mode" && (
              <div className="grid gap-3 px-6 pb-6">
                <button className="grid gap-1 rounded-lg border bg-muted/45 p-4 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openAgentEditor("form")} type="button">
                  <span className="font-semibold text-sm">用介面{agentEditMode === "add" ? "新增" : "編輯"}</span>
                  <span className="text-muted-foreground text-xs">填寫名稱、描述與常用設定，系統會產生 opencode agent YAML。</span>
                </button>
                <button className="grid gap-1 rounded-lg border bg-muted/45 p-4 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openAgentEditor("yaml")} type="button">
                  <span className="font-semibold text-sm">用 YAML 文件{agentEditMode === "add" ? "新增" : "編輯"}</span>
                  <span className="text-muted-foreground text-xs">直接貼上或修改 opencode agent 的 YAML 設定檔內容。</span>
                </button>
              </div>
            )}

            {agentDialogView === "form" && (
              <div className="grid gap-4 px-6 pb-6">
                <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
                  <label className="grid gap-2 text-muted-foreground text-sm">
                    Agent 名稱
                    <Input aria-label="Agent 名稱" onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} placeholder="docs-implement" value={agentForm.name} />
                  </label>
                  <label className="grid gap-2 text-muted-foreground text-sm">
                    使用時機 / 描述
                    <Textarea aria-label="Agent 描述" onChange={(event) => setAgentForm((current) => ({ ...current, description: event.target.value }))} placeholder="描述這個 agent 何時應該被使用，以及它要負責的任務。" rows={4} value={agentForm.description} />
                  </label>
                </div>
                <div>
                  <Button disabled={!agentForm.name.trim()} onClick={submitAgentConfig}>{agentEditMode === "add" ? "新增 Agent" : "保存"}</Button>
                </div>
              </div>
            )}

            {agentDialogView === "yaml" && (
              <div className="grid gap-4 px-6 pb-6">
                <label className="grid gap-2 text-muted-foreground text-sm">
                  opencode agent YAML
                  <Textarea aria-label="opencode agent YAML" className="font-mono" onChange={(event) => setAgentYaml(event.target.value)} rows={12} spellCheck={false} value={agentYaml} />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground text-xs">會從 YAML 的 <code>name</code> 與 <code>description</code> 更新清單顯示。</p>
                  <Button disabled={!agentYaml.trim()} onClick={submitAgentConfig}>{agentEditMode === "add" ? "新增 Agent" : "保存 YAML"}</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
