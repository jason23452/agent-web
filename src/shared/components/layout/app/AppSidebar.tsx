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
  getOpenCodeModelSettings,
  updateOpenCodeModelSettings,
} from "@/shared/api/opencodeModelSettings";
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
  deleteAgentRegistryEntry,
  deleteCommandRegistryEntry,
  deleteToolRegistryEntry,
  readAgentRegistryEntry,
  readCommandRegistryEntry,
  readToolRegistryEntry,
  testToolScript,
  upsertPluginRegistryEntry,
  upsertAgentRegistryEntry,
  upsertCommandRegistryEntry,
  deletePluginRegistryEntry,
  listOpenCodeRegistryEntries,
  readSkillRegistryEntry,
  upsertSkillRegistryEntry,
  upsertToolRegistryEntry,
  type OpenCodeRegistryEntry,
} from "@/shared/api/opencodeRegistry";
import { listProjectToolIds } from "@/shared/api/opencodeTools";
import { listOpenCodeCommands, type OpenCodeRuntimeCommand } from "@/shared/api/opencodeCommands";
 import { deleteOpenCodeSkills, importSkillArchives, importSkillUrls, listOpenCodeSkills, updateSkillProjectSettings } from "@/shared/api/opencodeSkills";
import {
  applyOpenCodeConfig,
  getOpenCodeConfig,
  syncOpenCodePluginConfig,
  type OpenCodeConfigScope,
} from "@/shared/api/opencodeProjectConfig";
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
  emptyCommandForm,
  emptyMcpForm,
  emptyPluginForm,
  emptySkillForm,
  emptyToolForm,
  initialMcpServers,
  initialModelProviders,
  initialToolDefinitions,
} from "@/shared/components/layout/app-sidebar/config";
import type {
  AgentConfigMode,
  CommandDefinition,
  CommandForm,
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
  PluginConfigMode,
  PluginConfigScope,
  PluginEditorMode,
  PluginSkillDialogView,
  PluginSkillTab,
  ProjectDialogView,
  SkillDefinition,
  PendingRegistryDelete,
  PendingRegistryUpsert,
  RegistryConfigScope,
  ToolDefinition,
  ToolEditMode,
} from "@/shared/types/app-sidebar";
import {
  agentToYaml,
  getToolPermissionKey,
  isCustomTool,
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
    installTarget: "project",
  };
}

function toRegistryAgentDefinition(
  entry: OpenCodeRegistryEntry,
  runtimeAgent?: AgentDefinition,
): AgentDefinition {
  return {
    ...(runtimeAgent ?? {
      ...emptyAgentForm,
      id: entry.name,
      name: entry.name,
      description: "OpenCode custom agent.",
      scope: "custom",
    }),
    id: runtimeAgent?.id ?? entry.name,
    name: entry.name,
    scope: runtimeAgent?.scope === "system" ? "system" : "custom",
    installTarget: entry.scope,
    inherited: entry.inherited,
    overridesGlobal: entry.overridesGlobal,
    registryPath: entry.path,
    registryType: entry.type,
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
    overridesGlobal: registryEntry?.overridesGlobal,
    registryPath: registryEntry?.path,
    registryType: registryEntry?.type,
    runtime: "js-ts",
    entry: getToolEntryPath(toolId, registryEntry?.scope ?? "project", registryEntry),
  };
}

function toCommandDefinition(
  entry: OpenCodeRegistryEntry,
  runtimeCommand?: OpenCodeRuntimeCommand,
): CommandDefinition {
  return {
    id: entry.name,
    name: entry.name,
    description: runtimeCommand?.description ?? "OpenCode custom command.",
    source: "custom",
    agent: runtimeCommand?.agent,
    model: runtimeCommand?.model,
    subtask: runtimeCommand?.subtask,
    template: runtimeCommand?.template ?? "",
    installTarget: entry.scope,
    inherited: entry.inherited,
    overridesGlobal: entry.overridesGlobal,
    registryPath: entry.path,
    registryType: entry.type,
  };
}

function toRuntimeCommandDefinition(command: OpenCodeRuntimeCommand): CommandDefinition {
  return {
    id: command.name,
    name: command.name,
    description: command.description ?? "OpenCode runtime command.",
    source: "runtime",
    agent: command.agent,
    model: command.model,
    subtask: command.subtask,
    template: command.template,
  };
}

function parseCommandDocument(content: string, fallback: CommandDefinition): CommandForm {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const metadata = new Map<string, string>();

  for (const line of match?.[1]?.split("\n") ?? []) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    metadata.set(key, value);
  }

  return {
    name: fallback.name,
    installTarget: fallback.installTarget ?? "project",
    description: metadata.get("description") ?? fallback.description,
    agent: metadata.get("agent") ?? "",
    model: metadata.get("model") ?? "",
    subtask: metadata.get("subtask") === "true",
    template: match?.[2] ?? content,
  };
}

