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
  mode: "primary" | "subagent" | "all";
  model: string;
  tools: string[];
  toolGuidance?: Record<string, string>;
  skillGuidance?: Record<string, string>;
  skills: string[];
  permission: Record<string, "allow" | "ask" | "deny">;
  systemPrompt: string;
  temperature?: string;
  steps?: string;
  hidden?: boolean;
};

type AgentDialogView = "list" | "detail" | "config";
type AgentEditMode = "add" | "edit";
type AgentToolTab = "agents" | "tools";
type AgentConfigMode = "interface" | "yaml";

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
    mode: "primary",
    model: "openai/gpt-5.5",
    tools: ["read", "grep", "glob", "bash", "apply_patch"],
    skills: ["react-vite-feature-based", "coss"],
    permission: { read: "allow", grep: "allow", glob: "allow", bash: "allow", edit: "allow", task: "allow" },
    systemPrompt: "You are the default build agent. Implement requested changes directly and verify your work.",
  },
  {
    id: "explore",
    name: "explore",
    description: "Fast agent specialized for exploring codebases and answering repository questions.",
    scope: "system",
    mode: "subagent",
    model: "openai/gpt-5.5-mini",
    tools: ["read", "grep", "glob", "task"],
    skills: ["react-vite-feature-based"],
    permission: { read: "allow", grep: "allow", glob: "allow", edit: "deny", bash: "ask", task: "allow" },
    systemPrompt: "Explore the codebase quickly and return concise findings. Do not edit files.",
  },
  {
    id: "general",
    name: "general",
    description: "General-purpose agent for researching complex questions and executing multi-step tasks.",
    scope: "system",
    mode: "subagent",
    model: "openai/gpt-5.5",
    tools: ["read", "grep", "glob", "bash", "task"],
    skills: ["playwright-e2e-testing", "accessibility-compliance"],
    permission: { read: "allow", grep: "allow", glob: "allow", bash: "ask", edit: "ask", task: "allow" },
    systemPrompt: "Research complex questions and execute multi-step work with clear verification.",
  },
  {
    id: "plan",
    name: "plan",
    description: "Plan mode. Disallows all edit tools.",
    scope: "system",
    mode: "subagent",
    model: "openai/gpt-5.5-mini",
    tools: ["read", "grep", "glob"],
    skills: ["information-architecture"],
    permission: { read: "allow", grep: "allow", glob: "allow", bash: "ask", edit: "deny", task: "deny" },
    systemPrompt: "Analyze and plan. Do not modify files.",
  },
  {
    id: "docs-implement",
    name: "Docs Implement",
    description: "掃描 docs 中需求實作的文件，平行派 subagent 實作，完成後更新狀態。",
    scope: "custom",
    mode: "subagent",
    model: "openai/gpt-5.5",
    tools: ["read", "grep", "glob", "task", "apply_patch"],
    skills: ["react-vite-feature-based", "coss"],
    permission: { read: "allow", grep: "allow", glob: "allow", bash: "ask", edit: "allow", task: "allow" },
    systemPrompt: "Read implementation docs, coordinate subagents, implement requested changes, and update status notes.",
  },
  {
    id: "docs-plan",
    name: "Docs Plan",
    description: "像內建 plan 一樣規劃工作，但可在 docs 新增或修改規劃文件並標記。",
    scope: "custom",
    mode: "subagent",
    model: "openai/gpt-5.5-mini",
    tools: ["read", "grep", "glob"],
    skills: ["information-architecture"],
    permission: { read: "allow", grep: "allow", glob: "allow", bash: "ask", edit: "ask", task: "deny" },
    systemPrompt: "Plan documentation-driven work and write concise implementation plans when needed.",
  },
];

const availableSkills = [
  "react-vite-feature-based",
  "coss",
  "playwright-e2e-testing",
  "accessibility-compliance",
  "information-architecture",
  "responsive-design",
];

function getToolPermissionKey(tool: string) {
  if (tool === "apply_patch" || tool === "write" || tool === "edit") return "edit";
  return tool;
}

