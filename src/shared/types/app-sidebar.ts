import type { Project, Session } from "@/shared/types/workspace";
import type { OpenCodeProviderListResponse } from "@/shared/api/opencodeProviders";

export type AppSidebarProject = Pick<Project, "description" | "displayName" | "id" | "name" | "path">;

export type AppSidebarSession = {
  id: Session["id"];
  title: Session["title"];
  meta: Session["meta"];
};

export type AppSidebarProps = {
  activeProjectPath: string;
  activeSessionId?: string | null;
  onCreateProject: (name: string) => Promise<AppSidebarProject>;
  onCreateSession: () => Promise<void>;
  onDeleteProject: (project: AppSidebarProject) => Promise<void>;
  onProjectChange: (path: string) => void;
  onOpenCodeProviderCatalogChange?: (catalog: OpenCodeProviderListResponse | null) => void;
  onOpenCodeDisabledModelsChange?: (disabledModelKeys: string[]) => void;
  onRefreshProjects: () => Promise<void>;
  onRestartOpenCode: (reason: string) => Promise<void>;
  onWorkflowOpen: () => void;
  open: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  projects: AppSidebarProject[];
  projectsError?: string | null;
  projectsLoading?: boolean;
  sessions: AppSidebarSession[];
  sessionsError?: string | null;
  sessionsLoading?: boolean;
};

export type McpServerType = "local" | "remote";
export type McpConfigMode = "interface" | "document";

export type McpServer = {
  id: string;
  name: string;
  scope: "project" | "global";
  type: McpServerType;
  url: string;
  command: string[];
  cwd: string;
  environment: Record<string, string>;
  headers: Record<string, string>;
  oauth?: Record<string, unknown> | false;
  enabled: boolean;
  timeout?: number;
  inherited?: boolean;
};

export type McpKeyValueField = { key: string; value: string };
export type McpOAuthForm = { clientId: string; clientSecret: string; scope: string; disabled: boolean };

export type McpForm = {
  name: string;
  type: McpServerType;
  url: string;
  command: string;
  cwd: string;
  environment: McpKeyValueField[];
  headers: McpKeyValueField[];
  oauth: McpOAuthForm;
  enabled: boolean;
  timeout: string;
};

export type McpDialogView = "list" | "add" | "edit";
export type ProjectDialogView = "list" | "create";
export type PluginSkillDialogView = "list" | "add-plugin" | "add-skill" | "plugin-detail" | "edit-skill";
export type PluginSkillTab = "plugins" | "skills";
export type PluginConfigMode = "interface" | "document";
export type PluginConfigScope = "project" | "global";
export type PluginEditorMode = "add" | "edit" | "view";
export type PermissionAction = "allow" | "ask" | "deny";
export type PermissionValue = PermissionAction | Record<string, PermissionAction>;

export type PluginDefinition = {
  id: string;
  name: string;
  description: string;
  source: "remote" | "local" | "built-in" | "archive";
  entry: string;
  enabled: boolean;
  config: string;
  archiveName?: string;
  installTarget?: "project" | "global";
  useInProject?: boolean;
};

export type PluginInstallMethod = "npm" | "local" | "archive";

export type PluginForm = {
  method: PluginInstallMethod;
  name: string;
  description: string;
  entry: string;
  installTarget: "project" | "global";
  archiveName: string;
  code: string;
  useOfficialExample: boolean;
  officialExample: string;
  customPluginEnabled: boolean;
  useInProject: boolean;
};

export type SkillInstallTarget =
  | "project"
  | "global";

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
  inherited?: boolean;
};

export type SkillForm = {
  method: "remote" | "upload";
  useInProject: boolean;
  name: string;
  description: string;
  installTarget: SkillInstallTarget;
  license: string;
  compatibility: string;
  archiveName: string;
  sources: string;
  archiveFiles: File[];
};

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  scope: "system" | "custom";
  installTarget?: "project" | "global";
  inherited?: boolean;
  overridesGlobal?: boolean;
  registryPath?: string;
  registryType?: "file" | "directory";
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
  installTarget: "project" | "global";
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
  installTarget?: "project" | "global";
  inherited?: boolean;
  overridesGlobal?: boolean;
  registryPath?: string;
  registryType?: "file" | "directory";
  runtime?: "js-ts";
  entry?: string;
  code?: string;
  testInput?: string;
};

export type ToolForm = {
  name: string;
  description: string;
  category: string;
  installTarget: NonNullable<ToolDefinition["installTarget"]>;
  runtime: ToolDefinition["runtime"];
  entry: string;
  code: string;
  testInput: string;
};

export type CommandDefinition = {
  id: string;
  name: string;
  description: string;
  source: "runtime" | "custom";
  agent?: string;
  model?: string;
  subtask?: boolean;
  template: string;
  installTarget?: "project" | "global";
  inherited?: boolean;
  overridesGlobal?: boolean;
  registryPath?: string;
  registryType?: "file" | "directory";
};

export type CommandForm = {
  name: string;
  installTarget: "project" | "global";
  description: string;
  agent: string;
  model: string;
  subtask: boolean;
  template: string;
};

export type AgentDialogView =
  | "list"
  | "detail"
  | "config"
  | "tool-detail"
  | "tool-config"
  | "command-detail"
  | "command-config";
export type AgentEditMode = "add" | "edit";
export type ToolEditMode = "add" | "edit";
export type AgentToolTab = "agents" | "tools" | "commands";
export type AgentConfigMode = "interface" | "yaml";
export type CommandConfigMode = "interface" | "document";

export type InstallResult = {
  status: "success" | "error";
  message: string;
};

export type RegistryConfigScope = "project" | "global";

export type PendingRegistryUpsert = {
  scope: RegistryConfigScope;
  name: string;
  content: string;
  filename?: string;
};

export type PendingRegistryDelete = {
  scope: RegistryConfigScope;
  name: string;
};
