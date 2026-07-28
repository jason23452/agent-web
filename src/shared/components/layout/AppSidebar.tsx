import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  FolderIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PlugZapIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
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
import { Sidebar } from "@/shared/components/layout/Sidebar";

type AppSidebarProject = {
  id: string;
  name: string;
  path: string;
};

type AppSidebarSession = {
  id: string;
  title: string;
  meta: string;
};

type AppSidebarProps = {
  activeProjectPath: string;
  onProjectChange: (path: string) => void;
  open: boolean;
  onClose: () => void;
  onSelectSession: () => void;
  projects: AppSidebarProject[];
  sessions: AppSidebarSession[];
};

const navItems = [
  { icon: SparklesIcon, label: "新對話", active: true },
  { icon: HistoryIcon, label: "專案" },
  { icon: ServerIcon, label: "MCP Server" },
  { icon: PlugZapIcon, label: "外掛/技能" },
  { icon: HatGlasses, label: "智能體/工具" },
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
type ProjectDialogView = "list" | "create";
type PluginSkillDialogView = "list" | "add-plugin" | "add-skill";
type PluginSkillTab = "plugins" | "skills";
type PermissionAction = "allow" | "ask" | "deny";
type PermissionValue = PermissionAction | Record<string, PermissionAction>;

type PluginDefinition = {
  id: string;
  name: string;
  description: string;
  source: "npm" | "local" | "built-in" | "archive";
  entry: string;
  enabled: boolean;
  config: string;
  archiveName?: string;
  installTarget?: "project" | "global";
};

type PluginInstallMethod = "npm" | "local" | "archive";

type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  scope: "global" | "project" | "claude" | "agents" | "archive";
  enabled: boolean;
  path: string;
  license?: string;
  compatibility?: string;
  archiveName?: string;
  installTarget?: SkillInstallTarget;
};

type SkillInstallTarget = "project-opencode" | "global-opencode" | "project-claude" | "global-claude" | "project-agents" | "global-agents";

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
  subagents: string[];
  subagentGuidance?: Record<string, string>;
  permission: Record<string, PermissionValue>;
  systemPrompt: string;
  temperature?: string;
  top_p?: string;
  variant?: string;
  steps?: string;
  disable?: boolean;
  hidden?: boolean;
  color?: string;
  promptSource?: "inline" | "file";
  promptFile?: string;
  providerOptionsJson?: string;
  permissionRulesJson?: string;
};

type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  source: "built-in" | "custom";
  runtime?: "python" | "js-ts";
  entry?: string;
  code?: string;
  testInput?: string;
};

type AgentDialogView = "list" | "detail" | "config" | "tool-config";
type AgentEditMode = "add" | "edit";
type ToolEditMode = "add" | "edit";
type AgentToolTab = "agents" | "tools";
type AgentConfigMode = "interface" | "yaml";

type ModelProvider = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  connected: boolean;
  enabled: boolean;
  npm: string;
  baseUrl: string;
  apiKey: string;
  headersJson: string;
  defaultModel: string;
  modelDisplayName: string;
  contextLimit: string;
  outputLimit: string;
  whitelist: string;
  blacklist: string;
  authMethods: string[];
};

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
    subagents: ["explore", "general", "plan"],
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
    subagents: ["plan"],
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
    subagents: ["explore", "plan"],
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
    subagents: [],
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
    subagents: ["explore", "docs-plan"],
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
    subagents: ["plan"],
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

const initialPlugins: PluginDefinition[] = [
  {
    id: "helicone-session",
    name: "opencode-helicone-session",
    description: "將 OpenCode session telemetry 送到 Helicone，方便追蹤模型呼叫與成本。",
    source: "npm",
    entry: "opencode-helicone-session",
    enabled: true,
    config: '{"sampleRate":1}',
  },
  {
    id: "project-hooks",
    name: "project-hooks",
    description: "專案本地 plugin，可提供自訂 hooks、工具與整合流程。",
    source: "local",
    entry: "./.opencode/plugins/project-hooks.ts",
    enabled: false,
    config: '{}',
  },
];

const emptyPluginForm = {
  method: "npm" as PluginInstallMethod,
  name: "",
  description: "",
  entry: "",
  installTarget: "project" as "project" | "global",
  archiveName: "",
};

const emptySkillForm = {
  name: "",
  description: "",
  installTarget: "project-opencode" as SkillInstallTarget,
  license: "",
  compatibility: "opencode",
  archiveName: "",
};

const initialSkillSettings: SkillDefinition[] = availableSkills.map((skill, index) => ({
  id: skill,
  name: skill,
  description: index < 2 ? "目前專案常用技能，可被 Agent 載入並套用對應工作流。" : "可選技能，啟用後可提供給 Agent 設定使用。",
  scope: index < 3 ? "project" : "global",
  enabled: index < 4,
  path: index < 3 ? `.opencode/skills/${skill}/SKILL.md` : `~/.config/opencode/skills/${skill}/SKILL.md`,
}));

const modelVariants = ["", "none", "minimal", "low", "medium", "high", "xhigh", "max"];

const agentColors = ["", "primary", "secondary", "accent", "success", "warning", "error", "info"];

const availableModels = [
  "openai/gpt-5.5",
  "openai/gpt-5.5-mini",
  "opencode/gpt-5.1-codex",
  "anthropic/claude-opus-4-5-20251101",
  "anthropic/claude-sonnet-4-5-20250929",
  "google/gemini-3-pro",
  "minimax/minimax-m2.1",
];

const initialModelProviders: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "使用 ChatGPT Pro/Plus 或 API 密鑰連接",
    icon: "◎",
    connected: true,
    enabled: true,
    npm: "@ai-sdk/openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "{env:OPENAI_API_KEY}",
    headersJson: "",
    defaultModel: "openai/gpt-5.5",
    modelDisplayName: "GPT 5.5",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["ChatGPT Pro/Plus (browser)", "ChatGPT Pro/Plus (headless)", "API 密鑰"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "使用 Claude Pro/Max 或 API 密鑰連接",
    icon: "AI",
    connected: false,
    enabled: true,
    npm: "@ai-sdk/anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "{env:ANTHROPIC_API_KEY}",
    headersJson: "",
    defaultModel: "anthropic/claude-sonnet-4-5-20250929",
    modelDisplayName: "Claude Sonnet 4.5",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "claude-opus-4-5-20251101",
    authMethods: ["Claude Pro/Max (browser)", "Claude Pro/Max (headless)", "API 密鑰"],
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "使用 Google 帳號或 API 密鑰連接",
    icon: "✦",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "{env:GOOGLE_GENERATIVE_AI_API_KEY}",
    headersJson: "",
    defaultModel: "google/gemini-3-pro",
    modelDisplayName: "Gemini 3 Pro",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["Google OAuth (browser)", "Google OAuth (headless)", "API 密鑰"],
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    description: "使用 OpenCode Zen 或 API 密鑰連接",
    icon: "Z",
    badge: "推薦",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.opencode.ai/v1",
    apiKey: "{env:OPENCODE_API_KEY}",
    headersJson: "",
    defaultModel: "opencode/gpt-5.1-codex",
    modelDisplayName: "GPT 5.1 Codex",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["OpenCode Zen", "API 密鑰"],
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    description: "適合所有人的低成本訂閱",
    icon: "G",
    badge: "推薦",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.opencode.ai/v1",
    apiKey: "{env:OPENCODE_GO_API_KEY}",
    headersJson: "",
    defaultModel: "opencode/gpt-5.1-codex",
    modelDisplayName: "GPT 5.1 Codex",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["OpenCode Go", "API 密鑰"],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "使用 Copilot 或 API 密鑰連接",
    icon: "⌘",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.githubcopilot.com/v1",
    apiKey: "{env:GITHUB_TOKEN}",
    headersJson: "",
    defaultModel: "github-copilot/gpt-4.1",
    modelDisplayName: "GPT 4.1",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["GitHub OAuth (browser)", "Device code", "API 密鑰"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "使用 OpenRouter 帳號或 API 密鑰連接",
    icon: "↢",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "{env:OPENROUTER_API_KEY}",
    headersJson: "",
    defaultModel: "openrouter/openai/gpt-4.1",
    modelDisplayName: "GPT 4.1 via OpenRouter",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["OpenRouter OAuth", "API 密鑰", "自訂 headers"],
  },
];

function getToolPermissionKey(tool: string) {
  if (tool === "apply_patch" || tool === "write" || tool === "edit") return "edit";
  return tool;
}

const initialToolDefinitions: ToolDefinition[] = [
  { id: "read", name: "read", description: "Read files from the current workspace.", category: "Files", source: "built-in" },
  { id: "grep", name: "grep", description: "Search file contents using regular expressions.", category: "Search", source: "built-in" },
  { id: "glob", name: "glob", description: "Find files by path pattern across the workspace.", category: "Search", source: "built-in" },
  { id: "bash", name: "bash", description: "Run approved terminal commands for verification and development tasks.", category: "Runtime", source: "built-in" },
  { id: "apply_patch", name: "apply_patch", description: "Apply precise file edits through patch operations.", category: "Edit", source: "built-in" },
  { id: "task", name: "task", description: "Launch subagents for larger exploration or implementation work.", category: "Agent", source: "built-in" },
  { id: "database", name: "database", description: "Query project database records, schema, and persisted data.", category: "Custom", source: "custom" },
  { id: "cms_publish", name: "cms_publish", description: "Publish or validate CMS content through a project-specific tool.", category: "Custom", source: "custom" },
];

function isCustomTool(toolName: string, tools = initialToolDefinitions) {
  return tools.some((tool) => tool.name === toolName && tool.source === "custom");
}

function permissionToYaml(permission: Record<string, PermissionValue>) {
  return Object.entries(permission).map(([key, value]) => {
    if (typeof value === "string") return `  ${key}: ${value}`;
    const rules = Object.entries(value).map(([pattern, action]) => `    ${JSON.stringify(pattern)}: ${action}`).join("\n");
    return `  ${key}:\n${rules}`;
  }).join("\n");
}

function providerOptionsToYaml(optionsJson?: string) {
  if (!optionsJson?.trim()) return "";

  try {
    const options = JSON.parse(optionsJson) as Record<string, unknown>;
    return Object.entries(options).map(([key, value]) => {
      if (typeof value === "string") return `${key}: ${value}`;
      return `${key}: ${JSON.stringify(value)}`;
    }).join("\n");
  } catch {
    return "# Provider options JSON is invalid and was not emitted.";
  }
}