const toolDefinitions = [
  { id: "read", name: "read", description: "Read files from the current workspace.", category: "Files", source: "built-in" },
  { id: "grep", name: "grep", description: "Search file contents using regular expressions.", category: "Search", source: "built-in" },
  { id: "glob", name: "glob", description: "Find files by path pattern across the workspace.", category: "Search", source: "built-in" },
  { id: "bash", name: "bash", description: "Run approved terminal commands for verification and development tasks.", category: "Runtime", source: "built-in" },
  { id: "apply_patch", name: "apply_patch", description: "Apply precise file edits through patch operations.", category: "Edit", source: "built-in" },
  { id: "task", name: "task", description: "Launch subagents for larger exploration or implementation work.", category: "Agent", source: "built-in" },
  { id: "database", name: "database", description: "Query project database records, schema, and persisted data.", category: "Custom", source: "custom" },
  { id: "cms_publish", name: "cms_publish", description: "Publish or validate CMS content through a project-specific tool.", category: "Custom", source: "custom" },
];

function isCustomTool(toolName: string) {
  return toolDefinitions.some((tool) => tool.name === toolName && tool.source === "custom");
}

const emptyAgentForm = {
  name: "",
  description: "",
  mode: "subagent" as AgentDefinition["mode"],
  model: "openai/gpt-5.5",
  temperature: "0.3",
  steps: "",
  tools: ["read", "grep", "glob"],
  toolGuidance: {} as Record<string, string>,
  skillGuidance: {} as Record<string, string>,
  skills: ["react-vite-feature-based"],
  permission: { read: "allow", grep: "allow", glob: "allow", bash: "ask", edit: "ask", task: "ask" } as AgentDefinition["permission"],
  systemPrompt: "",
};

