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
import { ModalShell } from "@/shared/components/layout/ModalShell";
import { agentColors, availableModels, modelVariants } from "./config";
import type {
  AgentConfigMode,
  AgentDefinition,
  AgentDialogView,
  AgentEditMode,
  AgentForm,
  AgentToolTab,
  InstallResult,
  PermissionAction,
  ToolDefinition,
  ToolEditMode,
  ToolForm,
} from "./types";
import {
  agentToYaml,
  getPermissionLabel,
  getPermissionVariant,
  getToolPermissionKey,
  taskPermissionFor,
} from "./utils";

type AgentsToolsModalProps = {
  agentConfigMode: AgentConfigMode;
  agentEditMode: AgentEditMode;
  agentForm: AgentForm;
  agentToolTab: AgentToolTab;
  agentYaml: string;
  agents: AgentDefinition[];
  agentsToolsHasChanges: boolean;
  availableSkillNames: string[];
  batchUpdateNotice: string;
  editingAgentId: string | null;
  guidanceSkill: string | null;
  guidanceSubagent: string | null;
  guidanceTool: string | null;
  isCustomToolName: (toolName: string) => boolean;
  onAddFormSubagent: () => void;
  onAgentConfigModeChange: (mode: AgentConfigMode) => void;
  onAgentDialogViewChange: Dispatch<SetStateAction<AgentDialogView>>;
  onAgentFormChange: Dispatch<SetStateAction<AgentForm>>;
  onAgentToolTabChange: Dispatch<SetStateAction<AgentToolTab>>;
  onAgentYamlChange: (value: string) => void;
  onConfirmBatchUpdate: () => void;
  onDeleteAgent: (agentId: string) => void;
  onDeleteTool: (tool: ToolDefinition) => void;
  onGetCallableSubagentOptions: (
    agentId: string | null,
    assignedSubagents: string[],
  ) => AgentDefinition[];
  onGuidanceSkillChange: Dispatch<SetStateAction<string | null>>;
  onGuidanceSubagentChange: Dispatch<SetStateAction<string | null>>;
  onGuidanceToolChange: Dispatch<SetStateAction<string | null>>;
  onOpenAddAgentMode: () => void;
  onOpenAddToolMode: () => void;
  onOpenChange: (open: boolean) => void;
  onOpenAgentDetail: (agent: AgentDefinition) => void;
  onOpenEditAgentMode: (agent: AgentDefinition) => void;
  onOpenEditToolMode: (tool: ToolDefinition) => void;
  onRemoveFormSubagent: (subagentId: string) => void;
  onRunToolCallTest: () => void;
  onSkillToAddChange: (value: string) => void;
  onSubagentToAddChange: (value: string) => void;
  onSubmitAgentConfig: () => void;
  onSubmitToolConfig: () => void;
  onToolFormChange: Dispatch<SetStateAction<ToolForm>>;
  onToolTestResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  onToolToAddChange: (value: string) => void;
  onUpdateSkillGuidance: (skill: string, value: string) => void;
  onUpdateSubagentGuidance: (subagentId: string, value: string) => void;
  onUpdateToolGuidance: (tool: string, value: string) => void;
  open: boolean;
  selectedAgent: AgentDefinition | null;
  skillToAdd: string;
  subagentToAdd: string;
  toolDefinitions: ToolDefinition[];
  toolEditMode: ToolEditMode;
  toolForm: ToolForm;
  toolTestResult: InstallResult | null;
  toolToAdd: string;
  view: AgentDialogView;
};