function parseJsonObject<T>(json?: string) {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as T;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getPermissionVariant(value: PermissionValue) {
  if (typeof value !== "string") return "info" as const;
  if (value === "allow") return "success" as const;
  if (value === "deny") return "error" as const;
  return "warning" as const;
}

function getPermissionLabel(value: PermissionValue) {
  return typeof value === "string" ? value : "rules";
}

function taskPermissionFor(subagents: string[]) {
  if (subagents.length === 0) return "deny" as PermissionAction;
  return { "*": "deny" as const, ...Object.fromEntries(subagents.map((subagent) => [subagent, "allow" as const])) };
}

function getSkillBasePath(target: SkillInstallTarget) {
  const paths: Record<SkillInstallTarget, string> = {
    "project-opencode": ".opencode/skills",
    "global-opencode": "~/.config/opencode/skills",
    "project-claude": ".claude/skills",
    "global-claude": "~/.claude/skills",
    "project-agents": ".agents/skills",
    "global-agents": "~/.agents/skills",
  };
  return paths[target];
}

function getSkillScope(target: SkillInstallTarget): SkillDefinition["scope"] {
  if (target.includes("claude")) return "claude";
  if (target.includes("agents")) return "agents";
  return target.startsWith("global") ? "global" : "project";
}

function isValidSkillName(name: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) && name.length <= 64;
}

const emptyAgentForm = {
  name: "",
  description: "",
  mode: "subagent" as AgentDefinition["mode"],
  model: "openai/gpt-5.5",
  temperature: "0.3",
  top_p: "1",
  variant: "",
  steps: "",
  disable: false,
  hidden: false,
  color: "",
  promptSource: "inline" as AgentDefinition["promptSource"],
  promptFile: "",
  providerOptionsJson: "",
  permissionRulesJson: "",
  tools: ["read", "grep", "glob"],
  toolGuidance: {} as Record<string, string>,
  skillGuidance: {} as Record<string, string>,
  skills: ["react-vite-feature-based"],
  subagents: [] as string[],
  subagentGuidance: {} as Record<string, string>,
  permission: { read: "allow", grep: "allow", glob: "allow", list: "allow", bash: "ask", edit: "ask", task: "deny", skill: "allow", webfetch: "ask", websearch: "ask", lsp: "allow", question: "ask", todowrite: "ask", external_directory: "ask", doom_loop: "ask" } as AgentDefinition["permission"],
  systemPrompt: "",
};

const emptyToolForm = {
  name: "",
  description: "",
  category: "Custom",
  runtime: "js-ts" as ToolDefinition["runtime"],
  entry: "./.opencode/tools/my-tool.ts",
  code: "",
  testInput: '{"input":"hello"}',
};

function agentToYaml(agent: Pick<AgentDefinition, "name" | "description"> & Partial<AgentDefinition>) {
  const tools = agent.tools?.length ? agent.tools : ["read", "grep", "glob"];
  const skills = agent.skills?.length ? agent.skills : ["react-vite-feature-based"];
  const subagents = agent.subagents?.length ? agent.subagents : [];
  const permission: Record<string, PermissionValue> = "permission" in agent && agent.permission ? agent.permission as AgentDefinition["permission"] : { edit: "allow", bash: "ask", read: "allow", grep: "allow", glob: "allow" };
  const permissionRules = parseJsonObject<Record<string, PermissionValue>>(agent.permissionRulesJson);
  const effectivePermission: Record<string, PermissionValue> = { ...permission, ...permissionRules, task: taskPermissionFor(subagents) };
  const systemPrompt = "systemPrompt" in agent && agent.systemPrompt ? agent.systemPrompt : "You are a focused opencode agent. Follow the user's request and use the configured tools responsibly.";
  const toolGuidance = "toolGuidance" in agent && agent.toolGuidance ? agent.toolGuidance : {};
  const skillGuidance = "skillGuidance" in agent && agent.skillGuidance ? agent.skillGuidance : {};
  const subagentGuidance = "subagentGuidance" in agent && agent.subagentGuidance ? agent.subagentGuidance : {};
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
  const subagentGuidanceText = subagents
    .map((subagent) => ({ subagent, guidance: subagentGuidance[subagent]?.trim() }))
    .filter((item) => item.guidance)
    .map((item) => `- ${item.subagent}: ${item.guidance}`)
    .join("\n");
  const providerOptionsYaml = providerOptionsToYaml(agent.providerOptionsJson);
  const promptFile = agent.promptSource === "file" && agent.promptFile?.trim() ? `prompt: "{file:${agent.promptFile.trim()}}"\n` : "";
  return `---\nname: ${agent.name || "my-agent"}\ndescription: ${agent.description || "Describe when this agent should be used."}\nmode: ${agent.mode ?? "subagent"}\nmodel: ${"model" in agent && agent.model ? agent.model : "openai/gpt-5.5"}\ntemperature: ${"temperature" in agent && agent.temperature ? agent.temperature : "0.3"}\ntop_p: ${"top_p" in agent && agent.top_p ? agent.top_p : "1"}\n${"variant" in agent && agent.variant ? `variant: ${agent.variant}\n` : ""}${"steps" in agent && agent.steps ? `steps: ${agent.steps}\n` : ""}${agent.disable ? "disable: true\n" : ""}${agent.hidden ? "hidden: true\n" : ""}${agent.color ? `color: ${agent.color}\n` : ""}${promptFile}${providerOptionsYaml ? `${providerOptionsYaml}\n` : ""}tools:\n${tools.map((tool) => `  ${tool}: true`).join("\n")}\nskills:\n${skills.map((skill) => `  - ${skill}`).join("\n")}\npermission:\n${permissionToYaml(effectivePermission)}\n---\n${agent.promptSource === "file" ? "" : systemPrompt}${guidanceText ? `\n\n## Tool usage guidance\n${guidanceText}` : ""}${skillGuidanceText ? `\n\n## Skill usage guidance\n${skillGuidanceText}` : ""}${subagentGuidanceText ? `\n\n## Subagent usage guidance\n${subagentGuidanceText}` : ""}\n`;
}