function agentToYaml(agent: Pick<AgentDefinition, "name" | "description"> & Partial<AgentDefinition>) {
  const tools = agent.tools?.length ? agent.tools : ["read", "grep", "glob"];
  const skills = agent.skills?.length ? agent.skills : ["react-vite-feature-based"];
  const permission = "permission" in agent && agent.permission ? agent.permission as AgentDefinition["permission"] : { edit: "allow", bash: "ask", read: "allow", grep: "allow", glob: "allow" };
  const systemPrompt = "systemPrompt" in agent && agent.systemPrompt ? agent.systemPrompt : "You are a focused opencode agent. Follow the user's request and use the configured tools responsibly.";
  const toolGuidance = "toolGuidance" in agent && agent.toolGuidance ? agent.toolGuidance : {};
  const skillGuidance = "skillGuidance" in agent && agent.skillGuidance ? agent.skillGuidance : {};
  const guidanceText = tools
    .map((tool) => ({ tool, guidance: toolGuidance[tool]?.trim() }))
    .filter((item) => item.guidance)
    .map((item) => `- ${item.tool}: ${item.guidance}`)
    .join("\n");
  const skillGuidanceText = skills
    .map((skill) => ({ skill, guidance: skillGuidance[skill]?.trim() }))
    .filter((item) => item.guidance)
    .map((item) => `- ${item.skill}: ${item.guidance}`)
    .join("\n");
  return `---\nname: ${agent.name || "my-agent"}\ndescription: ${agent.description || "Describe when this agent should be used."}\nmode: ${agent.mode ?? "subagent"}\nmodel: ${"model" in agent && agent.model ? agent.model : "openai/gpt-5.5"}\ntemperature: ${"temperature" in agent && agent.temperature ? agent.temperature : "0.3"}\n${"steps" in agent && agent.steps ? `steps: ${agent.steps}\n` : ""}tools:\n${tools.map((tool) => `  ${tool}: true`).join("\n")}\nskills:\n${skills.map((skill) => `  - ${skill}`).join("\n")}\npermission:\n${Object.entries(permission).map(([key, value]) => `  ${key}: ${value}`).join("\n")}\n---\n${systemPrompt}${guidanceText ? `\n\n## Tool usage guidance\n${guidanceText}` : ""}${skillGuidanceText ? `\n\n## Skill usage guidance\n${skillGuidanceText}` : ""}\n`;
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
  const [agentConfigMode, setAgentConfigMode] = useState<AgentConfigMode>("interface");
  const [agentToolTab, setAgentToolTab] = useState<AgentToolTab>("agents");
  const [agents, setAgents] = useState<AgentDefinition[]>(agentDefinitions);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentYaml, setAgentYaml] = useState(agentToYaml(emptyAgentForm));
  const [toolToAdd, setToolToAdd] = useState(toolDefinitions[0]!.name);
  const [skillToAdd, setSkillToAdd] = useState(availableSkills[0]!);
  const [guidanceTool, setGuidanceTool] = useState<string | null>(null);
  const [guidanceSkill, setGuidanceSkill] = useState<string | null>(null);

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
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? null;

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
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setAgentsDialogOpen(true);
  }

  function openAddAgentMode() {
    setAgentEditMode("add");
    setEditingAgentId(null);
    setSelectedAgentId(null);
    setAgentConfigMode("interface");
    setAgentForm(emptyAgentForm);
    setAgentYaml(agentToYaml(emptyAgentForm));
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setAgentDialogView("config");
  }

  function openAgentDetail(agent: AgentDefinition) {
    setSelectedAgentId(agent.id);
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setAgentDialogView("detail");
  }

  function openEditAgentMode(agent: AgentDefinition) {
    setAgentEditMode("edit");
    setEditingAgentId(agent.id);
    setSelectedAgentId(agent.id);
    setAgentConfigMode("interface");
    setAgentForm({
      name: agent.name,
      description: agent.description,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature ?? "0.3",
      steps: agent.steps ?? "",
      tools: agent.tools,
      toolGuidance: agent.toolGuidance ?? {},
      skillGuidance: agent.skillGuidance ?? {},
      skills: agent.skills,
      permission: agent.permission,
      systemPrompt: agent.systemPrompt,
    });
    setAgentYaml(agentToYaml(agent));
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setAgentDialogView("config");
  }

  function switchAgentConfigMode(mode: AgentConfigMode) {
    if (mode === "yaml") {
      setAgentYaml(agentToYaml({
        ...agentForm,
        id: editingAgentId ?? "draft-agent",
        scope: "custom",
        hidden: false,
      }));
    }

    setAgentConfigMode(mode);
  }

  function submitAgentConfig() {
    const fallbackName = agentEditMode === "add" ? "custom-agent" : "agent";
    const yamlName = agentYaml.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const yamlDescription = agentYaml.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    const yamlMode = agentYaml.match(/^mode:\s*(primary|subagent|all)$/m)?.[1] as AgentDefinition["mode"] | undefined;
    const yamlModel = agentYaml.match(/^model:\s*(.+)$/m)?.[1]?.trim();
    const yamlPrompt = agentYaml.split("---").slice(2).join("---").trim();
    const nextAgent: AgentDefinition = {
      id: editingAgentId ?? `agent-${Date.now()}`,
      name: agentConfigMode === "yaml" ? yamlName || fallbackName : agentForm.name.trim() || fallbackName,
      description: agentConfigMode === "yaml" ? yamlDescription || "透過 YAML 新增的 opencode agent。" : agentForm.description.trim() || "透過介面新增的 opencode agent。",
      scope: "custom" as const,
      mode: agentConfigMode === "yaml" ? yamlMode ?? "subagent" : agentForm.mode,
      model: agentConfigMode === "yaml" ? yamlModel || "openai/gpt-5.5" : agentForm.model,
      temperature: agentConfigMode === "yaml" ? agentYaml.match(/^temperature:\s*(.+)$/m)?.[1]?.trim() : agentForm.temperature,
      steps: agentConfigMode === "yaml" ? agentYaml.match(/^steps:\s*(.+)$/m)?.[1]?.trim() : agentForm.steps,
      tools: agentConfigMode === "yaml" ? ["read", "grep", "glob"] : agentForm.tools,
      toolGuidance: agentConfigMode === "yaml" ? {} : agentForm.toolGuidance,
      skillGuidance: agentConfigMode === "yaml" ? {} : agentForm.skillGuidance,
      skills: agentConfigMode === "yaml" ? ["react-vite-feature-based"] : agentForm.skills,
      permission: agentConfigMode === "yaml" ? { read: "allow", grep: "allow", glob: "allow", bash: "ask", edit: "ask", task: "ask" } : agentForm.permission,
      systemPrompt: agentConfigMode === "yaml" ? yamlPrompt || "" : agentForm.systemPrompt,
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

  function updateAgentConfig(agentId: string, update: (agent: AgentDefinition) => AgentDefinition) {
    setAgents((current) => current.map((agent) => agent.id === agentId ? update(agent) : agent));
  }

  function addAgentTool() {
    if (!selectedAgentId || !toolToAdd) return;
    const permissionKey = getToolPermissionKey(toolToAdd);
    updateAgentConfig(selectedAgentId, (agent) => agent.tools.includes(toolToAdd) ? agent : {
      ...agent,
      tools: [...agent.tools, toolToAdd],
      toolGuidance: isCustomTool(toolToAdd) ? { ...agent.toolGuidance, [toolToAdd]: agent.toolGuidance?.[toolToAdd] ?? "" } : agent.toolGuidance,
      permission: { ...agent.permission, [permissionKey]: agent.permission[permissionKey] ?? "ask" },
    });
  }

  function removeAgentTool(tool: string) {
    if (!selectedAgentId) return;
    const permissionKey = getToolPermissionKey(tool);
    if (guidanceTool === tool) setGuidanceTool(null);
    updateAgentConfig(selectedAgentId, (agent) => {
      const nextPermission = { ...agent.permission };
      const nextToolGuidance = { ...agent.toolGuidance };
      delete nextPermission[permissionKey];
      delete nextToolGuidance[tool];
      return { ...agent, tools: agent.tools.filter((item) => item !== tool), toolGuidance: nextToolGuidance, permission: nextPermission };
    });
  }

  function updateToolGuidance(tool: string, value: string) {
    if (!isCustomTool(tool)) return;

    if (agentDialogView === "config") {
      setAgentForm((current) => ({
        ...current,
        toolGuidance: { ...current.toolGuidance, [tool]: value },
      }));
      return;
    }

    if (selectedAgentId) {
      updateAgentConfig(selectedAgentId, (agent) => ({
        ...agent,
        toolGuidance: { ...agent.toolGuidance, [tool]: value },
      }));
    }
  }

  function updateSkillGuidance(skill: string, value: string) {
    if (agentDialogView === "config") {
      setAgentForm((current) => ({
        ...current,
        skillGuidance: { ...current.skillGuidance, [skill]: value },
      }));
      return;
    }

    if (selectedAgentId) {
      updateAgentConfig(selectedAgentId, (agent) => ({
        ...agent,
        skillGuidance: { ...agent.skillGuidance, [skill]: value },
      }));
    }
  }

  function addAgentSkill() {
    if (!selectedAgentId || !skillToAdd) return;
    updateAgentConfig(selectedAgentId, (agent) => agent.skills.includes(skillToAdd) ? agent : { ...agent, skills: [...agent.skills, skillToAdd], skillGuidance: { ...agent.skillGuidance, [skillToAdd]: agent.skillGuidance?.[skillToAdd] ?? "" } });
  }

  function removeAgentSkill(skill: string) {
    if (!selectedAgentId) return;
    if (guidanceSkill === skill) setGuidanceSkill(null);
    updateAgentConfig(selectedAgentId, (agent) => {
      const nextSkillGuidance = { ...agent.skillGuidance };
      delete nextSkillGuidance[skill];
      return { ...agent, skills: agent.skills.filter((item) => item !== skill), skillGuidance: nextSkillGuidance };
    });
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
                    onClick={() => setAgentDialogView("list")}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-base">
                    {agentDialogView === "list" ? "智能體/工具" : agentDialogView === "detail" ? "Agent 設定" : agentEditMode === "add" ? "新增 Agent" : "編輯 Agent"}
                  </h2>
                  <p className="mt-0.5 text-muted-foreground text-xs">{agentDialogView === "list" ? `Total ${agentToolTab === "agents" ? agents.length : toolDefinitions.length}` : "介面配置 / 文字配置 YAML"}</p>
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
              <div className="grid max-h-[500px] gap-5 overflow-y-auto px-6 pb-6">
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
                              <MenuItem onClick={() => openAgentDetail(agent)}>查看設定</MenuItem>
                              <MenuItem onClick={() => openEditAgentMode(agent)}>編輯</MenuItem>
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
                              <MenuItem onClick={() => openAgentDetail(agent)}>查看設定</MenuItem>
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
                                <Badge size="sm" variant={tool.source === "custom" ? "success" : "secondary"}>{tool.source}</Badge>
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

            {agentDialogView === "detail" && selectedAgent && (
              <div className="grid max-h-[500px] gap-4 overflow-y-auto px-6 pb-6">
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
                  <button className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "interface" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchAgentConfigMode("interface")} type="button">介面配置</button>
                  <button className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchAgentConfigMode("yaml")} type="button">文字配置</button>
                </div>

                <div className="rounded-lg bg-muted/55 p-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-base">{selectedAgent.name}</h3>
                    <Badge size="sm" variant={selectedAgent.scope === "system" ? "info" : "success"}>{selectedAgent.scope}</Badge>
                    <Badge size="sm" variant="outline">{selectedAgent.mode}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground text-sm leading-6">{selectedAgent.description}</p>
                </div>

                {agentConfigMode === "interface" ? (
                  <>
                    <section className="grid gap-2" aria-labelledby="agent-tools-title">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-tools-title">Tools</h4><Badge size="sm" variant="secondary">{selectedAgent.tools.length}</Badge></div>
                      <div className="grid gap-1.5">
                        {selectedAgent.tools.map((tool) => {
                          const permissionKey = getToolPermissionKey(tool);
                          return (
                            <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={tool}>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto] sm:items-center">
                                <span className="min-w-0 truncate font-mono">{tool}</span>
                                {isCustomTool(tool) && (
                                  <Button onClick={() => setGuidanceTool(guidanceTool === tool ? null : tool)} size="sm" type="button" variant="outline">
                                    {selectedAgent.toolGuidance?.[tool]?.trim() ? "編輯使用情境" : "新增使用情境"}
                                  </Button>
                                )}
                                <select
                                  aria-label={`${tool} permission`}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                                  onChange={(event) => updateAgentConfig(selectedAgent.id, (agent) => ({ ...agent, permission: { ...agent.permission, [permissionKey]: event.target.value as "allow" | "ask" | "deny" } }))}
                                  value={selectedAgent.permission[permissionKey] ?? "ask"}
                                >
                                  <option value="allow">allow</option>
                                  <option value="ask">ask</option>
                                  <option value="deny">deny</option>
                                </select>
                                <button aria-label={`移除 tool ${tool}`} className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => removeAgentTool(tool)} type="button"><XIcon aria-hidden="true" className="size-3" /></button>
                              </div>
                              {guidanceTool === tool && isCustomTool(tool) && (
                                <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                  使用情境
                                  <Textarea aria-label={`${tool} 使用情境`} onChange={(event) => updateToolGuidance(tool, event.target.value)} placeholder={`說明 ${tool} 什麼情況需要被呼叫，以及模型應該如何使用它。`} rows={3} value={selectedAgent.toolGuidance?.[tool] ?? ""} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setToolToAdd(event.target.value)} value={toolToAdd}>{toolDefinitions.map((tool) => <option key={tool.id} value={tool.name}>{tool.name} · {tool.category}</option>)}</select><Button onClick={addAgentTool} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Tool</Button></div>
                    </section>

                    <section className="grid gap-2" aria-labelledby="agent-skills-title">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-skills-title">Skills</h4><Badge size="sm" variant="secondary">{selectedAgent.skills.length}</Badge></div>
                      <div className="grid gap-1.5">
                        {selectedAgent.skills.map((skill) => (
                          <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={skill}>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                              <span className="min-w-0 truncate font-mono">{skill}</span>
                              <Button onClick={() => setGuidanceSkill(guidanceSkill === skill ? null : skill)} size="sm" type="button" variant="outline">
                                {selectedAgent.skillGuidance?.[skill]?.trim() ? "編輯使用情境" : "新增使用情境"}
                              </Button>
                              <button aria-label={`移除 skill ${skill}`} className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => removeAgentSkill(skill)} type="button"><XIcon aria-hidden="true" className="size-3" /></button>
                            </div>
                            {guidanceSkill === skill && (
                              <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                使用情境
                                <Textarea aria-label={`${skill} 使用情境`} onChange={(event) => updateSkillGuidance(skill, event.target.value)} placeholder={`說明這個 agent 什麼情況會使用 ${skill} skill。`} rows={3} value={selectedAgent.skillGuidance?.[skill] ?? ""} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setSkillToAdd(event.target.value)} value={skillToAdd}>{availableSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select><Button onClick={addAgentSkill} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Skill</Button></div>
                    </section>

                    <section className="grid gap-2" aria-labelledby="agent-permissions-title">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-permissions-title">Permissions</h4><Badge size="sm" variant="secondary">{Object.keys(selectedAgent.permission).length}</Badge></div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {Object.entries(selectedAgent.permission).map(([key, value]) => <div className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5 text-xs" key={key}><span className="font-mono">{key}</span><Badge size="sm" variant={value === "allow" ? "success" : value === "deny" ? "error" : "warning"}>{value}</Badge></div>)}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="grid gap-2" aria-labelledby="agent-yaml-preview-title"><h4 className="font-semibold text-sm" id="agent-yaml-preview-title">Markdown 預覽</h4><pre className="max-h-72 overflow-auto rounded-lg border bg-muted/45 p-3 font-mono text-xs leading-5 text-muted-foreground">{agentToYaml(selectedAgent)}</pre></section>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => openEditAgentMode(selectedAgent)} size="sm">編輯 Agent</Button>
                </div>
              </div>
            )}

            {agentDialogView === "config" && (
              <div className="grid max-h-[500px] gap-4 overflow-y-auto px-6 pb-6">
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1"><button className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "interface" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchAgentConfigMode("interface")} type="button">介面配置</button><button className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchAgentConfigMode("yaml")} type="button">文字配置</button></div>
                {agentConfigMode === "interface" ? (
                  <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-muted-foreground text-sm">Agent 名稱<Input aria-label="Agent 名稱" onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} placeholder="docs-implement" value={agentForm.name} /></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Model<Input aria-label="Agent model" onChange={(event) => setAgentForm((current) => ({ ...current, model: event.target.value }))} placeholder="openai/gpt-5.5" value={agentForm.model} /></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="grid gap-2 text-muted-foreground text-sm">Mode<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, mode: event.target.value as AgentDefinition["mode"] }))} value={agentForm.mode}><option value="primary">primary</option><option value="subagent">subagent</option><option value="all">all</option></select></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Temperature<Input aria-label="temperature" onChange={(event) => setAgentForm((current) => ({ ...current, temperature: event.target.value }))} placeholder="0.3" value={agentForm.temperature} /></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Steps<Input aria-label="steps" onChange={(event) => setAgentForm((current) => ({ ...current, steps: event.target.value }))} placeholder="可留空" value={agentForm.steps} /></label>
                    </div>
                    <label className="grid gap-2 text-muted-foreground text-sm">使用時機 / Description<Textarea aria-label="Agent 描述" onChange={(event) => setAgentForm((current) => ({ ...current, description: event.target.value }))} placeholder="描述這個 agent 何時應該被使用，以及它要負責的任務。" rows={3} value={agentForm.description} /></label>
                    <label className="grid gap-2 text-muted-foreground text-sm">系統提示詞 / Prompt<Textarea aria-label="系統提示詞" onChange={(event) => setAgentForm((current) => ({ ...current, systemPrompt: event.target.value }))} placeholder="輸入這個 agent 的 system prompt 內容。" rows={5} value={agentForm.systemPrompt} /></label>

                    <section className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground">Tools</h4>
                        <Badge size="sm" variant="secondary">{agentForm.tools.length}</Badge>
                      </div>
                      <div className="grid gap-1.5">
                        {agentForm.tools.map((tool) => {
                          const permissionKey = getToolPermissionKey(tool);
                          return (
                            <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={tool}>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto] sm:items-center">
                                <span className="min-w-0 truncate font-mono">{tool}</span>
                                {isCustomTool(tool) && (
                                  <Button onClick={() => setGuidanceTool(guidanceTool === tool ? null : tool)} size="sm" type="button" variant="outline">
                                    {agentForm.toolGuidance[tool]?.trim() ? "編輯使用情境" : "新增使用情境"}
                                  </Button>
                                )}
                                <select aria-label={`${tool} permission`} className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, permission: { ...current.permission, [permissionKey]: event.target.value as "allow" | "ask" | "deny" } }))} value={agentForm.permission[permissionKey] ?? "ask"}>
                                  <option value="allow">allow</option>
                                  <option value="ask">ask</option>
                                  <option value="deny">deny</option>
                                </select>
                                <button aria-label={`移除 tool ${tool}`} className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setAgentForm((current) => { const nextPermission = { ...current.permission }; const nextToolGuidance = { ...current.toolGuidance }; delete nextPermission[permissionKey]; delete nextToolGuidance[tool]; if (guidanceTool === tool) setGuidanceTool(null); return { ...current, tools: current.tools.filter((item) => item !== tool), toolGuidance: nextToolGuidance, permission: nextPermission }; })} type="button"><XIcon aria-hidden="true" className="size-3" /></button>
                              </div>
                              {guidanceTool === tool && isCustomTool(tool) && (
                                <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                  使用情境
                                  <Textarea aria-label={`${tool} 使用情境`} onChange={(event) => updateToolGuidance(tool, event.target.value)} placeholder={`說明 ${tool} 什麼情況需要被呼叫，以及模型應該如何使用它。`} rows={3} value={agentForm.toolGuidance[tool] ?? ""} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setToolToAdd(event.target.value)} value={toolToAdd}>
                          {toolDefinitions.map((tool) => <option key={tool.id} value={tool.name}>{tool.name} · {tool.category}</option>)}
                        </select>
                        <Button onClick={() => setAgentForm((current) => { const permissionKey = getToolPermissionKey(toolToAdd); return current.tools.includes(toolToAdd) ? current : { ...current, tools: [...current.tools, toolToAdd], toolGuidance: isCustomTool(toolToAdd) ? { ...current.toolGuidance, [toolToAdd]: current.toolGuidance[toolToAdd] ?? "" } : current.toolGuidance, permission: { ...current.permission, [permissionKey]: current.permission[permissionKey] ?? "ask" } }; })} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Tool</Button>
                      </div>
                    </section>
                    <section className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground">Skills</h4>
                        <Badge size="sm" variant="secondary">{agentForm.skills.length}</Badge>
                      </div>
                      <div className="grid gap-1.5">
                        {agentForm.skills.map((skill) => (
                          <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={skill}>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                              <span className="min-w-0 truncate font-mono">{skill}</span>
                              <Button onClick={() => setGuidanceSkill(guidanceSkill === skill ? null : skill)} size="sm" type="button" variant="outline">
                                {agentForm.skillGuidance[skill]?.trim() ? "編輯使用情境" : "新增使用情境"}
                              </Button>
                              <button aria-label={`移除 skill ${skill}`} className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setAgentForm((current) => { const nextSkillGuidance = { ...current.skillGuidance }; delete nextSkillGuidance[skill]; if (guidanceSkill === skill) setGuidanceSkill(null); return { ...current, skills: current.skills.filter((item) => item !== skill), skillGuidance: nextSkillGuidance }; })} type="button"><XIcon aria-hidden="true" className="size-3" /></button>
                            </div>
                            {guidanceSkill === skill && (
                              <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                使用情境
                                <Textarea aria-label={`${skill} 使用情境`} onChange={(event) => updateSkillGuidance(skill, event.target.value)} placeholder={`說明這個 agent 什麼情況會使用 ${skill} skill。`} rows={3} value={agentForm.skillGuidance[skill] ?? ""} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setSkillToAdd(event.target.value)} value={skillToAdd}>{availableSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select>
                        <Button onClick={() => setAgentForm((current) => current.skills.includes(skillToAdd) ? current : { ...current, skills: [...current.skills, skillToAdd], skillGuidance: { ...current.skillGuidance, [skillToAdd]: current.skillGuidance[skillToAdd] ?? "" } })} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Skill</Button>
                      </div>
                    </section>
                    <section className="grid gap-2"><h4 className="font-semibold text-sm text-foreground">Permissions</h4><div className="grid gap-2 sm:grid-cols-2">{Object.entries(agentForm.permission).map(([key, value]) => <label className="grid gap-1 text-muted-foreground text-xs" key={key}>{key}<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, permission: { ...current.permission, [key]: event.target.value as "allow" | "ask" | "deny" } }))} value={value}><option value="allow">allow</option><option value="ask">ask</option><option value="deny">deny</option></select></label>)}</div></section>
                  </div>
                ) : (
                  <label className="grid gap-2 text-muted-foreground text-sm">opencode agent Markdown (.md)<Textarea aria-label="opencode agent Markdown" className="font-mono" onChange={(event) => setAgentYaml(event.target.value)} rows={16} spellCheck={false} value={agentYaml} /></label>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-muted-foreground text-xs">介面配置適合快速新增；文字配置可直接編輯 opencode agent Markdown。</p><Button disabled={agentConfigMode === "interface" ? !agentForm.name.trim() : !agentYaml.trim()} onClick={submitAgentConfig}>{agentEditMode === "add" ? "新增 Agent" : "保存 Agent"}</Button></div>
              </div>
            )}

          </section>
        </div>
      )}
    </>
  );
}
