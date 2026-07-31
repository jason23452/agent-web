import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  installOpenCodeNpmPackages,
  listOpenCodeNpmPackages,
  uninstallOpenCodeNpmPackages,
  type NpmPackageEntry,
  type NpmPackageScope,
  type NpmPackageListResponse,
} from "@/shared/api/opencodeNpmPackages";
import {
  listProjectAgents,
  type OpenCodeAgent,
} from "@/shared/api/opencodeAgents";
import {
  completeOpenCodeProviderAuth,
  disconnectOpenCodeProviderAuth,
  disposeOpenCodeInstance,
  getOpenCodeProviderOAuthStatus,
  getOpenCodeProviderAuthMethods,
  listOpenCodeProviders,
  setOpenCodeProviderApiKey,
  startOpenCodeProviderAuth,
  type OpenCodeAuthMethod,
  type OpenCodeAuthMethodsResponse,
  type OpenCodeProvider,
  type OpenCodeProviderListResponse,
} from "@/shared/api/opencodeProviders";
import {
  listEffectiveProjectTools,
  readToolRegistryEntry,
  testToolScript,
  upsertToolRegistryEntry,
  type OpenCodeRegistryEntry,
} from "@/shared/api/opencodeRegistry";
import { listProjectToolIds } from "@/shared/api/opencodeTools";
import {
  UserSettingsModal,
  type ModelProvider,
  type UserSettingsSection,
} from "@/shared/components/layout/settings/UserSettingsModal";
import { AgentsToolsModal } from "@/shared/components/layout/app-sidebar/AgentsToolsModal";
import { AppSidebarPanel } from "@/shared/components/layout/app-sidebar/AppSidebarPanel";
import { McpServersDialog } from "@/shared/components/layout/app-sidebar/McpServersDialog";
import { PluginSkillModal } from "@/shared/components/layout/app-sidebar/PluginSkillModal";
import { ProjectDialog } from "@/shared/components/layout/app-sidebar/ProjectDialog";
import { ApiError, getApiErrorMessage } from "@/shared/api";
import { toastManager } from "@/shared/components/ui/toast";
import {
  availableSkills,
  emptyAgentForm,
  emptyMcpForm,
  emptyPluginForm,
  emptySkillForm,
  emptyToolForm,
  initialMcpServers,
  initialModelProviders,
  initialPlugins,
  initialSkillSettings,
  initialToolDefinitions,
} from "@/shared/components/layout/app-sidebar/config";
import type {
  AgentConfigMode,
  AgentDefinition,
  AgentDialogView,
  AgentEditMode,
  AgentToolTab,
  AppSidebarProject,
  AppSidebarProps,
  InstallResult,
  McpServer,
  McpDialogView,
  PluginDefinition,
  PluginSkillDialogView,
  PluginSkillTab,
  ProjectDialogView,
  SkillDefinition,
  ToolDefinition,
  ToolEditMode,
} from "@/shared/types/app-sidebar";
import {
  agentToYaml,
  getSkillBasePath,
  getSkillScope,
  getToolPermissionKey,
  isCustomTool,
  isValidSkillName,
  taskPermissionFor,
} from "@/shared/utils/app-sidebar";

const PROJECT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

const initialModelProviderById = Object.fromEntries(
  initialModelProviders.map((provider) => [provider.id, provider]),
);
const PROVIDER_AUTH_POLL_INTERVAL_MS = 2_000;
const PROVIDER_AUTH_POLL_ATTEMPTS = 150;

const AGENT_MODE_ORDER: Record<AgentDefinition["mode"], number> = {
  primary: 0,
  all: 1,
  subagent: 2,
};
const AGENT_SCOPE_ORDER: Record<AgentDefinition["scope"], number> = {
  system: 0,
  custom: 1,
};
const SYSTEM_TOOL_METADATA: Record<
  string,
  Pick<ToolDefinition, "category" | "description" | "source">
> = Object.fromEntries(
  [
    ...initialToolDefinitions.filter((tool) => tool.source === "built-in"),
    {
      id: "list",
      name: "list",
      description: "List files and directories in the current workspace.",
      category: "Files",
      source: "built-in" as const,
    },
    {
      id: "write",
      name: "write",
      description: "Write or create files in the current workspace.",
      category: "Edit",
      source: "built-in" as const,
    },
    {
      id: "edit",
      name: "edit",
      description: "Edit files in the current workspace.",
      category: "Edit",
      source: "built-in" as const,
    },
    {
      id: "patch",
      name: "patch",
      description: "Apply patch-style edits to files.",
      category: "Edit",
      source: "built-in" as const,
    },
    {
      id: "todowrite",
      name: "todowrite",
      description: "Create and maintain an in-session task list.",
      category: "Planning",
      source: "built-in" as const,
    },
    {
      id: "webfetch",
      name: "webfetch",
      description: "Fetch and inspect content from a URL.",
      category: "Web",
      source: "built-in" as const,
    },
    {
      id: "websearch",
      name: "websearch",
      description: "Search the web for up-to-date information.",
      category: "Web",
      source: "built-in" as const,
    },
    {
      id: "lsp",
      name: "lsp",
      description: "Use language-server information for code intelligence.",
      category: "Code Intelligence",
      source: "built-in" as const,
    },
    {
      id: "question",
      name: "question",
      description: "Ask the user for clarification or choices.",
      category: "Interaction",
      source: "built-in" as const,
    },
    {
      id: "skill",
      name: "skill",
      description: "Load specialized instructions and workflows.",
      category: "Agent",
      source: "built-in" as const,
    },
  ].map((tool) => [
    tool.name,
    {
      category: tool.category,
      description: tool.description,
      source: tool.source,
    },
  ]),
);

type AgentPermission = AgentDefinition["permission"];
type AgentPermissionValue = AgentPermission[string];

function toAgentDefinition(agent: OpenCodeAgent): AgentDefinition {
  const permission = normalizeOpenCodePermission(agent.permission);

  return {
    id: agent.name,
    name: agent.name,
    description: agent.description ?? "OpenCode agent.",
    scope: isSystemOpenCodeAgent(agent) ? "system" : "custom",
    mode: agent.mode,
    model: agent.model
      ? `${agent.model.providerID}/${agent.model.modelID}`
      : "opencode/default",
    tools: Object.keys(permission)
      .filter((permissionName) => permissionName !== "task")
      .sort((a, b) => a.localeCompare(b)),
    toolGuidance: {},
    skillGuidance: {},
    skills: [],
    subagents: getAllowedTaskAgents(permission),
    subagentGuidance: {},
    permission,
    systemPrompt: agent.prompt ?? "",
    temperature:
      agent.temperature === undefined ? undefined : String(agent.temperature),
    top_p: agent.topP === undefined ? undefined : String(agent.topP),
    variant: agent.variant,
    steps: agent.steps === undefined ? undefined : String(agent.steps),
    hidden: agent.hidden,
    color: agent.color,
    promptSource: "inline",
    promptFile: "",
    providerOptionsJson: stringifyJson(agent.options),
    permissionRulesJson: Array.isArray(agent.permission)
      ? stringifyJson(agent.permission)
      : "",
  };
}

function toToolDefinition(
  toolId: string,
  registryEntry?: OpenCodeRegistryEntry,
): ToolDefinition {
  const metadata = SYSTEM_TOOL_METADATA[toolId];
  if (metadata) {
    return {
      id: toolId,
      name: toolId,
      ...metadata,
    };
  }

  return {
    id: toolId,
    name: toolId,
    description: "OpenCode project/global custom or dynamically registered tool.",
    category: "Custom",
    source: "custom",
    installTarget: registryEntry?.scope ?? "project",
    inherited: registryEntry?.inherited,
    registryPath: registryEntry?.path,
    registryType: registryEntry?.type,
    runtime: "js-ts",
    entry: getToolEntryPath(toolId, registryEntry?.scope ?? "project", registryEntry),
  };
}

function getToolEntryPath(
  name: string,
  installTarget: NonNullable<ToolDefinition["installTarget"]> = "project",
  registryEntry?: OpenCodeRegistryEntry,
) {
  const relativePath = registryEntry ? getRegistryToolRelativePath(name, registryEntry) : undefined;
  const defaultRelativePath = `${name}.ts`;
  const path = relativePath || defaultRelativePath;
  const prefix = installTarget === "global" ? "~/.config/opencode/tools" : "./.opencode/tools";

  return `${prefix}/${path}`;
}

function getRegistryToolRelativePath(name: string, registryEntry: OpenCodeRegistryEntry) {
  const normalizedPath = registryEntry.path.replace(/\\/g, "/");
  const marker = "/tools/";
  const markerIndex = normalizedPath.lastIndexOf(marker);
  if (markerIndex === -1) return registryEntry.type === "directory" ? name : `${name}.ts`;

  return normalizedPath.slice(markerIndex + marker.length);
}

function getProjectNameFromPath(path: string) {
  const normalizedPath = path.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalizedPath.split("/").filter(Boolean).at(-1) ?? "";
}

