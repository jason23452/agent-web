import type { Dispatch, SetStateAction } from "react";
import { MoreHorizontalIcon, PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/shared/components/ui/menu";
import { Textarea } from "@/shared/components/ui/textarea";
import type {
  AgentConfigMode,
  CommandDefinition,
  CommandForm,
  AgentDefinition,
  AgentForm,
  AgentToolTab,
  AgentEditMode,
  PermissionAction,
  ToolDefinition,
  ToolEditMode,
  ToolForm,
  InstallResult,
} from "@/shared/types/app-sidebar";
import {
  getPermissionLabel,
  getPermissionVariant,
  agentToYaml,
  getToolPermissionKey,
  taskPermissionFor,
} from "@/shared/utils/app-sidebar";
import { agentColors, modelVariants } from "./config";


function getAgentScopeLabel(scope: AgentDefinition["scope"]) {
  return scope === "system" ? "系統" : "自訂";
}

function getAgentModeLabel(mode: AgentDefinition["mode"]) {
  if (mode === "primary") return "主要智能體";
  if (mode === "subagent") return "子智能體";
  return "全部";
}

function getAgentModeVariant(
  mode: AgentDefinition["mode"],
): "default" | "secondary" | "warning" {
  if (mode === "primary") return "default";
  if (mode === "subagent") return "warning";
  return "secondary";
}

function getToolSourceLabel(source: ToolDefinition["source"]) {
  return source === "built-in" ? "內建" : "自訂";
}

function getToolTargetLabel(target?: ToolDefinition["installTarget"]) {
  if (target === "global") return "Global";
  if (target === "project") return "Project";
  return "Custom";
}

function getRegistryScopeLabel(scope?: ToolDefinition["installTarget"]) {
  return scope === "global" ? "Global" : "Project";
}

function getToolFormEntryPath(
  name: string,
  installTarget: NonNullable<ToolDefinition["installTarget"]> = "project",
) {
  const safeName = name.trim().replace(/\s+/g, "_") || "my-tool";
  const relativePath = `${safeName}.ts`;
  const prefix = installTarget === "global" ? "~/.config/opencode/tools" : "./.opencode/tools";

  return `${prefix}/${relativePath}`;
}

function isDefaultToolEntry(form: ToolForm) {
  return !form.entry || form.entry === getToolFormEntryPath(form.name, form.installTarget);
}

export function AgentsToolsList({
  agents,
  agentsError,
  agentsLoading = false,
  agentToolTab,
  commands,
  commandsError,
  commandsLoading = false,
  onAgentToolTabChange,
  onDeleteCommand,
  onDeleteGlobalCommand,
  onDeleteAgent,
  onDeleteTool,
  onOpenAgentDetail,
  onOpenCommandDetail,
  onOpenEditGlobalCommandMode,
  onOpenEditCommandMode,
  onOpenEditAgentMode,
  onOpenEditToolMode,
  onOpenToolDetail,
  toolDefinitions,
  toolsError,
  toolsLoading = false,
  projectRequired = false,
}: {
  agents: AgentDefinition[];
  agentsError?: string | null;
  agentsLoading?: boolean;
  agentToolTab: AgentToolTab;
  commands: CommandDefinition[];
  commandsError?: string | null;
  commandsLoading?: boolean;
  onAgentToolTabChange: Dispatch<SetStateAction<AgentToolTab>>;
  onDeleteCommand: (command: CommandDefinition) => void;
  onDeleteGlobalCommand: (command: CommandDefinition) => void;
  onDeleteAgent: (agentId: string) => void;
  onDeleteTool: (tool: ToolDefinition) => void;
  onOpenAgentDetail: (agent: AgentDefinition) => void;
  onOpenCommandDetail: (command: CommandDefinition) => void;
  onOpenEditGlobalCommandMode: (command: CommandDefinition) => void;
  onOpenEditCommandMode: (command: CommandDefinition) => void;
  onOpenEditAgentMode: (agent: AgentDefinition) => void;
  onOpenEditToolMode: (tool: ToolDefinition) => void;
  onOpenToolDetail: (tool: ToolDefinition) => void;
  toolDefinitions: ToolDefinition[];
  toolsError?: string | null;
  toolsLoading?: boolean;
  projectRequired?: boolean;
}) {
  const systemAgents = agents.filter((agent) => agent.scope === "system");
  const customAgents = agents.filter((agent) => agent.scope === "custom");
  const systemTools = toolDefinitions.filter((tool) => tool.source === "built-in");
  const customTools = toolDefinitions.filter((tool) => tool.source === "custom");

  return (
    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 pb-6">
      <div className="grid grid-cols-3 rounded-lg bg-muted p-1">
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentToolTab === "agents" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentToolTabChange("agents")}
          type="button"
        >
           智能體
        </button>
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentToolTab === "tools" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentToolTabChange("tools")}
          type="button"
        >
          工具
        </button>
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentToolTab === "commands" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentToolTabChange("commands")}
          type="button"
        >
          Commands
        </button>
      </div>

      {projectRequired && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm" role="alert">
           請先開啟專案，或切換到 Global scope 後再查看 OpenCode 設定。
        </div>
      )}

      {!projectRequired && agentToolTab === "agents" && (
        <>
          {agentsLoading && (
            <div
              className="rounded-lg border border-dashed bg-muted/45 px-4 py-6 text-center text-muted-foreground text-sm"
              role="status"
            >
            載入 OpenCode 智能體...
            </div>
          )}

          {!agentsLoading && agentsError && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm"
              role="alert"
            >
              {agentsError}
            </div>
          )}

           {!agentsLoading && !agentsError && agents.length === 0 && (
             <div className="rounded-lg border border-dashed bg-muted/45 px-4 py-6 text-center text-muted-foreground text-sm">
              尚無 OpenCode 智能體。
             </div>
           )}

          {!agentsLoading && !agentsError && agents.length > 0 && (
            <>
          <section aria-labelledby="built-in-agents-title">
            <h3
              className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
              id="built-in-agents-title"
            >
               內建智能體
            </h3>
            <ul className="grid gap-1">
              {systemAgents.map((agent) => (
                  <li key={agent.id}>
                    <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-sm">
                            {agent.name}
                          </span>
                           <Badge size="sm" variant="info">
                             內建
                           </Badge>
                           <Badge size="sm" variant="outline">
                             {getRegistryScopeLabel(agent.installTarget)}
                           </Badge>
                           <Badge size="sm" variant={getAgentModeVariant(agent.mode)}>
                            {getAgentModeLabel(agent.mode)}
                          </Badge>
                          {agent.hidden && (
              <Badge size="sm" variant="outline">
              隱藏
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
                          {agent.description}
                        </p>
                      </div>
                      <Menu>
                        <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                        </MenuTrigger>
                        <MenuPopup align="end" className="min-w-36">
                          <MenuItem onClick={() => onOpenAgentDetail(agent)}>
                            檢視
                          </MenuItem>
                           <MenuItem>內建</MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  </li>
                ))}
                {systemAgents.length === 0 && (
                  <li className="rounded-lg border border-dashed bg-muted/35 px-3 py-4 text-muted-foreground text-sm">
                    尚未有內建智能體
                  </li>
                )}
            </ul>
          </section>

          <section aria-labelledby="custom-agents-title">
            <h3
              className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
              id="custom-agents-title"
            >
               自訂智能體
            </h3>
            <ul className="grid gap-1">
              {customAgents.map((agent) => (
                  <li key={agent.id}>
                    <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-sm">
                            {agent.name}
                          </span>
                           <Badge size="sm" variant="success">
                              自訂
                           </Badge>
                           <Badge size="sm" variant="outline">
                             {getRegistryScopeLabel(agent.installTarget)}
                           </Badge>
                           {agent.inherited && (
                             <Badge size="sm" variant="info">
                               Inherited
                             </Badge>
                           )}
                           {agent.overridesGlobal && (
                             <Badge size="sm" variant="warning">
                               Overrides Global
                             </Badge>
                           )}
                          <Badge size="sm" variant={getAgentModeVariant(agent.mode)}>
                            {getAgentModeLabel(agent.mode)}
                          </Badge>
                          {agent.hidden && (
                            <Badge size="sm" variant="outline">
                             隱藏
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
                          {agent.description}
                        </p>
                      </div>
                      <Menu>
                        <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                        </MenuTrigger>
                        <MenuPopup align="end" className="min-w-36">
                          <MenuItem onClick={() => onOpenAgentDetail(agent)}>
                             檢視
                          </MenuItem>
                          <MenuItem onClick={() => onOpenEditAgentMode(agent)}>
                             編輯
                          </MenuItem>
                           <MenuItem>自訂</MenuItem>
                          <MenuSeparator />
                          <MenuItem
                            onClick={() => onDeleteAgent(agent.id)}
                            variant="destructive"
                          >
                             刪除
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  </li>
                ))}
                {customAgents.length === 0 && (
                  <li className="rounded-lg border border-dashed bg-muted/35 px-3 py-4 text-muted-foreground text-sm">
                    尚未有自訂智能體
                  </li>
                )}
            </ul>
          </section>
            </>
          )}
        </>
      )}

      {!projectRequired && agentToolTab === "tools" && (
        <>
          {toolsLoading && (
            <div
              className="rounded-lg border border-dashed bg-muted/45 px-4 py-6 text-center text-muted-foreground text-sm"
              role="status"
            >
            載入 OpenCode 工具...
            </div>
          )}

          {!toolsLoading && toolsError && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm"
              role="alert"
            >
              {toolsError}
            </div>
          )}

            {!toolsLoading && !toolsError && toolDefinitions.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/45 px-4 py-6 text-center text-muted-foreground text-sm">
              尚無 OpenCode 工具。
            </div>
            )}

          {!toolsLoading && !toolsError && toolDefinitions.length > 0 && (
            <>
              <section aria-labelledby="built-in-tools-title">
                <h3
                  className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
                  id="built-in-tools-title"
                >
                  內建工具
                </h3>
                <ul className="grid gap-1">
                  {systemTools.map((tool) => (
                    <li key={tool.id}>
                      <ToolListItem
                        onDeleteTool={onDeleteTool}
                        onOpenEditToolMode={onOpenEditToolMode}
                        onOpenToolDetail={onOpenToolDetail}
                        tool={tool}
                      />
                    </li>
                  ))}
                {systemTools.length === 0 && (
                  <li className="rounded-lg border border-dashed bg-muted/35 px-3 py-4 text-muted-foreground text-sm">
                    尚未有內建工具
                  </li>
                )}
                </ul>
              </section>

              <section aria-labelledby="custom-tools-title">
                <h3
                  className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
                  id="custom-tools-title"
                >
                  自訂工具
                </h3>
                <ul className="grid gap-1">
                  {customTools.map((tool) => (
                    <li key={tool.id}>
                      <ToolListItem
                        onDeleteTool={onDeleteTool}
                        onOpenEditToolMode={onOpenEditToolMode}
                        onOpenToolDetail={onOpenToolDetail}
                        tool={tool}
                      />
                    </li>
                  ))}
                {customTools.length === 0 && (
                  <li className="rounded-lg border border-dashed bg-muted/35 px-3 py-4 text-muted-foreground text-sm">
                    尚未有自訂工具
                  </li>
                )}
                </ul>
              </section>
            </>
          )}
        </>
      )}

      {!projectRequired && agentToolTab === "commands" && (
        <>
          {commandsLoading && (
            <div
              className="rounded-lg border border-dashed bg-muted/45 px-4 py-6 text-center text-muted-foreground text-sm"
              role="status"
            >
              載入 OpenCode Commands...
            </div>
          )}

          {!commandsLoading && commandsError && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm"
              role="alert"
            >
              {commandsError}
            </div>
          )}

          {!commandsLoading && !commandsError && commands.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/45 px-4 py-6 text-center text-muted-foreground text-sm">
              尚無 OpenCode Commands。
            </div>
          )}

          {!commandsLoading && !commandsError && commands.length > 0 && (
            <section aria-labelledby="commands-title">
              <h3
                className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
                id="commands-title"
              >
                OpenCode Commands
              </h3>
              <ul className="grid gap-1">
                {commands.map((command) => (
                  <li key={command.id}>
                    <CommandListItem
                      command={command}
                      onDeleteCommand={onDeleteCommand}
                      onDeleteGlobalCommand={onDeleteGlobalCommand}
                      onOpenCommandDetail={onOpenCommandDetail}
                      onOpenEditGlobalCommandMode={onOpenEditGlobalCommandMode}
                      onOpenEditCommandMode={onOpenEditCommandMode}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function CommandListItem({
  command,
  onDeleteCommand,
  onDeleteGlobalCommand,
  onOpenCommandDetail,
  onOpenEditGlobalCommandMode,
  onOpenEditCommandMode,
}: {
  command: CommandDefinition;
  onDeleteCommand: (command: CommandDefinition) => void;
  onDeleteGlobalCommand: (command: CommandDefinition) => void;
  onOpenCommandDetail: (command: CommandDefinition) => void;
  onOpenEditGlobalCommandMode: (command: CommandDefinition) => void;
  onOpenEditCommandMode: (command: CommandDefinition) => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-sm">/{command.name}</span>
          <Badge size="sm" variant={command.source === "custom" ? "success" : "secondary"}>
            {command.source === "custom" ? "自訂" : "Runtime"}
          </Badge>
          {command.source === "custom" && (
            <>
              <Badge size="sm" variant="outline">
                {command.installTarget === "global" ? "Global" : "Project"}
              </Badge>
              {command.inherited && <Badge size="sm" variant="info">Inherited</Badge>}
              {command.overridesGlobal && <Badge size="sm" variant="warning">Overrides Global</Badge>}
            </>
          )}
          {command.subtask && <Badge size="sm" variant="secondary">Subtask</Badge>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
          {command.description || "未提供說明"}
        </p>
      </div>
      <Menu>
        <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MoreHorizontalIcon aria-hidden="true" className="size-4" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-36">
          <MenuItem onClick={() => onOpenCommandDetail(command)}>檢視</MenuItem>
          {command.source === "custom" && (
            <>
              <MenuItem onClick={() => onOpenEditCommandMode(command)}>編輯</MenuItem>
              {command.inherited && (
                <MenuItem onClick={() => onOpenEditGlobalCommandMode(command)}>
                  編輯 Global
                </MenuItem>
              )}
              <MenuSeparator />
              <MenuItem
                onClick={() =>
                  command.inherited
                    ? onDeleteGlobalCommand(command)
                    : onDeleteCommand(command)
                }
                variant="destructive"
              >
                刪除
              </MenuItem>
            </>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}

export function CommandDetailPanel({
  command,
  onDeleteGlobalCommand,
  onOpenEditGlobalCommandMode,
  onOpenEditCommandMode,
}: {
  command: CommandDefinition;
  onDeleteGlobalCommand: (command: CommandDefinition) => void;
  onOpenEditGlobalCommandMode: (command: CommandDefinition) => void;
  onOpenEditCommandMode: (command: CommandDefinition) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="rounded-lg bg-muted/55 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-base">/{command.name}</h3>
          <Badge size="sm" variant={command.source === "custom" ? "success" : "secondary"}>
            {command.source === "custom" ? "自訂" : "Runtime"}
          </Badge>
          {command.source === "custom" && (
            <>
              <Badge size="sm" variant="outline">
                {command.installTarget === "global" ? "Global" : "Project"}
              </Badge>
              {command.inherited && <Badge size="sm" variant="info">Inherited</Badge>}
              {command.overridesGlobal && <Badge size="sm" variant="warning">Overrides Global</Badge>}
            </>
          )}
        </div>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          {command.description || "未提供說明"}
        </p>
      </div>
      <section className="grid gap-2" aria-labelledby="command-metadata-title">
        <h4 className="font-semibold text-sm" id="command-metadata-title">Command 設定</h4>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <ToolMetadataItem label="Command 名稱" value={`/${command.name}`} />
          <ToolMetadataItem label="執行 agent" value={command.agent || "目前 agent"} />
          <ToolMetadataItem label="模型" value={command.model || "目前模型"} />
          <ToolMetadataItem label="Subtask" value={command.subtask ? "true" : "false"} />
          <ToolMetadataItem label="來源" value={command.source === "custom" ? "Registry Markdown" : "OpenCode Runtime"} />
          {command.registryPath && <ToolMetadataItem label="Registry 路徑" value={command.registryPath} />}
        </div>
      </section>
      <section className="grid gap-2" aria-labelledby="command-template-title">
        <h4 className="font-semibold text-sm" id="command-template-title">Prompt template</h4>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/45 p-3 font-mono text-xs leading-5 text-muted-foreground">
          {command.template}
        </pre>
      </section>
      <div className="flex justify-end">
        {command.source === "custom" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => onOpenEditCommandMode(command)} size="sm">
              {command.inherited ? "建立 Project Override" : "編輯 Command"}
            </Button>
            {command.inherited && (
              <>
                <Button onClick={() => onOpenEditGlobalCommandMode(command)} size="sm" variant="outline">
                  編輯 Global
                </Button>
                <Button onClick={() => onDeleteGlobalCommand(command)} size="sm" variant="destructive">
                  刪除 Global
                </Button>
              </>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            此 Command 由 OpenCode runtime 載入，請透過其來源設定修改。
          </p>
        )}
      </div>
    </div>
  );
}

export function CommandConfigPanel({
  commandForm,
  commandEditMode,
  onCommandFormChange,
  onSubmitCommandConfig,
}: {
  commandForm: CommandForm;
  commandEditMode: "add" | "edit";
  onCommandFormChange: Dispatch<SetStateAction<CommandForm>>;
  onSubmitCommandConfig: () => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-muted-foreground text-sm">
            Command 名稱
            <Input
              aria-label="Command 名稱"
              onChange={(event) => onCommandFormChange((current) => ({ ...current, name: event.target.value }))}
              placeholder="review"
              value={commandForm.name}
            />
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            Install target
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => onCommandFormChange((current) => ({ ...current, installTarget: event.target.value as CommandForm["installTarget"] }))}
              value={commandForm.installTarget}
            >
              <option value="project">Project</option>
              <option value="global">Global</option>
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-muted-foreground text-sm">
          說明
          <Input
            aria-label="Command 說明"
            onChange={(event) => onCommandFormChange((current) => ({ ...current, description: event.target.value }))}
            placeholder="Review recent changes"
            value={commandForm.description}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-muted-foreground text-sm">
            Agent（可選）
            <Input
              aria-label="Command agent"
              onChange={(event) => onCommandFormChange((current) => ({ ...current, agent: event.target.value }))}
              placeholder="build"
              value={commandForm.agent}
            />
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            Model（可選）
            <Input
              aria-label="Command model"
              onChange={(event) => onCommandFormChange((current) => ({ ...current, model: event.target.value }))}
              placeholder="anthropic/claude-sonnet-4-5"
              value={commandForm.model}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-muted-foreground text-sm">
          <input
            checked={commandForm.subtask}
            onChange={(event) => onCommandFormChange((current) => ({ ...current, subtask: event.target.checked }))}
            type="checkbox"
          />
          以 subtask 執行
        </label>
        <label className="grid gap-2 text-muted-foreground text-sm">
          Prompt template
          <Textarea
            aria-label="Command prompt template"
            className="min-h-56 font-mono"
            onChange={(event) => onCommandFormChange((current) => ({ ...current, template: event.target.value }))}
            placeholder="Review the current changes and suggest improvements.\n\n$ARGUMENTS"
            rows={10}
            spellCheck={false}
            value={commandForm.template}
          />
        </label>
        <p className="text-muted-foreground text-xs">
          儲存後會產生 OpenCode command markdown：<code>{`{name}.md`}</code>。
          可使用 <code>$ARGUMENTS</code>、<code>$1</code> 等參數。
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={!commandForm.name.trim() || !commandForm.template.trim()}
          onClick={onSubmitCommandConfig}
        >
          {commandEditMode === "add" ? "新增 Command" : "更新 Command"}
        </Button>
      </div>
    </div>
  );
}

export function ToolListItem({
  onDeleteTool,
  onOpenEditToolMode,
  onOpenToolDetail,
  tool,
}: {
  onDeleteTool: (tool: ToolDefinition) => void;
  onOpenEditToolMode: (tool: ToolDefinition) => void;
  onOpenToolDetail: (tool: ToolDefinition) => void;
  tool: ToolDefinition;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-sm">{tool.name}</span>
          <Badge size="sm" variant="outline">
            {tool.category}
          </Badge>
          <Badge
            size="sm"
            variant={tool.source === "custom" ? "success" : "secondary"}
          >
            {getToolSourceLabel(tool.source)}
          </Badge>
          <Badge size="sm" variant="outline">
            {getToolTargetLabel(tool.installTarget ?? "project")}
          </Badge>
           {tool.inherited && (
            <Badge size="sm" variant="info">
               Inherited
            </Badge>
           )}
           {tool.overridesGlobal && (
             <Badge size="sm" variant="warning">
               Overrides Global
             </Badge>
           )}
          {tool.runtime && (
            <Badge size="sm" variant="info">
              JS/TS
            </Badge>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
          {tool.description}
        </p>
      </div>
      <Menu>
        <MenuTrigger className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MoreHorizontalIcon aria-hidden="true" className="size-4" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-36">
           <MenuItem onClick={() => onOpenToolDetail(tool)}>檢視</MenuItem>
          {tool.source === "custom" && (
            <MenuItem onClick={() => onOpenEditToolMode(tool)}>編輯</MenuItem>
          )}
           <MenuItem>自訂</MenuItem>
           {tool.source === "custom" && <MenuSeparator />}
           {tool.source === "custom" && (
             <MenuItem onClick={() => onDeleteTool(tool)} variant="destructive">
               刪除
             </MenuItem>
           )}
        </MenuPopup>
      </Menu>
    </div>
  );
}

export function ToolDetailPanel({
  onOpenEditToolMode,
  tool,
}: {
  onOpenEditToolMode: (tool: ToolDefinition) => void;
  tool: ToolDefinition;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="rounded-lg bg-muted/55 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-base">{tool.name}</h3>
          <Badge size="sm" variant="outline">
            {tool.category}
          </Badge>
          <Badge
            size="sm"
            variant={tool.source === "custom" ? "success" : "secondary"}
          >
            {getToolSourceLabel(tool.source)}
          </Badge>
          {tool.runtime && (
            <Badge size="sm" variant="info">
              JS/TS
            </Badge>
          )}
        </div>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          {tool.description}
        </p>
      </div>

      <section className="grid gap-2" aria-labelledby="tool-metadata-title">
        <h4 className="font-semibold text-sm" id="tool-metadata-title">
          工具內容
        </h4>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <ToolMetadataItem label="工具 ID" value={tool.id} />
          <ToolMetadataItem label="名稱" value={tool.name} />
          <ToolMetadataItem label="分類" value={tool.category} />
          <ToolMetadataItem label="來源" value={getToolSourceLabel(tool.source)} />
          {tool.source === "custom" && (
            <ToolMetadataItem
             label="Install target"
              value={getToolTargetLabel(tool.installTarget)}
            />
          )}
          {tool.runtime && (
            <ToolMetadataItem
              label="執行環境"
              value="JS/TS"
            />
          )}
            {tool.entry && <ToolMetadataItem label="進入點" value={tool.entry} />}
            {tool.registryPath && (
            <ToolMetadataItem label="Registry 路徑" value={tool.registryPath} />
          )}
        </div>
      </section>

      {tool.testInput && (
        <section className="grid gap-2" aria-labelledby="tool-test-input-title">
            <h4 className="font-semibold text-sm" id="tool-test-input-title">
              測試輸入
          </h4>
          <pre className="max-h-36 overflow-auto rounded-lg border bg-muted/45 p-3 font-mono text-muted-foreground text-xs leading-5">
            {tool.testInput}
          </pre>
        </section>
      )}

      {tool.code && (
        <section className="grid gap-2" aria-labelledby="tool-code-title">
            <h4 className="font-semibold text-sm" id="tool-code-title">
              程式碼預覽
          </h4>
          <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/45 p-3 font-mono text-muted-foreground text-xs leading-5">
            {tool.code}
          </pre>
        </section>
      )}

      <div className="flex justify-end">
        {tool.source === "custom" ? (
          <Button onClick={() => onOpenEditToolMode(tool)} size="sm">
            編輯工具
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
              內建工具不支援編輯，可直接複製其設定並建立自訂工具。
          </p>
        )}
      </div>
    </div>
  );
}

export function ToolMetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border bg-background px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-foreground">{value}</span>
    </div>
  );
}

export function ToolConfigPanel({
  onRunToolCallTest,
  onSubmitToolConfig,
  onToolFormChange,
  onToolTestResultChange,
  toolCallTestLoading = false,
  toolEditMode,
  toolForm,
  toolTestResult,
}: {
  onRunToolCallTest: () => Promise<void> | void;
  onSubmitToolConfig: () => void;
  onToolFormChange: Dispatch<SetStateAction<ToolForm>>;
  onToolTestResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  toolCallTestLoading?: boolean;
  toolEditMode: ToolEditMode;
  toolForm: ToolForm;
  toolTestResult: InstallResult | null;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-muted-foreground text-sm">
            工具名稱
            <Input
              aria-label="工具名稱"
              onChange={(event) => {
                const nextName = event.target.value;
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  name: nextName,
                  entry: isDefaultToolEntry(current)
                    ? getToolFormEntryPath(nextName, current.installTarget)
                    : current.entry,
                }));
              }}
              placeholder="cms_publish"
              value={toolForm.name}
            />
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            分類
            <Input
              aria-label="工具分類"
              onChange={(event) =>
                onToolFormChange((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="自訂"
              value={toolForm.category}
            />
          </label>
        </div>
        <label className="grid gap-2 text-muted-foreground text-sm">
          說明
          <Textarea
            aria-label="工具說明"
            onChange={(event) =>
              onToolFormChange((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="請描述這個工具的用途與行為。"
            rows={3}
            value={toolForm.description}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-muted-foreground text-sm">
            Install target
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => {
                const installTarget = event.target.value as ToolForm["installTarget"];
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  installTarget,
                  entry: isDefaultToolEntry(current)
                    ? getToolFormEntryPath(current.name, installTarget)
                    : current.entry,
                }));
              }}
              value={toolForm.installTarget}
            >
            <option value="project">Project</option>
            <option value="global">Global</option>
            </select>
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            執行環境
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => {
                const runtime = event.target.value as ToolDefinition["runtime"];
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  runtime,
                  entry: isDefaultToolEntry(current)
                    ? getToolFormEntryPath(current.name, current.installTarget)
                    : current.entry,
                }));
              }}
              value={toolForm.runtime}
            >
              <option value="js-ts">JS / TS</option>
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-muted-foreground text-sm">
          工具程式碼
            <Textarea
              aria-label="工具程式碼"
            className="font-mono"
            onChange={(event) => {
              onToolTestResultChange(null);
              onToolFormChange((current) => ({
                ...current,
                code: event.target.value,
              }));
            }}
              placeholder={
                "// JS/TS 工具實作"
              }
            rows={10}
            spellCheck={false}
            value={toolForm.code}
          />
        </label>
        <section
          className="grid gap-3 rounded-lg border bg-background p-3"
          aria-labelledby="tool-call-test-title"
        >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm text-foreground" id="tool-call-test-title">
                  工具呼叫測試
                </h4>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  透過測試呼叫後端 API，確認工具定義與參數是否可正常執行。
                </p>
            </div>
            <Button
              disabled={toolCallTestLoading}
              loading={toolCallTestLoading}
              onClick={() => void onRunToolCallTest()}
              size="sm"
              type="button"
              variant="outline"
            >
               {toolCallTestLoading ? "執行中..." : "執行工具呼叫測試"}
            </Button>
          </div>
          <label className="grid gap-2 text-muted-foreground text-sm">
            測試輸入 JSON
            <Textarea
              aria-label="工具測試輸入 JSON"
              className="font-mono"
              onChange={(event) => {
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  testInput: event.target.value,
                }));
              }}
              placeholder={'{"input":"hello"}'}
              rows={4}
              spellCheck={false}
              value={toolForm.testInput}
            />
          </label>
          {toolTestResult && (
            <div
              className={`whitespace-pre-line rounded-md border px-3 py-2 text-xs ${toolTestResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
            >
              {toolTestResult.message}
            </div>
          )}
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            請以 JS/TS 環境執行工具呼叫測試，以驗證後端回應。
          </p>
        <Button
          disabled={toolCallTestLoading || !toolForm.name.trim() || toolTestResult?.status !== "success"}
          onClick={onSubmitToolConfig}
        >
          {toolEditMode === "add" ? "新增工具" : "更新工具"}
        </Button>
      </div>
    </div>
  );
}

export function AgentDetailPanel({
  agentConfigMode,
  agents,
  guidanceSkill,
  guidanceSubagent,
  guidanceTool,
  isCustomToolName,
  onAgentConfigModeChange,
  onGuidanceSkillChange,
  onGuidanceSubagentChange,
  onGuidanceToolChange,
  onOpenEditAgentMode,
  selectedAgent,
}: {
  agentConfigMode: AgentConfigMode;
  agents: AgentDefinition[];
  guidanceSkill: string | null;
  guidanceSubagent: string | null;
  guidanceTool: string | null;
  isCustomToolName: (toolName: string) => boolean;
  onAgentConfigModeChange: (mode: AgentConfigMode) => void;
  onGuidanceSkillChange: Dispatch<SetStateAction<string | null>>;
  onGuidanceSubagentChange: Dispatch<SetStateAction<string | null>>;
  onGuidanceToolChange: Dispatch<SetStateAction<string | null>>;
  onOpenEditAgentMode: (agent: AgentDefinition) => void;
  selectedAgent: AgentDefinition;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "interface" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentConfigModeChange("interface")}
          type="button"
        >
          介面設定
        </button>
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentConfigModeChange("yaml")}
          type="button"
        >
          YAML
        </button>
      </div>

      <div className="rounded-lg bg-muted/55 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-base">
            {selectedAgent.name}
          </h3>
          <Badge
            size="sm"
            variant={selectedAgent.scope === "system" ? "info" : "success"}
          >
            {getAgentScopeLabel(selectedAgent.scope)}
          </Badge>
          <Badge size="sm" variant={getAgentModeVariant(selectedAgent.mode)}>
            {getAgentModeLabel(selectedAgent.mode)}
          </Badge>
           {selectedAgent.hidden && (
             <Badge size="sm" variant="outline">
               隱藏
             </Badge>
           )}
        </div>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          {selectedAgent.description}
        </p>
      </div>

      {agentConfigMode === "interface" ? (
        <>
          <section className="grid gap-2" aria-labelledby="agent-tools-title">
            <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-sm" id="agent-tools-title">
                工具
              </h4>
              <div className="flex items-center gap-1.5">
                <Badge size="sm" variant="warning">
                  棄用
                </Badge>
                <Badge size="sm" variant="secondary">
                  {selectedAgent.tools.length}
                </Badge>
              </div>
            </div>
            <div className="grid gap-1.5">
              {selectedAgent.tools.map((tool) => {
                const permissionKey = getToolPermissionKey(tool);
                return (
                  <div
                    className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                    key={tool}
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto] sm:items-center">
                      <span className="min-w-0 truncate font-mono">{tool}</span>
                      {isCustomToolName(tool) && (
                        <Button
                          onClick={() =>
                            onGuidanceToolChange(
                              guidanceTool === tool ? null : tool,
                            )
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {selectedAgent.toolGuidance?.[tool]?.trim()
                            ? "編輯指引"
                            : "新增指引"}
                        </Button>
                      )}
                      <select
                        aria-label={`${tool} 權限`}
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        disabled
                        value={
                          typeof selectedAgent.permission[permissionKey] ===
                          "string"
                            ? selectedAgent.permission[permissionKey]
                            : "ask"
                        }
                      >
                        <option value="allow">allow</option>
                        <option value="ask">ask</option>
                        <option value="deny">deny</option>
                      </select>
                      <span className="size-6" aria-hidden="true" />
                    </div>
                    {guidanceTool === tool && isCustomToolName(tool) && (
                        <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                        指引
                        <Textarea
                          aria-label={`${tool} 指引`}
                          placeholder="可選：輸入這個工具的自訂指引。"
                          readOnly
                          rows={3}
                          value={selectedAgent.toolGuidance?.[tool] ?? ""}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
               工具清單可直接關聯到智能體。自訂工具可補充專屬指引。</p>
          </section>

          <section
            className="grid gap-2"
            aria-labelledby="agent-subagents-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm" id="agent-subagents-title">
                可呼叫子智能體
              </h4>
              <Badge size="sm" variant="secondary">
                {selectedAgent.subagents.length}
              </Badge>
            </div>
            <div className="grid gap-1.5">
              {selectedAgent.subagents.map((subagentId) => {
                const subagent = agents.find((agent) => agent.id === subagentId);
                return (
                  <div
                    className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                    key={subagentId}
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                      <span className="min-w-0 truncate font-mono">
                        {subagent?.name ?? subagentId}
                      </span>
                        <Badge size="sm" variant="outline">
                          {getAgentModeLabel(subagent?.mode ?? "subagent")}
                        </Badge>
                      <Button
                        onClick={() =>
                          onGuidanceSubagentChange(
                            guidanceSubagent === subagentId ? null : subagentId,
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                        >
                          {selectedAgent.subagentGuidance?.[subagentId]?.trim()
                            ? "編輯指引"
                            : "新增指引"}
                      </Button>
                      <span className="size-6" aria-hidden="true" />
                    </div>
                    {guidanceSubagent === subagentId && (
                      <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                        指引
                        <Textarea
                          aria-label={`${subagent?.name ?? subagentId} 指引`}
                           placeholder="可選：輸入這個子智能體的自訂指引。"
                          readOnly
                          rows={3}
                          value={
                            selectedAgent.subagentGuidance?.[subagentId] ?? ""
                          }
                        />
                      </label>
                    )}
                  </div>
                );
              })}
              {selectedAgent.subagents.length === 0 && (
                <p className="rounded-md border border-dashed bg-background px-3 py-3 text-muted-foreground text-xs">
                    尚未有可呼叫子智能體
                </p>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                可將子智能體加入可呼叫清單，供智能體在對話中轉接任務。</p>
              <p className="text-muted-foreground text-xs">
                任務權限目前支援 Object 寫法，可針對不同可呼叫子智能體設定 allow / ask / deny。
              </p>
          </section>

          <section className="grid gap-2" aria-labelledby="agent-skills-title">
            <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-sm" id="agent-skills-title">
                技能
              </h4>
              <Badge size="sm" variant="secondary">
                {selectedAgent.skills.length}
              </Badge>
            </div>
            <div className="grid gap-1.5">
              {selectedAgent.skills.map((skill) => (
                <div
                  className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                  key={skill}
                >
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                    <span className="min-w-0 truncate font-mono">{skill}</span>
                    <Button
                      onClick={() =>
                        onGuidanceSkillChange(
                          guidanceSkill === skill ? null : skill,
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {selectedAgent.skillGuidance?.[skill]?.trim()
                        ? "編輯指引"
                        : "新增指引"}
                    </Button>
                    <span className="size-6" aria-hidden="true" />
                  </div>
                  {guidanceSkill === skill && (
                    <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                      指引
                      <Textarea
                        aria-label={`${skill} 指引`}
                         placeholder={`可選：輸入這項技能的自訂指引。`}
                       readOnly
                       rows={3}
                       value={selectedAgent.skillGuidance?.[skill] ?? ""}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
               智能體可使用以下技能清單，並可為每項技能補充自訂指引。</p>
          </section>

          <section
            className="grid gap-2"
            aria-labelledby="agent-permissions-title"
          >
            <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-sm" id="agent-permissions-title">
                權限
              </h4>
              <Badge size="sm" variant="secondary">
                {Object.keys(selectedAgent.permission).length}
              </Badge>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries({
                ...selectedAgent.permission,
                task: taskPermissionFor(selectedAgent.subagents),
              }).map(([key, value]) => (
                <div
                  className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5 text-xs"
                  key={key}
                >
                  <span className="font-mono">{key}</span>
                  <Badge size="sm" variant={getPermissionVariant(value)}>
                    {getPermissionLabel(value)}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="grid gap-2" aria-labelledby="agent-yaml-preview-title">
          <h4 className="font-semibold text-sm" id="agent-yaml-preview-title">
            Markdown 內容
          </h4>
          <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/45 p-3 font-mono text-xs leading-5 text-muted-foreground">
            {agentToYaml(selectedAgent)}
          </pre>
        </section>
      )}

      <div className="flex justify-end">
        {selectedAgent.scope === "custom" ? (
          <Button onClick={() => onOpenEditAgentMode(selectedAgent)} size="sm">
            編輯智能體
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
            系統智能體不會提供直接編輯，可複製其 YAML 並建立自訂智能體後再修改。
          </p>
        )}
      </div>
    </div>
  );
}

export function AgentConfigPanel({
  agentConfigMode,
  agentEditMode,
  agentForm,
  agentYaml,
  agents,
  availableModels,
  availableSkillNames,
  editingAgentId,
  guidanceSkill,
  guidanceSubagent,
  guidanceTool,
  isCustomToolName,
  onAddFormSubagent,
  onAgentConfigModeChange,
  onAgentFormChange,
  onAgentYamlChange,
  onGetCallableSubagentOptions,
  onGuidanceSkillChange,
  onGuidanceSubagentChange,
  onGuidanceToolChange,
  onRemoveFormSubagent,
  onSkillToAddChange,
  onSubagentToAddChange,
  onSubmitAgentConfig,
  onToolToAddChange,
  onUpdateSkillGuidance,
  onUpdateSubagentGuidance,
  onUpdateToolGuidance,
  skillToAdd,
  subagentToAdd,
  toolDefinitions,
  toolToAdd,
}: {
  agentConfigMode: AgentConfigMode;
  agentEditMode: AgentEditMode;
  agentForm: AgentForm;
  agentYaml: string;
  agents: AgentDefinition[];
  availableModels: string[];
  availableSkillNames: string[];
  editingAgentId: string | null;
  guidanceSkill: string | null;
  guidanceSubagent: string | null;
  guidanceTool: string | null;
  isCustomToolName: (toolName: string) => boolean;
  onAddFormSubagent: () => void;
  onAgentConfigModeChange: (mode: AgentConfigMode) => void;
  onAgentFormChange: Dispatch<SetStateAction<AgentForm>>;
  onAgentYamlChange: (value: string) => void;
  onGetCallableSubagentOptions: (
    agentId: string | null,
    assignedSubagents: string[],
  ) => AgentDefinition[];
  onGuidanceSkillChange: Dispatch<SetStateAction<string | null>>;
  onGuidanceSubagentChange: Dispatch<SetStateAction<string | null>>;
  onGuidanceToolChange: Dispatch<SetStateAction<string | null>>;
  onRemoveFormSubagent: (subagentId: string) => void;
  onSkillToAddChange: (value: string) => void;
  onSubagentToAddChange: (value: string) => void;
  onSubmitAgentConfig: () => void;
  onToolToAddChange: (value: string) => void;
  onUpdateSkillGuidance: (skill: string, value: string) => void;
  onUpdateSubagentGuidance: (subagentId: string, value: string) => void;
  onUpdateToolGuidance: (tool: string, value: string) => void;
  skillToAdd: string;
  subagentToAdd: string;
  toolDefinitions: ToolDefinition[];
  toolToAdd: string;
}) {
  const callableSubagentOptions = onGetCallableSubagentOptions(
    editingAgentId,
    agentForm.subagents,
  );

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "interface" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentConfigModeChange("interface")}
          type="button"
        >
          介面設定
        </button>
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentConfigModeChange("yaml")}
          type="button"
        >
          YAML
        </button>
      </div>
      {agentConfigMode === "interface" ? (
        <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-muted-foreground text-sm">
               智能體名稱
              <Input
                 aria-label="智能體名稱"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="docs-implement"
                value={agentForm.name}
              />
            </label>
            <label className="grid gap-2 text-muted-foreground text-sm">
              模型
              <select
                aria-label="模型"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
                value={agentForm.model}
              >
                {!availableModels.includes(agentForm.model) && (
                  <option value={agentForm.model}>{agentForm.model}</option>
                )}
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2 text-muted-foreground text-sm">
              模式
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) =>
                  onAgentFormChange((current) => {
                    const mode = event.target.value as AgentDefinition["mode"];
                    return {
                      ...current,
                      mode,
                      hidden: mode === "subagent" ? current.hidden : false,
                    };
                  })
                }
                value={agentForm.mode}
              >
                <option value="primary">主要智能體</option>
                <option value="subagent">子智能體</option>
                <option value="all">全部</option>
              </select>
            </label>
            <label className="grid gap-2 text-muted-foreground text-sm">
              溫度
              <Input
                aria-label="溫度"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    temperature: event.target.value,
                  }))
                }
                placeholder="0.3"
                value={agentForm.temperature}
              />
            </label>
            <label className="grid gap-2 text-muted-foreground text-sm">
              Top P
              <Input
                aria-label="Top P"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    top_p: event.target.value,
                  }))
                }
                placeholder="1"
                value={agentForm.top_p}
              />
            </label>
            <label className="grid min-w-0 gap-2 text-muted-foreground text-sm">
              變體
              <select
                aria-label="變體"
                className="h-8 min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    variant: event.target.value,
                  }))
                }
                value={agentForm.variant}
              >
                {modelVariants.map((variant) => (
                  <option key={variant || "default"} value={variant}>
                    {variant || "預設"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-muted-foreground text-sm">
              步數
              <Input
                aria-label="步數"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    steps: event.target.value,
                  }))
                }
                 placeholder="例如 8"
                value={agentForm.steps}
              />
            </label>
          </div>
          <label className="grid gap-2 text-muted-foreground text-sm">
              描述
            <Textarea
               aria-label="智能體描述"
              onChange={(event) =>
                onAgentFormChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="請用一到兩句描述此智能體的核心職責。"
              rows={3}
              value={agentForm.description}
            />
          </label>
          <section className="grid gap-3 rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-sm text-foreground">進階</h4>
              <Badge size="sm" variant="outline">
                OpenCode
              </Badge>
            </div>
             <div className="grid gap-3 sm:grid-cols-2">
               <label className="grid gap-2 text-muted-foreground text-sm">
                 Install target
                 <select
                   className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                   onChange={(event) =>
                     onAgentFormChange((current) => ({
                       ...current,
                       installTarget: event.target.value as AgentForm["installTarget"],
                     }))
                   }
                   value={agentForm.installTarget}
                 >
                   <option value="project">Project</option>
                   <option value="global">Global</option>
                 </select>
               </label>
               <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground text-sm">
                <input
                  checked={agentForm.disable}
                  onChange={(event) =>
                    onAgentFormChange((current) => ({
                      ...current,
                      disable: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                 停用智能體
              </label>
              {agentForm.mode === "subagent" && (
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground text-sm">
                  <input
                    checked={agentForm.hidden}
                    onChange={(event) =>
                      onAgentFormChange((current) => ({
                        ...current,
                        hidden: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                   在 @ 功能表中隱藏
                </label>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-muted-foreground text-sm">
                顏色
                <select
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) =>
                    onAgentFormChange((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                  value={agentForm.color}
                >
                  {agentColors.map((color) => (
                    <option key={color || "default"} value={color}>
                       {color || "預設"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-muted-foreground text-sm">
                提示來源
                <select
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) =>
                    onAgentFormChange((current) => ({
                      ...current,
                      promptSource: event.target.value as AgentForm["promptSource"],
                    }))
                  }
                  value={agentForm.promptSource}
                >
                  <option value="inline">內嵌 markdown 內容</option>
                  <option value="file">參考檔案</option>
                </select>
              </label>
            </div>
            {agentForm.promptSource === "file" && (
              <label className="grid gap-2 text-muted-foreground text-sm">
                提示檔案
                <Input
                  aria-label="提示檔案"
                  onChange={(event) =>
                    onAgentFormChange((current) => ({
                      ...current,
                      promptFile: event.target.value,
                    }))
                  }
                  placeholder="./prompts/review.txt"
                  value={agentForm.promptFile}
                />
              </label>
            )}
            <label className="grid gap-2 text-muted-foreground text-sm">
              權限規則 JSON
              <Textarea
                aria-label="權限規則 JSON"
                className="font-mono"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    permissionRulesJson: event.target.value,
                  }))
                }
                placeholder={
                  '{"bash":{"*":"ask","git *":"allow"},"external_directory":{"~/projects/**":"allow"}}'
                }
                rows={3}
                spellCheck={false}
                value={agentForm.permissionRulesJson}
              />
            </label>
              <label className="grid gap-2 text-muted-foreground text-sm">
              供應商特定選項 JSON
              <Textarea
                aria-label="供應商特定選項 JSON"
                className="font-mono"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    providerOptionsJson: event.target.value,
                  }))
                }
                placeholder={'{"reasoningEffort":"high","textVerbosity":"low"}'}
                rows={3}
                spellCheck={false}
                value={agentForm.providerOptionsJson}
              />
            </label>
          </section>
          {agentForm.promptSource === "inline" && (
            <label className="grid gap-2 text-muted-foreground text-sm">
               系統提示詞
              <Textarea
               aria-label="智能體系統提示詞"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    systemPrompt: event.target.value,
                  }))
                }
                placeholder="輸入此智能體的自訂系統提示詞。"
                rows={5}
                value={agentForm.systemPrompt}
              />
            </label>
          )}

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">工具</h4>
              <div className="flex items-center gap-1.5">
                <Badge size="sm" variant="warning">
                  棄用
                </Badge>
                <Badge size="sm" variant="secondary">
                  {agentForm.tools.length}
                </Badge>
              </div>
            </div>
            <div className="grid gap-1.5">
              {agentForm.tools.map((tool) => {
                const permissionKey = getToolPermissionKey(tool);
                return (
                  <div
                    className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                    key={tool}
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_7rem_auto] sm:items-center">
                      <span className="min-w-0 truncate font-mono">{tool}</span>
                      {isCustomToolName(tool) && (
                        <Button
                          onClick={() =>
                            onGuidanceToolChange(
                              guidanceTool === tool ? null : tool,
                            )
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {agentForm.toolGuidance[tool]?.trim()
                             ? "編輯指引"
                             : "新增指引"}
                        </Button>
                      )}
                      <select
                        aria-label={`${tool} 權限`}
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        onChange={(event) =>
                          onAgentFormChange((current) => ({
                            ...current,
                            permission: {
                              ...current.permission,
                              [permissionKey]: event.target
                                .value as PermissionAction,
                            },
                          }))
                        }
                        value={
                          typeof agentForm.permission[permissionKey] === "string"
                            ? agentForm.permission[permissionKey]
                            : "ask"
                        }
                      >
                        <option value="allow">allow</option>
                        <option value="ask">ask</option>
                        <option value="deny">deny</option>
                      </select>
                      <button
                        aria-label={`移除 tool ${tool}`}
                        className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => {
                          if (guidanceTool === tool) onGuidanceToolChange(null);
                          onAgentFormChange((current) => {
                            const nextPermission = { ...current.permission };
                            const nextToolGuidance = { ...current.toolGuidance };
                            delete nextPermission[permissionKey];
                            delete nextToolGuidance[tool];
                            return {
                              ...current,
                              tools: current.tools.filter((item) => item !== tool),
                              toolGuidance: nextToolGuidance,
                              permission: nextPermission,
                            };
                          });
                        }}
                        type="button"
                      >
                        <XIcon aria-hidden="true" className="size-3" />
                      </button>
                    </div>
                    {guidanceTool === tool && isCustomToolName(tool) && (
                      <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                        指引
                        <Textarea
                          aria-label={`${tool} 指引`}
                          onChange={(event) =>
                            onUpdateToolGuidance(tool, event.target.value)
                          }
                           placeholder={`可選：輸入這個工具的自訂指引。`}
                           rows={3}
                            value={agentForm.toolGuidance[tool] ?? ""}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                disabled={toolDefinitions.length === 0}
                onChange={(event) => onToolToAddChange(event.target.value)}
                value={
                  toolDefinitions.some((tool) => tool.name === toolToAdd)
                    ? toolToAdd
                    : ""
                }
              >
                {toolDefinitions.length === 0 && (
                  <option value="">請先新增可用工具</option>
                )}
                {toolDefinitions.map((tool) => (
                  <option key={tool.id} value={tool.name}>
                    {tool.name} / {tool.category}
                  </option>
                ))}
              </select>
              <Button
                disabled={!toolToAdd || toolDefinitions.length === 0}
                onClick={() =>
                  onAgentFormChange((current) => {
                    const permissionKey = getToolPermissionKey(toolToAdd);
                    return current.tools.includes(toolToAdd)
                      ? current
                      : {
                          ...current,
                          tools: [...current.tools, toolToAdd],
                          toolGuidance: isCustomToolName(toolToAdd)
                            ? {
                                ...current.toolGuidance,
                                [toolToAdd]: current.toolGuidance[toolToAdd] ?? "",
                              }
                            : current.toolGuidance,
                          permission: {
                            ...current.permission,
                            [permissionKey]:
                              current.permission[permissionKey] ?? "ask",
                          },
                        };
                  })
                }
                size="sm"
                variant="outline"
              >
                <PlusIcon aria-hidden="true" />
           新增工具
              </Button>
            </div>
          </section>

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">
                 可呼叫子智能體
              </h4>
              <Badge size="sm" variant="secondary">
                {agentForm.subagents.length}
              </Badge>
            </div>
            <div className="grid gap-1.5">
              {agentForm.subagents.map((subagentId) => {
                const subagent = agents.find((agent) => agent.id === subagentId);
                return (
                  <div
                    className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                    key={subagentId}
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                      <span className="min-w-0 truncate font-mono">
                        {subagent?.name ?? subagentId}
                      </span>
                        <Badge size="sm" variant="outline">
                          {getAgentModeLabel(subagent?.mode ?? "subagent")}
                        </Badge>
                      <Button
                        onClick={() =>
                          onGuidanceSubagentChange(
                            guidanceSubagent === subagentId ? null : subagentId,
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {agentForm.subagentGuidance[subagentId]?.trim()
                           ? "編輯指引"
                           : "新增指引"}
                      </Button>
                      <button
                        aria-label={`移除子智能體 ${subagent?.name ?? subagentId}`}
                        className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => onRemoveFormSubagent(subagentId)}
                        type="button"
                      >
                        <XIcon aria-hidden="true" className="size-3" />
                      </button>
                    </div>
                    {guidanceSubagent === subagentId && (
                      <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                        指引
                        <Textarea
                          aria-label={`${subagent?.name ?? subagentId} 指引`}
                          onChange={(event) =>
                            onUpdateSubagentGuidance(
                              subagentId,
                              event.target.value,
                            )
                          }
                           placeholder={`可選：輸入這個子智能體的自訂指引。`}
                          rows={3}
                          value={agentForm.subagentGuidance[subagentId] ?? ""}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
                {agentForm.subagents.length === 0 && (
                  <p className="rounded-md border border-dashed bg-background px-3 py-3 text-muted-foreground text-xs">
                    尚未有可呼叫子智能體
                  </p>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => onSubagentToAddChange(event.target.value)}
                value={subagentToAdd}
              >
                {callableSubagentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} / {agent.mode}
                  </option>
                ))}
              </select>
              <Button
                disabled={callableSubagentOptions.length === 0}
                onClick={onAddFormSubagent}
                size="sm"
                variant="outline"
              >
                <PlusIcon aria-hidden="true" />
           新增子智能體
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
                任務權限可用 Object 語法，限制特定可呼叫子智能體的任務權限。
            </p>
          </section>

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">技能</h4>
              <Badge size="sm" variant="secondary">
                {agentForm.skills.length}
              </Badge>
            </div>
            <div className="grid gap-1.5">
              {agentForm.skills.map((skill) => (
                <div
                  className="grid gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                  key={skill}
                >
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                    <span className="min-w-0 truncate font-mono">{skill}</span>
                    <Button
                      onClick={() =>
                        onGuidanceSkillChange(
                          guidanceSkill === skill ? null : skill,
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                       {agentForm.skillGuidance[skill]?.trim()
                            ? "編輯指引"
                            : "新增指引"}
                    </Button>
                    <button
                       aria-label={`移除技能 ${skill}`}
                      className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => {
                        if (guidanceSkill === skill) onGuidanceSkillChange(null);
                        onAgentFormChange((current) => {
                          const nextSkillGuidance = { ...current.skillGuidance };
                          delete nextSkillGuidance[skill];
                          return {
                            ...current,
                            skills: current.skills.filter((item) => item !== skill),
                            skillGuidance: nextSkillGuidance,
                          };
                        });
                      }}
                      type="button"
                    >
                      <XIcon aria-hidden="true" className="size-3" />
                    </button>
                  </div>
                  {guidanceSkill === skill && (
                    <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                       指引
                        <Textarea
                         aria-label={`${skill} 指引`}
                         onChange={(event) =>
                           onUpdateSkillGuidance(skill, event.target.value)
                         }
                          placeholder={`可選：輸入這項技能的自訂指引。`}
                        rows={3}
                        value={agentForm.skillGuidance[skill] ?? ""}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => onSkillToAddChange(event.target.value)}
                value={skillToAdd}
              >
                {availableSkillNames.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              <Button
                onClick={() =>
                  onAgentFormChange((current) =>
                    current.skills.includes(skillToAdd)
                      ? current
                      : {
                          ...current,
                          skills: [...current.skills, skillToAdd],
                          skillGuidance: {
                            ...current.skillGuidance,
                            [skillToAdd]: current.skillGuidance[skillToAdd] ?? "",
                          },
                        },
                  )
                }
                size="sm"
                variant="outline"
              >
                <PlusIcon aria-hidden="true" />
          新增 Skill
              </Button>
            </div>
          </section>
          <section className="grid gap-2">
            <h4 className="font-semibold text-sm text-foreground">
              權限
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(agentForm.permission)
                .filter(([key]) => key !== "task")
                .map(([key, value]) => (
                  <label
                    className="grid gap-1 text-muted-foreground text-xs"
                    key={key}
                  >
                    {key}
                    <select
                      className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) =>
                        onAgentFormChange((current) => ({
                          ...current,
                          permission: {
                            ...current.permission,
                            [key]: event.target.value as PermissionAction,
                          },
                        }))
                      }
                      value={typeof value === "string" ? value : "ask"}
                    >
                      <option value="allow">allow</option>
                      <option value="ask">ask</option>
                      <option value="deny">deny</option>
                    </select>
                  </label>
                ))}
            </div>
            <p className="text-muted-foreground text-xs">
               任務權限支援 Object 語法，可設定可呼叫子智能體的任務權限（allow / ask / deny）。
            </p>
          </section>
        </div>
      ) : (
        <label className="grid gap-2 text-muted-foreground text-sm">
           OpenCode 智能體 Markdown（.md）
          <Textarea
            aria-label="OpenCode 智能體 Markdown"
            className="font-mono"
            onChange={(event) => onAgentYamlChange(event.target.value)}
            rows={16}
            spellCheck={false}
            value={agentYaml}
          />
        </label>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            請維持 OpenCode 智能體 Markdown 格式，必要時可貼上自訂智能體檔案內容。</p>
        <Button
          disabled={
            agentConfigMode === "interface"
              ? !agentForm.name.trim()
              : !agentYaml.trim()
          }
          onClick={onSubmitAgentConfig}
        >
          {agentEditMode === "add" ? "新增智能體" : "更新智能體"}
        </Button>
      </div>
    </div>
  );
}
