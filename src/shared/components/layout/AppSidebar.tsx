import { useState } from "react";
import {
  UserSettingsModal,
  type ModelProvider,
  type UserSettingsSection,
} from "@/shared/components/layout/UserSettingsModal";
import { AgentsToolsModal } from "@/shared/components/layout/app-sidebar/AgentsToolsModal";
import { AppSidebarPanel } from "@/shared/components/layout/app-sidebar/AppSidebarPanel";
import { McpServersDialog } from "@/shared/components/layout/app-sidebar/McpServersDialog";
import { PluginSkillModal } from "@/shared/components/layout/app-sidebar/PluginSkillModal";
import { ProjectDialog } from "@/shared/components/layout/app-sidebar/ProjectDialog";
import {
  agentDefinitions,
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
} from "@/shared/components/layout/app-sidebar/types";
import {
  agentToYaml,
  getSkillBasePath,
  getSkillScope,
  getToolPermissionKey,
  isCustomTool,
  isValidSkillName,
  taskPermissionFor,
} from "@/shared/components/layout/app-sidebar/utils";

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
  const [projectDialogView, setProjectDialogView] =
    useState<ProjectDialogView>("list");
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
  const [agents, setAgents] = useState<AgentDefinition[]>(agentDefinitions);
  const [toolDefinitions, setToolDefinitions] = useState<ToolDefinition[]>(
    initialToolDefinitions,
  );
  const [agentsToolsHasChanges, setAgentsToolsHasChanges] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolEditMode, setToolEditMode] = useState<ToolEditMode>("add");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [agentYaml, setAgentYaml] = useState(agentToYaml(emptyAgentForm));
  const [toolForm, setToolForm] = useState(emptyToolForm);
  const [toolTestResult, setToolTestResult] =
    useState<InstallResult | null>(null);
  const [toolToAdd, setToolToAdd] = useState(initialToolDefinitions[0]!.name);
  const [subagentToAdd, setSubagentToAdd] = useState("");
  const [skillToAdd, setSkillToAdd] = useState(availableSkills[0]!);
  const [guidanceTool, setGuidanceTool] = useState<string | null>(null);
  const [guidanceSkill, setGuidanceSkill] = useState<string | null>(null);
  const [guidanceSubagent, setGuidanceSubagent] = useState<string | null>(null);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [userSettingsSection, setUserSettingsSection] =
    useState<UserSettingsSection>("model-providers");
  const [modelProviderSearch, setModelProviderSearch] = useState("");
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>(
    initialModelProviders,
  );
  const [selectedModelProviderId, setSelectedModelProviderId] = useState<
    string | null
  >(null);
  const [selectedProviderAuthMethod, setSelectedProviderAuthMethod] = useState<
    string | null
  >(null);

  const filteredProjects = projects.filter((project) => {
    const keyword = projectSearch.trim().toLowerCase();
    if (!keyword) return true;
    return (
      project.name.toLowerCase().includes(keyword) ||
      project.path.toLowerCase().includes(keyword)
    );
  });

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
    const confirmed = window.confirm(
      `是否建立專案？\n名稱：${name}\n路徑：${path}`,
    );
    if (!confirmed) return;
    const nextProject = { id: `project-${Date.now()}`, name, path };
    setProjects((current) =>
      current.some((project) => project.path === path)
        ? current
        : [nextProject, ...current],
    );
    setProjectDialogView("list");
    setProjectCreateName("");
    finishProjectOpen(path);
  }

  function confirmBatchUpdate(scope: "agents-tools" | "plugins-skills") {
    const label = scope === "agents-tools" ? "智能體與工具" : "外掛與技能";
    const confirmed = window.confirm(
      `${label} 是 build-time 設定，更新後需要重新載入 OpenCode 才會完整生效。是否要批次更新？`,
    );
    if (!confirmed) return;
    if (scope === "agents-tools") {
      setAgentsToolsHasChanges(false);
    } else {
      setPluginSkillHasChanges(false);
    }
    setBatchUpdateNotice(
      `${label} 已批次更新，請重新載入 OpenCode 讓 build-time 設定生效。`,
    );
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
      entry:
        tool.entry ??
        `./.opencode/tools/${tool.name}.${tool.runtime === "python" ? "py" : "ts"}`,
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
      entry:
        toolForm.entry.trim() ||
        `./.opencode/tools/${name}.${toolForm.runtime === "python" ? "py" : "ts"}`,
      code: toolForm.code,
      testInput: toolForm.testInput,
    };

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

  function runToolCallTest() {
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
        message: "Tool code 不能為空，請先填入 Python 或 JS/TS 實作。",
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

    const expectedExtension =
      toolForm.runtime === "python" ? ".py" : ".ts 或 .js";
    const extensionValid =
      toolForm.runtime === "python"
        ? toolForm.entry.endsWith(".py")
        : toolForm.entry.endsWith(".ts") || toolForm.entry.endsWith(".js");

    if (!extensionValid) {
      setToolTestResult({
        status: "error",
        message: `${toolForm.runtime === "python" ? "Python" : "JS/TS"} tool 的 entry 建議使用 ${expectedExtension}。`,
      });
      return;
    }

    setToolTestResult({
      status: "success",
      message:
        "Tool call test passed：基本設定、entry 副檔名、code 與 JSON 測試參數都有效。",
    });
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
        filteredSessions={filteredSessions}
        historySearch={historySearch}
        historySearchOpen={historySearchOpen}
        onAgentsOpen={openAgentsList}
        onClose={onClose}
        onHistorySearchChange={setHistorySearch}
        onHistorySearchToggle={() =>
          setHistorySearchOpen((current) => !current)
        }
        onMcpOpen={openMcpList}
        onPluginSkillOpen={openPluginSkillSettings}
        onProjectOpen={() => {
          setProjectDialogView("list");
          setProjectDialogOpen(true);
        }}
        onSelectSession={onSelectSession}
        onUserSettingsOpen={() => {
          setUserSettingsSection("model-providers");
          setSelectedModelProviderId(null);
          setSelectedProviderAuthMethod(null);
          setUserSettingsOpen(true);
        }}
        open={open}
      />

      <ProjectDialog
        activeProjectPath={activeProjectPath}
        createName={projectCreateName}
        filteredProjects={filteredProjects}
        onClose={() => {
          setProjectDialogOpen(false);
          setProjectDialogView("list");
        }}
        onConfirmCreate={confirmCreateProject}
        onConfirmOpen={confirmOpenProject}
        onCreateNameChange={setProjectCreateName}
        onSearchChange={setProjectSearch}
        onViewChange={setProjectDialogView}
        open={projectDialogOpen}
        search={projectSearch}
        view={projectDialogView}
      />

      <UserSettingsModal
        filteredModelProviders={filteredModelProviders}
        modelProviderSearch={modelProviderSearch}
        onClose={closeUserSettings}
        onModelProviderSearchChange={setModelProviderSearch}
        onOpenChange={(settingsOpen) => {
          if (!settingsOpen) closeUserSettings();
        }}
        onProviderAuthMethodChange={setSelectedProviderAuthMethod}
        onProviderSelect={(providerId) => {
          setSelectedModelProviderId(providerId);
          setSelectedProviderAuthMethod(null);
        }}
        onProviderUpdate={updateModelProvider}
        onProviderViewBack={() => {
          if (selectedProviderAuthMethod) {
            setSelectedProviderAuthMethod(null);
            return;
          }

          setSelectedModelProviderId(null);
        }}
        onSectionChange={(nextSection) => {
          setUserSettingsSection(nextSection);
          setSelectedModelProviderId(null);
          setSelectedProviderAuthMethod(null);
        }}
        open={userSettingsOpen}
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
        skillToAdd={skillToAdd}
        subagentToAdd={subagentToAdd}
        toolDefinitions={toolDefinitions}
        toolEditMode={toolEditMode}
        toolForm={toolForm}
        toolTestResult={toolTestResult}
        toolToAdd={toolToAdd}
        view={agentDialogView}
      />
    </>
  );
}