function getRegistryFilenameFromEntry(
  name: string,
  entry: string,
) {
  const normalizedEntry = entry.replace(/\\/g, "/").trim();
  const marker = "/tools/";
  const markerIndex = normalizedEntry.lastIndexOf(marker);
  const relativePath = markerIndex === -1
    ? normalizedEntry.replace(/^\.\/\.opencode\/tools\//, "").replace(/^~\/\.config\/opencode\/tools\//, "")
    : normalizedEntry.slice(markerIndex + marker.length);

  if (!relativePath || relativePath === `${name}.ts`) {
    return undefined;
  }

  return relativePath;
}

function sortToolDefinitions(a: ToolDefinition, b: ToolDefinition) {
  if (a.source !== b.source) return a.source === "built-in" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function sortAgentDefinitions(a: AgentDefinition, b: AgentDefinition) {
  const scopeDiff = AGENT_SCOPE_ORDER[a.scope] - AGENT_SCOPE_ORDER[b.scope];
  if (scopeDiff !== 0) return scopeDiff;

  const modeDiff = AGENT_MODE_ORDER[a.mode] - AGENT_MODE_ORDER[b.mode];
  if (modeDiff !== 0) return modeDiff;

  return a.name.localeCompare(b.name);
}

function isSystemOpenCodeAgent(agent: OpenCodeAgent) {
  return Boolean(agent.builtIn ?? agent.native);
}

function normalizeOpenCodePermission(
  permission: OpenCodeAgent["permission"],
): AgentPermission {
  if (Array.isArray(permission)) {
    return permission.reduce<AgentPermission>((normalized, rule) => {
      if (!rule.permission) return normalized;

      const pattern = rule.pattern || "*";
      const currentValue = normalized[rule.permission];
      if (pattern === "*" && currentValue === undefined) {
        normalized[rule.permission] = rule.action;
        return normalized;
      }

      const currentRules = isPermissionRuleMap(currentValue)
        ? { ...currentValue }
        : currentValue
          ? { "*": currentValue }
          : {};
      normalized[rule.permission] = {
        ...currentRules,
        [pattern]: rule.action,
      };
      return normalized;
    }, {});
  }

  if (!isRecord(permission)) return {};

  return Object.fromEntries(
    Object.entries(permission).filter(([, value]) => isPermissionValue(value)),
  ) as AgentPermission;
}

function getAllowedTaskAgents(permission: AgentPermission) {
  const taskPermission = permission.task;
  if (!isPermissionRuleMap(taskPermission)) return [];

  return Object.entries(taskPermission)
    .filter(([agentName, action]) => agentName !== "*" && action === "allow")
    .map(([agentName]) => agentName)
    .sort((a, b) => a.localeCompare(b));
}

function isPermissionValue(value: unknown): value is AgentPermissionValue {
  return isPermissionAction(value) || isPermissionRuleMap(value);
}

function isPermissionRuleMap(
  value: unknown,
): value is Record<string, "allow" | "ask" | "deny"> {
  if (!isRecord(value)) return false;

  return Object.values(value).every(isPermissionAction);
}

function isPermissionAction(value: unknown): value is "allow" | "ask" | "deny" {
  return value === "allow" || value === "ask" || value === "deny";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyJson(value: unknown) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value) && value.length === 0) return "";
  if (isRecord(value) && Object.keys(value).length === 0) return "";

  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return "";
  }
}

function pickDefaultProviderModel(
  provider: OpenCodeProvider,
  defaultModels: Record<string, string>,
) {
  const models = provider.models;
  const preferredModelId = defaultModels[provider.id];
  if (preferredModelId && models[preferredModelId]) {
    return [preferredModelId, models[preferredModelId]] as const;
  }

  const firstEntry = Object.entries(models)[0];
  if (firstEntry) {
    return [firstEntry[0], firstEntry[1]] as const;
  }

  return ["", undefined] as const;
}

function resolveAuthMethods(
  provider: OpenCodeProvider,
  authMethodsResponse: OpenCodeAuthMethodsResponse | undefined,
  fallbackMethods: string[] = [],
) {
  const fromBackend = resolveAuthMethodDetails(provider, authMethodsResponse, fallbackMethods).map((item) => item.label);
  if (fromBackend.length) {
    return fromBackend;
  }

  return fallbackMethods.length > 0
    ? fallbackMethods
    : ["API 密鑰", "瀏覽器授權", "自動授權"];
}

function resolveAuthMethodDetails(
  provider: OpenCodeProvider,
  authMethodsResponse: OpenCodeAuthMethodsResponse | undefined,
  fallbackMethods: string[] = [],
): OpenCodeAuthMethod[] {
  const fromBackend = authMethodsResponse?.[provider.id];
  if (fromBackend?.length) {
    return fromBackend;
  }

  const labels = fallbackMethods.length > 0
    ? fallbackMethods
    : ["API 密鑰", "瀏覽器授權", "自動授權"];

  return labels.map((label) => ({
    label,
    type: label.toLowerCase().includes("api") || label.includes("密鑰") ? "api" : "oauth",
  }));
}

function resolveProviderDescription(provider: OpenCodeProvider) {
  const envVariables = [provider.key, ...provider.env].filter((item): item is string =>
    Boolean(item),
  );
  if (envVariables.length > 0) {
    return `從環境變數 ${envVariables.join(", ")} 讀取設定。`;
  }

  return "透過 OpenCode provider 設定載入。";
}