function commandToMarkdown(command: CommandDefinition): string {
  const metadata = [
    command.description.trim() ? `description: ${command.description.trim()}` : "",
    command.agent?.trim() ? `agent: ${command.agent.trim()}` : "",
    command.model?.trim() ? `model: ${command.model.trim()}` : "",
    command.subtask ? "subtask: true" : "",
  ].filter(Boolean);

  return `---\n${metadata.join("\n")}\n---\n${command.template.trim()}\n`;
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

function sortCommandDefinitions(a: CommandDefinition, b: CommandDefinition) {
  return a.name.localeCompare(b.name);
}

function areSetsEqual<T>(left: Set<T>, right: Set<T>) {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
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
   const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
   const [pluginConfigMode, setPluginConfigMode] = useState<PluginConfigMode>("interface");
   const [pluginConfigScope, setPluginConfigScope] = useState<PluginConfigScope>("project");
   const [pluginDocument, setPluginDocument] = useState("");
   const [, setPluginConfig] = useState<Record<string, unknown>>({});
   const [pluginConfigLoading, setPluginConfigLoading] = useState(false);
  const [skillSettings, setSkillSettings] =
     useState<SkillDefinition[]>([]);
   const [pluginForm, setPluginForm] = useState(emptyPluginForm);
   const [editingPluginId, setEditingPluginId] = useState<string | null>(null);
   const [pluginReadOnly, setPluginReadOnly] = useState(false);
   const [pluginEditorMode, setPluginEditorMode] = useState<PluginEditorMode>("add");
   const [pendingPluginFiles, setPendingPluginFiles] = useState<Record<string, { code: string; scope: PluginConfigScope }>>({});
   const [pendingPluginDeletes, setPendingPluginDeletes] = useState<Record<string, PluginConfigScope>>({});
   const [pendingPluginScopeMoves, setPendingPluginScopeMoves] = useState<Record<string, { from: PluginConfigScope; to: PluginConfigScope }>>({});
   const [pendingRemotePluginDeletes, setPendingRemotePluginDeletes] = useState<Record<string, PluginConfigScope>>({});
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [pluginInstallResult, setPluginInstallResult] =
    useState<InstallResult | null>(null);
   const [skillInstallResult, setSkillInstallResult] =
     useState<InstallResult | null>(null);
   const [skillImportLoading, setSkillImportLoading] = useState(false);
   const [pendingSkillDeletes, setPendingSkillDeletes] = useState<Record<string, SkillDefinition>>({});
   const [skillEditing, setSkillEditing] = useState<SkillDefinition | null>(null);
   const [skillEditingScope, setSkillEditingScope] = useState<"project" | "global">("project");
   const [skillDocument, setSkillDocument] = useState("");
    const [pendingSkillEdits, setPendingSkillEdits] = useState<Record<string, { scope: "project" | "global"; content: string }>>({});
    const [enabledGlobalSkills, setEnabledGlobalSkills] = useState<string[]>([]);
    const [savedEnabledGlobalSkills, setSavedEnabledGlobalSkills] = useState<string[]>([]);
  const [batchUpdateNotice, setBatchUpdateNotice] = useState("");
  const [pluginSkillHasChanges, setPluginSkillHasChanges] = useState(false);
  const [agentsDialogOpen, setAgentsDialogOpen] = useState(false);
  const [agentDialogView, setAgentDialogView] =
    useState<AgentDialogView>("list");
  const [agentEditMode, setAgentEditMode] = useState<AgentEditMode>("add");
  const [agentConfigMode, setAgentConfigMode] =
    useState<AgentConfigMode>("interface");
  const [agentToolTab, setAgentToolTab] = useState<AgentToolTab>("agents");
  const [agentsToolsScope, setAgentsToolsScope] = useState<RegistryConfigScope>("project");
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [toolDefinitions, setToolDefinitions] = useState<ToolDefinition[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [agentsToolsHasChanges, setAgentsToolsHasChanges] = useState(false);
  const [pendingAgentUpserts, setPendingAgentUpserts] = useState<Record<string, PendingRegistryUpsert>>({});
  const [pendingAgentDeletes, setPendingAgentDeletes] = useState<Record<string, PendingRegistryDelete>>({});
  const [pendingToolUpserts, setPendingToolUpserts] = useState<Record<string, PendingRegistryUpsert>>({});
  const [pendingToolDeletes, setPendingToolDeletes] = useState<Record<string, PendingRegistryDelete>>({});
  const [commands, setCommands] = useState<CommandDefinition[]>([]);
  const [commandsError, setCommandsError] = useState<string | null>(null);
  const [commandsLoading, setCommandsLoading] = useState(false);
  const [pendingCommandUpserts, setPendingCommandUpserts] = useState<Record<string, PendingRegistryUpsert>>({});
  const [pendingCommandDeletes, setPendingCommandDeletes] = useState<Record<string, PendingRegistryDelete>>({});
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolEditMode, setToolEditMode] = useState<ToolEditMode>("add");
  const [commandEditMode, setCommandEditMode] = useState<"add" | "edit">("add");
  const [commandEditTargetScope, setCommandEditTargetScope] = useState<RegistryConfigScope | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentYaml, setAgentYaml] = useState(agentToYaml(emptyAgentForm));
  const [toolForm, setToolForm] = useState(emptyToolForm);
  const [commandForm, setCommandForm] = useState<CommandForm>(emptyCommandForm);
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
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
  const [persistedDisabledModelIds, setPersistedDisabledModelIds] = useState<Set<string>>(() => new Set());
  const [modelSettingsApplying, setModelSettingsApplying] = useState(false);
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
  const selectedCommand =
    commands.find((command) => command.id === selectedCommandId) ?? null;
  const activeProjectName =
    projects.find((project) => project.path === activeProjectPath)?.name ??
    getProjectNameFromPath(activeProjectPath);
  const selectedModelProvider =
    modelProviders.find(
      (provider) => provider.id === selectedModelProviderId,
    ) ?? null;
  const modelSettingsChanged = !areSetsEqual(disabledModelIds, persistedDisabledModelIds);
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

  const applyDisabledModelKeys = useCallback((disabledModelKeys: string[], options: { persisted?: boolean } = {}) => {
    const next = new Set(disabledModelKeys);
    setDisabledModelIds(next);
    if (options.persisted) setPersistedDisabledModelIds(new Set(next));
    onOpenCodeDisabledModelsChange?.(Array.from(next));
    return next;
  }, [onOpenCodeDisabledModelsChange]);

  const applyModelEnabledStates = useCallback((disabledModels: Set<string>) => {
    setModelProviders((current) =>
      current.map((provider) => ({
        ...provider,
        availableModels: (provider.availableModels ?? []).map((model) => ({
          ...model,
          enabled: !disabledModels.has(model.key),
        })),
      })),
    );
  }, []);

  const loadModelProviders = useCallback(
    async (signal?: AbortSignal) => {
      const directory = activeProjectPath?.trim() || undefined;
      const query = directory ? { directory } : undefined;

      try {
        const providerResponse = await listOpenCodeProviders({
          query,
          signal,
        });
        const modelKeys = providerResponse.all.flatMap((provider) =>
          Object.values(provider.models).map((model) => `${provider.id}/${model.id}`),
        );
        const [authMethodsResponseResult, modelSettingsResponse] = await Promise.allSettled([
          getOpenCodeProviderAuthMethods({
            query,
            signal,
          }),
          updateOpenCodeModelSettings({ modelKeys }, { signal }),
        ]);
        let authMethodsResponse: OpenCodeAuthMethodsResponse | undefined;

        if (authMethodsResponseResult.status === "fulfilled") authMethodsResponse = authMethodsResponseResult.value;

        if (signal?.aborted) return;
        const resolvedModelSettings = modelSettingsResponse.status === "fulfilled"
          ? modelSettingsResponse.value
          : await getOpenCodeModelSettings({ signal });
        if (signal?.aborted) return;
        const nextDisabledModelIds = applyDisabledModelKeys(
          resolvedModelSettings.disabledModelKeys,
          { persisted: true },
        );
        onOpenCodeProviderCatalogChange?.(providerResponse);

        const nextProviders = providerResponse.all
          .map((provider) =>
            toModelProvider(provider, providerResponse, authMethodsResponse, nextDisabledModelIds),
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
    [activeProjectPath, applyDisabledModelKeys, onOpenCodeProviderCatalogChange, selectedModelProviderId],
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
      if (agentsToolsScope === "project" && !activeProjectPath) {
        setAgents([]);
        setSelectedAgentId(null);
        setAgentsError("請先開啟專案後再查看 OpenCode agents。");
        setAgentsLoading(false);
        setToolDefinitions([]);
        setToolsError("請先開啟專案後再查看 OpenCode tools。");
        setToolsLoading(false);
        setCommands([]);
        setSelectedCommandId(null);
        setCommandsError("請先開啟專案後再查看 OpenCode Commands。");
        setCommandsLoading(false);
        return;
      }

      if (agentsToolsHasChanges) return;

      setAgentsLoading(true);
      setAgentsError(null);
      setToolsLoading(true);
      setToolsError(null);
      setCommandsLoading(true);
      setCommandsError(null);

      if (agentsToolsScope === "global") {
        void Promise.all([
          listOpenCodeRegistryEntries("global", "agents", undefined, false, { signal: controller.signal }),
          listOpenCodeRegistryEntries("global", "tools", undefined, false, { signal: controller.signal }),
          listOpenCodeRegistryEntries("global", "commands", undefined, false, { signal: controller.signal }),
        ])
          .then(([agentResponse, toolResponse, commandResponse]) => {
            if (controller.signal.aborted) return;

            const nextAgents = agentResponse.entries
              .map((entry) => toRegistryAgentDefinition(entry))
              .sort(sortAgentDefinitions);
            const nextTools = toolResponse.entries
              .map((entry) => toToolDefinition(entry.name, entry))
              .sort(sortToolDefinitions);
            const nextCommands = commandResponse.entries
              .map((entry) => toCommandDefinition(entry))
              .sort(sortCommandDefinitions);
            setAgents(nextAgents);
            setToolDefinitions(nextTools);
            setCommands(nextCommands);
            setSelectedAgentId((current) =>
              current && nextAgents.some((agent) => agent.id === current) ? current : null,
            );
            setSelectedToolId((current) =>
              current && nextTools.some((tool) => tool.id === current) ? current : null,
            );
            setSelectedCommandId((current) =>
              current && nextCommands.some((command) => command.id === current) ? current : null,
            );
            setToolToAdd((current) =>
              current && nextTools.some((tool) => tool.name === current)
                ? current
                : nextTools[0]?.name ?? "",
            );
          })
          .catch((error) => {
            if (controller.signal.aborted) return;
            setAgents([]);
            setToolDefinitions([]);
            setCommands([]);
            setSelectedAgentId(null);
            setSelectedToolId(null);
            setSelectedCommandId(null);
            setToolToAdd("");
            setAgentsError(getApiErrorMessage(error));
            setToolsError(getApiErrorMessage(error));
            setCommandsError(getApiErrorMessage(error));
          })
          .finally(() => {
            if (controller.signal.aborted) return;
            setAgentsLoading(false);
            setToolsLoading(false);
            setCommandsLoading(false);
          });
        return;
      }

      void Promise.all([
        listProjectAgents(activeProjectPath, { signal: controller.signal }),
        listOpenCodeRegistryEntries("project", "agents", activeProjectName, true, { signal: controller.signal }),
      ])
        .then(([runtimeAgents, registryResponse]) => {
          if (controller.signal.aborted) return;

          const runtimeByName = new Map(
            runtimeAgents.map((agent) => [agent.name, toAgentDefinition(agent)]),
          );
          const registryEntries = registryResponse.entries;
          const names = new Set([
            ...runtimeAgents.map((agent) => agent.name),
            ...registryEntries.map((entry) => entry.name),
          ]);
          const registryByName = new Map(
            registryEntries.map((entry) => [entry.name, entry]),
          );
          const nextAgents = [...names]
            .map((name) => {
              const entry = registryByName.get(name);
              const runtimeAgent = runtimeByName.get(name);
              return entry
                ? toRegistryAgentDefinition(entry, runtimeAgent)
                : runtimeAgent
                  ? { ...runtimeAgent, installTarget: "project" as const }
                  : undefined;
            })
            .filter((agent): agent is AgentDefinition => Boolean(agent))
            .sort(sortAgentDefinitions);
          setAgents(nextAgents);
          setSelectedAgentId((current) =>
            current && nextAgents.some((agent) => agent.id === current) ? current : null,
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
        listOpenCodeRegistryEntries("project", "tools", activeProjectName, true, { signal: controller.signal }),
      ])
        .then(([toolIds, registryResponse]) => {
          if (controller.signal.aborted) return;

          const registryEntries = registryResponse.entries;
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
          setSelectedToolId((current) =>
            current && nextTools.some((tool) => tool.id === current) ? current : null,
          );
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

      void Promise.all([
        listOpenCodeCommands(activeProjectPath, { signal: controller.signal }),
        listOpenCodeRegistryEntries(
          "project",
          "commands",
          activeProjectName,
          true,
          { signal: controller.signal },
        ),
      ])
        .then(([runtimeCommands, registryResponse]) => {
          if (controller.signal.aborted) return;

          const runtimeByName = new Map(
            runtimeCommands.map((command) => [command.name, command]),
          );
          const registryByName = new Map(
            registryResponse.entries.map((entry) => [entry.name, entry]),
          );
          const names = new Set([
            ...runtimeCommands.map((command) => command.name),
            ...registryResponse.entries.map((entry) => entry.name),
          ]);
          const nextCommands = [...names]
            .map((name) => {
              const runtimeCommand = runtimeByName.get(name);
              const registryEntry = registryByName.get(name);
              return registryEntry
                ? toCommandDefinition(registryEntry, runtimeCommand)
                : runtimeCommand
                  ? toRuntimeCommandDefinition(runtimeCommand)
                  : undefined;
            })
            .filter((command): command is CommandDefinition => Boolean(command))
            .sort(sortCommandDefinitions);
          setCommands(nextCommands);
          setSelectedCommandId((current) =>
            current && nextCommands.some((command) => command.id === current) ? current : null,
          );
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setCommands([]);
          setSelectedCommandId(null);
          setCommandsError(getApiErrorMessage(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setCommandsLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeProjectName, activeProjectPath, agentsDialogOpen, agentsToolsHasChanges, agentsToolsScope]);

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
    const label = scope === "agents-tools" ? "智能體、工具與 Commands" : "外掛與技能";
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
      if (scope === "agents-tools") {
        const pendingAgentDeleteItems = Object.values(pendingAgentDeletes);
        const pendingToolDeleteItems = Object.values(pendingToolDeletes);
        const pendingCommandDeleteItems = Object.values(pendingCommandDeletes);
        const pendingAgentUpsertItems = Object.values(pendingAgentUpserts);
        const pendingToolUpsertItems = Object.values(pendingToolUpserts);
        const pendingCommandUpsertItems = Object.values(pendingCommandUpserts);

        if (
          [...pendingAgentDeleteItems, ...pendingToolDeleteItems, ...pendingCommandDeleteItems, ...pendingAgentUpsertItems, ...pendingToolUpsertItems, ...pendingCommandUpsertItems]
            .some((item) => item.scope === "project") &&
          !activeProjectName
        ) {
          throw new Error("Project scope 需要先開啟有效的 Project。");
        }

        for (const item of pendingAgentDeleteItems) {
          await deleteAgentRegistryEntry(
            item.scope,
            item.name,
            item.scope === "project" ? activeProjectName : undefined,
          );
        }
        for (const item of pendingToolDeleteItems) {
          await deleteToolRegistryEntry(
            item.scope,
            item.name,
            item.scope === "project" ? activeProjectName : undefined,
          );
        }
        for (const item of pendingCommandDeleteItems) {
          await deleteCommandRegistryEntry(
            item.scope,
            item.name,
            item.scope === "project" ? activeProjectName : undefined,
          );
        }
        for (const item of pendingAgentUpsertItems) {
          await upsertAgentRegistryEntry(
            item.scope,
            item.name,
            {
              content: item.content,
              filename: item.filename,
              restart: false,
              wait: false,
              reason: "agent-updated",
            },
            item.scope === "project" ? activeProjectName : undefined,
          );
        }
        for (const item of pendingToolUpsertItems) {
          await upsertToolRegistryEntry(
            item.scope,
            item.name,
            {
              content: item.content,
              filename: item.filename,
              restart: false,
              wait: false,
              reason: "tool-updated",
            },
            item.scope === "project" ? activeProjectName : undefined,
          );
        }
        for (const item of pendingCommandUpsertItems) {
          await upsertCommandRegistryEntry(
            item.scope,
            item.name,
            {
              content: item.content,
              filename: item.filename,
              restart: false,
              wait: false,
              reason: "command-updated",
            },
            item.scope === "project" ? activeProjectName : undefined,
          );
        }
      } else if (pluginConfigMode === "document") {
        await applyOpenCodeConfig(pluginConfigScope, {
          content: pluginDocument,
          restart: false,
          wait: false,
          reason: "plugin-document-updated",
        }, pluginConfigScope === "project" ? activeProjectName : undefined);
      } else if (scope === "plugins-skills") {
        for (const [name, file] of Object.entries(pendingPluginFiles)) {
          await upsertPluginRegistryEntry(
            file.scope,
            name,
            { content: file.code, filename: `${name}.ts`, restart: false, wait: false, reason: "plugin-file-added" },
            file.scope === "project" ? activeProjectName : undefined,
          );
        }
        for (const [name, deleteScope] of Object.entries(pendingPluginDeletes)) {
          await deletePluginRegistryEntry(
            deleteScope,
            name,
            deleteScope === "project" ? activeProjectName : undefined,
          );
        }
        for (const [name, move] of Object.entries(pendingPluginScopeMoves)) {
          if (move.from !== move.to && !(move.from === "global" && move.to === "project")) {
            await deletePluginRegistryEntry(
              move.from,
              name,
              move.from === "project" ? activeProjectName : undefined,
            );
          }
        }
        const pendingSkillsByScope = Object.values(pendingSkillDeletes).reduce<Record<string, string[]>>((groups, skill) => {
          const scopeKey = skill.scope === "global" ? "global" : "project";
          (groups[scopeKey] ??= []).push(skill.name);
          return groups;
        }, {});
        for (const [skillScope, names] of Object.entries(pendingSkillsByScope)) {
          await deleteOpenCodeSkills(names, skillScope as "project" | "global", skillScope === "project" ? activeProjectName : undefined, false);
        }
        for (const [name, edit] of Object.entries(pendingSkillEdits)) {
          await upsertSkillRegistryEntry(edit.scope, name, { content: edit.content, filename: "SKILL.md", restart: false, wait: false, reason: "skill-edited" }, edit.scope === "project" ? activeProjectName : undefined);
        }
        if (activeProjectName && JSON.stringify(enabledGlobalSkills) !== JSON.stringify(savedEnabledGlobalSkills)) {
          await updateSkillProjectSettings({ project: activeProjectName, enabledGlobalSkills, restart: false, reason: "project-skills-updated" });
        }
        const deletedRemoteNames = new Set(Object.keys(pendingRemotePluginDeletes));
        const movedFromGlobalToProject = new Set(
          Object.entries(pendingPluginScopeMoves)
            .filter(([, move]) => move.from === "global" && move.to === "project")
            .map(([name]) => name),
        );
        const globalPlugins = plugins
          .filter((plugin) => plugin.installTarget === "global" && !movedFromGlobalToProject.has(plugin.name))
          .filter((plugin) => !deletedRemoteNames.has(plugin.name))
        const projectPlugins = plugins
          .filter((plugin) => plugin.installTarget !== "global" || plugin.useInProject || movedFromGlobalToProject.has(plugin.name))
          .filter((plugin) => !deletedRemoteNames.has(plugin.name))
        const globalPluginNames = globalPlugins.map((plugin) => toPluginConfigEntry(plugin, "global"));
        const projectPluginNames = projectPlugins.map((plugin) => toPluginConfigEntry(plugin, "project"));
        const hasGlobalPluginDraft = plugins.some((plugin) => plugin.installTarget === "global")
          || Object.values(pendingPluginDeletes).some((deleteScope) => deleteScope === "global")
          || Object.values(pendingPluginFiles).some((file) => file.scope === "global")
          || Object.values(pendingRemotePluginDeletes).some((deleteScope) => deleteScope === "global")
          || Object.values(pendingPluginScopeMoves).some((move) => move.from === "global" || move.to === "global");
        const configUpdate = {
          config: {
            plugin: pluginConfigScope === "global" ? globalPluginNames : projectPluginNames,
          },
        };
        if (hasGlobalPluginDraft && activeProjectName) {
          const globalFiles: Record<string, string> = {};
          const projectFiles: Record<string, string> = {};
          for (const [name, file] of Object.entries(pendingPluginFiles)) {
            (file.scope === "global" ? globalFiles : projectFiles)[name] = file.code;
          }
          const globalDeletes = Object.entries(pendingPluginDeletes).filter(([, deleteScope]) => deleteScope === "global").map(([name]) => name);
          const projectDeletes = Object.entries(pendingPluginDeletes).filter(([, deleteScope]) => deleteScope === "project").map(([name]) => name);
          const moves = Object.entries(pendingPluginScopeMoves).map(([name, move]) => ({ name, ...move }));
          await syncOpenCodePluginConfig({
            globalPlugins: globalPluginNames,
            globalFiles,
            globalDeletes,
            project: activeProjectName,
            projectPlugins: projectPluginNames,
            projectFiles,
            projectDeletes,
            moves,
            reason: "global-plugin-updated",
          });
        } else if (pluginConfigScope === "global") {
          await applyOpenCodeConfig("global", {
            ...configUpdate,
            restart: false,
            wait: false,
            reason: "plugin-list-updated",
          });
        } else {
          await applyOpenCodeConfig(pluginConfigScope, {
            ...configUpdate,
            restart: false,
            wait: false,
            reason: "plugin-list-updated",
          }, pluginConfigScope === "project" ? activeProjectName : undefined);
        }
      }
      await onRestartOpenCode(`Apply ${label} modal updates`);
      setPendingAgentUpserts({});
      setPendingAgentDeletes({});
      setPendingToolUpserts({});
      setPendingToolDeletes({});
      setPendingCommandUpserts({});
      setPendingCommandDeletes({});
      setCommandEditTargetScope(null);
      setPendingPluginFiles({});
       setPendingPluginDeletes({});
       setPendingPluginScopeMoves({});
       setPendingRemotePluginDeletes({});
       setPendingSkillDeletes({});
       setPendingSkillEdits({});
       setSavedEnabledGlobalSkills(enabledGlobalSkills);

      if (scope === "agents-tools") {
        setAgentsToolsHasChanges(false);
      } else {
        setPluginSkillHasChanges(false);
      }
      setBatchUpdateNotice(`${label} 已更新，OpenCode server 已重新啟動。`);
      toastManager.add({
         id: `batch-update-success-${scope}`,
        title: "OpenCode 已重新啟動",
        description: `${label} 更新已生效。`,
        type: "success",
      });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBatchUpdateNotice(`${label} 更新失敗：${message}`);
      toastManager.add({
         id: `batch-update-error-${scope}`,
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
    setPluginConfigMode("interface");
    setPluginSkillSearch("");
    setPlugins([]);
    setPluginConfigLoading(!pluginSkillHasChanges);
    setPluginSkillDialogOpen(true);
  }

  function resetPluginEditor() {
    setPluginForm(emptyPluginForm);
    setEditingPluginId(null);
    setPluginReadOnly(false);
    setPluginEditorMode("add");
    setPluginInstallResult(null);
  }

  function startPluginAdd() {
    resetPluginEditor();
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

  async function applyModelSettings() {
    if (modelSettingsApplying) return;

    const disabledModelKeys = Array.from(disabledModelIds);
    setModelSettingsApplying(true);
    try {
      const response = await updateOpenCodeModelSettings({ disabledModelKeys });
      const next = applyDisabledModelKeys(response.disabledModelKeys, { persisted: true });
      applyModelEnabledStates(next);
      toastManager.add({
        id: `model-settings-updated-${Date.now()}`,
        description: "模型開關狀態已更新到 OpenCode volume JSON。",
        title: "模型設定已更新",
        type: "success",
      });
    } catch (error) {
      toastManager.add({
        id: `model-settings-update-error-${Date.now()}`,
        description: getApiErrorMessage(error),
        title: "儲存模型開關失敗",
        type: "error",
      });
    } finally {
      setModelSettingsApplying(false);
    }
  }

  function cancelModelSettings() {
    const next = new Set(persistedDisabledModelIds);
    setDisabledModelIds(next);
    onOpenCodeDisabledModelsChange?.(Array.from(next));
    applyModelEnabledStates(next);
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

  const loadPluginConfig = useCallback(async () => {
    if (pluginSkillHasChanges) return;

    if (pluginConfigScope === "project" && !activeProjectName) {
      setPlugins([]);
      setPluginDocument("");
      setPluginConfig({});
      return;
    }

    // Keep the current cards visible when returning to this tab. Only the
    // initial load needs a skeleton; tab navigation must not flash the modal.
    setPluginConfigLoading(plugins.length === 0);
    try {
      const [response, globalResponse, localResponse] = await Promise.all([
        getOpenCodeConfig(pluginConfigScope as OpenCodeConfigScope, activeProjectName),
        pluginConfigScope === "project"
          ? getOpenCodeConfig("global")
          : Promise.resolve(null),
        listOpenCodeRegistryEntries(pluginConfigScope, "plugins", activeProjectName, pluginConfigScope === "project"),
      ]);
      const globalPluginNames = globalResponse && Array.isArray(globalResponse.config.plugin)
        ? globalResponse.config.plugin.filter((item): item is string => typeof item === "string")
        : [];
      const projectPluginNames = Array.isArray(response.config.plugin)
        ? response.config.plugin.filter((item): item is string => typeof item === "string")
        : [];
      const configuredPlugins = response.effectivePlugins ?? [...new Set([...globalPluginNames, ...projectPluginNames])];
      const localPlugins = localResponse.entries.map((entry) => ({
        name: entry.name,
        scope: entry.scope,
      }));
      setPluginConfig(response.config);
      setPluginDocument(response.content);
      setPlugins([
        ...configuredPlugins.map((entry): PluginDefinition => ({
        id: entry,
        name: isLocalPluginConfigEntry(entry) ? pluginNameFromConfigEntry(entry) : entry,
        description: "OpenCode opencode.jsonc plugin 設定。",
          source: isLocalPluginConfigEntry(entry) ? "local" : "remote",
          entry,
          enabled: true,
          config: "",
          installTarget: globalPluginNames.includes(entry) ? "global" : "project",
          useInProject: projectPluginNames.includes(entry),
        })),
        ...localPlugins.filter(({ name }) => !configuredPlugins.some((entry) => isLocalPluginConfigEntry(entry) && pluginNameFromConfigEntry(entry) === name)).map(({ name, scope }) => ({
          id: `local-${scope}-${name}`,
          name,
          description: "載入 .opencode/plugins/ 的本機自訂外掛。",
          source: "local" as const,
          entry: `.opencode/plugins/${name}.ts`,
          enabled: true,
          config: "",
          installTarget: scope,
        })),
      ]);
      setPluginSkillHasChanges(false);
    } catch (error) {
      setPluginInstallResult({ status: "error", message: `載入 Plugin 設定失敗：${getApiErrorMessage(error)}` });
    } finally {
      setPluginConfigLoading(false);
    }
  }, [activeProjectName, pluginConfigScope, pluginSkillHasChanges, plugins.length]);

  useEffect(() => {
    if (!pluginSkillDialogOpen || pluginSkillTab !== "plugins") return;
    const timeoutId = window.setTimeout(() => {
      void loadPluginConfig();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPluginConfig, pluginSkillDialogOpen, pluginSkillTab]);

  function changePluginConfigScope(scope: PluginConfigScope) {
    setPluginConfigScope(scope);
    setPluginSkillHasChanges(false);
  }

  function cancelPluginSkillChanges() {
    void loadPluginConfig();
    void loadSkills();
    setPendingSkillDeletes({});
    setPendingSkillEdits({});
    setPluginForm(emptyPluginForm);
    setSkillForm(emptySkillForm);
    setPluginInstallResult(null);
    setSkillInstallResult(null);
    setPendingPluginFiles({});
     setPendingPluginDeletes({});
    setPendingPluginScopeMoves({});
    setPendingRemotePluginDeletes({});
    setPluginSkillHasChanges(false);
    setBatchUpdateNotice("");
  }

  function addPluginFromOfficialSource() {
    const pluginNames = pluginForm.method === "npm"
      ? [...new Set(pluginForm.name.split(/[\s,]+/).map((name) => name.trim()).filter(Boolean))]
      : [pluginForm.name.trim()];

    if (pluginNames.length === 0) {
      setPluginInstallResult({
        status: "error",
        message:
          "請輸入 npm Plugin package name。",
      });
      return;
    }

    if (pluginForm.method === "local" && !pluginForm.customPluginEnabled) {
      setPluginInstallResult({
        status: "error",
        message: "請先勾選「是否開啟自訂 Plugin」才能建立自訂 Plugin。",
      });
      return;
    }

      const description = pluginForm.description.trim() || (
      pluginForm.method === "npm"
        ? "透過 opencode.jsonc 的 plugin 陣列載入。"
        : "載入目前 scope .opencode/plugins/ 的本機自訂外掛。"
    );
    const nextPlugins: PluginDefinition[] = pluginNames.map((pluginName) => ({
      id: pluginName,
      name: pluginName,
      description,
      source: pluginForm.method === "npm" ? "remote" : "local",
      entry: pluginForm.method === "npm" ? pluginName : `.opencode/plugins/${pluginName}.ts`,
      enabled: true,
      config: "",
      installTarget: pluginForm.installTarget,
      useInProject: pluginForm.useInProject,
    }));

    setPlugins((current) => {
      if (editingPluginId) {
        return current.map((plugin) => plugin.id === editingPluginId ? { ...nextPlugins[0]!, id: editingPluginId } : plugin);
      }
      const existing = new Set(current.map((plugin) => plugin.name));
      return [...nextPlugins.filter((plugin) => !existing.has(plugin.name)), ...current];
    });
    if (pluginForm.method === "local") {
      setPendingPluginFiles((current) => ({
        ...current,
        [pluginNames[0]!]: { code: pluginForm.code, scope: pluginForm.installTarget },
      }));
    }
    if (editingPluginId) {
      const previous = plugins.find((plugin) => plugin.id === editingPluginId);
      if (previous?.installTarget && previous.installTarget !== pluginForm.installTarget) {
        setPendingPluginScopeMoves((current) => ({
          ...current,
          [pluginNames[0]!]: { from: previous.installTarget!, to: pluginForm.installTarget },
        }));
        if (pluginForm.method === "local") {
          setPendingPluginDeletes((current) => ({
            ...current,
            [pluginNames[0]!]: previous.installTarget!,
          }));
        }
      }
    }
    setPluginInstallResult({
      status: "success",
      message: pluginForm.method === "local"
        ? `已加入 ${pluginNames[0]}，按更新後寫入 plugins 目錄。`
        : `已加入 ${nextPlugins.length} 個遠端外掛，按更新後批次寫入 opencode.jsonc。`,
    });
    setPluginForm(emptyPluginForm);
    setEditingPluginId(null);
    setPluginSkillTab("plugins");
    setPluginSkillDialogView("list");
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function editPlugin(plugin: PluginDefinition) {
    setPluginReadOnly(false);
    setPluginEditorMode("edit");
    setEditingPluginId(plugin.id);
    setPluginForm({
      ...emptyPluginForm,
      method: plugin.source === "local" ? "local" : "npm",
      name: plugin.name,
      description: plugin.description,
      customPluginEnabled: plugin.source === "local",
      entry: plugin.entry,
      installTarget: plugin.installTarget ?? "global",
      useInProject: plugin.useInProject ?? true,
    });
    setPluginSkillDialogView("add-plugin");
  }

  function viewPlugin(plugin: PluginDefinition) {
    editPlugin(plugin);
    setPluginReadOnly(true);
    setPluginEditorMode("view");
    setPluginSkillDialogView("plugin-detail");
  }

  function deletePlugin(pluginId: string) {
    const plugin = plugins.find((item) => item.id === pluginId);
    setPlugins((current) => current.filter((plugin) => plugin.id !== pluginId));
    if (plugin?.source === "local") {
      setPendingPluginDeletes((current) => ({ ...current, [plugin.name]: plugin.installTarget ?? "project" }));
    } else if (plugin?.source === "remote") {
      setPendingRemotePluginDeletes((current) => ({
        ...current,
        [plugin.name]: plugin.installTarget ?? "project",
      }));
    }
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function togglePluginProject(plugin: PluginDefinition, enabled: boolean) {
    if (plugin.installTarget !== "global") return;
    setPlugins((current) => current.map((item) => item.id === plugin.id ? { ...item, useInProject: enabled } : item));
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  function toPluginConfigEntry(plugin: PluginDefinition, scope: PluginConfigScope): string {
    if (plugin.source === "local") {
      return scope === "global"
        ? `./plugins/${plugin.name}.ts`
        : `./.opencode/plugins/${plugin.name}.ts`;
    }

    return plugin.name;
  }

  function isLocalPluginConfigEntry(entry: string): boolean {
    return entry.startsWith("./plugins/") || entry.startsWith("./.opencode/plugins/");
  }

  function pluginNameFromConfigEntry(entry: string): string {
    return entry.replace(/^\.\/?(?:\.opencode\/)?plugins\//, "").replace(/\.(ts|js|mjs|cjs)$/, "");
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
    void importSkills();
  }

  function toggleGlobalSkill(skill: SkillDefinition, enabled: boolean) {
    setEnabledGlobalSkills((current) => enabled ? [...new Set([...current, skill.name])] : current.filter((name) => name !== skill.name));
    setSkillSettings((current) => current.map((item) => item.id === skill.id ? { ...item, enabled } : item));
    setPluginSkillHasChanges(true);
    setBatchUpdateNotice("");
  }

  async function importSkills() {
    if (skillImportLoading) return;
    const scope = skillForm.installTarget;
    const project = scope === "project" ? activeProjectName : undefined;
    setSkillImportLoading(true);
    try {
      const sources = skillForm.sources.split(/\r?\n/).map((source) => source.trim()).filter(Boolean);
      const result = sources.length > 0
        ? await importSkillUrls({ scope, project, sources, overwrite: true, restart: false })
        : await importSkillArchives(skillForm.archiveFiles, { scope, project, overwrite: true, restart: false });
      const failureDetails = result.failed.map((item) => `${item.source}: ${item.reason}`).join("；");
      setSkillInstallResult({
        status: result.imported.length > 0 ? "success" : "error",
        message: `匯入 ${result.imported.length} 個，略過 ${result.skipped.length} 個，失敗 ${result.failed.length} 個。${failureDetails ? ` ${failureDetails}` : ""}`,
      });
      if (scope === "global" && skillForm.useInProject && activeProjectName && result.imported.length > 0) {
        const importedNames = result.imported.map((item) => item.name);
        const existingEnabled = skillSettings.filter((skill) => skill.inherited && skill.enabled).map((skill) => skill.name);
        const nextEnabled = [...new Set([...enabledGlobalSkills, ...existingEnabled, ...importedNames])].sort();
        await updateSkillProjectSettings({ project: activeProjectName, enabledGlobalSkills: nextEnabled, restart: false, reason: "global-skills-enabled-for-project" });
        setEnabledGlobalSkills(nextEnabled);
        setSavedEnabledGlobalSkills(nextEnabled);
      }
      await loadSkills();
      if (result.imported.length === 0) return;
      setSkillForm(emptySkillForm);
      setPluginSkillTab("skills");
      setPluginSkillDialogView("list");
    } catch (error) { setSkillInstallResult({ status: "error", message: getApiErrorMessage(error) }); }
    finally { setSkillImportLoading(false); }
  }

  const loadSkills = useCallback(async () => {
    if (!activeProjectName) return;
    try {
      const response = await listOpenCodeSkills("project", activeProjectName, true);
       const enabled = response.entries.filter((entry) => entry.inherited && entry.enabled !== false).map((entry) => entry.name);
       setEnabledGlobalSkills(enabled);
       setSavedEnabledGlobalSkills(enabled);
       setSkillSettings(response.entries.map((entry) => ({ id: `${entry.scope}-${entry.name}`, name: entry.name, description: entry.description, scope: entry.scope, inherited: entry.inherited, enabled: entry.enabled !== false, path: entry.path })));
    } catch (error) { setSkillInstallResult({ status: "error", message: `載入 Skill 失敗：${getApiErrorMessage(error)}` }); }
  }, [activeProjectName]);

  useEffect(() => {
    if (pluginSkillDialogOpen && pluginSkillTab === "skills") void loadSkills();
  }, [loadSkills, pluginSkillDialogOpen, pluginSkillTab]);

  async function deleteSkill(skill: SkillDefinition) {
    if (skill.scope === "global" && skill.id.startsWith("global-")) {
      setSkillInstallResult({ status: "error", message: "此 Skill 來自 Global inherited，請切換 Global scope 後刪除。" });
      return;
    }
    showConfirmationToast({
      id: `skill-delete-confirm-${skill.name}`,
      title: `將 ${skill.name} 加入刪除清單？`,
      description: "按下 modal 底部的「更新」後才會真正刪除。",
      onConfirm: () => {
        setPendingSkillDeletes((current) => ({ ...current, [skill.name]: skill }));
        setSkillSettings((current) => current.filter((item) => item.id !== skill.id));
        setPluginSkillHasChanges(true);
        setBatchUpdateNotice("");
      },
    });
  }

  async function editSkill(skill: SkillDefinition) {
    const scope = skill.scope === "global" ? "global" : "project";
    try {
      const response = await readSkillRegistryEntry(scope, skill.name, scope === "project" ? activeProjectName : undefined);
      setSkillEditing(skill);
      setSkillEditingScope(scope);
      setSkillDocument(response.content ?? "");
      setPluginSkillDialogView("edit-skill");
    } catch (error) {
      toastManager.add({ id: `skill-read-error-${skill.name}`, title: "Skill 讀取失敗", description: getApiErrorMessage(error), type: "error" });
    }
  }

  function saveSkillEdit() {
    if (!skillEditing) return;
    const scope = skillEditingScope;
    const sourceScope = skillEditing.scope === "global" ? "global" : "project";
    if (scope === "project" && !activeProjectName) {
      toastManager.add({ id: `skill-edit-project-required-${skillEditing.name}`, title: "無法儲存 Skill", description: "Project scope 需要先開啟 Project。", type: "error" });
      return;
    }
    if (scope !== sourceScope) {
      setPendingSkillDeletes((current) => ({
        ...current,
        [`${sourceScope}:${skillEditing.name}`]: { ...skillEditing, scope: sourceScope },
      }));
    }
    setPendingSkillEdits((current) => ({ ...current, [skillEditing.name]: { scope, content: skillDocument } }));
    setSkillSettings((current) => current.map((skill) => skill.id === skillEditing.id
      ? { ...skill, scope, path: scope === "global" ? skill.path.replace(/\.opencode\/skills/, "~/.config/opencode/skills") : skill.path.replace(/~\/.config\/opencode\/skills/, ".opencode/skills") }
      : skill));
    setPluginSkillHasChanges(true);
    setPluginSkillDialogView("list");
    setBatchUpdateNotice("");
  }

  async function changeSkillEditingScope(scope: "project" | "global") {
    if (!skillEditing) return;
    if (scope === "project" && !activeProjectName) {
      toastManager.add({ id: `skill-scope-project-required-${skillEditing.name}`, title: "無法轉移 Skill", description: "請先開啟 Project。", type: "error" });
      return;
    }
    setSkillEditingScope(scope);
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
    if (!agentsToolsHasChanges) setAgentsToolsScope("project");
    setSelectedToolId(null);
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setGuidanceSubagent(null);
    setAgentsDialogOpen(true);
  }

  function cancelAgentsToolsChanges() {
    if (!agentsToolsHasChanges) {
      setAgentsDialogOpen(false);
      return;
    }

    setPendingAgentUpserts({});
    setPendingAgentDeletes({});
    setPendingToolUpserts({});
    setPendingToolDeletes({});
    setPendingCommandUpserts({});
    setPendingCommandDeletes({});
    setCommandEditTargetScope(null);
    setAgentsToolsHasChanges(false);
    setBatchUpdateNotice("");
    setAgentDialogView("list");
    setSelectedAgentId(null);
    setSelectedToolId(null);
  }

  function openAddAgentMode() {
    setAgentEditMode("add");
    setEditingAgentId(null);
    setSelectedAgentId(null);
    setAgentConfigMode("interface");
    setAgentForm({ ...emptyAgentForm, installTarget: agentsToolsScope });
    setAgentYaml(agentToYaml({ ...emptyAgentForm, installTarget: agentsToolsScope }));
    setGuidanceTool(null);
    setGuidanceSkill(null);
    setGuidanceSubagent(null);
    setAgentDialogView("config");
  }

  function openAddToolMode() {
    setToolEditMode("add");
    setEditingToolId(null);
    setSelectedToolId(null);
    setToolForm({
      ...emptyToolForm,
      installTarget: agentsToolsScope,
      entry: getToolEntryPath("my-tool", agentsToolsScope),
    });
    setToolTestResult(null);
    setAgentDialogView("tool-config");
  }

  function openAddCommandMode() {
    setCommandEditMode("add");
    setEditingCommandId(null);
    setSelectedCommandId(null);
    setCommandEditTargetScope(null);
    setCommandForm({ ...emptyCommandForm, installTarget: agentsToolsScope });
    setAgentDialogView("command-config");
  }

  function openCommandDetail(command: CommandDefinition) {
    setSelectedCommandId(command.id);
    setAgentToolTab("commands");
    setAgentDialogView("command-detail");
    if (command.source === "custom") void loadCommandRegistryContent(command);
  }

  function openEditCommandMode(command: CommandDefinition) {
    if (command.source !== "custom") return;
    setCommandEditMode("edit");
    setCommandEditTargetScope(command.inherited ? "project" : null);
    setEditingCommandId(command.id);
    setSelectedCommandId(command.id);
    setCommandForm({
      ...emptyCommandForm,
      name: command.name,
      installTarget: command.inherited ? "project" : command.installTarget ?? agentsToolsScope,
      description: command.description,
    });
    setAgentDialogView("command-config");
    void loadCommandRegistryContent(command);
  }

  function openEditGlobalCommandMode(command: CommandDefinition) {
    if (command.source !== "custom" || !command.inherited) return;
    setCommandEditMode("edit");
    setCommandEditTargetScope("global");
    setEditingCommandId(command.id);
    setSelectedCommandId(command.id);
    setCommandForm({
      ...emptyCommandForm,
      name: command.name,
      installTarget: "global",
      description: command.description,
    });
    setAgentDialogView("command-config");
    void loadCommandRegistryContent(command);
  }

  async function loadCommandRegistryContent(command: CommandDefinition) {
    const sourceScope = command.inherited ? "global" : command.installTarget ?? agentsToolsScope;
    if (sourceScope === "project" && !activeProjectName) return;

    const pendingContent = pendingCommandUpserts[`${sourceScope}:${command.name}`]?.content;
    if (pendingContent) {
      const parsed = parseCommandDocument(pendingContent, command);
      setCommands((current) => current.map((item) =>
        item.id === command.id
          ? {
              ...item,
              description: parsed.description,
              agent: parsed.agent || undefined,
              model: parsed.model || undefined,
              subtask: parsed.subtask,
              template: parsed.template,
            }
          : item,
      ));
      setCommandForm((current) =>
        current.name === command.name
          ? { ...parsed, installTarget: current.installTarget }
          : current,
      );
      return;
    }

    try {
      const response = await readCommandRegistryEntry(
        sourceScope,
        command.name,
        sourceScope === "project" ? activeProjectName : undefined,
      );
      const content = response.content ?? Object.values(response.files ?? {})[0] ?? "";
      if (!content) return;

      const parsed = parseCommandDocument(content, command);
      setCommands((current) => current.map((item) =>
        item.id === command.id
          ? {
              ...item,
              description: parsed.description,
              agent: parsed.agent || undefined,
              model: parsed.model || undefined,
              subtask: parsed.subtask,
              template: parsed.template,
            }
          : item,
      ));
      setCommandForm((current) =>
        current.name === command.name
          ? { ...parsed, installTarget: current.installTarget }
          : current,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return;
      setCommandsError(`讀取 command 內容失敗：${getApiErrorMessage(error)}`);
    }
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
      installTarget: tool.inherited ? "project" : tool.installTarget ?? "project",
      runtime: tool.runtime ?? "js-ts",
      entry:
        (tool.inherited ? undefined : tool.entry) ??
        getToolEntryPath(
          tool.name,
          tool.inherited ? "project" : tool.installTarget ?? "project",
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

  async function loadAgentRegistryContent(agent: AgentDefinition) {
    if (!agent.installTarget) return;
    if (agent.installTarget === "project" && !activeProjectName) return;

    try {
      const response = await readAgentRegistryEntry(
        agent.installTarget,
        agent.name,
        agent.installTarget === "project" ? activeProjectName : undefined,
      );
      const content = response.content ?? Object.values(response.files ?? {})[0] ?? "";
      if (!content) return;
      setAgentYaml(content);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return;
      setAgentsError(`讀取 agent 內容失敗：${getApiErrorMessage(error)}`);
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
    setAgentConfigMode(agentsToolsScope === "global" ? "yaml" : "interface");
    setAgentForm({
      name: agent.name,
      installTarget: agent.inherited ? "project" : agent.installTarget ?? agentsToolsScope,
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
    if (agent.installTarget) void loadAgentRegistryContent(agent);
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
    const currentAgent = editingAgentId
      ? agents.find((agent) => agent.id === editingAgentId)
      : undefined;
    const existingAgentWithName = agents.find((agent) => agent.name === (
      agentConfigMode === "yaml" ? yamlName : agentForm.name.trim()
    ));
    const targetScope: RegistryConfigScope =
      agentEditMode === "add"
        ? agentForm.installTarget
        : currentAgent?.inherited
          ? "project"
          : agentForm.installTarget;
    if (targetScope === "project" && !activeProjectName) {
      setAgentsError("Project scope 需要先開啟有效的 Project。");
      return;
    }

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
      installTarget: targetScope,
      inherited: agentsToolsScope === "project" && targetScope === "global",
      overridesGlobal:
        targetScope === "project"
          ? currentAgent?.inherited || currentAgent?.overridesGlobal || existingAgentWithName?.inherited
          : undefined,
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

    const content = agentConfigMode === "yaml" ? agentYaml : agentToYaml(nextAgent);
    const filename = `${nextAgent.name}.md`;
    const sourceScope = currentAgent?.installTarget ?? agentsToolsScope;
    const sourceName = currentAgent?.name ?? nextAgent.name;
    const sourceKey = `${sourceScope}:${sourceName}`;
    const upsertKey = `${targetScope}:${nextAgent.name}`;
    const sourceIsDraft = Boolean(
      currentAgent &&
      currentAgent.id.startsWith("agent-") &&
      pendingAgentUpserts[sourceKey],
    );
    const shouldDeleteSource = Boolean(
      currentAgent &&
      (sourceScope !== targetScope || sourceName !== nextAgent.name) &&
      !sourceIsDraft &&
      !(currentAgent.inherited && sourceScope === "global"),
    );

    if (shouldDeleteSource) {
      setPendingAgentDeletes((current) => ({
        ...current,
        [sourceKey]: { scope: sourceScope, name: sourceName },
      }));
    }
    if (sourceIsDraft && sourceKey !== upsertKey) {
      setPendingAgentUpserts((current) => {
        const next = { ...current };
        delete next[sourceKey];
        return next;
      });
    }
    setPendingAgentUpserts((current) => ({
      ...current,
      [upsertKey]: {
        scope: targetScope,
        name: nextAgent.name,
        content,
        filename,
      },
    }));
    setPendingAgentDeletes((current) => {
      const next = { ...current };
      delete next[upsertKey];
      return next;
    });

    setAgents((current) => {
      if (agentEditMode === "edit" && editingAgentId) {
        const canShowInCurrentScope =
          targetScope === agentsToolsScope ||
          (agentsToolsScope === "project" && targetScope === "global");
        return canShowInCurrentScope
          ? current.map((agent) => agent.id === editingAgentId ? nextAgent : agent)
          : current.filter((agent) => agent.id !== editingAgentId);
      }

      const canShowInCurrentScope =
        targetScope === agentsToolsScope ||
        (agentsToolsScope === "project" && targetScope === "global");
      return canShowInCurrentScope ? [...current, nextAgent] : current;
    });
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
    setAgentDialogView("list");
  }

  function deleteAgent(agentId: string) {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent || agent.scope === "system") return;
    if (agent.inherited) {
      setAgentsError("此 agent 來自 Global inherited，請切換到 Global scope 後刪除。");
      return;
    }

    const removeAgent = () => {
      const scope = agent.installTarget ?? agentsToolsScope;
      const key = `${scope}:${agent.name}`;
      setPendingAgentUpserts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      if (!agent.id.startsWith("agent-") || !pendingAgentUpserts[key]) {
        setPendingAgentDeletes((current) => ({
          ...current,
          [key]: { scope, name: agent.name },
        }));
      } else {
        setPendingAgentDeletes((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      setAgents((current) =>
        current
          .filter((item) => item.id !== agentId)
          .map((item) => {
            const nextSubagentGuidance = { ...item.subagentGuidance };
            delete nextSubagentGuidance[agentId];
            delete nextSubagentGuidance[agent.name];
            return {
              ...item,
              subagents: item.subagents.filter(
                (subagentId) => subagentId !== agentId && subagentId !== agent.name,
              ),
              subagentGuidance: nextSubagentGuidance,
            };
          }),
      );
      setAgentsToolsHasChanges(true);
      setBatchUpdateNotice("");
    };

    if ((agent.installTarget ?? agentsToolsScope) === "global") {
      showConfirmationToast({
        id: `agent-delete-confirm-${agent.name}`,
        title: `刪除 Global agent ${agent.name}？`,
        description: "刪除後會影響所有 Project，按下 modal 底部的「更新」後才會真正刪除。",
        onConfirm: removeAgent,
      });
      return;
    }
    removeAgent();
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

    const currentTool = editingToolId
      ? toolDefinitions.find((tool) => tool.id === editingToolId)
      : undefined;
    const existingToolWithName = toolDefinitions.find((tool) => tool.name === name);
    const targetScope: RegistryConfigScope =
      toolEditMode === "add"
        ? installTarget
        : currentTool?.inherited
          ? "project"
          : installTarget;
    if (targetScope === "project" && !activeProjectName) {
      setToolTestResult({
        status: "error",
        message: "請先開啟有效 project，才能建立 project-local tool。",
      });
      return;
    }
    const nextTool: ToolDefinition = {
      id: editingToolId ?? `tool-${Date.now()}`,
      name,
      description:
        toolForm.description.trim() ||
        `Custom ${installTarget === "global" ? "global" : "project"} tool.`,
      category: toolForm.category.trim() || "Custom",
      source: "custom",
      installTarget: targetScope,
      inherited: agentsToolsScope === "project" && targetScope === "global",
      overridesGlobal:
        targetScope === "project"
          ? currentTool?.inherited || currentTool?.overridesGlobal || existingToolWithName?.inherited
          : undefined,
      runtime: toolForm.runtime,
      entry,
      code: toolForm.code,
      testInput: toolForm.testInput,
    };

    const sourceScope = currentTool?.installTarget ?? agentsToolsScope;
    const sourceName = currentTool?.name ?? name;
    const sourceKey = `${sourceScope}:${sourceName}`;
    const upsertKey = `${targetScope}:${name}`;
    const sourceIsDraft = Boolean(
      currentTool &&
      currentTool.id.startsWith("tool-") &&
      pendingToolUpserts[sourceKey],
    );
    const shouldDeleteSource = Boolean(
      currentTool &&
      (sourceScope !== targetScope || sourceName !== name) &&
      !sourceIsDraft &&
      !(currentTool.inherited && sourceScope === "global"),
    );
    if (shouldDeleteSource) {
      setPendingToolDeletes((current) => ({
        ...current,
        [sourceKey]: { scope: sourceScope, name: sourceName },
      }));
    }
    if (sourceIsDraft && sourceKey !== upsertKey) {
      setPendingToolUpserts((current) => {
        const next = { ...current };
        delete next[sourceKey];
        return next;
      });
    }
    setPendingToolUpserts((current) => ({
      ...current,
      [upsertKey]: {
        scope: targetScope,
        name,
        content: toolForm.code,
        filename: filename ?? `${name}.ts`,
      },
    }));
    setPendingToolDeletes((current) => {
      const next = { ...current };
      delete next[upsertKey];
      return next;
    });

    setToolDefinitions((current) => {
      if (toolEditMode === "edit" && editingToolId) {
        const canShowInCurrentScope =
          targetScope === agentsToolsScope ||
          (agentsToolsScope === "project" && targetScope === "global");
        return canShowInCurrentScope
          ? current.map((tool) => tool.id === editingToolId && tool.source === "custom" ? nextTool : tool)
          : current.filter((tool) => tool.id !== editingToolId);
      }

      const canShowInCurrentScope =
        targetScope === agentsToolsScope ||
        (agentsToolsScope === "project" && targetScope === "global");
      return canShowInCurrentScope
        ? [...current.filter((tool) => tool.name !== name), nextTool]
        : current;
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
    if (tool.inherited) {
      setToolsError("此 tool 來自 Global inherited，請切換到 Global scope 後刪除。");
      return;
    }

    const removeTool = () => {
      const scope = tool.installTarget ?? agentsToolsScope;
      const key = `${scope}:${tool.name}`;
      setPendingToolUpserts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      if (!tool.id.startsWith("tool-") || !pendingToolUpserts[key]) {
        setPendingToolDeletes((current) => ({
          ...current,
          [key]: { scope, name: tool.name },
        }));
      } else {
        setPendingToolDeletes((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      setToolDefinitions((current) => current.filter((item) => item.id !== tool.id));
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
    };

    if ((tool.installTarget ?? agentsToolsScope) === "global") {
      showConfirmationToast({
        id: `tool-delete-confirm-${tool.name}`,
        title: `刪除 Global tool ${tool.name}？`,
        description: "刪除後會影響所有 Project，按下 modal 底部的「更新」後才會真正刪除。",
        onConfirm: removeTool,
      });
      return;
    }
    removeTool();
  }

  function submitCommandConfig() {
    const name = commandForm.name.trim().replace(/\s+/g, "-");
    if (!name || !commandForm.template.trim()) return;

    const currentCommand = editingCommandId
      ? commands.find((command) => command.id === editingCommandId)
      : undefined;
    const existingCommandWithName = commands.find((command) => command.name === name);
    const targetScope: RegistryConfigScope =
      commandEditMode === "add"
        ? commandForm.installTarget
        : currentCommand?.inherited
          ? commandEditTargetScope ?? "project"
          : commandForm.installTarget;

    if (targetScope === "project" && !activeProjectName) {
      setCommandsError("Project scope 需要先開啟有效的 Project。");
      return;
    }

    const nextCommand: CommandDefinition = {
      id: editingCommandId ?? `command-${Date.now()}`,
      name,
      description: commandForm.description.trim() || "OpenCode custom command.",
      source: "custom",
      agent: commandForm.agent.trim() || undefined,
      model: commandForm.model.trim() || undefined,
      subtask: commandForm.subtask,
      template: commandForm.template,
      installTarget: targetScope,
      inherited: agentsToolsScope === "project" && targetScope === "global",
      overridesGlobal:
        targetScope === "project"
          ? currentCommand?.inherited || currentCommand?.overridesGlobal || existingCommandWithName?.inherited
          : undefined,
    };
    const content = commandToMarkdown(nextCommand);
    const sourceScope = currentCommand?.installTarget ?? agentsToolsScope;
    const sourceName = currentCommand?.name ?? name;
    const sourceKey = `${sourceScope}:${sourceName}`;
    const upsertKey = `${targetScope}:${name}`;
    const sourceIsDraft = Boolean(
      currentCommand &&
      currentCommand.id.startsWith("command-") &&
      pendingCommandUpserts[sourceKey],
    );
    const shouldDeleteSource = Boolean(
      currentCommand &&
      (sourceScope !== targetScope || sourceName !== name) &&
      !sourceIsDraft &&
      !(currentCommand.inherited && sourceScope === "global"),
    );

    if (shouldDeleteSource) {
      setPendingCommandDeletes((current) => ({
        ...current,
        [sourceKey]: { scope: sourceScope, name: sourceName },
      }));
    }
    if (sourceIsDraft && sourceKey !== upsertKey) {
      setPendingCommandUpserts((current) => {
        const next = { ...current };
        delete next[sourceKey];
        return next;
      });
    }
    setPendingCommandUpserts((current) => ({
      ...current,
      [upsertKey]: {
        scope: targetScope,
        name,
        content,
        filename: `${name}.md`,
      },
    }));
    setPendingCommandDeletes((current) => {
      const next = { ...current };
      delete next[upsertKey];
      return next;
    });

    setCommands((current) => {
      if (commandEditMode === "edit" && editingCommandId) {
        const canShowInCurrentScope =
          targetScope === agentsToolsScope ||
          (agentsToolsScope === "project" && targetScope === "global");
        return canShowInCurrentScope
          ? current.map((command) => command.id === editingCommandId ? nextCommand : command)
          : current.filter((command) => command.id !== editingCommandId);
      }

      const canShowInCurrentScope =
        targetScope === agentsToolsScope ||
        (agentsToolsScope === "project" && targetScope === "global");
      return canShowInCurrentScope
        ? [...current.filter((command) => command.name !== name), nextCommand]
        : current;
    });
    setAgentsToolsHasChanges(true);
    setBatchUpdateNotice("");
    setSelectedCommandId(nextCommand.id);
    setAgentToolTab("commands");
    setAgentDialogView("list");
  }

  function deleteCommand(command: CommandDefinition) {
    if (command.source !== "custom") return;
    if (command.inherited) {
      setCommandsError("此 command 來自 Global inherited，請切換到 Global scope 後刪除。");
      return;
    }

    const removeCommand = () => {
      const scope = command.installTarget ?? agentsToolsScope;
      const key = `${scope}:${command.name}`;
      setPendingCommandUpserts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      if (!command.id.startsWith("command-") || !pendingCommandUpserts[key]) {
        setPendingCommandDeletes((current) => ({
          ...current,
          [key]: { scope, name: command.name },
        }));
      } else {
        setPendingCommandDeletes((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      setCommands((current) => current.filter((item) => item.id !== command.id));
      setAgentsToolsHasChanges(true);
      setBatchUpdateNotice("");
    };

    if ((command.installTarget ?? agentsToolsScope) === "global") {
      showConfirmationToast({
        id: `command-delete-confirm-${command.name}`,
        title: `刪除 Global command ${command.name}？`,
        description: "刪除後會影響所有 Project，按下 modal 底部的「更新」後才會真正刪除。",
        onConfirm: removeCommand,
      });
      return;
    }
    removeCommand();
  }

  function deleteGlobalCommand(command: CommandDefinition) {
    if (command.source !== "custom" || !command.inherited) return;

    const removeGlobalCommand = () => {
      const key = `global:${command.name}`;
      setPendingCommandUpserts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      if (!command.id.startsWith("command-") || !pendingCommandUpserts[key]) {
        setPendingCommandDeletes((current) => ({
          ...current,
          [key]: { scope: "global", name: command.name },
        }));
      } else {
        setPendingCommandDeletes((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      setCommands((current) => current.filter((item) => item.id !== command.id));
      setAgentsToolsHasChanges(true);
      setBatchUpdateNotice("");
    };

    showConfirmationToast({
      id: `command-global-delete-confirm-${command.name}`,
      title: `刪除 Global command ${command.name}？`,
      description: "刪除後會影響所有 Project，按下 modal 底部的「更新」後才會真正刪除。",
      onConfirm: removeGlobalCommand,
    });
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
        modelSettingsApplying={modelSettingsApplying}
        modelSettingsChanged={modelSettingsChanged}
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
        onApplyModelSettings={applyModelSettings}
        onApplyNpmPackageChanges={applyNpmPackageChanges}
        onCancelModelSettings={cancelModelSettings}
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
         onCancelBatchUpdate={cancelPluginSkillChanges}
         onOpenChange={setPluginSkillDialogOpen}
         onStartAdd={startPluginAdd}
         onExitPluginEditor={resetPluginEditor}
        onPluginFormChange={setPluginForm}
         onPluginConfigScopeChange={changePluginConfigScope}
         onPluginConfigModeChange={setPluginConfigMode}
        onPluginDocumentChange={(content) => {
          setPluginDocument(content);
          setPluginSkillHasChanges(true);
          setBatchUpdateNotice("");
        }}
         onPluginRefresh={() => void loadPluginConfig()}
        onPluginInstallResultChange={setPluginInstallResult}
        onSearchChange={setPluginSkillSearch}
        onSkillFormChange={setSkillForm}
        onSkillInstallResultChange={setSkillInstallResult}
        onTabChange={setPluginSkillTab}
         onEditPlugin={editPlugin}
         onViewPlugin={viewPlugin}
          onDeletePlugin={deletePlugin}
          onTogglePluginProject={pluginConfigScope === "project" ? togglePluginProject : undefined}
         onToggleSkill={toggleSkill}
         onDeleteSkill={deleteSkill}
          onEditSkill={editSkill}
          onToggleGlobalSkill={toggleGlobalSkill}
        onViewChange={setPluginSkillDialogView}
        open={pluginSkillDialogOpen}
        pluginForm={pluginForm}
        pluginConfigMode={pluginConfigMode}
        pluginConfigScope={pluginConfigScope}
        pluginDocument={pluginDocument}
         pluginConfigLoading={pluginConfigLoading}
         pluginReadOnly={pluginReadOnly}
         pluginEditorMode={pluginEditorMode}
         currentProjectName={activeProjectName}
         projectRequired={!activeProjectName}
        pluginInstallResult={pluginInstallResult}
        plugins={plugins}
        search={pluginSkillSearch}
        skillForm={skillForm}
         skillInstallResult={skillInstallResult}
         skillImportLoading={skillImportLoading}
         skillDocument={skillDocument}
         skillEditingName={skillEditing?.name ?? "Skill"}
         skillEditingScope={skillEditingScope}
         onSkillEditingScopeChange={changeSkillEditingScope}
         onSkillDocumentChange={setSkillDocument}
         onSaveSkill={saveSkillEdit}
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
         commandEditMode={commandEditMode}
         commandForm={commandForm}
         commands={commands}
         commandsError={commandsError}
         commandsLoading={commandsLoading}
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
         onCancelBatchUpdate={cancelAgentsToolsChanges}
         onCommandFormChange={setCommandForm}
         onDeleteCommand={deleteCommand}
         onDeleteGlobalCommand={deleteGlobalCommand}
         onDeleteAgent={deleteAgent}
        onDeleteTool={deleteTool}
        onGetCallableSubagentOptions={getCallableSubagentOptions}
        onGuidanceSkillChange={setGuidanceSkill}
        onGuidanceSubagentChange={setGuidanceSubagent}
        onGuidanceToolChange={setGuidanceTool}
         onOpenAddAgentMode={openAddAgentMode}
         onOpenAddCommandMode={openAddCommandMode}
         onOpenAddToolMode={openAddToolMode}
         onOpenAgentDetail={openAgentDetail}
         onOpenCommandDetail={openCommandDetail}
        onOpenChange={setAgentsDialogOpen}
         onOpenEditAgentMode={openEditAgentMode}
         onOpenEditCommandMode={openEditCommandMode}
         onOpenEditGlobalCommandMode={openEditGlobalCommandMode}
        onOpenEditToolMode={openEditToolMode}
        onOpenToolDetail={openToolDetail}
        onRemoveFormSubagent={removeFormSubagent}
        onRunToolCallTest={runToolCallTest}
        onSkillToAddChange={setSkillToAdd}
        onSubagentToAddChange={setSubagentToAdd}
         onSubmitAgentConfig={submitAgentConfig}
         onSubmitCommandConfig={submitCommandConfig}
         onSubmitToolConfig={submitToolConfig}
        onToolFormChange={setToolForm}
        onToolTestResultChange={setToolTestResult}
        onToolToAddChange={setToolToAdd}
        onUpdateSkillGuidance={updateSkillGuidance}
        onUpdateSubagentGuidance={updateSubagentGuidance}
        onUpdateToolGuidance={updateToolGuidance}
        open={agentsDialogOpen}
         selectedAgent={selectedAgent}
         selectedCommand={selectedCommand}
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
          projectRequired={agentsToolsScope === "project" && !activeProjectName}
      />
    </>
  );
}