export function AppSidebar({
  activeProjectPath,
  onProjectChange,
  open,
  onClose,
  onSelectSession,
  projects: initialProjects,
  sessions,
}: AppSidebarProps) {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogView, setProjectDialogView] = useState<ProjectDialogView>("list");
  const [projects, setProjects] = useState(initialProjects);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectCreateName, setProjectCreateName] = useState("");
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpDialogView, setMcpDialogView] = useState<McpDialogView>("list");
  const [mcpSearch, setMcpSearch] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>(initialMcpServers);
  const [editingMcpId, setEditingMcpId] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState(emptyMcpForm);
  const [pluginSkillDialogOpen, setPluginSkillDialogOpen] = useState(false);
  const [pluginSkillDialogView, setPluginSkillDialogView] = useState<PluginSkillDialogView>("list");
  const [pluginSkillTab, setPluginSkillTab] = useState<PluginSkillTab>("plugins");
  const [pluginSkillSearch, setPluginSkillSearch] = useState("");
  const [plugins, setPlugins] = useState<PluginDefinition[]>(initialPlugins);
  const [skillSettings, setSkillSettings] = useState<SkillDefinition[]>(initialSkillSettings);
  const [pluginForm, setPluginForm] = useState(emptyPluginForm);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [pluginInstallResult, setPluginInstallResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [skillInstallResult, setSkillInstallResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [batchUpdateNotice, setBatchUpdateNotice] = useState("");
  const [pluginSkillHasChanges, setPluginSkillHasChanges] = useState(false);
  const [agentsDialogOpen, setAgentsDialogOpen] = useState(false);
  const [agentDialogView, setAgentDialogView] = useState<AgentDialogView>("list");
  const [agentEditMode, setAgentEditMode] = useState<AgentEditMode>("add");
  const [agentConfigMode, setAgentConfigMode] = useState<AgentConfigMode>("interface");
  const [agentToolTab, setAgentToolTab] = useState<AgentToolTab>("agents");
  const [agents, setAgents] = useState<AgentDefinition[]>(agentDefinitions);
  const [toolDefinitions, setToolDefinitions] = useState<ToolDefinition[]>(initialToolDefinitions);
  const [agentsToolsHasChanges, setAgentsToolsHasChanges] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolEditMode, setToolEditMode] = useState<ToolEditMode>("add");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentYaml, setAgentYaml] = useState(agentToYaml(emptyAgentForm));
  const [toolForm, setToolForm] = useState(emptyToolForm);
  const [toolTestResult, setToolTestResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [toolToAdd, setToolToAdd] = useState(initialToolDefinitions[0]!.name);
  const [subagentToAdd, setSubagentToAdd] = useState("");
  const [skillToAdd, setSkillToAdd] = useState(availableSkills[0]!);
  const [guidanceTool, setGuidanceTool] = useState<string | null>(null);
  const [guidanceSkill, setGuidanceSkill] = useState<string | null>(null);
  const [guidanceSubagent, setGuidanceSubagent] = useState<string | null>(null);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>(initialModelProviders);
  const [selectedModelProviderId, setSelectedModelProviderId] = useState<string | null>(null);
  const [selectedProviderAuthMethod, setSelectedProviderAuthMethod] = useState<string | null>(null);

  const filteredProjects = projects.filter((project) => {
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
  const filteredPlugins = plugins.filter((plugin) => {
    const keyword = pluginSkillSearch.trim().toLowerCase();
    if (!keyword || pluginSkillTab !== "plugins") return true;
    return plugin.name.toLowerCase().includes(keyword) || plugin.description.toLowerCase().includes(keyword) || plugin.entry.toLowerCase().includes(keyword);
  });
  const filteredSkillSettings = skillSettings.filter((skill) => {
    const keyword = pluginSkillSearch.trim().toLowerCase();
    if (!keyword || pluginSkillTab !== "skills") return true;
    return skill.name.toLowerCase().includes(keyword) || skill.description.toLowerCase().includes(keyword) || skill.path.toLowerCase().includes(keyword);
  });
  const availableSkillNames = skillSettings.filter((skill) => skill.enabled).map((skill) => skill.name);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const selectedModelProvider = modelProviders.find((provider) => provider.id === selectedModelProviderId) ?? null;
  const isCustomToolName = (toolName: string) => isCustomTool(toolName, toolDefinitions);

  function finishProjectOpen(path: string) {
    onProjectChange(path);
    setProjectDialogOpen(false);
    setProjectDialogView("list");
    onClose();
  }

  function confirmOpenProject(path: string) {
    if (!path.trim()) return;
    const confirmed = window.confirm(`是否開啟專案？\n${path}`);
    if (!confirmed) return;
    finishProjectOpen(path);
  }

  function confirmCreateProject() {
    const name = projectCreateName.trim();
    const path = `/workspace/${name}/`;
    if (!name) return;
    const confirmed = window.confirm(`是否建立專案？\n名稱：${name}\n路徑：${path}`);
    if (!confirmed) return;
    const nextProject = { id: `project-${Date.now()}`, name, path };
    setProjects((current) => current.some((project) => project.path === path) ? current : [nextProject, ...current]);
    setProjectDialogView("list");
    setProjectCreateName("");
    finishProjectOpen(path);
  }

  function confirmBatchUpdate(scope: "agents-tools" | "plugins-skills") {
    const label = scope === "agents-tools" ? "智能體與工具" : "外掛與技能";
    const confirmed = window.confirm(`${label} 是 build-time 設定，更新後需要重新載入 OpenCode 才會完整生效。是否要批次更新？`);
    if (!confirmed) return;
    if (scope === "agents-tools") {
      setAgentsToolsHasChanges(false);
    } else {
      setPluginSkillHasChanges(false);
    }
    setBatchUpdateNotice(`${label} 已批次更新，請重新載入 OpenCode 讓 build-time 設定生效。`);
  }

  function agentCanReach(fromAgentId: string, targetAgentId: string, visited = new Set<string>()): boolean {
    if (fromAgentId === targetAgentId) return true;
    if (visited.has(fromAgentId)) return false;
    visited.add(fromAgentId);

    const fromAgent = agents.find((agent) => agent.id === fromAgentId);
    if (!fromAgent) return false;

    return fromAgent.subagents.some((subagentId) => agentCanReach(subagentId, targetAgentId, visited));
  }

  function getCallableSubagentOptions(agentId: string | null, assignedSubagents: string[]) {
    return agents.filter((agent) => {
      if (agent.mode === "primary") return false;
      if (agentId && agent.id === agentId) return false;
      if (assignedSubagents.includes(agent.id)) return false;
      if (agentId && agentCanReach(agent.id, agentId)) return false;
      return true;
    });
  }

  function openMcpList() {
    setMcpDialogView("list");
    setMcpDialogOpen(true);
  }

  function openPluginSkillSettings() {
    setPluginSkillDialogView("list");
    setPluginSkillTab("plugins");
    setPluginSkillSearch("");
    setPluginSkillDialogOpen(true);
  }

  function updateModelProvider(providerId: string, updates: Partial<ModelProvider>) {
    setModelProviders((current) => current.map((provider) => provider.id === providerId ? { ...provider, ...updates } : provider));
  }

  function closeUserSettings() {
    setUserSettingsOpen(false);
    setSelectedModelProviderId(null);
    setSelectedProviderAuthMethod(null);
  }

  function togglePlugin(pluginId: string) {
    setPlugins((current) => current.map((plugin) => plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin));
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function addPluginFromOfficialSource() {
    const method = pluginForm.method;
    const archiveName = pluginForm.archiveName.trim();
    const rawName = method === "archive" ? archiveName.replace(/\.(zip|tar|tgz|tar\.gz)$/i, "") : pluginForm.name.trim();
    const pluginName = rawName.replace(/[^a-zA-Z0-9_@/-]+/g, "-").replace(/^-|-$/g, "");

    if (!pluginName) {
      setPluginInstallResult({ status: "error", message: method === "archive" ? "請先選擇 plugin 壓縮檔。" : "請輸入 plugin 名稱。" });
      return;
    }

    if (method === "archive" && !/\.(zip|tar|tgz|tar\.gz)$/i.test(archiveName)) {
      setPluginInstallResult({ status: "error", message: "只支援 .zip、.tar、.tgz、.tar.gz 壓縮檔。" });
      return;
    }

    if (method === "local" && !pluginForm.entry.trim()) {
      setPluginInstallResult({ status: "error", message: "Local plugin 需要指定 .js 或 .ts entry path。" });
      return;
    }

    const targetDirectory = pluginForm.installTarget === "project" ? `.opencode/plugins/${pluginName}` : `~/.config/opencode/plugins/${pluginName}`;
    const entry = method === "npm"
      ? pluginName
      : method === "local"
        ? pluginForm.entry.trim()
        : `${targetDirectory}/index.ts`;
    const nextPlugin: PluginDefinition = {
      id: `${method}-${Date.now()}`,
      name: pluginName,
      description: pluginForm.description.trim() || (method === "npm" ? "透過 opencode.json plugin array 載入的 npm plugin。" : "透過 OpenCode plugins directory 自動載入的本地 plugin。"),
      source: method,
      entry,
      enabled: true,
      config: method === "npm" ? JSON.stringify({ plugin: [pluginName] }, null, 2) : JSON.stringify({ directory: targetDirectory }, null, 2),
      archiveName: method === "archive" ? archiveName : undefined,
      installTarget: method === "npm" ? undefined : pluginForm.installTarget,
    };

    setPlugins((current) => current.some((plugin) => plugin.name === pluginName && plugin.source === method) ? current : [nextPlugin, ...current]);
    setPluginInstallResult({ status: "success", message: method === "npm" ? `已新增 npm plugin：請寫入 opencode.json 的 plugin array。` : `已新增 local plugin：OpenCode 會從 ${entry} 載入。` });
    setPluginForm(emptyPluginForm);
    setPluginSkillTab("plugins");
    setPluginSkillDialogView("list");
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function toggleSkill(skillId: string) {
    setSkillSettings((current) => current.map((skill) => skill.id === skillId ? { ...skill, enabled: !skill.enabled } : skill));
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function addSkillFromOfficialSource() {
    const archiveName = skillForm.archiveName.trim();
    const rawName = archiveName ? archiveName.replace(/\.(zip|tar|tgz|tar\.gz)$/i, "") : skillForm.name.trim();
    const skillName = rawName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "");

    if (!isValidSkillName(skillName)) {
      setSkillInstallResult({ status: "error", message: "Skill name 必須符合官方規則：小寫英數、單一 hyphen 分隔，1-64 字元。" });
      return;
    }

    if (!skillForm.description.trim()) {
      setSkillInstallResult({ status: "error", message: "Skill description 是官方必要欄位。" });
      return;
    }

    if (archiveName && !/\.(zip|tar|tgz|tar\.gz)$/i.test(archiveName)) {
      setSkillInstallResult({ status: "error", message: "壓縮檔只支援 .zip、.tar、.tgz、.tar.gz。" });
      return;
    }

    const basePath = getSkillBasePath(skillForm.installTarget);
    const nextSkill: SkillDefinition = {
      id: skillName,
      name: skillName,
      description: skillForm.description.trim(),
      scope: archiveName ? "archive" : getSkillScope(skillForm.installTarget),
      enabled: true,
      path: `${basePath}/${skillName}/SKILL.md`,
      license: skillForm.license.trim() || undefined,
      compatibility: skillForm.compatibility.trim() || undefined,
      archiveName: archiveName || undefined,
      installTarget: skillForm.installTarget,
    };

    setSkillSettings((current) => current.some((skill) => skill.id === skillName) ? current : [nextSkill, ...current]);
    setSkillInstallResult({ status: "success", message: archiveName ? `已新增 archive skill：解壓後需包含 ${skillName}/SKILL.md。` : `已新增 skill：${nextSkill.path}` });
    setSkillForm(emptySkillForm);
    setPluginSkillTab("skills");
    setPluginSkillDialogView("list");
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
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
    setGuidanceSubagent(null);
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
    setGuidanceSubagent(null);
    setAgentDialogView("config");
  }

  function openAddToolMode() {
    setToolEditMode("add");
    setEditingToolId(null);
    setToolForm(emptyToolForm);
    setToolTestResult(null);
    setAgentDialogView("tool-config");
  }

  function openEditToolMode(tool: ToolDefinition) {
    if (tool.source !== "custom") return;
    setToolEditMode("edit");
    setEditingToolId(tool.id);
    setToolForm({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      runtime: tool.runtime ?? "js-ts",
      entry: tool.entry ?? `./.opencode/tools/${tool.name}.${tool.runtime === "python" ? "py" : "ts"}`,
      code: tool.code ?? "",
      testInput: tool.testInput ?? emptyToolForm.testInput,
    });
    setToolTestResult(null);
    setAgentDialogView("tool-config");
  }

  function openAgentDetail(agent: AgentDefinition) {
    setSelectedAgentId(agent.id);
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setGuidanceSubagent(null);
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
      top_p: agent.top_p ?? "1",
      variant: agent.variant ?? "",
      steps: agent.steps ?? "",
      disable: agent.disable ?? false,
      hidden: agent.hidden ?? false,
      color: agent.color ?? "",
      promptSource: agent.promptSource ?? "inline",
      promptFile: agent.promptFile ?? "",
      providerOptionsJson: agent.providerOptionsJson ?? "",
      permissionRulesJson: agent.permissionRulesJson ?? "",
      tools: agent.tools,
      toolGuidance: agent.toolGuidance ?? {},
      skillGuidance: agent.skillGuidance ?? {},
      skills: agent.skills,
      subagents: agent.subagents,
      subagentGuidance: agent.subagentGuidance ?? {},
      permission: agent.permission,
      systemPrompt: agent.systemPrompt,
    });
    setAgentYaml(agentToYaml(agent));
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setGuidanceSubagent(null);
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
    const yamlPromptFile = agentYaml.match(/^prompt:\s*"?\{file:(.+?)\}"?$/m)?.[1]?.trim();
    const yamlPrompt = agentYaml.split("---").slice(2).join("---").trim();
    const nextAgent: AgentDefinition = {
      id: editingAgentId ?? `agent-${Date.now()}`,
      name: agentConfigMode === "yaml" ? yamlName || fallbackName : agentForm.name.trim() || fallbackName,
      description: agentConfigMode === "yaml" ? yamlDescription || "透過 YAML 新增的 opencode agent。" : agentForm.description.trim() || "透過介面新增的 opencode agent。",
      scope: "custom" as const,
      mode: agentConfigMode === "yaml" ? yamlMode ?? "subagent" : agentForm.mode,
      model: agentConfigMode === "yaml" ? yamlModel || "openai/gpt-5.5" : agentForm.model,
      temperature: agentConfigMode === "yaml" ? agentYaml.match(/^temperature:\s*(.+)$/m)?.[1]?.trim() : agentForm.temperature,
      top_p: agentConfigMode === "yaml" ? agentYaml.match(/^top_p:\s*(.+)$/m)?.[1]?.trim() : agentForm.top_p,
      variant: agentConfigMode === "yaml" ? agentYaml.match(/^variant:\s*(.+)$/m)?.[1]?.trim() : agentForm.variant,
      steps: agentConfigMode === "yaml" ? agentYaml.match(/^steps:\s*(.+)$/m)?.[1]?.trim() : agentForm.steps,
      disable: agentConfigMode === "yaml" ? agentYaml.match(/^disable:\s*true$/m) !== null : agentForm.disable,
      hidden: agentConfigMode === "yaml" ? agentYaml.match(/^hidden:\s*true$/m) !== null : agentForm.hidden,
      color: agentConfigMode === "yaml" ? agentYaml.match(/^color:\s*(.+)$/m)?.[1]?.trim() : agentForm.color,
      promptSource: agentConfigMode === "yaml" ? yamlPromptFile ? "file" : "inline" : agentForm.promptSource,
      promptFile: agentConfigMode === "yaml" ? yamlPromptFile ?? "" : agentForm.promptFile,
      providerOptionsJson: agentConfigMode === "yaml" ? "" : agentForm.providerOptionsJson,
      permissionRulesJson: agentConfigMode === "yaml" ? "" : agentForm.permissionRulesJson,
      tools: agentConfigMode === "yaml" ? ["read", "grep", "glob"] : agentForm.tools,
      toolGuidance: agentConfigMode === "yaml" ? {} : agentForm.toolGuidance,
      skillGuidance: agentConfigMode === "yaml" ? {} : agentForm.skillGuidance,
      skills: agentConfigMode === "yaml" ? ["react-vite-feature-based"] : agentForm.skills,
      subagents: agentConfigMode === "yaml" ? [] : agentForm.subagents,
      subagentGuidance: agentConfigMode === "yaml" ? {} : agentForm.subagentGuidance,
      permission: agentConfigMode === "yaml" ? emptyAgentForm.permission : { ...agentForm.permission, task: taskPermissionFor(agentForm.subagents) },
      systemPrompt: agentConfigMode === "yaml" ? yamlPrompt || "" : agentForm.systemPrompt,
    };

    setAgents((current) => {
      if (agentEditMode === "edit" && editingAgentId) {
        return current.map((agent) => agent.id === editingAgentId ? nextAgent : agent);
      }

      return [...current, nextAgent];
    });
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
    setAgentDialogView("list");
  }

  function deleteAgent(agentId: string) {
    setAgents((current) => current.filter((agent) => agent.id !== agentId).map((agent) => {
      const nextSubagentGuidance = { ...agent.subagentGuidance };
      delete nextSubagentGuidance[agentId];
      return { ...agent, subagents: agent.subagents.filter((subagentId) => subagentId !== agentId), subagentGuidance: nextSubagentGuidance };
    }));
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
  }

  function submitToolConfig() {
    const name = toolForm.name.trim().replace(/\s+/g, "_");
    if (!name) return;

    const nextTool: ToolDefinition = {
      id: editingToolId ?? name,
      name,
      description: toolForm.description.trim() || "Custom project tool.",
      category: toolForm.category.trim() || "Custom",
      source: "custom",
      runtime: toolForm.runtime,
      entry: toolForm.entry.trim() || `./.opencode/tools/${name}.${toolForm.runtime === "python" ? "py" : "ts"}`,
      code: toolForm.code,
      testInput: toolForm.testInput,
    };

    setToolDefinitions((current) => {
      if (toolEditMode === "edit" && editingToolId) {
        return current.map((tool) => tool.id === editingToolId && tool.source === "custom" ? nextTool : tool);
      }

      return current.some((tool) => tool.name === name) ? current : [...current, nextTool];
    });
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
    setToolToAdd(name);
    setAgentDialogView("list");
    setAgentToolTab("tools");
  }

  function deleteTool(tool: ToolDefinition) {
    if (tool.source !== "custom") return;
    setToolDefinitions((current) => current.filter((item) => item.id !== tool.id));
    setAgents((current) => current.map((agent) => {
      const permissionKey = getToolPermissionKey(tool.name);
      const nextPermission = { ...agent.permission };
      const nextToolGuidance = { ...agent.toolGuidance };
      delete nextPermission[permissionKey];
      delete nextToolGuidance[tool.name];
      return { ...agent, tools: agent.tools.filter((item) => item !== tool.name), permission: nextPermission, toolGuidance: nextToolGuidance };
    }));
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
  }

  function runToolCallTest() {
    if (!toolForm.name.trim()) {
      setToolTestResult({ status: "error", message: "Tool 名稱必填。" });
      return;
    }

    if (!toolForm.entry.trim()) {
      setToolTestResult({ status: "error", message: "Entry file 必填，否則執行時找不到 tool 檔案。" });
      return;
    }

    if (!toolForm.code.trim()) {
      setToolTestResult({ status: "error", message: "Tool code 不能為空，請先填入 Python 或 JS/TS 實作。" });
      return;
    }

    try {
      JSON.parse(toolForm.testInput || "{}");
    } catch {
      setToolTestResult({ status: "error", message: "Test input 必須是合法 JSON。" });
      return;
    }

    const expectedExtension = toolForm.runtime === "python" ? ".py" : ".ts 或 .js";
    const extensionValid = toolForm.runtime === "python"
      ? toolForm.entry.endsWith(".py")
      : toolForm.entry.endsWith(".ts") || toolForm.entry.endsWith(".js");

    if (!extensionValid) {
      setToolTestResult({ status: "error", message: `${toolForm.runtime === "python" ? "Python" : "JS/TS"} tool 的 entry 建議使用 ${expectedExtension}。` });
      return;
    }

    setToolTestResult({ status: "success", message: "Tool call test passed：基本設定、entry 副檔名、code 與 JSON 測試參數都有效。" });
  }

  function updateAgentConfig(agentId: string, update: (agent: AgentDefinition) => AgentDefinition) {
    setAgents((current) => current.map((agent) => agent.id === agentId ? update(agent) : agent));
  }

  function addFormSubagent() {
    const options = getCallableSubagentOptions(editingAgentId, agentForm.subagents);
    const subagentId = options.some((agent) => agent.id === subagentToAdd) ? subagentToAdd : options[0]?.id;
    if (!subagentId) return;
    setAgentForm((current) => {
      if (current.subagents.includes(subagentId)) return current;
      const nextSubagents = [...current.subagents, subagentId];
      return { ...current, subagents: nextSubagents, subagentGuidance: { ...current.subagentGuidance, [subagentId]: current.subagentGuidance[subagentId] ?? "" }, permission: { ...current.permission, task: taskPermissionFor(nextSubagents) } };
    });
  }

  function removeFormSubagent(subagentId: string) {
    if (guidanceSubagent === subagentId) setGuidanceSubagent(null);
    setAgentForm((current) => {
      const nextSubagentGuidance = { ...current.subagentGuidance };
      delete nextSubagentGuidance[subagentId];
      const nextSubagents = current.subagents.filter((item) => item !== subagentId);
      return { ...current, subagents: nextSubagents, subagentGuidance: nextSubagentGuidance, permission: { ...current.permission, task: taskPermissionFor(nextSubagents) } };
    });
  }

  function updateSubagentGuidance(subagentId: string, value: string) {
    if (agentDialogView === "config") {
      setAgentForm((current) => ({
        ...current,
        subagentGuidance: { ...current.subagentGuidance, [subagentId]: value },
      }));
      return;
    }

    if (selectedAgentId) {
      updateAgentConfig(selectedAgentId, (agent) => ({
        ...agent,
        subagentGuidance: { ...agent.subagentGuidance, [subagentId]: value },
      }));
    }
  }

  function updateToolGuidance(tool: string, value: string) {
    if (!isCustomToolName(tool)) return;

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

  return (
    <>
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
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.active ? "bg-accent text-accent-foreground" : "text-foreground"}`}
                  onClick={() => {
                    if (item.label === "專案") {
                      setProjectDialogView("list");
                      setProjectDialogOpen(true);
                    }
                    if (item.label === "MCP Server") openMcpList();
                    if (item.label === "外掛/技能") openPluginSkillSettings();
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
        className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]"
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
        <ul className="grid min-h-0 auto-rows-max content-start gap-1 overflow-y-auto pr-1 pb-2">
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

      <div className="shrink-0 border-border/70 border-t px-2 pt-3">
        <button
          aria-label="開啟使用者設定"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setUserSettingsOpen(true)}
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
          <SettingsIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
      </Sidebar>

      {projectDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label={projectDialogView === "list" ? "打開項目" : "建立專案"}
            className="w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
          >
            <div className="flex h-14 items-center justify-between gap-4 border-border/70 border-b px-4">
              <div className="flex min-w-0 items-center gap-2">
                {projectDialogView === "create" && (
                  <button
                    aria-label="返回項目列表"
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setProjectDialogView("list")}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                  </button>
                )}
                <h2 className="font-semibold text-base">{projectDialogView === "list" ? "打開項目" : "建立專案"}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {projectDialogView === "list" && <Button onClick={() => setProjectDialogView("create")} size="sm" variant="outline"><PlusIcon aria-hidden="true" />建立專案</Button>}
                <button
                  aria-label={projectDialogView === "list" ? "關閉打開項目" : "關閉建立專案"}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setProjectDialogOpen(false);
                    setProjectDialogView("list");
                  }}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-3">
              {projectDialogView === "list" ? (
                <>
                  <label className="relative block">
                    <span className="sr-only">搜尋文件夾</span>
                    <SearchIcon aria-hidden="true" className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
                    <input
                      className="h-10 w-full rounded-lg border-0 bg-muted/60 pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted focus:ring-2 focus:ring-ring"
                      onChange={(event) => setProjectSearch(event.target.value)}
                      placeholder="搜尋文件夾"
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
                            onClick={() => confirmOpenProject(project.path)}
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
                </>
              ) : (
                <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
                  <div className="grid gap-1">
                    <h3 className="font-semibold text-sm">建立新專案</h3>
                    <p className="text-muted-foreground text-xs">輸入專案名稱，建立後會自動切換到新專案。</p>
                  </div>
                  <label className="grid gap-1.5">
                    <span className="font-medium text-xs">專案名稱</span>
                    <Input
                      aria-label="新專案名稱"
                      autoFocus
                      onChange={(event) => setProjectCreateName(event.target.value)}
                      placeholder="例如：agent-web"
                      value={projectCreateName}
                    />
                    <span className="text-muted-foreground text-xs">系統會自動建立到 workspace 專案目錄。</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setProjectDialogView("list")} size="sm" variant="outline">取消</Button>
                    <Button className="sm:min-w-24" disabled={!projectCreateName.trim()} onClick={confirmCreateProject} size="sm">
                      <PlusIcon aria-hidden="true" />
                      建立專案
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {userSettingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label="使用者設定"
            className={`flex max-h-[calc(100dvh-2rem)] min-h-0 w-full flex-col overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)] ${selectedModelProvider ? "max-w-[640px]" : "max-w-[760px]"}`}
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-5">
              <div className="flex min-w-0 items-center gap-2">
                {selectedModelProvider && (
                  <button
                    aria-label="返回模型供應商列表"
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      if (selectedProviderAuthMethod) {
                        setSelectedProviderAuthMethod(null);
                        return;
                      }

                      setSelectedModelProviderId(null);
                    }}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                  </button>
                )}
                {!selectedModelProvider && (
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base">使用者設定</h2>
                    <p className="mt-0.5 text-muted-foreground text-xs">帳號、模型供應商與 Agent API 配置。</p>
                  </div>
                )}
              </div>
              <button
                aria-label="關閉使用者設定"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={closeUserSettings}
                type="button"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {!selectedModelProvider ? (
                <div className="mx-auto grid max-w-[680px] gap-8">
                  <section className="grid gap-3" aria-labelledby="connected-provider-title">
                    <h3 className="font-semibold text-sm" id="connected-provider-title">提供商</h3>
                    <ul className="grid gap-2">
                      {modelProviders.filter((provider) => provider.connected).map((provider) => (
                        <li className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3" key={provider.id}>
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-5 shrink-0 place-items-center font-bold text-sm">{provider.icon}</span>
                            <strong className="truncate font-semibold text-sm">{provider.name}</strong>
                            <Badge size="sm" variant="secondary">API 密鑰</Badge>
                          </div>
                          <Button onClick={() => updateModelProvider(provider.id, { connected: false, enabled: false })} size="sm" variant="ghost">斷開連接</Button>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="grid gap-3" aria-labelledby="popular-provider-title">
                    <h3 className="font-semibold text-sm" id="popular-provider-title">熱門提供商</h3>
                    <ul className="overflow-hidden rounded-lg bg-muted/45">
                      {modelProviders.filter((provider) => !provider.connected).map((provider) => (
                        <li className="border-border/70 border-b last:border-b-0" key={provider.id}>
                          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid size-5 shrink-0 place-items-center font-bold text-sm">{provider.icon}</span>
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <strong className="truncate font-semibold text-sm">{provider.name}</strong>
                                  {provider.badge && <Badge size="sm" variant="secondary">{provider.badge}</Badge>}
                                </div>
                                <p className="mt-0.5 truncate text-muted-foreground text-xs">{provider.description}</p>
                              </div>
                            </div>
                            <Button onClick={() => { setSelectedModelProviderId(provider.id); setSelectedProviderAuthMethod(null); }} size="sm" variant="outline">
                              <PlusIcon aria-hidden="true" />
                              連接
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : selectedProviderAuthMethod ? (
                <div className="grid gap-8 px-0 pt-1 pb-14">
                  <div className="flex items-center gap-4">
                    <span className="grid size-5 shrink-0 place-items-center font-bold text-sm">{selectedModelProvider.icon}</span>
                    <h3 className="font-semibold text-base">連接 {selectedModelProvider.name}</h3>
                  </div>

                  <section className="grid gap-6" aria-labelledby="provider-verification-title">
                    <p className="text-muted-foreground text-sm leading-6" id="provider-verification-title">
                      訪問 <button className="font-medium text-foreground underline underline-offset-4" type="button">此鏈接</button> 並輸入以下代碼，以連接你的帳戶並在 OpenCode 中使用 {selectedModelProvider.name} 模型。
                    </p>
                    <label className="grid gap-2 text-muted-foreground text-xs">
                      確認碼
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-lg border bg-muted/35">
                        <input aria-label="確認碼" className="h-9 min-w-0 rounded-l-lg border-0 bg-transparent px-3 font-mono text-foreground text-sm outline-none" readOnly value="V58L-H67ZK" />
                        <button aria-label="複製確認碼" className="grid size-9 place-items-center rounded-r-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button">
                          <CopyIcon aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </label>
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                      <span aria-hidden="true" className="grid size-4 grid-cols-2 gap-0.5 opacity-60">
                        <span className="rounded-[1px] bg-current" />
                        <span className="rounded-[1px] bg-current/40" />
                        <span className="rounded-[1px] bg-current/40" />
                        <span className="rounded-[1px] bg-current" />
                      </span>
                      等待授權...
                    </div>
                  </section>
                </div>
              ) : (
                <div className="grid gap-8 px-0 pt-1 pb-14">
                  <div className="flex items-center gap-4">
                    <span className="grid size-5 shrink-0 place-items-center font-bold text-sm">{selectedModelProvider.icon}</span>
                    <h3 className="font-semibold text-base">連接 {selectedModelProvider.name}</h3>
                  </div>

                  <section className="grid gap-3" aria-labelledby="provider-auth-methods-title">
                    <p className="text-muted-foreground text-sm" id="provider-auth-methods-title">選擇 {selectedModelProvider.name} 的登錄方式。</p>
                    <div className="grid gap-1 pl-4">
                      {selectedModelProvider.authMethods.map((method) => (
                        <button
                          className="flex min-h-9 w-full items-center rounded-lg px-3 text-left font-medium text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          key={method}
                          onClick={() => setSelectedProviderAuthMethod(method)}
                          type="button"
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            {!selectedModelProvider && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-border/70 border-t bg-background px-5 py-4">
              <p className="text-muted-foreground text-xs">建議使用 `/connect` 或 {"{env:KEY}"}，避免把明文 API Key 寫入專案。</p>
              <Button onClick={() => setUserSettingsOpen(false)} size="lg">完成</Button>
            </div>}
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

      {pluginSkillDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label="外掛與技能設定"
            className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-[640px] flex-col overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-5">
              <div className="flex min-w-0 items-center gap-2">
                {pluginSkillDialogView !== "list" && (
                  <button
                    aria-label="返回外掛與技能列表"
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setPluginSkillDialogView("list")}
                    type="button"
                  >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-base">{pluginSkillDialogView === "add-plugin" ? "新增 Plugin" : pluginSkillDialogView === "add-skill" ? "新增 Skill" : "外掛/技能"}</h2>
                  <p className="mt-0.5 text-muted-foreground text-xs">Plugins {plugins.length} · Skills {skillSettings.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {pluginSkillDialogView === "list" && (
                  <Button onClick={() => setPluginSkillDialogView(pluginSkillTab === "plugins" ? "add-plugin" : "add-skill")} size="sm" variant="outline">
                    <PlusIcon aria-hidden="true" />
                    {pluginSkillTab === "plugins" ? "新增 Plugin" : "新增 Skill"}
                  </Button>
                )}
                <button
                  aria-label="關閉外掛與技能設定"
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setPluginSkillDialogOpen(false);
                    setPluginSkillDialogView("list");
                  }}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
              {pluginSkillDialogView === "list" ? (
                <>
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
                <button className={`h-8 rounded-md font-medium text-sm transition ${pluginSkillTab === "plugins" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => { setPluginSkillTab("plugins"); setPluginSkillSearch(""); }} type="button">外掛</button>
                <button className={`h-8 rounded-md font-medium text-sm transition ${pluginSkillTab === "skills" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => { setPluginSkillTab("skills"); setPluginSkillSearch(""); }} type="button">技能</button>
              </div>

              <InputGroup data-size="sm">
                <InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon>
                <InputGroupInput aria-label="搜尋外掛或技能" onChange={(event) => setPluginSkillSearch(event.target.value)} placeholder={pluginSkillTab === "plugins" ? "搜尋外掛名稱、描述或 entry" : "搜尋技能名稱、描述或路徑"} value={pluginSkillSearch} />
                {pluginSkillSearch && <InputGroupAddon align="inline-end"><button aria-label="清除搜尋" className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setPluginSkillSearch("")} type="button"><XIcon aria-hidden="true" className="size-3.5" /></button></InputGroupAddon>}
              </InputGroup>

              {pluginSkillTab === "plugins" && (
                <section className="grid gap-2" aria-labelledby="plugins-settings-title">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-sm" id="plugins-settings-title">Plugins</h3><Badge size="sm" variant="secondary">{plugins.filter((plugin) => plugin.enabled).length} enabled</Badge></div>
                  <ul className="grid gap-2">
                    {filteredPlugins.map((plugin) => (
                      <li className="rounded-lg bg-muted/55 px-4 py-3" key={plugin.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="truncate font-semibold text-sm">{plugin.name}</span><Badge size="sm" variant={plugin.enabled ? "success" : "secondary"}>{plugin.enabled ? "enabled" : "disabled"}</Badge><Badge size="sm" variant="outline">{plugin.source}</Badge>{plugin.installTarget && <Badge size="sm" variant="info">{plugin.installTarget}</Badge>}</div>
                            <p className="mt-1 text-muted-foreground text-xs leading-5">{plugin.description}</p>
                            {plugin.archiveName && <p className="mt-1 truncate text-muted-foreground text-xs">Archive: {plugin.archiveName}</p>}
                            <p className="mt-1 truncate font-mono text-muted-foreground text-xs">{plugin.entry}</p>
                          </div>
                          <Button onClick={() => togglePlugin(plugin.id)} size="sm" variant={plugin.enabled ? "outline" : "secondary"}>{plugin.enabled ? "停用" : "啟用"}</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {filteredPlugins.length === 0 && <p className="rounded-md border border-dashed bg-background px-3 py-6 text-center text-muted-foreground text-sm">找不到符合的外掛。</p>}
                </section>
              )}

              {pluginSkillTab === "skills" && (
                <section className="grid gap-2" aria-labelledby="skills-settings-title">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-sm" id="skills-settings-title">Skills</h3><Badge size="sm" variant="secondary">{skillSettings.filter((skill) => skill.enabled).length} enabled</Badge></div>
                  <ul className="grid gap-2">
                    {filteredSkillSettings.map((skill) => (
                      <li className="flex items-start justify-between gap-3 rounded-lg bg-muted/55 px-4 py-3" key={skill.id}>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="truncate font-semibold text-sm">{skill.name}</span><Badge size="sm" variant={skill.enabled ? "success" : "secondary"}>{skill.enabled ? "enabled" : "disabled"}</Badge><Badge size="sm" variant="outline">{skill.scope}</Badge>{skill.installTarget && <Badge size="sm" variant="info">{skill.installTarget}</Badge>}</div>
                          <p className="mt-1 text-muted-foreground text-xs leading-5">{skill.description}</p>
                          {skill.archiveName && <p className="mt-1 truncate text-muted-foreground text-xs">Archive: {skill.archiveName}</p>}
                          <p className="mt-1 truncate font-mono text-muted-foreground text-xs">{skill.path}</p>
                        </div>
                        <Button onClick={() => toggleSkill(skill.id)} size="sm" variant={skill.enabled ? "outline" : "secondary"}>{skill.enabled ? "停用" : "啟用"}</Button>
                      </li>
                    ))}
                  </ul>
                  {filteredSkillSettings.length === 0 && <p className="rounded-md border border-dashed bg-background px-3 py-6 text-center text-muted-foreground text-sm">找不到符合的技能。</p>}
                </section>
              )}
                </>
              ) : pluginSkillDialogView === "add-plugin" ? (
                <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
                  <div className="grid gap-1">
                    <h3 className="font-semibold text-sm">新增 Plugin</h3>
                    <p className="text-muted-foreground text-xs leading-5">依 OpenCode 官方方式載入：npm 寫入 config，local/archive 放到 plugins 目錄。</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-muted-foreground text-xs">來源<select className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => { setPluginInstallResult(null); setPluginForm((current) => ({ ...current, method: event.target.value as PluginInstallMethod })); }} value={pluginForm.method}><option value="npm">npm package</option><option value="local">local file</option><option value="archive">archive</option></select></label>
                    <label className="grid gap-1 text-muted-foreground text-xs">Install target<select className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" disabled={pluginForm.method === "npm"} onChange={(event) => setPluginForm((current) => ({ ...current, installTarget: event.target.value as "project" | "global" }))} value={pluginForm.installTarget}><option value="project">project</option><option value="global">global</option></select></label>
                  </div>
                  {pluginForm.method === "archive" ? <label className="grid gap-1 text-muted-foreground text-xs">Plugin archive<Input aria-label="Plugin 壓縮檔" onChange={(event) => { setPluginInstallResult(null); setPluginForm((current) => ({ ...current, archiveName: event.target.files?.[0]?.name ?? "" })); }} type="file" accept=".zip,.tar,.tgz,.gz" /></label> : <label className="grid gap-1 text-muted-foreground text-xs">{pluginForm.method === "npm" ? "NPM package" : "Plugin name"}<Input aria-label="Plugin 名稱" autoFocus onChange={(event) => { setPluginInstallResult(null); setPluginForm((current) => ({ ...current, name: event.target.value })); }} placeholder={pluginForm.method === "npm" ? "opencode-helicone-session" : "project-hooks"} value={pluginForm.name} /></label>}
                  {pluginForm.method === "local" && <label className="grid gap-1 text-muted-foreground text-xs">Local entry<Input aria-label="Local plugin entry" onChange={(event) => { setPluginInstallResult(null); setPluginForm((current) => ({ ...current, entry: event.target.value })); }} placeholder="./.opencode/plugins/my-plugin.ts" value={pluginForm.entry} /></label>}
                  <label className="grid gap-1 text-muted-foreground text-xs">描述<Input aria-label="Plugin 描述" onChange={(event) => setPluginForm((current) => ({ ...current, description: event.target.value }))} placeholder="可留空" value={pluginForm.description} /></label>
                  {pluginForm.method === "archive" && pluginForm.archiveName && <p className="truncate text-muted-foreground text-xs">已選擇：{pluginForm.archiveName}</p>}
                  {pluginInstallResult && <div className={`rounded-md border px-3 py-2 text-xs ${pluginInstallResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{pluginInstallResult.message}</div>}
                  <p className="text-muted-foreground text-xs">npm: `plugin` config array；local: `.opencode/plugins/` 或 `~/.config/opencode/plugins/`；archive: 解壓到 plugin directory。</p>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setPluginSkillDialogView("list")} size="sm" variant="outline">取消</Button>
                    <Button onClick={addPluginFromOfficialSource} size="sm" type="button">新增 Plugin</Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
                  <div className="grid gap-1">
                    <h3 className="font-semibold text-sm">新增 Skill</h3>
                    <p className="text-muted-foreground text-xs leading-5">依 OpenCode 官方方式建立 name/SKILL.md，可放在 OpenCode、Claude 或 Agents 相容目錄。</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-muted-foreground text-xs">Skill name<Input aria-label="Skill name" autoFocus onChange={(event) => { setSkillInstallResult(null); setSkillForm((current) => ({ ...current, name: event.target.value })); }} placeholder="git-release" value={skillForm.name} /></label>
                    <label className="grid gap-1 text-muted-foreground text-xs">Install target<select className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setSkillForm((current) => ({ ...current, installTarget: event.target.value as SkillInstallTarget }))} value={skillForm.installTarget}><option value="project-opencode">project .opencode</option><option value="global-opencode">global opencode</option><option value="project-claude">project .claude</option><option value="global-claude">global claude</option><option value="project-agents">project .agents</option><option value="global-agents">global agents</option></select></label>
                  </div>
                  <label className="grid gap-1 text-muted-foreground text-xs">Description<Input aria-label="Skill description" onChange={(event) => { setSkillInstallResult(null); setSkillForm((current) => ({ ...current, description: event.target.value })); }} placeholder="Create consistent releases and changelogs" value={skillForm.description} /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-muted-foreground text-xs">License<Input aria-label="Skill license" onChange={(event) => setSkillForm((current) => ({ ...current, license: event.target.value }))} placeholder="MIT" value={skillForm.license} /></label>
                    <label className="grid gap-1 text-muted-foreground text-xs">Compatibility<Input aria-label="Skill compatibility" onChange={(event) => setSkillForm((current) => ({ ...current, compatibility: event.target.value }))} placeholder="opencode" value={skillForm.compatibility} /></label>
                  </div>
                  <label className="grid gap-1 text-muted-foreground text-xs">Archive import optional<Input aria-label="Skill archive" onChange={(event) => { setSkillInstallResult(null); setSkillForm((current) => ({ ...current, archiveName: event.target.files?.[0]?.name ?? "" })); }} type="file" accept=".zip,.tar,.tgz,.gz" /></label>
                  {skillForm.archiveName && <p className="truncate text-muted-foreground text-xs">已選擇：{skillForm.archiveName}</p>}
                  {skillInstallResult && <div className={`rounded-md border px-3 py-2 text-xs ${skillInstallResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{skillInstallResult.message}</div>}
                  <p className="text-muted-foreground text-xs">官方規則：名稱需符合 `^[a-z0-9]+(-[a-z0-9]+)*$`，目錄名需與 SKILL.md frontmatter 的 `name` 一致。</p>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setPluginSkillDialogView("list")} size="sm" variant="outline">取消</Button>
                    <Button onClick={addSkillFromOfficialSource} size="sm" type="button">新增 Skill</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-border/70 border-t bg-background px-6 py-4">
              <p className="text-muted-foreground text-xs">修改後需要更新並重新載入 OpenCode。</p>
              <div className="flex items-center gap-2">
                <Button onClick={() => setPluginSkillDialogOpen(false)} size="lg" variant="outline">關閉</Button>
                <Button disabled={!pluginSkillHasChanges} onClick={() => confirmBatchUpdate("plugins-skills")} size="lg">更新</Button>
              </div>
              {batchUpdateNotice && <p className="basis-full text-emerald-700 text-xs">{batchUpdateNotice}</p>}
            </div>
          </section>
        </div>
      )}

      {agentsDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4" role="presentation">
          <section
            aria-label="Agents"
            className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-[640px] flex-col overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-5">
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
                    {agentDialogView === "list" ? "智能體/工具" : agentDialogView === "detail" ? "Agent 設定" : agentDialogView === "tool-config" ? toolEditMode === "add" ? "新增 Tool" : "編輯 Tool" : agentEditMode === "add" ? "新增 Agent" : "編輯 Agent"}
                  </h2>
                  <p className="mt-0.5 text-muted-foreground text-xs">{agentDialogView === "list" ? `Total ${agentToolTab === "agents" ? agents.length : toolDefinitions.length}` : agentDialogView === "tool-config" ? "Python / JS / TS custom tool" : "介面配置 / 文字配置 YAML"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label={agentToolTab === "tools" ? "新增 Tool" : "新增 Agent"}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={agentToolTab === "tools" ? openAddToolMode : openAddAgentMode}
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
              <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 pb-6">
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
                                {tool.runtime && <Badge size="sm" variant="info">{tool.runtime === "python" ? "Python" : "JS/TS"}</Badge>}
                              </div>
                              <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{tool.description}</p>
                            </div>
                            <Menu>
                              <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                              </MenuTrigger>
                              <MenuPopup align="end" className="min-w-36">
                                <MenuItem>查看工具說明</MenuItem>
                                {tool.source === "custom" && <MenuItem onClick={() => openEditToolMode(tool)}>編輯</MenuItem>}
                                <MenuItem>複製工具名稱</MenuItem>
                                {tool.source === "custom" && <MenuSeparator />}
                                {tool.source === "custom" && <MenuItem onClick={() => deleteTool(tool)} variant="destructive">刪除</MenuItem>}
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

            {agentDialogView === "tool-config" && (
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
                <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-muted-foreground text-sm">Tool 名稱<Input aria-label="Tool 名稱" onChange={(event) => { setToolTestResult(null); setToolForm((current) => ({ ...current, name: event.target.value })); }} placeholder="cms_publish" value={toolForm.name} /></label>
                    <label className="grid gap-2 text-muted-foreground text-sm">Category<Input aria-label="Tool category" onChange={(event) => setToolForm((current) => ({ ...current, category: event.target.value }))} placeholder="Custom" value={toolForm.category} /></label>
                  </div>
                  <label className="grid gap-2 text-muted-foreground text-sm">描述<Textarea aria-label="Tool 描述" onChange={(event) => setToolForm((current) => ({ ...current, description: event.target.value }))} placeholder="描述這個 tool 會做什麼，以及 agent 什麼時候應該使用它。" rows={3} value={toolForm.description} /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-muted-foreground text-sm">Runtime<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => { setToolTestResult(null); setToolForm((current) => ({ ...current, runtime: event.target.value as ToolDefinition["runtime"], entry: current.entry || `./.opencode/tools/${current.name || "my-tool"}.${event.target.value === "python" ? "py" : "ts"}` })); }} value={toolForm.runtime}><option value="js-ts">JS / TS</option><option value="python">Python</option></select></label>
                    <label className="grid gap-2 text-muted-foreground text-sm">Entry file<Input aria-label="Tool entry file" onChange={(event) => { setToolTestResult(null); setToolForm((current) => ({ ...current, entry: event.target.value })); }} placeholder={toolForm.runtime === "python" ? "./.opencode/tools/my-tool.py" : "./.opencode/tools/my-tool.ts"} value={toolForm.entry} /></label>
                  </div>
                  <label className="grid gap-2 text-muted-foreground text-sm">Tool code<Textarea aria-label="Tool code" className="font-mono" onChange={(event) => { setToolTestResult(null); setToolForm((current) => ({ ...current, code: event.target.value })); }} placeholder={toolForm.runtime === "python" ? "# Python tool implementation" : "// JS/TS tool implementation"} rows={10} spellCheck={false} value={toolForm.code} /></label>
                  <section className="grid gap-3 rounded-lg border bg-background p-3" aria-labelledby="tool-call-test-title">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground" id="tool-call-test-title">Tool Call Test</h4>
                        <p className="mt-0.5 text-muted-foreground text-xs">保存前先檢查 tool call 的基本設定，避免執行時才失敗。</p>
                      </div>
                      <Button onClick={runToolCallTest} size="sm" type="button" variant="outline">測試 Tool Call</Button>
                    </div>
                    <label className="grid gap-2 text-muted-foreground text-sm">Test input JSON<Textarea aria-label="Tool test input JSON" className="font-mono" onChange={(event) => { setToolTestResult(null); setToolForm((current) => ({ ...current, testInput: event.target.value })); }} placeholder={'{"input":"hello"}'} rows={4} spellCheck={false} value={toolForm.testInput} /></label>
                    {toolTestResult && <div className={`rounded-md border px-3 py-2 text-xs ${toolTestResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{toolTestResult.message}</div>}
                  </section>
                  <div className="rounded-lg border border-dashed bg-background px-3 py-3 text-muted-foreground text-xs">
                    自訂工具會出現在工具清單與 Agent tool selector。內建工具不能編輯，只有 custom tool 可以編輯或刪除。
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-muted-foreground text-xs">Runtime 目前支援 Python 與 JS/TS；請先通過 Tool Call Test 再保存。</p><Button disabled={!toolForm.name.trim() || toolTestResult?.status !== "success"} onClick={submitToolConfig}>{toolEditMode === "add" ? "新增 Tool" : "保存 Tool"}</Button></div>
              </div>
            )}

            {agentDialogView === "detail" && selectedAgent && (
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
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
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-tools-title">Tools</h4><div className="flex items-center gap-1.5"><Badge size="sm" variant="warning">deprecated</Badge><Badge size="sm" variant="secondary">{selectedAgent.tools.length}</Badge></div></div>
                      <div className="grid gap-1.5">
                        {selectedAgent.tools.map((tool) => {
                          const permissionKey = getToolPermissionKey(tool);
                          return (
                            <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={tool}>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto] sm:items-center">
                                <span className="min-w-0 truncate font-mono">{tool}</span>
                                {isCustomToolName(tool) && (
                                  <Button onClick={() => setGuidanceTool(guidanceTool === tool ? null : tool)} size="sm" type="button" variant="outline">
                                    查看使用情境
                                  </Button>
                                )}
                                <select
                                  aria-label={`${tool} permission`}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                                  disabled
                                  value={typeof selectedAgent.permission[permissionKey] === "string" ? selectedAgent.permission[permissionKey] : "ask"}
                                >
                                  <option value="allow">allow</option>
                                  <option value="ask">ask</option>
                                  <option value="deny">deny</option>
                                </select>
                                <span className="size-6" aria-hidden="true" />
                              </div>
                              {guidanceTool === tool && isCustomToolName(tool) && (
                                <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                  使用情境
                                  <Textarea aria-label={`${tool} 使用情境`} placeholder="尚未設定使用情境。" readOnly rows={3} value={selectedAgent.toolGuidance?.[tool] ?? ""} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-muted-foreground text-xs">查看設定為唯讀；請到自訂 Agent 的編輯頁修改 tools。</p>
                    </section>

                    <section className="grid gap-2" aria-labelledby="agent-subagents-title">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-subagents-title">Callable Subagents</h4><Badge size="sm" variant="secondary">{selectedAgent.subagents.length}</Badge></div>
                      <div className="grid gap-1.5">
                        {selectedAgent.subagents.map((subagentId) => {
                          const subagent = agents.find((agent) => agent.id === subagentId);
                          return (
                            <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={subagentId}>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                                <span className="min-w-0 truncate font-mono">{subagent?.name ?? subagentId}</span>
                                <Badge size="sm" variant="outline">{subagent?.mode ?? "subagent"}</Badge>
                                <Button onClick={() => setGuidanceSubagent(guidanceSubagent === subagentId ? null : subagentId)} size="sm" type="button" variant="outline">
                                  查看使用情境
                                </Button>
                                <span className="size-6" aria-hidden="true" />
                              </div>
                              {guidanceSubagent === subagentId && (
                                <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                  使用情境
                                  <Textarea aria-label={`${subagent?.name ?? subagentId} 使用情境`} placeholder="尚未設定使用情境。" readOnly rows={3} value={selectedAgent.subagentGuidance?.[subagentId] ?? ""} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                        {selectedAgent.subagents.length === 0 && <p className="rounded-md border border-dashed bg-background px-3 py-3 text-muted-foreground text-xs">尚未設定可調用 subagent。</p>}
                      </div>
                      <p className="text-muted-foreground text-xs">查看設定為唯讀；請到自訂 Agent 的編輯頁修改 callable subagents。</p>
                      <p className="text-muted-foreground text-xs">這會輸出成官方 permission.task 規則；清單會排除自己與會造成回呼循環的 agent。</p>
                    </section>

                    <section className="grid gap-2" aria-labelledby="agent-skills-title">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-skills-title">Skills</h4><Badge size="sm" variant="secondary">{selectedAgent.skills.length}</Badge></div>
                      <div className="grid gap-1.5">
                        {selectedAgent.skills.map((skill) => (
                          <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={skill}>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                              <span className="min-w-0 truncate font-mono">{skill}</span>
                              <Button onClick={() => setGuidanceSkill(guidanceSkill === skill ? null : skill)} size="sm" type="button" variant="outline">
                                查看使用情境
                              </Button>
                              <span className="size-6" aria-hidden="true" />
                            </div>
                            {guidanceSkill === skill && (
                              <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                使用情境
                                <Textarea aria-label={`${skill} 使用情境`} placeholder="尚未設定使用情境。" readOnly rows={3} value={selectedAgent.skillGuidance?.[skill] ?? ""} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-muted-foreground text-xs">查看設定為唯讀；請到自訂 Agent 的編輯頁修改 skills。</p>
                    </section>

                    <section className="grid gap-2" aria-labelledby="agent-permissions-title">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm" id="agent-permissions-title">Permissions</h4><Badge size="sm" variant="secondary">{Object.keys(selectedAgent.permission).length}</Badge></div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {Object.entries({ ...selectedAgent.permission, task: taskPermissionFor(selectedAgent.subagents) }).map(([key, value]) => <div className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5 text-xs" key={key}><span className="font-mono">{key}</span><Badge size="sm" variant={getPermissionVariant(value)}>{getPermissionLabel(value)}</Badge></div>)}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="grid gap-2" aria-labelledby="agent-yaml-preview-title"><h4 className="font-semibold text-sm" id="agent-yaml-preview-title">Markdown 預覽</h4><pre className="max-h-72 overflow-auto rounded-lg border bg-muted/45 p-3 font-mono text-xs leading-5 text-muted-foreground">{agentToYaml(selectedAgent)}</pre></section>
                )}

                <div className="flex justify-end">
                  {selectedAgent.scope === "custom" ? <Button onClick={() => openEditAgentMode(selectedAgent)} size="sm">編輯 Agent</Button> : <p className="text-muted-foreground text-xs">官方內建 Agent 僅可查看；只有自訂 Agent 可以編輯。</p>}
                </div>
              </div>
            )}

            {agentDialogView === "config" && (
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1"><button className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "interface" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchAgentConfigMode("interface")} type="button">介面配置</button><button className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`} onClick={() => switchAgentConfigMode("yaml")} type="button">文字配置</button></div>
                {agentConfigMode === "interface" ? (
                  <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-muted-foreground text-sm">Agent 名稱<Input aria-label="Agent 名稱" onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} placeholder="docs-implement" value={agentForm.name} /></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Model<select aria-label="Agent model" className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, model: event.target.value }))} value={agentForm.model}>{!availableModels.includes(agentForm.model) && <option value={agentForm.model}>{agentForm.model}</option>}{availableModels.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="grid gap-2 text-muted-foreground text-sm">Mode<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => { const mode = event.target.value as AgentDefinition["mode"]; return { ...current, mode, hidden: mode === "subagent" ? current.hidden : false }; })} value={agentForm.mode}><option value="primary">primary</option><option value="subagent">subagent</option><option value="all">all</option></select></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Temperature<Input aria-label="temperature" onChange={(event) => setAgentForm((current) => ({ ...current, temperature: event.target.value }))} placeholder="0.3" value={agentForm.temperature} /></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Top P<Input aria-label="top_p" onChange={(event) => setAgentForm((current) => ({ ...current, top_p: event.target.value }))} placeholder="1" value={agentForm.top_p} /></label>
                      <label className="grid min-w-0 gap-2 text-muted-foreground text-sm">Variant<select aria-label="variant" className="h-8 min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, variant: event.target.value }))} value={agentForm.variant}>{modelVariants.map((variant) => <option key={variant || "default"} value={variant}>{variant || "default"}</option>)}</select></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-muted-foreground text-sm">Steps<Input aria-label="steps" onChange={(event) => setAgentForm((current) => ({ ...current, steps: event.target.value }))} placeholder="可留空" value={agentForm.steps} /></label>
                    </div>
                    <label className="grid gap-2 text-muted-foreground text-sm">使用時機 / Description<Textarea aria-label="Agent 描述" onChange={(event) => setAgentForm((current) => ({ ...current, description: event.target.value }))} placeholder="描述這個 agent 何時應該被使用，以及它要負責的任務。" rows={3} value={agentForm.description} /></label>
                    <section className="grid gap-3 rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-sm text-foreground">Advanced</h4><Badge size="sm" variant="outline">OpenCode</Badge></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground text-sm"><input checked={agentForm.disable} onChange={(event) => setAgentForm((current) => ({ ...current, disable: event.target.checked }))} type="checkbox" />Disable agent</label>
                        {agentForm.mode === "subagent" && <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground text-sm"><input checked={agentForm.hidden} onChange={(event) => setAgentForm((current) => ({ ...current, hidden: event.target.checked }))} type="checkbox" />Hidden from @ menu</label>}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-2 text-muted-foreground text-sm">Color<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, color: event.target.value }))} value={agentForm.color}>{agentColors.map((color) => <option key={color || "default"} value={color}>{color || "default"}</option>)}</select></label>
                        <label className="grid gap-2 text-muted-foreground text-sm">Prompt Source<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, promptSource: event.target.value as AgentDefinition["promptSource"] }))} value={agentForm.promptSource}><option value="inline">inline markdown body</option><option value="file">file reference</option></select></label>
                      </div>
                      {agentForm.promptSource === "file" && <label className="grid gap-2 text-muted-foreground text-sm">Prompt file<Input aria-label="Prompt file" onChange={(event) => setAgentForm((current) => ({ ...current, promptFile: event.target.value }))} placeholder="./prompts/review.txt" value={agentForm.promptFile} /></label>}
                      <label className="grid gap-2 text-muted-foreground text-sm">Permission rules JSON<Textarea aria-label="Permission rules JSON" className="font-mono" onChange={(event) => setAgentForm((current) => ({ ...current, permissionRulesJson: event.target.value }))} placeholder={'{"bash":{"*":"ask","git *":"allow"},"external_directory":{"~/projects/**":"allow"}}'} rows={3} spellCheck={false} value={agentForm.permissionRulesJson} /></label>
                      <label className="grid gap-2 text-muted-foreground text-sm">Provider-specific options JSON<Textarea aria-label="Provider-specific options JSON" className="font-mono" onChange={(event) => setAgentForm((current) => ({ ...current, providerOptionsJson: event.target.value }))} placeholder={'{"reasoningEffort":"high","textVerbosity":"low"}'} rows={3} spellCheck={false} value={agentForm.providerOptionsJson} /></label>
                    </section>
                    {agentForm.promptSource === "inline" && <label className="grid gap-2 text-muted-foreground text-sm">系統提示詞 / Prompt<Textarea aria-label="系統提示詞" onChange={(event) => setAgentForm((current) => ({ ...current, systemPrompt: event.target.value }))} placeholder="輸入這個 agent 的 system prompt 內容。" rows={5} value={agentForm.systemPrompt} /></label>}

                    <section className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground">Tools</h4>
                        <div className="flex items-center gap-1.5"><Badge size="sm" variant="warning">deprecated</Badge><Badge size="sm" variant="secondary">{agentForm.tools.length}</Badge></div>
                      </div>
                      <div className="grid gap-1.5">
                        {agentForm.tools.map((tool) => {
                          const permissionKey = getToolPermissionKey(tool);
                          return (
                            <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={tool}>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto] sm:items-center">
                                <span className="min-w-0 truncate font-mono">{tool}</span>
                                {isCustomToolName(tool) && (
                                  <Button onClick={() => setGuidanceTool(guidanceTool === tool ? null : tool)} size="sm" type="button" variant="outline">
                                    {agentForm.toolGuidance[tool]?.trim() ? "編輯使用情境" : "新增使用情境"}
                                  </Button>
                                )}
                                <select aria-label={`${tool} permission`} className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, permission: { ...current.permission, [permissionKey]: event.target.value as PermissionAction } }))} value={typeof agentForm.permission[permissionKey] === "string" ? agentForm.permission[permissionKey] : "ask"}>
                                  <option value="allow">allow</option>
                                  <option value="ask">ask</option>
                                  <option value="deny">deny</option>
                                </select>
                                <button aria-label={`移除 tool ${tool}`} className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setAgentForm((current) => { const nextPermission = { ...current.permission }; const nextToolGuidance = { ...current.toolGuidance }; delete nextPermission[permissionKey]; delete nextToolGuidance[tool]; if (guidanceTool === tool) setGuidanceTool(null); return { ...current, tools: current.tools.filter((item) => item !== tool), toolGuidance: nextToolGuidance, permission: nextPermission }; })} type="button"><XIcon aria-hidden="true" className="size-3" /></button>
                              </div>
                              {guidanceTool === tool && isCustomToolName(tool) && (
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
                        <Button onClick={() => setAgentForm((current) => { const permissionKey = getToolPermissionKey(toolToAdd); return current.tools.includes(toolToAdd) ? current : { ...current, tools: [...current.tools, toolToAdd], toolGuidance: isCustomToolName(toolToAdd) ? { ...current.toolGuidance, [toolToAdd]: current.toolGuidance[toolToAdd] ?? "" } : current.toolGuidance, permission: { ...current.permission, [permissionKey]: current.permission[permissionKey] ?? "ask" } }; })} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Tool</Button>
                      </div>
                    </section>

                    <section className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground">Callable Subagents</h4>
                        <Badge size="sm" variant="secondary">{agentForm.subagents.length}</Badge>
                      </div>
                      <div className="grid gap-1.5">
                        {agentForm.subagents.map((subagentId) => {
                          const subagent = agents.find((agent) => agent.id === subagentId);
                          return (
                            <div className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs" key={subagentId}>
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                                <span className="min-w-0 truncate font-mono">{subagent?.name ?? subagentId}</span>
                                <Badge size="sm" variant="outline">{subagent?.mode ?? "subagent"}</Badge>
                                <Button onClick={() => setGuidanceSubagent(guidanceSubagent === subagentId ? null : subagentId)} size="sm" type="button" variant="outline">
                                  {agentForm.subagentGuidance[subagentId]?.trim() ? "編輯使用情境" : "新增使用情境"}
                                </Button>
                                <button aria-label={`移除 subagent ${subagent?.name ?? subagentId}`} className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => removeFormSubagent(subagentId)} type="button"><XIcon aria-hidden="true" className="size-3" /></button>
                              </div>
                              {guidanceSubagent === subagentId && (
                                <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                                  使用情境
                                  <Textarea aria-label={`${subagent?.name ?? subagentId} 使用情境`} onChange={(event) => updateSubagentGuidance(subagentId, event.target.value)} placeholder={`說明這個 agent 什麼情況會呼叫 ${subagent?.name ?? subagentId} subagent。`} rows={3} value={agentForm.subagentGuidance[subagentId] ?? ""} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                        {agentForm.subagents.length === 0 && <p className="rounded-md border border-dashed bg-background px-3 py-3 text-muted-foreground text-xs">尚未設定可調用 subagent。</p>}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setSubagentToAdd(event.target.value)} value={subagentToAdd}>
                          {getCallableSubagentOptions(editingAgentId, agentForm.subagents).map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.mode}</option>)}
                        </select>
                        <Button disabled={getCallableSubagentOptions(editingAgentId, agentForm.subagents).length === 0} onClick={addFormSubagent} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Subagent</Button>
                      </div>
                      <p className="text-muted-foreground text-xs">這會輸出成官方 permission.task 規則；subagent 可以再調用其他 subagent，但不能選回呼叫鏈上的 agent。</p>
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
                        <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setSkillToAdd(event.target.value)} value={skillToAdd}>{availableSkillNames.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select>
                        <Button onClick={() => setAgentForm((current) => current.skills.includes(skillToAdd) ? current : { ...current, skills: [...current.skills, skillToAdd], skillGuidance: { ...current.skillGuidance, [skillToAdd]: current.skillGuidance[skillToAdd] ?? "" } })} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增 Skill</Button>
                      </div>
                    </section>
                    <section className="grid gap-2"><h4 className="font-semibold text-sm text-foreground">Permissions</h4><div className="grid gap-2 sm:grid-cols-2">{Object.entries(agentForm.permission).filter(([key]) => key !== "task").map(([key, value]) => <label className="grid gap-1 text-muted-foreground text-xs" key={key}>{key}<select className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setAgentForm((current) => ({ ...current, permission: { ...current.permission, [key]: event.target.value as PermissionAction } }))} value={typeof value === "string" ? value : "ask"}><option value="allow">allow</option><option value="ask">ask</option><option value="deny">deny</option></select></label>)}</div><p className="text-muted-foreground text-xs">task 權限由 Callable Subagents 產生 object syntax 規則。</p></section>
                  </div>
                ) : (
                  <label className="grid gap-2 text-muted-foreground text-sm">opencode agent Markdown (.md)<Textarea aria-label="opencode agent Markdown" className="font-mono" onChange={(event) => setAgentYaml(event.target.value)} rows={16} spellCheck={false} value={agentYaml} /></label>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-muted-foreground text-xs">介面配置適合快速新增；文字配置可直接編輯 opencode agent Markdown。</p><Button disabled={agentConfigMode === "interface" ? !agentForm.name.trim() : !agentYaml.trim()} onClick={submitAgentConfig}>{agentEditMode === "add" ? "新增 Agent" : "保存 Agent"}</Button></div>
              </div>
            )}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-border/70 border-t bg-background px-6 py-4">
              <p className="text-muted-foreground text-xs">修改後需要更新並重新載入 OpenCode。</p>
              <div className="flex items-center gap-2">
                <Button onClick={() => setAgentsDialogOpen(false)} size="lg" variant="outline">關閉</Button>
                <Button disabled={!agentsToolsHasChanges} onClick={() => confirmBatchUpdate("agents-tools")} size="lg">更新</Button>
              </div>
              {batchUpdateNotice && <p className="basis-full text-emerald-700 text-xs">{batchUpdateNotice}</p>}
            </div>

          </section>
        </div>
      )}
    </>
  );
}