function extractVerificationCode(instructions: string) {
  const codePatterns = [
    /(?:code|verification code|device code|確認碼)[:：\s]*([A-Za-z0-9][A-Za-z0-9._-]{4,})/i,
    /`([A-Za-z0-9][A-Za-z0-9._-]{4,})`/,
  ];

  for (const pattern of codePatterns) {
    const match = instructions.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function toModelProvider(
  provider: OpenCodeProvider,
  providersResponse: OpenCodeProviderListResponse,
  authMethodsResponse: OpenCodeAuthMethodsResponse | undefined,
  disabledModelIds: Set<string>,
) {
  const fallbackProvider = initialModelProviderById[provider.id];
  const [modelId, model] = pickDefaultProviderModel(
    provider,
    providersResponse.default,
  );
  const fallbackMethods = fallbackProvider?.authMethods ?? [];

  return {
    ...fallbackProvider,
    id: provider.id,
    name: provider.name,
    description: fallbackProvider?.description || resolveProviderDescription(provider),
    connected: providersResponse.connected.includes(provider.id),
    enabled: providersResponse.connected.includes(provider.id),
    npm: model?.api?.npm || fallbackProvider?.npm || "",
    baseUrl: model?.api?.url || fallbackProvider?.baseUrl || "",
    apiKey: fallbackProvider?.apiKey || "",
    headersJson: fallbackProvider?.headersJson || "",
    defaultModel: modelId ? `${provider.id}/${modelId}` : fallbackProvider?.defaultModel || "",
    modelDisplayName: model?.name || fallbackProvider?.modelDisplayName || "",
    contextLimit:
      typeof model?.limit?.context === "number"
        ? String(model.limit.context)
        : fallbackProvider?.contextLimit || "",
    outputLimit:
      typeof model?.limit?.output === "number"
        ? String(model.limit.output)
        : fallbackProvider?.outputLimit || "",
    whitelist: fallbackProvider?.whitelist || "",
    blacklist: fallbackProvider?.blacklist || "",
    authMethods: resolveAuthMethods(provider, authMethodsResponse, fallbackMethods),
    authMethodDetails: resolveAuthMethodDetails(provider, authMethodsResponse, fallbackMethods),
    availableModels: Object.values(provider.models)
      .map((model) => {
        const key = `${provider.id}/${model.id}`;
        return {
          contextLimit: typeof model.limit?.context === "number" ? String(model.limit.context) : undefined,
          enabled: !disabledModelIds.has(key),
          id: model.id,
          key,
          name: model.name,
          outputLimit: typeof model.limit?.output === "number" ? String(model.limit.output) : undefined,
          status: model.status,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    badge: fallbackProvider?.badge,
    icon: fallbackProvider?.icon || provider.name.charAt(0).toUpperCase(),
  } satisfies ModelProvider;
}


function getNpmPackageNameFromSpec(spec: string) {
  const normalized = spec.trim().toLowerCase();
  if (normalized.startsWith("@")) {
    const versionIndex = normalized.indexOf("@", 1);
    return versionIndex >= 0 ? normalized.slice(0, versionIndex) : normalized;
  }

  const versionIndex = normalized.indexOf("@");
  return versionIndex >= 0 ? normalized.slice(0, versionIndex) : normalized;
}

export function AppSidebar({
  activeProjectPath,
  activeSessionId,
  onCreateProject,
  onCreateSession,
  onDeleteProject,
  onOpenCodeDisabledModelsChange,
  onOpenCodeProviderCatalogChange,
  onProjectChange,
  onRefreshProjects,
  onRestartOpenCode,
  open,
  onClose,
  onSelectSession,
  projects,
  projectsError,
  projectsLoading = false,
  sessions,
  sessionsError,
  sessionsLoading = false,
}: AppSidebarProps) {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogView, setProjectDialogView] =
    useState<ProjectDialogView>("list");
  const [projectActionError, setProjectActionError] = useState<string | null>(
    null,
  );
  const [creatingProject, setCreatingProject] = useState(false);
  const [deletingProjectName, setDeletingProjectName] = useState<string | null>(
    null,
  );
  const deletingProjectRef = useRef<string | null>(null);
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
  const [pluginSkillDialogView, setPluginSkillDialogView] =
    useState<PluginSkillDialogView>("list");
  const [pluginSkillTab, setPluginSkillTab] =
    useState<PluginSkillTab>("plugins");
  const [pluginSkillSearch, setPluginSkillSearch] = useState("");
  const [plugins, setPlugins] = useState<PluginDefinition[]>(initialPlugins);
  const [skillSettings, setSkillSettings] =
    useState<SkillDefinition[]>(initialSkillSettings);
  const [pluginForm, setPluginForm] = useState(emptyPluginForm);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [pluginInstallResult, setPluginInstallResult] =
    useState<InstallResult | null>(null);
  const [skillInstallResult, setSkillInstallResult] =
    useState<InstallResult | null>(null);
  const [batchUpdateNotice, setBatchUpdateNotice] = useState("");
  const [pluginSkillHasChanges, setPluginSkillHasChanges] = useState(false);
  const [agentsDialogOpen, setAgentsDialogOpen] = useState(false);
  const [agentDialogView, setAgentDialogView] =
    useState<AgentDialogView>("list");
  const [agentEditMode, setAgentEditMode] = useState<AgentEditMode>("add");
  const [agentConfigMode, setAgentConfigMode] =
    useState<AgentConfigMode>("interface");
  const [agentToolTab, setAgentToolTab] = useState<AgentToolTab>("agents");
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [toolDefinitions, setToolDefinitions] = useState<ToolDefinition[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [agentsToolsHasChanges, setAgentsToolsHasChanges] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolEditMode, setToolEditMode] = useState<ToolEditMode>("add");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentYaml, setAgentYaml] = useState(agentToYaml(emptyAgentForm));
  const [toolForm, setToolForm] = useState(emptyToolForm);
  const [toolTestResult, setToolTestResult] =
    useState<InstallResult | null>(null);
  const [toolCallTestLoading, setToolCallTestLoading] = useState(false);
  const [toolToAdd, setToolToAdd] = useState(initialToolDefinitions[0]!.name);
  const [subagentToAdd, setSubagentToAdd] = useState("");
  const [skillToAdd, setSkillToAdd] = useState(availableSkills[0]!);
  const [guidanceTool, setGuidanceTool] = useState<string | null>(null);
  const [guidanceSkill, setGuidanceSkill] = useState<string | null>(null);
  const [guidanceSubagent, setGuidanceSubagent] = useState<string | null>(null);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [userSettingsSection, setUserSettingsSection] =
    useState<UserSettingsSection>("model-providers");
  const [npmPackageInput, setNpmPackageInput] = useState("");
  const [npmPackageTarget, setNpmPackageTarget] =
    useState<NpmPackageScope>("project");
  const [npmPackages, setNpmPackages] = useState<NpmPackageEntry[]>([]);
  const [npmPackageRoot, setNpmPackageRoot] = useState("");
  const [npmPackageJsonPath, setNpmPackageJsonPath] = useState("");
  const [npmPackagesError, setNpmPackagesError] = useState<string | null>(null);
  const [npmPackagesLoading, setNpmPackagesLoading] = useState(false);
  const [npmPackagesApplying, setNpmPackagesApplying] = useState(false);
  const [npmPackagesToInstall, setNpmPackagesToInstall] = useState<string[]>([]);
  const [npmPackagesToDelete, setNpmPackagesToDelete] = useState<string[]>([]);
  const [modelProviderSearch, setModelProviderSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [disabledModelIds, setDisabledModelIds] = useState<Set<string>>(() => new Set());
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>(
    initialModelProviders,
  );
  const [selectedModelProviderId, setSelectedModelProviderId] = useState<
    string | null
  >(null);
  const [selectedProviderAuthMethod, setSelectedProviderAuthMethod] = useState<
    string | null
  >(null);
  const [disconnectingProviderId, setDisconnectingProviderId] = useState<string | null>(null);
  const [providerAuthApplying, setProviderAuthApplying] = useState(false);

  const filteredProjects = projects.filter((project) => {
    const keyword = projectSearch.trim().toLowerCase();
    if (!keyword) return true;
    return (
      (project.displayName ?? "").toLowerCase().includes(keyword) ||
      (project.description ?? "").toLowerCase().includes(keyword) ||
      project.name.toLowerCase().includes(keyword) ||
      project.path.toLowerCase().includes(keyword)
    );
  });
  const projectDialogError = projectActionError ?? projectsError ?? null;

  const filteredSessions = sessions.filter((session) => {
    const keyword = historySearch.trim().toLowerCase();
    if (!keyword) return true;
    return (
      session.title.toLowerCase().includes(keyword) ||
      session.meta.toLowerCase().includes(keyword)
    );
  });

  const filteredMcpServers = mcpServers.filter((server) => {
    const keyword = mcpSearch.trim().toLowerCase();
    if (!keyword) return true;
    return (
      server.url.toLowerCase().includes(keyword) ||
      server.name.toLowerCase().includes(keyword) ||
      server.username.toLowerCase().includes(keyword)
    );
  });
  const filteredPlugins = plugins.filter((plugin) => {
    const keyword = pluginSkillSearch.trim().toLowerCase();
    if (!keyword || pluginSkillTab !== "plugins") return true;
    return (
      plugin.name.toLowerCase().includes(keyword) ||
      plugin.description.toLowerCase().includes(keyword) ||
      plugin.entry.toLowerCase().includes(keyword)
    );
  });
  const filteredSkillSettings = skillSettings.filter((skill) => {
    const keyword = pluginSkillSearch.trim().toLowerCase();
    if (!keyword || pluginSkillTab !== "skills") return true;
    return (
      skill.name.toLowerCase().includes(keyword) ||
      skill.description.toLowerCase().includes(keyword) ||
      skill.path.toLowerCase().includes(keyword)
    );
  });
  const availableSkillNames = skillSettings
    .filter((skill) => skill.enabled)
    .map((skill) => skill.name);
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const selectedTool =
    toolDefinitions.find((tool) => tool.id === selectedToolId) ?? null;
  const activeProjectName =
    projects.find((project) => project.path === activeProjectPath)?.name ??
    getProjectNameFromPath(activeProjectPath);
  const selectedModelProvider =
    modelProviders.find(
      (provider) => provider.id === selectedModelProviderId,
    ) ?? null;
  const filteredModelProviders = modelProviders.filter((provider) => {
    const keyword = modelProviderSearch.trim().toLowerCase();
    if (!keyword) return true;
    return (
      provider.name.toLowerCase().includes(keyword) ||
      provider.description.toLowerCase().includes(keyword)
    );
  });
  const isCustomToolName = (toolName: string) =>
    isCustomTool(toolName, toolDefinitions);

  const applyNpmPackageResponse = useCallback((response: NpmPackageListResponse) => {
    setNpmPackages(response.packages);
    setNpmPackageRoot(response.root);
    setNpmPackageJsonPath(response.packageJsonPath);
    setNpmPackagesToDelete((current) => {
      const packageNames = new Set(response.packages.map((item) => item.name));
      return current.filter((packageName) => packageNames.has(packageName));
    });
    setNpmPackagesError(null);
  }, []);

  const loadNpmPackages = useCallback(async () => {
    if (npmPackageTarget === "project" && !activeProjectName) {
      setNpmPackages([]);
      setNpmPackagesToInstall([]);
      setNpmPackagesToDelete([]);
      setNpmPackageRoot("");
      setNpmPackageJsonPath("");
      setNpmPackagesError("請先開啟一個 project，才能讀取 project npm packages。");
      setNpmPackagesLoading(false);
      return;
    }

    setNpmPackagesLoading(true);
    setNpmPackagesError(null);

    try {
      const response = await listOpenCodeNpmPackages(
        npmPackageTarget,
        activeProjectName,
      );
      applyNpmPackageResponse(response);
    } catch (error) {
      setNpmPackages([]);
      setNpmPackagesToInstall([]);
      setNpmPackagesToDelete([]);
      setNpmPackageRoot("");
      setNpmPackageJsonPath("");
      setNpmPackagesError(getApiErrorMessage(error));
    } finally {
      setNpmPackagesLoading(false);
    }
  }, [activeProjectName, applyNpmPackageResponse, npmPackageTarget]);

  useEffect(() => {
    if (!userSettingsOpen || userSettingsSection !== "npm-packages") return;

    const timeoutId = window.setTimeout(() => {
      void loadNpmPackages();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadNpmPackages, userSettingsOpen, userSettingsSection]);

  const loadModelProviders = useCallback(
    async (signal?: AbortSignal) => {
      const directory = activeProjectPath?.trim() || undefined;
      const query = directory ? { directory } : undefined;

      try {
        const providerResponse = await listOpenCodeProviders({
          query,
          signal,
        });
        let authMethodsResponse: OpenCodeAuthMethodsResponse | undefined;

        try {
          authMethodsResponse = await getOpenCodeProviderAuthMethods({
            query,
            signal,
          });
        } catch {
          authMethodsResponse = undefined;
        }

        if (signal?.aborted) return;
        onOpenCodeProviderCatalogChange?.(providerResponse);

        const nextProviders = providerResponse.all
          .map((provider) =>
            toModelProvider(provider, providerResponse, authMethodsResponse, disabledModelIds),
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setModelProviders((current) => {
          const previousProvidersById = Object.fromEntries(
            current.map((provider) => [provider.id, provider]),
          );

          return nextProviders.map((nextProvider) => ({
            ...nextProvider,
            verificationCode:
              nextProvider.connected ? undefined : previousProvidersById[nextProvider.id]?.verificationCode,
            verificationInstructions:
              nextProvider.connected ? undefined : previousProvidersById[nextProvider.id]?.verificationInstructions,
            verificationMethod:
              nextProvider.connected ? undefined : previousProvidersById[nextProvider.id]?.verificationMethod,
            verificationMethodIndex:
              nextProvider.connected ? undefined : previousProvidersById[nextProvider.id]?.verificationMethodIndex,
            verificationUrl:
              nextProvider.connected ? undefined : previousProvidersById[nextProvider.id]?.verificationUrl,
          }));
        });

        if (selectedModelProviderId && providerResponse.connected.includes(selectedModelProviderId)) {
          setSelectedProviderAuthMethod(null);
          setSelectedModelProviderId(null);
        }
      } catch (error) {
        if (signal?.aborted) return;
        setModelProviders(initialModelProviders);
        toastManager.add({
          id: `model-providers-load-error-${Date.now()}`,
          description: getApiErrorMessage(error),
          title: "載入模型商失敗",
          type: "error",
        });
      }
    },
    [activeProjectPath, disabledModelIds, onOpenCodeProviderCatalogChange, selectedModelProviderId],
  );

  const markModelProviderConnected = useCallback((providerId: string) => {
    setModelProviders((current) =>
      current.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              connected: true,
              enabled: true,
              verificationCode: undefined,
              verificationInstructions: undefined,
              verificationMethod: undefined,
              verificationMethodIndex: undefined,
              verificationUrl: undefined,
            }
          : provider,
      ),
    );
    setSelectedProviderAuthMethod(null);
    setSelectedModelProviderId(null);
  }, []);

  const pollProviderConnection = useCallback(
    async (providerId: string) => {
      const directory = activeProjectPath?.trim() || undefined;
      const query = directory ? { directory } : undefined;

      for (let attempt = 0; attempt < PROVIDER_AUTH_POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, PROVIDER_AUTH_POLL_INTERVAL_MS));

        try {
          const oauthStatus = await getOpenCodeProviderOAuthStatus(providerId, { query });
          if (oauthStatus.completed) {
            await loadModelProviders();
            markModelProviderConnected(providerId);
            toastManager.add({
              id: `provider-auth-connected-${providerId}-${Date.now()}`,
              description: "OAuth 驗證已成功，模型商狀態已更新。",
              title: "已連接模型商",
              type: "success",
            });
            return;
          }

          const providerResponse = await listOpenCodeProviders({ query });
          if (!providerResponse.connected.includes(providerId)) continue;

          await loadModelProviders();
          markModelProviderConnected(providerId);
          toastManager.add({
            id: `provider-auth-connected-${providerId}-${Date.now()}`,
            description: "模型商已成功連接，列表狀態已更新。",
            title: "已連接模型商",
            type: "success",
          });
          return;
        } catch {
          // Ignore transient proxy/server errors while the browser OAuth flow completes.
        }
      }

      toastManager.add({
        id: `provider-auth-timeout-${providerId}-${Date.now()}`,
        description: "Browser 授權完成後仍未從 OpenCode 讀到連接狀態，請重新整理模型商列表或檢查後端 OAuth callback log。",
        title: "模型商連接逾時",
        type: "error",
      });
    },
    [activeProjectPath, loadModelProviders, markModelProviderConnected],
  );

  const pollHeadlessProviderCompletion = useCallback(
    async (providerId: string, methodIndex: number) => {
      const directory = activeProjectPath?.trim() || undefined;
      const query = directory ? { directory } : undefined;

      for (let attempt = 0; attempt < PROVIDER_AUTH_POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, PROVIDER_AUTH_POLL_INTERVAL_MS));

        try {
          await completeOpenCodeProviderAuth(providerId, methodIndex, { query });
          await disposeOpenCodeInstance({ query });
          await loadModelProviders();
          markModelProviderConnected(providerId);
          toastManager.add({
            id: `provider-headless-auth-completed-${providerId}-${Date.now()}`,
            description: "Headless 授權已成功，模型商狀態已更新。",
            title: "已連接模型商",
            type: "success",
          });
          return;
        } catch {
          // The device-code/headless flow returns failure until the user finishes authorization.
        }
      }

      toastManager.add({
        id: `provider-headless-auth-timeout-${providerId}-${Date.now()}`,
        description: "Headless 授權完成後仍未收到 OpenCode callback 成功結果，請重新啟動授權流程。",
        title: "模型商連接逾時",
        type: "error",
      });
    },
    [activeProjectPath, loadModelProviders, markModelProviderConnected],
  );

  useEffect(() => {
    if (!userSettingsOpen || !["model-providers", "models"].includes(userSettingsSection)) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void loadModelProviders(controller.signal);
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [loadModelProviders, userSettingsOpen, userSettingsSection]);

  function stageNpmPackageInstalls() {
    const packageSpecs = parseNpmPackageInput(npmPackageInput);
    if (packageSpecs.length === 0) {
      setNpmPackagesError("請輸入至少一個 npm package。即使多個套件也可用空白或逗號分隔。");
      return;
    }

    if (npmPackageTarget === "project" && !activeProjectName) {
      setNpmPackagesError("請先開啟一個 project，才能新增當前 Project 的 npm package。");
      return;
    }

    const packageNamesToInstall = new Set(packageSpecs.map(getNpmPackageNameFromSpec));
    setNpmPackagesToInstall((current) => [
      ...current.filter((packageSpec) => !packageNamesToInstall.has(getNpmPackageNameFromSpec(packageSpec))),
      ...packageSpecs,
    ]);
    setNpmPackagesToDelete((current) => current.filter((packageName) => !packageNamesToInstall.has(packageName)));
    setNpmPackageInput("");
    setNpmPackagesError(null);
    toastManager.add({
      id: `npm-packages-staged-install-${Date.now()}`,
      title: "已加入待更新",
      description: `待新增 ${packageSpecs.length} 個 npm package。`,
      type: "info",
    });
  }

  async function applyNpmPackageChanges() {
    const packageSpecs = npmPackagesToInstall;
    const packageNamesToDelete = npmPackagesToDelete;

    if (packageSpecs.length === 0 && packageNamesToDelete.length === 0) {
      setNpmPackagesError("目前沒有待更新的 npm package 變更。");
      return;
    }

    if (npmPackageTarget === "project" && !activeProjectName) {
      setNpmPackagesError("請先開啟一個 project，才能更新當前 Project 的 npm packages。");
      return;
    }

    setNpmPackagesApplying(true);
    setNpmPackagesError(null);

    let response: NpmPackageListResponse | null = null;
    let installed = false;
    let uninstalled = false;

    try {
      if (packageNamesToDelete.length > 0) {
        response = await uninstallOpenCodeNpmPackages({
          packages: packageNamesToDelete,
          project: npmPackageTarget === "project" ? activeProjectName : undefined,
          scope: npmPackageTarget,
        });
        uninstalled = true;
      }

      if (packageSpecs.length > 0) {
        response = await installOpenCodeNpmPackages({
          packages: packageSpecs,
          project: npmPackageTarget === "project" ? activeProjectName : undefined,
          scope: npmPackageTarget,
        });
        installed = true;
      }

      if (response) {
        applyNpmPackageResponse(response);
      }
      setNpmPackagesToInstall([]);
      setNpmPackagesToDelete([]);
      toastManager.add({
        id: `npm-packages-applied-${Date.now()}`,
        title: "NPM 套件已更新",
        description: `已新增 ${packageSpecs.length} 個，刪除 ${packageNamesToDelete.length} 個。`,
        type: "success",
      });
    } catch (error) {
      if (response) {
        applyNpmPackageResponse(response);
      }
      if (installed) setNpmPackagesToInstall([]);
      if (uninstalled) setNpmPackagesToDelete([]);

      const message = getApiErrorMessage(error);
      setNpmPackagesError(message);
      toastManager.add({
        id: `npm-packages-apply-error-${Date.now()}`,
        title: "NPM 套件變更失敗",
        description: message,
        type: "error",
      });
    } finally {
      setNpmPackagesApplying(false);
    }
  }

  function toggleNpmPackageDelete(packageName: string) {
    const willDelete = !npmPackagesToDelete.includes(packageName);
    setNpmPackagesToDelete((current) => willDelete
      ? [...current, packageName]
      : current.filter((item) => item !== packageName));
    setNpmPackagesToInstall((current) => current.filter((packageSpec) => getNpmPackageNameFromSpec(packageSpec) !== packageName));
    toastManager.add({
      id: `npm-package-delete-selection-${Date.now()}`,
      title: willDelete ? "已加入待刪除" : "已取消待刪除",
      description: packageName,
      type: "info",
    });
  }

  function removeNpmPackageInstall(packageSpec: string) {
    setNpmPackagesToInstall((current) => current.filter((item) => item !== packageSpec));
    toastManager.add({
      id: `npm-package-install-selection-removed-${Date.now()}`,
      title: "已移除待新增",
      description: packageSpec,
      type: "info",
    });
  }

  function clearNpmPackageDeletes() {
    if (npmPackagesToDelete.length === 0) return;

    setNpmPackagesToDelete([]);
    toastManager.add({
      id: `npm-package-delete-selection-cleared-${Date.now()}`,
      title: "已清除待刪除",
      description: "待刪除清單已清空。",
      type: "info",
    });
  }

  function changeNpmPackageTarget(target: NpmPackageScope) {
    setNpmPackageTarget(target);
    setNpmPackageInput("");
    setNpmPackagesToInstall([]);
    setNpmPackagesToDelete([]);
    setNpmPackagesError(null);
  }

  function cancelNpmPackageChanges() {
    setNpmPackageInput("");
    setNpmPackagesToInstall([]);
    setNpmPackagesToDelete([]);
    setNpmPackagesError(null);
    toastManager.add({
      id: `npm-packages-changes-cancelled-${Date.now()}`,
      title: "已取消套件變更",
      description: "待新增與待刪除清單已清空。",
      type: "info",
    });
  }

  function parseNpmPackageInput(input: string) {
    return [...new Set(input.split(/[\s,]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
  }

  useEffect(() => {
    if (!agentsDialogOpen) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (!activeProjectPath) {
        setAgents([]);
        setSelectedAgentId(null);
        setAgentsError("請先開啟專案後再查看 OpenCode agents。");
        setAgentsLoading(false);
        setToolDefinitions([]);
        setToolsError("請先開啟專案後再查看 OpenCode tools。");
        setToolsLoading(false);
        return;
      }

      if (agentsToolsHasChanges) return;

      setAgentsLoading(true);
      setAgentsError(null);
      setToolsLoading(true);
      setToolsError(null);

      void listProjectAgents(activeProjectPath, { signal: controller.signal })
        .then((response) => {
          if (controller.signal.aborted) return;

          const nextAgents = response
            .map(toAgentDefinition)
            .sort(sortAgentDefinitions);
          setAgents(nextAgents);
          setSelectedAgentId((current) =>
            current && nextAgents.some((agent) => agent.id === current)
              ? current
              : null,
          );
        })
        .catch((error) => {
          if (controller.signal.aborted) return;

          setAgents([]);
          setSelectedAgentId(null);
          setAgentsError(getApiErrorMessage(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setAgentsLoading(false);
        });

      void Promise.all([
        listProjectToolIds(activeProjectPath, { signal: controller.signal }),
        activeProjectName
          ? listEffectiveProjectTools(activeProjectName, { signal: controller.signal }).catch(() => null)
          : Promise.resolve(null),
      ])
        .then(([toolIds, registryResponse]) => {
          if (controller.signal.aborted) return;

          const registryEntries = registryResponse?.entries ?? [];
          const registryEntriesByName = new Map(
            registryEntries.map((entry) => [entry.name, entry]),
          );
          const nextTools = [
            ...new Set([
              ...toolIds,
              ...registryEntries.map((entry) => entry.name),
            ]),
          ]
            .map((toolId) => toToolDefinition(toolId, registryEntriesByName.get(toolId)))
            .sort(sortToolDefinitions);
          setToolDefinitions(nextTools);
          setToolToAdd((current) =>
            current && nextTools.some((tool) => tool.name === current)
              ? current
              : nextTools[0]?.name ?? "",
          );
        })
        .catch((error) => {
          if (controller.signal.aborted) return;

          setToolDefinitions([]);
          setToolToAdd("");
          setToolsError(getApiErrorMessage(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setToolsLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeProjectName, activeProjectPath, agentsDialogOpen, agentsToolsHasChanges]);

  function showConfirmationToast({
    description,
    id,
    onConfirm,
    title,
  }: {
    description: ReactNode;
    id: string;
    onConfirm: () => Promise<void> | void;
    title: string;
  }) {
    toastManager.add({
      id,
      title,
      description,
      type: "warning",
      timeout: 9000,
      data: {
        cancelActionProps: {
          children: "取消",
          onClick: () => toastManager.close(id),
        },
      },
      actionProps: {
        children: "確認",
        onClick: () => {
          toastManager.close(id);
          void onConfirm();
        },
      },
    });
  }

  function finishProjectOpen(path: string) {
    onProjectChange(path);
    setProjectDialogOpen(false);
    setProjectDialogView("list");
    onClose();
  }

  function refreshProjects() {
    setProjectActionError(null);
    void onRefreshProjects();
  }

  function confirmOpenProject(path: string) {
    if (!path.trim()) return;
    showConfirmationToast({
      id: `open-project-${path}`,
      title: "是否開啟專案？",
      description: (
        <span className="grid gap-1">
          <span className="font-mono text-xs">{path}</span>
          <span className="text-xs">忽略此提示即取消操作。</span>
        </span>
      ),
      onConfirm: () => finishProjectOpen(path),
    });
  }

  async function createProject(name: string) {
    setCreatingProject(true);
    setProjectActionError(null);

    try {
      const nextProject = await onCreateProject(name);
      setProjectDialogView("list");
      setProjectCreateName("");
      finishProjectOpen(nextProject.path);
      toastManager.add({
        id: `project-created-${name}-${Date.now()}`,
        title: "專案已建立",
        description: nextProject.path,
        type: "success",
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setProjectActionError(message);
      toastManager.add({
        id: `project-create-error-${Date.now()}`,
        title: "建立專案失敗",
        description: message,
        type: "error",
      });
    } finally {
      setCreatingProject(false);
    }
  }

  function confirmCreateProject() {
    const name = projectCreateName.trim();
    if (!name) return;

    if (!PROJECT_NAME_PATTERN.test(name)) {
      setProjectActionError(
        "專案名稱只能使用英文、數字、底線、連字號，且需以英文或數字開頭。",
      );
      return;
    }

    showConfirmationToast({
      id: `create-project-${name}`,
      title: "是否建立專案？",
      description: (
        <span className="grid gap-1">
          <span>名稱：{name}</span>
          <span className="text-xs">會建立到 backend 的 OpenCode projects root。</span>
          <span className="text-xs">忽略此提示即取消操作。</span>
        </span>
      ),
      onConfirm: () => void createProject(name),
    });
  }

  function confirmDeleteProject(project: AppSidebarProject) {
    if (deletingProjectRef.current) return;

    const label = project.displayName || project.name;

    showConfirmationToast({
      id: `delete-project-${project.name}`,
      title: "是否刪除專案？",
      description: (
        <span className="grid gap-1">
          <span>名稱：{label}</span>
          <span className="font-mono text-xs">{project.path}</span>
          <span className="text-xs">會以 force=true 刪除 backend 管理的專案資料。</span>
        </span>
      ),
      onConfirm: () => void deleteProject(project),
    });
  }

  async function deleteProject(project: AppSidebarProject) {
    if (deletingProjectRef.current) return;

    deletingProjectRef.current = project.name;
    setDeletingProjectName(project.name);
    setProjectActionError(null);

    try {
      await onDeleteProject(project);
      toastManager.add({
        id: `project-deleted-${project.name}-${Date.now()}`,
        title: "專案已刪除",
        description: project.path,
        type: "success",
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setProjectActionError(message);
      toastManager.add({
        id: `project-delete-error-${Date.now()}`,
        title: "刪除專案失敗",
        description: message,
        type: "error",
      });
    } finally {
      deletingProjectRef.current = null;
      setDeletingProjectName(null);
    }
  }

  function confirmBatchUpdate(scope: "agents-tools" | "plugins-skills") {
    const label = scope === "agents-tools" ? "智能體與工具" : "外掛與技能";
    showConfirmationToast({
      id: `batch-update-${scope}`,
      title: `是否更新${label}？`,
      description:
        "按下確認後會套用更新並重新啟動 OpenCode server，完成前會顯示全域 loading。",
      onConfirm: () => applyBatchUpdate(scope, label),
    });
  }

  async function applyBatchUpdate(
    scope: "agents-tools" | "plugins-skills",
    label: string,
  ) {
    setBatchUpdateNotice(`${label} 更新中，正在重新啟動 OpenCode server...`);

    try {
      await onRestartOpenCode(`Apply ${label} modal updates`);

      if (scope === "agents-tools") {
        setAgentsToolsHasChanges(false);
      } else {
        setPluginSkillHasChanges(false);
      }
      setBatchUpdateNotice(`${label} 已更新，OpenCode server 已重新啟動。`);
      toastManager.add({
        id: `batch-update-success-${scope}-${Date.now()}`,
        title: "OpenCode 已重新啟動",
        description: `${label} 更新已生效。`,
        type: "success",
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBatchUpdateNotice(`${label} 更新失敗：${message}`);
      toastManager.add({
        id: `batch-update-error-${scope}-${Date.now()}`,
        title: "OpenCode 重新啟動失敗",
        description: message,
        type: "error",
      });
    }
  }

  function agentCanReach(
    fromAgentId: string,
    targetAgentId: string,
    visited = new Set<string>(),
  ): boolean {
    if (fromAgentId === targetAgentId) return true;
    if (visited.has(fromAgentId)) return false;
    visited.add(fromAgentId);

    const fromAgent = agents.find((agent) => agent.id === fromAgentId);
    if (!fromAgent) return false;

    return fromAgent.subagents.some((subagentId) =>
      agentCanReach(subagentId, targetAgentId, visited),
    );
  }

  function getCallableSubagentOptions(
    agentId: string | null,
    assignedSubagents: string[],
  ) {
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

  function updateModelProvider(
    providerId: string,
    updates: Partial<ModelProvider>,
  ) {
    setModelProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? { ...provider, ...updates } : provider,
      ),
    );
  }

  function toggleAvailableModel(modelKey: string, enabled: boolean) {
    setDisabledModelIds((current) => {
      const next = new Set(current);
      if (enabled) {
        next.delete(modelKey);
      } else {
        next.add(modelKey);
      }
      onOpenCodeDisabledModelsChange?.(Array.from(next));
      return next;
    });
    setModelProviders((current) =>
      current.map((provider) => ({
        ...provider,
        availableModels: (provider.availableModels ?? []).map((model) =>
          model.key === modelKey ? { ...model, enabled } : model,
        ),
      })),
    );
  }

  async function disconnectModelProvider(providerId: string) {
    if (disconnectingProviderId) return;

    const provider = modelProviders.find((item) => item.id === providerId);
    setDisconnectingProviderId(providerId);

    try {
      const directory = activeProjectPath?.trim() || undefined;
      await disconnectOpenCodeProviderAuth(providerId, {
        query: directory ? { directory } : undefined,
      });
      await disposeOpenCodeInstance({
        query: directory ? { directory } : undefined,
      });
      updateModelProvider(providerId, {
        connected: false,
        enabled: false,
        verificationCode: undefined,
        verificationInstructions: undefined,
        verificationMethod: undefined,
        verificationMethodIndex: undefined,
        verificationUrl: undefined,
      });
      await loadModelProviders();
      toastManager.add({
        id: `provider-disconnected-${providerId}-${Date.now()}`,
        description: `${provider?.name ?? providerId} 已從 OpenCode 移除授權。`,
        title: "已斷開連接",
        type: "success",
      });
    } catch (error) {
      toastManager.add({
        id: `provider-disconnect-error-${providerId}-${Date.now()}`,
        description: getApiErrorMessage(error),
        title: "斷開連接失敗",
        type: "error",
      });
    } finally {
      setDisconnectingProviderId(null);
    }
  }

  async function submitProviderApiKey(providerId: string, key: string, inputs?: Record<string, string>) {
    if (providerAuthApplying) return;

    const provider = modelProviders.find((item) => item.id === providerId);
    const directory = activeProjectPath?.trim() || undefined;
    const query = directory ? { directory } : undefined;
    setProviderAuthApplying(true);

    try {
      await setOpenCodeProviderApiKey(providerId, key.trim(), inputs, { query });
      await disposeOpenCodeInstance({ query });
      await loadModelProviders();
      setSelectedProviderAuthMethod(null);
      setSelectedModelProviderId(null);
      toastManager.add({
        id: `provider-api-key-connected-${providerId}-${Date.now()}`,
        description: `${provider?.name ?? providerId} 已使用 API key 連接。`,
        title: "已連接模型商",
        type: "success",
      });
    } catch (error) {
      toastManager.add({
        id: `provider-api-key-error-${providerId}-${Date.now()}`,
        description: getApiErrorMessage(error),
        title: "API key 連接失敗",
        type: "error",
      });
    } finally {
      setProviderAuthApplying(false);
    }
  }

  async function startProviderAuthFlow(method: string, inputs?: Record<string, string>) {
    if (!selectedModelProviderId) return;

    const provider = modelProviders.find((item) => item.id === selectedModelProviderId);
    if (!provider) return;

    const methodIndex = provider.authMethods.indexOf(method);
    if (methodIndex < 0) {
      toastManager.add({
        id: `provider-auth-method-not-found-${Date.now()}`,
        description: "未找到指定授權方式，請重新選擇。",
        title: "授權啟動失敗",
        type: "error",
      });
      return;
    }

    const authMethod = provider.authMethodDetails?.[methodIndex];
    if (authMethod?.type === "api") {
      updateModelProvider(provider.id, {
        verificationCode: undefined,
        verificationInstructions: undefined,
        verificationMethod: undefined,
        verificationMethodIndex: undefined,
        verificationUrl: undefined,
      });
      setSelectedProviderAuthMethod(method);
      return;
    }

    if (authMethod?.prompts?.length && !inputs) {
      updateModelProvider(provider.id, {
        verificationCode: undefined,
        verificationInstructions: undefined,
        verificationMethod: undefined,
        verificationMethodIndex: undefined,
        verificationUrl: undefined,
      });
      setSelectedProviderAuthMethod(method);
      return;
    }

    try {
      const response = await startOpenCodeProviderAuth(
        provider.id,
        methodIndex,
        inputs,
        {
          query: activeProjectPath ? { directory: activeProjectPath } : undefined,
        },
      );
      const verificationCode = extractVerificationCode(response.instructions);

      if (response.url) {
        window.open(response.url, "_blank", "noopener,noreferrer");
      }

      updateModelProvider(provider.id, {
        connected: provider.connected,
        verificationCode,
        verificationInstructions: response.instructions,
        verificationMethod: response.method,
        verificationMethodIndex: methodIndex,
        verificationUrl: response.url,
      });

      setSelectedProviderAuthMethod(method);
      toastManager.add({
        id: `provider-auth-started-${Date.now()}`,
        description:
          "請在彈出的授權連結完成驗證，完成後會自動更新連接狀態。",
        title: "請完成授權",
        type: "warning",
      });
      if (verificationCode) {
        void pollHeadlessProviderCompletion(provider.id, methodIndex);
      } else {
        void pollProviderConnection(provider.id);
      }
    } catch (error) {
      setSelectedProviderAuthMethod(null);
      toastManager.add({
        id: `provider-auth-start-error-${Date.now()}`,
        description: getApiErrorMessage(error),
        title: "授權啟動失敗",
        type: "error",
      });
    }
  }

  function closeUserSettings() {
    setUserSettingsOpen(false);
    setUserSettingsSection("model-providers");
    setModelProviderSearch("");
    setSelectedModelProviderId(null);
    setSelectedProviderAuthMethod(null);
  }

  function togglePlugin(pluginId: string) {
    setPlugins((current) =>
      current.map((plugin) =>
        plugin.id === pluginId
          ? { ...plugin, enabled: !plugin.enabled }
          : plugin,
      ),
    );
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function addPluginFromOfficialSource() {
    const method = pluginForm.method;
    const archiveName = pluginForm.archiveName.trim();
    const rawName =
      method === "archive"
        ? archiveName.replace(/\.(zip|tar|tgz|tar\.gz)$/i, "")
        : pluginForm.name.trim();
    const pluginName = rawName
      .replace(/[^a-zA-Z0-9_@/-]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!pluginName) {
      setPluginInstallResult({
        status: "error",
        message:
          method === "archive"
            ? "請先選擇 plugin 壓縮檔。"
            : "請輸入 plugin 名稱。",
      });
      return;
    }

    if (
      method === "archive" &&
      !/\.(zip|tar|tgz|tar\.gz)$/i.test(archiveName)
    ) {
      setPluginInstallResult({
        status: "error",
        message: "只支援 .zip、.tar、.tgz、.tar.gz 壓縮檔。",
      });
      return;
    }

    if (method === "local" && !pluginForm.entry.trim()) {
      setPluginInstallResult({
        status: "error",
        message: "Local plugin 需要指定 .js 或 .ts entry path。",
      });
      return;
    }

    const targetDirectory =
      pluginForm.installTarget === "project"
        ? `.opencode/plugins/${pluginName}`
        : `~/.config/opencode/plugins/${pluginName}`;
    const entry =
      method === "npm"
        ? pluginName
        : method === "local"
          ? pluginForm.entry.trim()
          : `${targetDirectory}/index.ts`;
    const nextPlugin: PluginDefinition = {
      id: `${method}-${Date.now()}`,
      name: pluginName,
      description:
        pluginForm.description.trim() ||
        (method === "npm"
          ? "透過 opencode.json plugin array 載入的 npm plugin。"
          : "透過 OpenCode plugins directory 自動載入的本地 plugin。"),
      source: method,
      entry,
      enabled: true,
      config:
        method === "npm"
          ? JSON.stringify({ plugin: [pluginName] }, null, 2)
          : JSON.stringify({ directory: targetDirectory }, null, 2),
      archiveName: method === "archive" ? archiveName : undefined,
      installTarget: method === "npm" ? undefined : pluginForm.installTarget,
    };

    setPlugins((current) =>
      current.some(
        (plugin) => plugin.name === pluginName && plugin.source === method,
      )
        ? current
        : [nextPlugin, ...current],
    );
    setPluginInstallResult({
      status: "success",
      message:
        method === "npm"
          ? `已新增 npm plugin：請寫入 opencode.json 的 plugin array。`
          : `已新增 local plugin：OpenCode 會從 ${entry} 載入。`,
    });
    setPluginForm(emptyPluginForm);
    setPluginSkillTab("plugins");
    setPluginSkillDialogView("list");
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function toggleSkill(skillId: string) {
    setSkillSettings((current) =>
      current.map((skill) =>
        skill.id === skillId ? { ...skill, enabled: !skill.enabled } : skill,
      ),
    );
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function addSkillFromOfficialSource() {
    const archiveName = skillForm.archiveName.trim();
    const rawName = archiveName
      ? archiveName.replace(/\.(zip|tar|tgz|tar\.gz)$/i, "")
      : skillForm.name.trim();
    const skillName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");

    if (!isValidSkillName(skillName)) {
      setSkillInstallResult({
        status: "error",
        message:
          "Skill name 必須符合官方規則：小寫英數、單一 hyphen 分隔，1-64 字元。",
      });
      return;
    }

    if (!skillForm.description.trim()) {
      setSkillInstallResult({
        status: "error",
        message: "Skill description 是官方必要欄位。",
      });
      return;
    }

    if (archiveName && !/\.(zip|tar|tgz|tar\.gz)$/i.test(archiveName)) {
      setSkillInstallResult({
        status: "error",
        message: "壓縮檔只支援 .zip、.tar、.tgz、.tar.gz。",
      });
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

    setSkillSettings((current) =>
      current.some((skill) => skill.id === skillName)
        ? current
        : [nextSkill, ...current],
    );
    setSkillInstallResult({
      status: "success",
      message: archiveName
        ? `已新增 archive skill：解壓後需包含 ${skillName}/SKILL.md。`
        : `已新增 skill：${nextSkill.path}`,
    });
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
      setMcpServers((current) =>
        current.map((server) =>
          server.id === editingMcpId ? { ...server, ...mcpForm } : server,
        ),
      );
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
    setMcpServers((current) =>
      current.map((server) => ({
        ...server,
        isDefault: server.id === serverId,
      })),
    );
  }

  function deleteMcpServer(serverId: string) {
    setMcpServers((current) => {
      const next = current.filter((server) => server.id !== serverId);
      if (next.some((server) => server.isDefault) || next.length === 0)
        return next;
      return next.map((server, index) => ({
        ...server,
        isDefault: index === 0,
      }));
    });
  }

  function openAgentsList() {
    setAgentDialogView("list");
    setAgentToolTab("agents");
    setSelectedToolId(null);
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
    setSelectedToolId(null);
    setToolForm(emptyToolForm);
    setToolTestResult(null);
    setAgentDialogView("tool-config");
  }

  function openEditToolMode(tool: ToolDefinition) {
    if (tool.source !== "custom") return;
    setToolEditMode("edit");
    setEditingToolId(tool.id);
    setSelectedToolId(tool.id);
    setToolForm({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      installTarget: tool.installTarget ?? "project",
      runtime: tool.runtime ?? "js-ts",
      entry:
        tool.entry ??
        getToolEntryPath(
          tool.name,
          tool.installTarget ?? "project",
        ),
      code: tool.code ?? "",
      testInput: tool.testInput ?? emptyToolForm.testInput,
    });
    setToolTestResult(null);
    setAgentDialogView("tool-config");

    if (tool.installTarget) {
      void loadToolRegistryContent(tool);
    }
  }

  async function loadToolRegistryContent(tool: ToolDefinition) {
    if ((tool.installTarget ?? "project") === "project" && !activeProjectName) return;

    try {
      const response = await readToolRegistryEntry(
        tool.installTarget ?? "project",
        tool.name,
        activeProjectName,
      );
      const content = response.content ?? Object.values(response.files ?? {})[0] ?? "";
      if (!content) return;

      setToolForm((current) =>
        current.name === tool.name
          ? {
              ...current,
              code: content,
              entry:
                response.file
                  ? getToolEntryPath(tool.name, current.installTarget, {
                      kind: "tools",
                      name: tool.name,
                      path: `${response.root.replace(/\\/g, "/")}/${response.file}`,
                      scope: current.installTarget,
                      type: response.files ? "directory" : "file",
                    })
                  : current.entry,
            }
          : current,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return;

      setToolTestResult({
        status: "error",
        message: `讀取 tool 內容失敗：${getApiErrorMessage(error)}`,
      });
    }
  }

  function openToolDetail(tool: ToolDefinition) {
    setSelectedToolId(tool.id);
    setAgentToolTab("tools");
    setAgentDialogView("tool-detail");
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
      setAgentYaml(
        agentToYaml({
          ...agentForm,
          id: editingAgentId ?? "draft-agent",
          scope: "custom",
          hidden: false,
        }),
      );
    }

    setAgentConfigMode(mode);
  }

  function submitAgentConfig() {
    const fallbackName = agentEditMode === "add" ? "custom-agent" : "agent";
    const yamlName = agentYaml.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const yamlDescription = agentYaml
      .match(/^description:\s*(.+)$/m)?.[1]
      ?.trim();
    const yamlMode = agentYaml.match(
      /^mode:\s*(primary|subagent|all)$/m,
    )?.[1] as AgentDefinition["mode"] | undefined;
    const yamlModel = agentYaml.match(/^model:\s*(.+)$/m)?.[1]?.trim();
    const yamlPromptFile = agentYaml
      .match(/^prompt:\s*"?\{file:(.+?)\}"?$/m)?.[1]
      ?.trim();
    const yamlPrompt = agentYaml.split("---").slice(2).join("---").trim();
    const nextAgent: AgentDefinition = {
      id: editingAgentId ?? `agent-${Date.now()}`,
      name:
        agentConfigMode === "yaml"
          ? yamlName || fallbackName
          : agentForm.name.trim() || fallbackName,
      description:
        agentConfigMode === "yaml"
          ? yamlDescription || "透過 YAML 新增的 opencode agent。"
          : agentForm.description.trim() || "透過介面新增的 opencode agent。",
      scope: "custom",
      mode:
        agentConfigMode === "yaml" ? (yamlMode ?? "subagent") : agentForm.mode,
      model:
        agentConfigMode === "yaml"
          ? yamlModel || "openai/gpt-5.5"
          : agentForm.model,
      temperature:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^temperature:\s*(.+)$/m)?.[1]?.trim()
          : agentForm.temperature,
      top_p:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^top_p:\s*(.+)$/m)?.[1]?.trim()
          : agentForm.top_p,
      variant:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^variant:\s*(.+)$/m)?.[1]?.trim()
          : agentForm.variant,
      steps:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^steps:\s*(.+)$/m)?.[1]?.trim()
          : agentForm.steps,
      disable:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^disable:\s*true$/m) !== null
          : agentForm.disable,
      hidden:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^hidden:\s*true$/m) !== null
          : agentForm.hidden,
      color:
        agentConfigMode === "yaml"
          ? agentYaml.match(/^color:\s*(.+)$/m)?.[1]?.trim()
          : agentForm.color,
      promptSource:
        agentConfigMode === "yaml"
          ? yamlPromptFile
            ? "file"
            : "inline"
          : agentForm.promptSource,
      promptFile:
        agentConfigMode === "yaml"
          ? (yamlPromptFile ?? "")
          : agentForm.promptFile,
      providerOptionsJson:
        agentConfigMode === "yaml" ? "" : agentForm.providerOptionsJson,
      permissionRulesJson:
        agentConfigMode === "yaml" ? "" : agentForm.permissionRulesJson,
      tools:
        agentConfigMode === "yaml" ? ["read", "grep", "glob"] : agentForm.tools,
      toolGuidance: agentConfigMode === "yaml" ? {} : agentForm.toolGuidance,
      skillGuidance: agentConfigMode === "yaml" ? {} : agentForm.skillGuidance,
      skills:
        agentConfigMode === "yaml"
          ? ["react-vite-feature-based"]
          : agentForm.skills,
      subagents: agentConfigMode === "yaml" ? [] : agentForm.subagents,
      subagentGuidance:
        agentConfigMode === "yaml" ? {} : agentForm.subagentGuidance,
      permission:
        agentConfigMode === "yaml"
          ? emptyAgentForm.permission
          : {
              ...agentForm.permission,
              task: taskPermissionFor(agentForm.subagents),
            },
      systemPrompt:
        agentConfigMode === "yaml" ? yamlPrompt || "" : agentForm.systemPrompt,
    };

    setAgents((current) => {
      if (agentEditMode === "edit" && editingAgentId) {
        return current.map((agent) =>
          agent.id === editingAgentId ? nextAgent : agent,
        );
      }

      return [...current, nextAgent];
    });
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
    setAgentDialogView("list");
  }

  function deleteAgent(agentId: string) {
    setAgents((current) =>
      current
        .filter((agent) => agent.id !== agentId)
        .map((agent) => {
          const nextSubagentGuidance = { ...agent.subagentGuidance };
          delete nextSubagentGuidance[agentId];
          return {
            ...agent,
            subagents: agent.subagents.filter(
              (subagentId) => subagentId !== agentId,
            ),
            subagentGuidance: nextSubagentGuidance,
          };
        }),
    );
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
  }

  async function submitToolConfig() {
    const name = toolForm.name.trim().replace(/\s+/g, "_");
    if (!name) return;
    if (toolForm.installTarget === "project" && !activeProjectName) {
      setToolTestResult({
        status: "error",
        message: "請先開啟有效 project，才能建立 project-local tool。",
      });
      return;
    }

    const installTarget = toolForm.installTarget;
    const entry =
      toolForm.entry.trim() ||
      getToolEntryPath(name, installTarget);
    const filename = getRegistryFilenameFromEntry(name, entry);

    const nextTool: ToolDefinition = {
      id: editingToolId ?? name,
      name,
      description:
        toolForm.description.trim() ||
        `Custom ${installTarget === "global" ? "global" : "project"} tool.`,
      category: toolForm.category.trim() || "Custom",
      source: "custom",
      installTarget,
      runtime: toolForm.runtime,
      entry,
      code: toolForm.code,
      testInput: toolForm.testInput,
    };

    try {
      await upsertToolRegistryEntry(
        installTarget,
        name,
        {
          content: toolForm.code,
          ...(filename ? { filename } : {}),
          reason: `${toolEditMode === "add" ? "Create" : "Update"} ${installTarget} tool ${name}`,
          restart: false,
          wait: false,
        },
        activeProjectName,
      );
    } catch (error) {
      setToolTestResult({
        status: "error",
        message: `保存 Tool 失敗：${getApiErrorMessage(error)}`,
      });
      return;
    }

    setToolDefinitions((current) => {
      if (toolEditMode === "edit" && editingToolId) {
        return current.map((tool) =>
          tool.id === editingToolId && tool.source === "custom"
            ? nextTool
            : tool,
        );
      }

      return current.some((tool) => tool.name === name)
        ? current
        : [...current, nextTool];
    });
    setSelectedToolId(nextTool.id);
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
    setToolToAdd(name);
    setAgentDialogView("list");
    setAgentToolTab("tools");
  }

  function deleteTool(tool: ToolDefinition) {
    if (tool.source !== "custom") return;
    setToolDefinitions((current) =>
      current.filter((item) => item.id !== tool.id),
    );
    setAgents((current) =>
      current.map((agent) => {
        const permissionKey = getToolPermissionKey(tool.name);
        const nextPermission = { ...agent.permission };
        const nextToolGuidance = { ...agent.toolGuidance };
        delete nextPermission[permissionKey];
        delete nextToolGuidance[tool.name];
        return {
          ...agent,
          tools: agent.tools.filter((item) => item !== tool.name),
          permission: nextPermission,
          toolGuidance: nextToolGuidance,
        };
      }),
    );
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
  }

  async function runToolCallTest() {
    if (toolCallTestLoading) return;

    if (!toolForm.name.trim()) {
      setToolTestResult({ status: "error", message: "Tool 名稱必填。" });
      return;
    }

    if (!toolForm.entry.trim()) {
      setToolTestResult({
        status: "error",
        message: "Entry file 必填，否則執行時找不到 tool 檔案。",
      });
      return;
    }

    if (!toolForm.code.trim()) {
      setToolTestResult({
        status: "error",
        message: "Tool code 不能為空，請先填入 JS/TS 實作。",
      });
      return;
    }

    if (toolForm.installTarget === "project" && !activeProjectName) {
      setToolTestResult({
        status: "error",
        message: "請先開啟有效 project，才能測試 project-local tool 背景服務。",
      });
      return;
    }

    try {
      JSON.parse(toolForm.testInput || "{}");
    } catch {
      setToolTestResult({
        status: "error",
        message: "Test input 必須是合法 JSON。",
      });
      return;
    }

    const expectedExtension = ".ts 或 .js";
    const extensionValid = toolForm.entry.endsWith(".ts") || toolForm.entry.endsWith(".js");

    if (!extensionValid) {
      setToolTestResult({
        status: "error",
        message: `JS/TS tool 的 entry 必須使用 ${expectedExtension}。`,
      });
      return;
    }

    setToolCallTestLoading(true);
    setToolTestResult(null);

    try {
      const result = await testToolScript({
        code: toolForm.code,
        entry: toolForm.entry,
        project: toolForm.installTarget === "project" ? activeProjectName : undefined,
        runtime: "js-ts",
        scope: toolForm.installTarget,
        testInput: toolForm.testInput || "{}",
      });
      const details = [
        ...(result.diagnostics?.length ? result.diagnostics : []),
        result.output ? `Output:\n${result.output}` : "",
        result.stdout ? `stdout:\n${result.stdout}` : "",
        result.stderr ? `stderr:\n${result.stderr}` : "",
      ].filter(Boolean);
      setToolTestResult({
        status: result.status,
        message: details.length
          ? `${result.message}\n${details.join("\n")}`
          : result.message,
      });
    } catch (error) {
      setToolTestResult({
        status: "error",
        message: `Tool Call Test 失敗：${getApiErrorMessage(error)}`,
      });
    } finally {
      setToolCallTestLoading(false);
    }
  }

  function updateAgentConfig(
    agentId: string,
    update: (agent: AgentDefinition) => AgentDefinition,
  ) {
    setAgents((current) =>
      current.map((agent) => (agent.id === agentId ? update(agent) : agent)),
    );
  }

  function addFormSubagent() {
    const options = getCallableSubagentOptions(
      editingAgentId,
      agentForm.subagents,
    );
    const subagentId = options.some((agent) => agent.id === subagentToAdd)
      ? subagentToAdd
      : options[0]?.id;
    if (!subagentId) return;
    setAgentForm((current) => {
      if (current.subagents.includes(subagentId)) return current;
      const nextSubagents = [...current.subagents, subagentId];
      return {
        ...current,
        subagents: nextSubagents,
        subagentGuidance: {
          ...current.subagentGuidance,
          [subagentId]: current.subagentGuidance[subagentId] ?? "",
        },
        permission: {
          ...current.permission,
          task: taskPermissionFor(nextSubagents),
        },
      };
    });
  }

  function removeFormSubagent(subagentId: string) {
    if (guidanceSubagent === subagentId) setGuidanceSubagent(null);
    setAgentForm((current) => {
      const nextSubagentGuidance = { ...current.subagentGuidance };
      delete nextSubagentGuidance[subagentId];
      const nextSubagents = current.subagents.filter(
        (item) => item !== subagentId,
      );
      return {
        ...current,
        subagents: nextSubagents,
        subagentGuidance: nextSubagentGuidance,
        permission: {
          ...current.permission,
          task: taskPermissionFor(nextSubagents),
        },
      };
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
      <AppSidebarPanel
        activeSessionId={activeSessionId}
        filteredSessions={filteredSessions}
        historySearch={historySearch}
        historySearchOpen={historySearchOpen}
        onAgentsOpen={openAgentsList}
        onClose={onClose}
        onCreateSession={() => void onCreateSession()}
        onHistorySearchChange={setHistorySearch}
        onHistorySearchToggle={() =>
          setHistorySearchOpen((current) => !current)
        }
        onMcpOpen={openMcpList}
        onPluginSkillOpen={openPluginSkillSettings}
        onProjectOpen={() => {
          setProjectDialogView("list");
          setProjectActionError(null);
          setProjectDialogOpen(true);
          void onRefreshProjects();
        }}
        onSelectSession={onSelectSession}
        onUserSettingsOpen={() => {
          setUserSettingsSection("model-providers");
          setSelectedModelProviderId(null);
          setSelectedProviderAuthMethod(null);
          setUserSettingsOpen(true);
        }}
        open={open}
        sessionsError={sessionsError}
        sessionsLoading={sessionsLoading}
      />

      <ProjectDialog
        activeProjectPath={activeProjectPath}
        busyProjectName={deletingProjectName}
        createName={projectCreateName}
        creatingProject={creatingProject}
        error={projectDialogError}
        filteredProjects={filteredProjects}
        loadingProjects={projectsLoading}
        onClose={() => {
          setProjectDialogOpen(false);
          setProjectDialogView("list");
          setProjectActionError(null);
        }}
        onConfirmCreate={confirmCreateProject}
        onConfirmDelete={confirmDeleteProject}
        onConfirmOpen={confirmOpenProject}
        onCreateNameChange={setProjectCreateName}
        onRefreshProjects={refreshProjects}
        onSearchChange={setProjectSearch}
        onViewChange={setProjectDialogView}
        open={projectDialogOpen}
        search={projectSearch}
        view={projectDialogView}
      />

      <UserSettingsModal
        activeProjectName={activeProjectName}
        disconnectingProviderId={disconnectingProviderId}
        filteredModelProviders={filteredModelProviders}
        modelProviders={modelProviders}
        modelProviderSearch={modelProviderSearch}
        modelSearch={modelSearch}
        npmPackageInput={npmPackageInput}
        npmPackageJsonPath={npmPackageJsonPath}
        npmPackageRoot={npmPackageRoot}
        npmPackages={npmPackages}
        npmPackagesApplying={npmPackagesApplying}
        npmPackagesError={npmPackagesError}
        npmPackagesLoading={npmPackagesLoading}
        npmPackagesToInstall={npmPackagesToInstall}
        npmPackagesToDelete={npmPackagesToDelete}
        npmPackageTarget={npmPackageTarget}
        onClose={closeUserSettings}
        onApplyNpmPackageChanges={applyNpmPackageChanges}
        onCancelNpmPackageChanges={cancelNpmPackageChanges}
        onClearNpmPackageDelete={clearNpmPackageDeletes}
        onRemoveNpmPackageInstall={removeNpmPackageInstall}
        onModelProviderSearchChange={setModelProviderSearch}
        onModelSearchChange={setModelSearch}
        onModelToggle={toggleAvailableModel}
        onNpmPackageInputChange={setNpmPackageInput}
        onNpmPackageTargetChange={changeNpmPackageTarget}
        onOpenChange={(settingsOpen) => {
          if (!settingsOpen) closeUserSettings();
        }}
        onProviderApiKeySubmit={submitProviderApiKey}
        onProviderAuthMethodChange={startProviderAuthFlow}
        onProviderDisconnect={disconnectModelProvider}
        onProviderSelect={(providerId) => {
          setSelectedModelProviderId(providerId);
          setSelectedProviderAuthMethod(null);
        }}
        onProviderViewBack={() => {
          if (selectedProviderAuthMethod) {
            setSelectedProviderAuthMethod(null);
            if (selectedModelProviderId) {
              void loadModelProviders();
            }
            return;
          }

          setSelectedModelProviderId(null);
        }}
        onRefreshNpmPackages={loadNpmPackages}
        onStageNpmPackageInstalls={stageNpmPackageInstalls}
        onToggleNpmPackageDelete={toggleNpmPackageDelete}
        onSectionChange={(nextSection) => {
          setUserSettingsSection(nextSection);
          setSelectedModelProviderId(null);
          setSelectedProviderAuthMethod(null);
          if (nextSection !== "models") setModelSearch("");
        }}
        open={userSettingsOpen}
        providerAuthApplying={providerAuthApplying}
        section={userSettingsSection}
        selectedAuthMethod={selectedProviderAuthMethod}
        selectedProvider={selectedModelProvider}
      />

      <McpServersDialog
        filteredServers={filteredMcpServers}
        form={mcpForm}
        onClose={() => setMcpDialogOpen(false)}
        onDeleteServer={deleteMcpServer}
        onEditServer={openEditMcpServer}
        onFormChange={(updates) =>
          setMcpForm((current) => ({ ...current, ...updates }))
        }
        onOpenAddServer={openAddMcpServer}
        onSearchChange={setMcpSearch}
        onSetDefaultServer={setDefaultMcpServer}
        onSubmit={submitMcpServer}
        onViewChange={setMcpDialogView}
        open={mcpDialogOpen}
        search={mcpSearch}
        view={mcpDialogView}
      />

      <PluginSkillModal
        batchUpdateNotice={batchUpdateNotice}
        filteredPlugins={filteredPlugins}
        filteredSkillSettings={filteredSkillSettings}
        hasChanges={pluginSkillHasChanges}
        onAddPlugin={addPluginFromOfficialSource}
        onAddSkill={addSkillFromOfficialSource}
        onConfirmBatchUpdate={() => confirmBatchUpdate("plugins-skills")}
        onOpenChange={setPluginSkillDialogOpen}
        onPluginFormChange={setPluginForm}
        onPluginInstallResultChange={setPluginInstallResult}
        onSearchChange={setPluginSkillSearch}
        onSkillFormChange={setSkillForm}
        onSkillInstallResultChange={setSkillInstallResult}
        onTabChange={setPluginSkillTab}
        onTogglePlugin={togglePlugin}
        onToggleSkill={toggleSkill}
        onViewChange={setPluginSkillDialogView}
        open={pluginSkillDialogOpen}
        pluginForm={pluginForm}
        pluginInstallResult={pluginInstallResult}
        plugins={plugins}
        search={pluginSkillSearch}
        skillForm={skillForm}
        skillInstallResult={skillInstallResult}
        skillSettings={skillSettings}
        tab={pluginSkillTab}
        view={pluginSkillDialogView}
      />

      <AgentsToolsModal
        agentConfigMode={agentConfigMode}
        agentEditMode={agentEditMode}
        agentForm={agentForm}
        agentToolTab={agentToolTab}
        agentYaml={agentYaml}
        agents={agents}
        agentsError={agentsError}
        agentsLoading={agentsLoading}
        agentsToolsHasChanges={agentsToolsHasChanges}
        availableSkillNames={availableSkillNames}
        batchUpdateNotice={batchUpdateNotice}
        editingAgentId={editingAgentId}
        guidanceSkill={guidanceSkill}
        guidanceSubagent={guidanceSubagent}
        guidanceTool={guidanceTool}
        isCustomToolName={isCustomToolName}
        onAddFormSubagent={addFormSubagent}
        onAgentConfigModeChange={switchAgentConfigMode}
        onAgentDialogViewChange={setAgentDialogView}
        onAgentFormChange={setAgentForm}
        onAgentToolTabChange={setAgentToolTab}
        onAgentYamlChange={setAgentYaml}
        onConfirmBatchUpdate={() => confirmBatchUpdate("agents-tools")}
        onDeleteAgent={deleteAgent}
        onDeleteTool={deleteTool}
        onGetCallableSubagentOptions={getCallableSubagentOptions}
        onGuidanceSkillChange={setGuidanceSkill}
        onGuidanceSubagentChange={setGuidanceSubagent}
        onGuidanceToolChange={setGuidanceTool}
        onOpenAddAgentMode={openAddAgentMode}
        onOpenAddToolMode={openAddToolMode}
        onOpenAgentDetail={openAgentDetail}
        onOpenChange={setAgentsDialogOpen}
        onOpenEditAgentMode={openEditAgentMode}
        onOpenEditToolMode={openEditToolMode}
        onOpenToolDetail={openToolDetail}
        onRemoveFormSubagent={removeFormSubagent}
        onRunToolCallTest={runToolCallTest}
        onSkillToAddChange={setSkillToAdd}
        onSubagentToAddChange={setSubagentToAdd}
        onSubmitAgentConfig={submitAgentConfig}
        onSubmitToolConfig={submitToolConfig}
        onToolFormChange={setToolForm}
        onToolTestResultChange={setToolTestResult}
        onToolToAddChange={setToolToAdd}
        onUpdateSkillGuidance={updateSkillGuidance}
        onUpdateSubagentGuidance={updateSubagentGuidance}
        onUpdateToolGuidance={updateToolGuidance}
        open={agentsDialogOpen}
        selectedAgent={selectedAgent}
        selectedTool={selectedTool}
        skillToAdd={skillToAdd}
        subagentToAdd={subagentToAdd}
        toolDefinitions={toolDefinitions}
        toolEditMode={toolEditMode}
        toolsError={toolsError}
        toolsLoading={toolsLoading}
        toolCallTestLoading={toolCallTestLoading}
        toolForm={toolForm}
        toolTestResult={toolTestResult}
        toolToAdd={toolToAdd}
        view={agentDialogView}
      />
    </>
  );
}
