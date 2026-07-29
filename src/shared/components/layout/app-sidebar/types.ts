import type { Project, Session } from "@/shared/types/workspace";

export type AppSidebarProject = {
  id: Project["id"];
  name: Project["name"];
  path: Project["path"];
};

export type AppSidebarSession = {
  id: Session["id"];
  title: Session["title"];
  meta: Session["meta"];
};

export type AppSidebarProps = {
  activeProjectPath: string;
  onProjectChange: (path: string) => void;
  open: boolean;
  onClose: () => void;
  onSelectSession: () => void;
  projects: AppSidebarProject[];
  sessions: AppSidebarSession[];
};

export type McpServer = {
  id: string;
  url: string;
  name: string;
  username: string;
  password: string;
  version: string;
  isDefault: boolean;
};

export type McpForm = Pick<
  McpServer,
  "url" | "name" | "username" | "password"
>;

export type McpDialogView = "list" | "add" | "edit";
export type ProjectDialogView = "list" | "create";
export type PluginSkillDialogView = "list" | "add-plugin" | "add-skill";
export type PluginSkillTab = "plugins" | "skills";
export type PermissionAction = "allow" | "ask" | "deny";
export type PermissionValue = PermissionAction | Record<string, PermissionAction>;

export type PluginDefinition = {
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

export type PluginInstallMethod = "npm" | "local" | "archive";

export type PluginForm = {
  method: PluginInstallMethod;
  name: string;
  description: string;
  entry: string;
  installTarget: "project" | "global";
  archiveName: string;
};

export type SkillInstallTarget =
  | "project-opencode"
  | "global-opencode"
  | "project-claude"
  | "global-claude"
  | "project-agents"
  | "global-agents";

export type SkillDefinition = {
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

export type SkillForm = {
  name: string;
  description: string;
  installTarget: SkillInstallTarget;
  license: string;
  compatibility: string;
  archiveName: string;
};

export type AgentDefinition = {
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

export type AgentForm = {
  name: string;
  description: string;
  mode: AgentDefinition["mode"];
  model: string;
  temperature: string;
  top_p: string;
  variant: string;
  steps: string;
  disable: boolean;
  hidden: boolean;
  color: string;
  promptSource: NonNullable<AgentDefinition["promptSource"]>;
  promptFile: string;
  providerOptionsJson: string;
  permissionRulesJson: string;
  tools: string[];
  toolGuidance: Record<string, string>;
  skillGuidance: Record<string, string>;
  skills: string[];
  subagents: string[];
  subagentGuidance: Record<string, string>;
  permission: AgentDefinition["permission"];
  systemPrompt: string;
};

export type ToolDefinition = {
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

export type ToolForm = {
  name: string;
  description: string;
  category: string;
  runtime: ToolDefinition["runtime"];
  entry: string;
  code: string;
  testInput: string;
};

export type AgentDialogView = "list" | "detail" | "config" | "tool-config";
export type AgentEditMode = "add" | "edit";
export type ToolEditMode = "add" | "edit";
export type AgentToolTab = "agents" | "tools";
export type AgentConfigMode = "interface" | "yaml";

export type InstallResult = {
  status: "success" | "error";
  message: string;
};