export function AgentsToolsModal({
  agentConfigMode,
  agentEditMode,
  agentForm,
  agentToolTab,
  agentYaml,
  agents,
  agentsToolsHasChanges,
  availableSkillNames,
  batchUpdateNotice,
  editingAgentId,
  guidanceSkill,
  guidanceSubagent,
  guidanceTool,
  isCustomToolName,
  onAddFormSubagent,
  onAgentConfigModeChange,
  onAgentDialogViewChange,
  onAgentFormChange,
  onAgentToolTabChange,
  onAgentYamlChange,
  onConfirmBatchUpdate,
  onDeleteAgent,
  onDeleteTool,
  onGetCallableSubagentOptions,
  onGuidanceSkillChange,
  onGuidanceSubagentChange,
  onGuidanceToolChange,
  onOpenAddAgentMode,
  onOpenAddToolMode,
  onOpenChange,
  onOpenAgentDetail,
  onOpenEditAgentMode,
  onOpenEditToolMode,
  onRemoveFormSubagent,
  onRunToolCallTest,
  onSkillToAddChange,
  onSubagentToAddChange,
  onSubmitAgentConfig,
  onSubmitToolConfig,
  onToolFormChange,
  onToolTestResultChange,
  onToolToAddChange,
  onUpdateSkillGuidance,
  onUpdateSubagentGuidance,
  onUpdateToolGuidance,
  open,
  selectedAgent,
  skillToAdd,
  subagentToAdd,
  toolDefinitions,
  toolEditMode,
  toolForm,
  toolTestResult,
  toolToAdd,
  view,
}: AgentsToolsModalProps) {
  return (
    <ModalShell
      ariaLabel="Agents"
      backButton={
        view !== "list"
          ? {
              ariaLabel: "返回智能體/工具列表",
              onClick: () => onAgentDialogViewChange("list"),
            }
          : undefined
      }
      bodyClassName="p-0"
      closeAriaLabel="關閉 Agents"
      description={
        view === "list"
          ? `Total ${agentToolTab === "agents" ? agents.length : toolDefinitions.length}`
          : view === "tool-config"
            ? "Python / JS / TS custom tool"
            : "介面配置 / 文字配置 YAML"
      }
      footer={
        <>
          <p className="text-muted-foreground text-xs">
            修改後需要更新並重新載入 OpenCode。
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={() => onOpenChange(false)} size="lg" variant="outline">
              關閉
            </Button>
            <Button
              disabled={!agentsToolsHasChanges}
              onClick={onConfirmBatchUpdate}
              size="lg"
            >
              更新
            </Button>
          </div>
          {batchUpdateNotice && (
            <p className="basis-full text-emerald-700 text-xs">
              {batchUpdateNotice}
            </p>
          )}
        </>
      }
      headerActions={
        <button
          aria-label={agentToolTab === "tools" ? "新增 Tool" : "新增 Agent"}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={agentToolTab === "tools" ? onOpenAddToolMode : onOpenAddAgentMode}
          type="button"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={
        view === "list"
          ? "智能體/工具"
          : view === "detail"
            ? "Agent 設定"
            : view === "tool-config"
              ? toolEditMode === "add"
                ? "新增 Tool"
                : "編輯 Tool"
              : agentEditMode === "add"
                ? "新增 Agent"
                : "編輯 Agent"
      }
    >
      {view === "list" && (
        <AgentsToolsList
          agents={agents}
          agentToolTab={agentToolTab}
          onAgentToolTabChange={onAgentToolTabChange}
          onDeleteAgent={onDeleteAgent}
          onDeleteTool={onDeleteTool}
          onOpenAgentDetail={onOpenAgentDetail}
          onOpenEditAgentMode={onOpenEditAgentMode}
          onOpenEditToolMode={onOpenEditToolMode}
          toolDefinitions={toolDefinitions}
        />
      )}

      {view === "tool-config" && (
        <ToolConfigPanel
          onRunToolCallTest={onRunToolCallTest}
          onSubmitToolConfig={onSubmitToolConfig}
          onToolFormChange={onToolFormChange}
          onToolTestResultChange={onToolTestResultChange}
          toolEditMode={toolEditMode}
          toolForm={toolForm}
          toolTestResult={toolTestResult}
        />
      )}

      {view === "detail" && selectedAgent && (
        <AgentDetailPanel
          agentConfigMode={agentConfigMode}
          agents={agents}
          guidanceSkill={guidanceSkill}
          guidanceSubagent={guidanceSubagent}
          guidanceTool={guidanceTool}
          isCustomToolName={isCustomToolName}
          onAgentConfigModeChange={onAgentConfigModeChange}
          onGuidanceSkillChange={onGuidanceSkillChange}
          onGuidanceSubagentChange={onGuidanceSubagentChange}
          onGuidanceToolChange={onGuidanceToolChange}
          onOpenEditAgentMode={onOpenEditAgentMode}
          selectedAgent={selectedAgent}
        />
      )}

      {view === "config" && (
        <AgentConfigPanel
          agentConfigMode={agentConfigMode}
          agentEditMode={agentEditMode}
          agentForm={agentForm}
          agentYaml={agentYaml}
          agents={agents}
          availableSkillNames={availableSkillNames}
          editingAgentId={editingAgentId}
          guidanceSkill={guidanceSkill}
          guidanceSubagent={guidanceSubagent}
          guidanceTool={guidanceTool}
          isCustomToolName={isCustomToolName}
          onAddFormSubagent={onAddFormSubagent}
          onAgentConfigModeChange={onAgentConfigModeChange}
          onAgentFormChange={onAgentFormChange}
          onAgentYamlChange={onAgentYamlChange}
          onGetCallableSubagentOptions={onGetCallableSubagentOptions}
          onGuidanceSkillChange={onGuidanceSkillChange}
          onGuidanceSubagentChange={onGuidanceSubagentChange}
          onGuidanceToolChange={onGuidanceToolChange}
          onRemoveFormSubagent={onRemoveFormSubagent}
          onSkillToAddChange={onSkillToAddChange}
          onSubagentToAddChange={onSubagentToAddChange}
          onSubmitAgentConfig={onSubmitAgentConfig}
          onToolToAddChange={onToolToAddChange}
          onUpdateSkillGuidance={onUpdateSkillGuidance}
          onUpdateSubagentGuidance={onUpdateSubagentGuidance}
          onUpdateToolGuidance={onUpdateToolGuidance}
          skillToAdd={skillToAdd}
          subagentToAdd={subagentToAdd}
          toolDefinitions={toolDefinitions}
          toolToAdd={toolToAdd}
        />
      )}
    </ModalShell>
  );
}

function AgentsToolsList({
  agents,
  agentToolTab,
  onAgentToolTabChange,
  onDeleteAgent,
  onDeleteTool,
  onOpenAgentDetail,
  onOpenEditAgentMode,
  onOpenEditToolMode,
  toolDefinitions,
}: {
  agents: AgentDefinition[];
  agentToolTab: AgentToolTab;
  onAgentToolTabChange: Dispatch<SetStateAction<AgentToolTab>>;
  onDeleteAgent: (agentId: string) => void;
  onDeleteTool: (tool: ToolDefinition) => void;
  onOpenAgentDetail: (agent: AgentDefinition) => void;
  onOpenEditAgentMode: (agent: AgentDefinition) => void;
  onOpenEditToolMode: (tool: ToolDefinition) => void;
  toolDefinitions: ToolDefinition[];
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 pb-6">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
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
      </div>

      {agentToolTab === "agents" && (
        <>
          <section aria-labelledby="built-in-agents-title">
            <h3
              className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
              id="built-in-agents-title"
            >
              Built-in Agents
            </h3>
            <ul className="grid gap-1">
              {agents
                .filter((agent) => agent.scope === "system")
                .map((agent) => (
                  <li key={agent.id}>
                    <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-sm">
                            {agent.name}
                          </span>
                          <Badge size="sm" variant="info">
                            system
                          </Badge>
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
                            查看設定
                          </MenuItem>
                          <MenuItem>複製名稱</MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          <section aria-labelledby="custom-agents-title">
            <h3
              className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
              id="custom-agents-title"
            >
              Custom Agents
            </h3>
            <ul className="grid gap-1">
              {agents
                .filter((agent) => agent.scope === "custom")
                .map((agent) => (
                  <li key={agent.id}>
                    <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-sm">
                            {agent.name}
                          </span>
                          <Badge size="sm" variant="success">
                            custom
                          </Badge>
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
                            查看設定
                          </MenuItem>
                          <MenuItem onClick={() => onOpenEditAgentMode(agent)}>
                            編輯
                          </MenuItem>
                          <MenuItem>複製</MenuItem>
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
            </ul>
          </section>
        </>
      )}

      {agentToolTab === "tools" && (
        <section aria-labelledby="available-tools-title">
          <h3
            className="mb-2 px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
            id="available-tools-title"
          >
            Available Tools
          </h3>
          <ul className="grid gap-1">
            {toolDefinitions.map((tool) => (
              <li key={tool.id}>
                <div className="group flex items-start gap-3 rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-sm">
                        {tool.name}
                      </span>
                      <Badge size="sm" variant="outline">
                        {tool.category}
                      </Badge>
                      <Badge
                        size="sm"
                        variant={tool.source === "custom" ? "success" : "secondary"}
                      >
                        {tool.source}
                      </Badge>
                      {tool.runtime && (
                        <Badge size="sm" variant="info">
                          {tool.runtime === "python" ? "Python" : "JS/TS"}
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
                      <MenuItem>查看工具說明</MenuItem>
                      {tool.source === "custom" && (
                        <MenuItem onClick={() => onOpenEditToolMode(tool)}>
                          編輯
                        </MenuItem>
                      )}
                      <MenuItem>複製工具名稱</MenuItem>
                      {tool.source === "custom" && <MenuSeparator />}
                      {tool.source === "custom" && (
                        <MenuItem
                          onClick={() => onDeleteTool(tool)}
                          variant="destructive"
                        >
                          刪除
                        </MenuItem>
                      )}
                    </MenuPopup>
                  </Menu>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ToolConfigPanel({
  onRunToolCallTest,
  onSubmitToolConfig,
  onToolFormChange,
  onToolTestResultChange,
  toolEditMode,
  toolForm,
  toolTestResult,
}: {
  onRunToolCallTest: () => void;
  onSubmitToolConfig: () => void;
  onToolFormChange: Dispatch<SetStateAction<ToolForm>>;
  onToolTestResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  toolEditMode: ToolEditMode;
  toolForm: ToolForm;
  toolTestResult: InstallResult | null;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
      <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-muted-foreground text-sm">
            Tool 名稱
            <Input
              aria-label="Tool 名稱"
              onChange={(event) => {
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  name: event.target.value,
                }));
              }}
              placeholder="cms_publish"
              value={toolForm.name}
            />
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            Category
            <Input
              aria-label="Tool category"
              onChange={(event) =>
                onToolFormChange((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Custom"
              value={toolForm.category}
            />
          </label>
        </div>
        <label className="grid gap-2 text-muted-foreground text-sm">
          描述
          <Textarea
            aria-label="Tool 描述"
            onChange={(event) =>
              onToolFormChange((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="描述這個 tool 會做什麼，以及 agent 什麼時候應該使用它。"
            rows={3}
            value={toolForm.description}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-muted-foreground text-sm">
            Runtime
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => {
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  runtime: event.target.value as ToolDefinition["runtime"],
                  entry:
                    current.entry ||
                    `./.opencode/tools/${current.name || "my-tool"}.${event.target.value === "python" ? "py" : "ts"}`,
                }));
              }}
              value={toolForm.runtime}
            >
              <option value="js-ts">JS / TS</option>
              <option value="python">Python</option>
            </select>
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            Entry file
            <Input
              aria-label="Tool entry file"
              onChange={(event) => {
                onToolTestResultChange(null);
                onToolFormChange((current) => ({
                  ...current,
                  entry: event.target.value,
                }));
              }}
              placeholder={
                toolForm.runtime === "python"
                  ? "./.opencode/tools/my-tool.py"
                  : "./.opencode/tools/my-tool.ts"
              }
              value={toolForm.entry}
            />
          </label>
        </div>
        <label className="grid gap-2 text-muted-foreground text-sm">
          Tool code
          <Textarea
            aria-label="Tool code"
            className="font-mono"
            onChange={(event) => {
              onToolTestResultChange(null);
              onToolFormChange((current) => ({
                ...current,
                code: event.target.value,
              }));
            }}
            placeholder={
              toolForm.runtime === "python"
                ? "# Python tool implementation"
                : "// JS/TS tool implementation"
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
                Tool Call Test
              </h4>
              <p className="mt-0.5 text-muted-foreground text-xs">
                保存前先檢查 tool call 的基本設定，避免執行時才失敗。
              </p>
            </div>
            <Button
              onClick={onRunToolCallTest}
              size="sm"
              type="button"
              variant="outline"
            >
              測試 Tool Call
            </Button>
          </div>
          <label className="grid gap-2 text-muted-foreground text-sm">
            Test input JSON
            <Textarea
              aria-label="Tool test input JSON"
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
              className={`rounded-md border px-3 py-2 text-xs ${toolTestResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
            >
              {toolTestResult.message}
            </div>
          )}
        </section>
        <div className="rounded-lg border border-dashed bg-background px-3 py-3 text-muted-foreground text-xs">
          自訂工具會出現在工具清單與 Agent tool selector。內建工具不能編輯，只有
          custom tool 可以編輯或刪除。
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Runtime 目前支援 Python 與 JS/TS；請先通過 Tool Call Test 再保存。
        </p>
        <Button
          disabled={!toolForm.name.trim() || toolTestResult?.status !== "success"}
          onClick={onSubmitToolConfig}
        >
          {toolEditMode === "add" ? "新增 Tool" : "保存 Tool"}
        </Button>
      </div>
    </div>
  );
}

function AgentDetailPanel({
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
          介面配置
        </button>
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentConfigModeChange("yaml")}
          type="button"
        >
          文字配置
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
            {selectedAgent.scope}
          </Badge>
          <Badge size="sm" variant="outline">
            {selectedAgent.mode}
          </Badge>
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
                Tools
              </h4>
              <div className="flex items-center gap-1.5">
                <Badge size="sm" variant="warning">
                  deprecated
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
                          查看使用情境
                        </Button>
                      )}
                      <select
                        aria-label={`${tool} permission`}
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
                        使用情境
                        <Textarea
                          aria-label={`${tool} 使用情境`}
                          placeholder="尚未設定使用情境。"
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
              查看設定為唯讀；請到自訂 Agent 的編輯頁修改 tools。
            </p>
          </section>

          <section
            className="grid gap-2"
            aria-labelledby="agent-subagents-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm" id="agent-subagents-title">
                Callable Subagents
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
                        {subagent?.mode ?? "subagent"}
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
                        查看使用情境
                      </Button>
                      <span className="size-6" aria-hidden="true" />
                    </div>
                    {guidanceSubagent === subagentId && (
                      <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                        使用情境
                        <Textarea
                          aria-label={`${subagent?.name ?? subagentId} 使用情境`}
                          placeholder="尚未設定使用情境。"
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
                  尚未設定可調用 subagent。
                </p>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              查看設定為唯讀；請到自訂 Agent 的編輯頁修改 callable subagents。
            </p>
            <p className="text-muted-foreground text-xs">
              這會輸出成官方 permission.task 規則；清單會排除自己與會造成回呼循環的
              agent。
            </p>
          </section>

          <section className="grid gap-2" aria-labelledby="agent-skills-title">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm" id="agent-skills-title">
                Skills
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
                      查看使用情境
                    </Button>
                    <span className="size-6" aria-hidden="true" />
                  </div>
                  {guidanceSkill === skill && (
                    <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                      使用情境
                      <Textarea
                        aria-label={`${skill} 使用情境`}
                        placeholder="尚未設定使用情境。"
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
              查看設定為唯讀；請到自訂 Agent 的編輯頁修改 skills。
            </p>
          </section>

          <section
            className="grid gap-2"
            aria-labelledby="agent-permissions-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm" id="agent-permissions-title">
                Permissions
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
            Markdown 預覽
          </h4>
          <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/45 p-3 font-mono text-xs leading-5 text-muted-foreground">
            {agentToYaml(selectedAgent)}
          </pre>
        </section>
      )}

      <div className="flex justify-end">
        {selectedAgent.scope === "custom" ? (
          <Button onClick={() => onOpenEditAgentMode(selectedAgent)} size="sm">
            編輯 Agent
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
            官方內建 Agent 僅可查看；只有自訂 Agent 可以編輯。
          </p>
        )}
      </div>
    </div>
  );
}

function AgentConfigPanel({
  agentConfigMode,
  agentEditMode,
  agentForm,
  agentYaml,
  agents,
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
          介面配置
        </button>
        <button
          className={`h-8 rounded-md font-medium text-sm transition ${agentConfigMode === "yaml" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onAgentConfigModeChange("yaml")}
          type="button"
        >
          文字配置
        </button>
      </div>
      {agentConfigMode === "interface" ? (
        <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-muted-foreground text-sm">
              Agent 名稱
              <Input
                aria-label="Agent 名稱"
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
              Model
              <select
                aria-label="Agent model"
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
              Mode
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
                <option value="primary">primary</option>
                <option value="subagent">subagent</option>
                <option value="all">all</option>
              </select>
            </label>
            <label className="grid gap-2 text-muted-foreground text-sm">
              Temperature
              <Input
                aria-label="temperature"
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
                aria-label="top_p"
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
              Variant
              <select
                aria-label="variant"
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
                    {variant || "default"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-muted-foreground text-sm">
              Steps
              <Input
                aria-label="steps"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    steps: event.target.value,
                  }))
                }
                placeholder="可留空"
                value={agentForm.steps}
              />
            </label>
          </div>
          <label className="grid gap-2 text-muted-foreground text-sm">
            使用時機 / Description
            <Textarea
              aria-label="Agent 描述"
              onChange={(event) =>
                onAgentFormChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="描述這個 agent 何時應該被使用，以及它要負責的任務。"
              rows={3}
              value={agentForm.description}
            />
          </label>
          <section className="grid gap-3 rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-sm text-foreground">Advanced</h4>
              <Badge size="sm" variant="outline">
                OpenCode
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
                Disable agent
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
                  Hidden from @ menu
                </label>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-muted-foreground text-sm">
                Color
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
                      {color || "default"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-muted-foreground text-sm">
                Prompt Source
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
                  <option value="inline">inline markdown body</option>
                  <option value="file">file reference</option>
                </select>
              </label>
            </div>
            {agentForm.promptSource === "file" && (
              <label className="grid gap-2 text-muted-foreground text-sm">
                Prompt file
                <Input
                  aria-label="Prompt file"
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
              Permission rules JSON
              <Textarea
                aria-label="Permission rules JSON"
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
              Provider-specific options JSON
              <Textarea
                aria-label="Provider-specific options JSON"
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
              系統提示詞 / Prompt
              <Textarea
                aria-label="系統提示詞"
                onChange={(event) =>
                  onAgentFormChange((current) => ({
                    ...current,
                    systemPrompt: event.target.value,
                  }))
                }
                placeholder="輸入這個 agent 的 system prompt 內容。"
                rows={5}
                value={agentForm.systemPrompt}
              />
            </label>
          )}

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">Tools</h4>
              <div className="flex items-center gap-1.5">
                <Badge size="sm" variant="warning">
                  deprecated
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
                            ? "編輯使用情境"
                            : "新增使用情境"}
                        </Button>
                      )}
                      <select
                        aria-label={`${tool} permission`}
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
                        使用情境
                        <Textarea
                          aria-label={`${tool} 使用情境`}
                          onChange={(event) =>
                            onUpdateToolGuidance(tool, event.target.value)
                          }
                          placeholder={`說明 ${tool} 什麼情況需要被呼叫，以及模型應該如何使用它。`}
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
                onChange={(event) => onToolToAddChange(event.target.value)}
                value={toolToAdd}
              >
                {toolDefinitions.map((tool) => (
                  <option key={tool.id} value={tool.name}>
                    {tool.name} · {tool.category}
                  </option>
                ))}
              </select>
              <Button
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
                新增 Tool
              </Button>
            </div>
          </section>

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">
                Callable Subagents
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
                        {subagent?.mode ?? "subagent"}
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
                          ? "編輯使用情境"
                          : "新增使用情境"}
                      </Button>
                      <button
                        aria-label={`移除 subagent ${subagent?.name ?? subagentId}`}
                        className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => onRemoveFormSubagent(subagentId)}
                        type="button"
                      >
                        <XIcon aria-hidden="true" className="size-3" />
                      </button>
                    </div>
                    {guidanceSubagent === subagentId && (
                      <label className="grid gap-1.5 border-border/70 border-t pt-2 text-muted-foreground text-xs">
                        使用情境
                        <Textarea
                          aria-label={`${subagent?.name ?? subagentId} 使用情境`}
                          onChange={(event) =>
                            onUpdateSubagentGuidance(
                              subagentId,
                              event.target.value,
                            )
                          }
                          placeholder={`說明這個 agent 什麼情況會呼叫 ${subagent?.name ?? subagentId} subagent。`}
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
                  尚未設定可調用 subagent。
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
                    {agent.name} · {agent.mode}
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
                新增 Subagent
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              這會輸出成官方 permission.task 規則；subagent 可以再調用其他 subagent，但不能選回呼叫鏈上的
              agent。
            </p>
          </section>

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">Skills</h4>
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
                        ? "編輯使用情境"
                        : "新增使用情境"}
                    </Button>
                    <button
                      aria-label={`移除 skill ${skill}`}
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
                      使用情境
                      <Textarea
                        aria-label={`${skill} 使用情境`}
                        onChange={(event) =>
                          onUpdateSkillGuidance(skill, event.target.value)
                        }
                        placeholder={`說明這個 agent 什麼情況會使用 ${skill} skill。`}
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
              Permissions
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
              task 權限由 Callable Subagents 產生 object syntax 規則。
            </p>
          </section>
        </div>
      ) : (
        <label className="grid gap-2 text-muted-foreground text-sm">
          opencode agent Markdown (.md)
          <Textarea
            aria-label="opencode agent Markdown"
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
          介面配置適合快速新增；文字配置可直接編輯 opencode agent Markdown。
        </p>
        <Button
          disabled={
            agentConfigMode === "interface"
              ? !agentForm.name.trim()
              : !agentYaml.trim()
          }
          onClick={onSubmitAgentConfig}
        >
          {agentEditMode === "add" ? "新增 Agent" : "保存 Agent"}
        </Button>
      </div>
    </div>
  );
}
