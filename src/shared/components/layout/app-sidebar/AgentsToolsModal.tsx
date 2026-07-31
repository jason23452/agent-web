import type { Dispatch, SetStateAction } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ModalShell } from "@/shared/components/layout/ModalShell";
import type {
  AgentConfigMode,
  AgentDialogView,
  AgentEditMode,
  AgentForm,
  AgentToolTab,
  AgentDefinition,
  InstallResult,
  ToolDefinition,
  ToolEditMode,
  ToolForm,
} from "./types";
import {
  AgentsToolsList,
  AgentConfigPanel,
  AgentDetailPanel,
  ToolConfigPanel,
  ToolDetailPanel,
} from "./AgentsToolsModalSections";


type AgentsToolsModalProps = {
  agentConfigMode: AgentConfigMode;
  agentEditMode: AgentEditMode;
  agentForm: AgentForm;
  agentToolTab: AgentToolTab;
  agentYaml: string;
  agents: AgentDefinition[];
  agentsError?: string | null;
  agentsLoading?: boolean;
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
  onOpenToolDetail: (tool: ToolDefinition) => void;
  onRemoveFormSubagent: (subagentId: string) => void;
  onRunToolCallTest: () => Promise<void> | void;
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
  selectedTool: ToolDefinition | null;
  skillToAdd: string;
  subagentToAdd: string;
  toolDefinitions: ToolDefinition[];
  toolEditMode: ToolEditMode;
  toolCallTestLoading?: boolean;
  toolsError?: string | null;
  toolsLoading?: boolean;
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
  agentsError,
  agentsLoading = false,
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
  onOpenToolDetail,
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
  selectedTool,
  skillToAdd,
  subagentToAdd,
  toolDefinitions,
  toolEditMode,
  toolCallTestLoading = false,
  toolsError,
  toolsLoading = false,
  toolForm,
  toolTestResult,
  toolToAdd,
  view,
}: AgentsToolsModalProps) {
  return (
    <ModalShell
      ariaLabel="代理與工具"
      backButton={
        view !== "list"
          ? {
               ariaLabel: "返回代理與工具列表",
              onClick: () => onAgentDialogViewChange("list"),
            }
          : undefined
      }
      bodyClassName="p-0"
      closeAriaLabel="關閉代理與工具"
      description={
        view === "list"
            ? agentsLoading && agentToolTab === "agents"
             ? "載入 OpenCode 代理..."
             : toolsLoading && agentToolTab === "tools"
               ? "載入 OpenCode 工具..."
             : `共 ${agentToolTab === "agents" ? agents.length : toolDefinitions.length} 筆`
          : view === "tool-config"
            ? "JS / TS 自訂工具"
            : view === "tool-detail"
              ? "OpenCode 工具說明"
            : "介面設定 / YAML 設定"
        }
        footer={
          <>
            <p className="text-muted-foreground text-xs">
              請在儲存後重新整理 OpenCode 伺服器以套用變更。
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => onOpenChange(false)} size="lg" variant="outline">
              取消
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
            aria-label={agentToolTab === "tools" ? "新增工具" : "新增代理"}
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
          ? "代理 / 工具"
          : view === "detail"
             ? "代理設定"
             : view === "tool-config"
              ? toolEditMode === "add"
                ? "新增工具"
                : "編輯工具"
              : view === "tool-detail"
                ? "工具說明"
                : agentEditMode === "add"
                  ? "新增代理"
                  : "編輯代理"
      }
    >
      {view === "list" && (
        <AgentsToolsList
          agents={agents}
          agentsError={agentsError}
          agentsLoading={agentsLoading}
          agentToolTab={agentToolTab}
          onAgentToolTabChange={onAgentToolTabChange}
          onDeleteAgent={onDeleteAgent}
          onDeleteTool={onDeleteTool}
          onOpenAgentDetail={onOpenAgentDetail}
          onOpenEditAgentMode={onOpenEditAgentMode}
          onOpenEditToolMode={onOpenEditToolMode}
          onOpenToolDetail={onOpenToolDetail}
          toolDefinitions={toolDefinitions}
          toolsError={toolsError}
          toolsLoading={toolsLoading}
        />
      )}

      {view === "tool-config" && (
        <ToolConfigPanel
          onRunToolCallTest={onRunToolCallTest}
          onSubmitToolConfig={onSubmitToolConfig}
          onToolFormChange={onToolFormChange}
          onToolTestResultChange={onToolTestResultChange}
          toolCallTestLoading={toolCallTestLoading}
          toolEditMode={toolEditMode}
          toolForm={toolForm}
          toolTestResult={toolTestResult}
        />
      )}

      {view === "tool-detail" && selectedTool && (
        <ToolDetailPanel
          onOpenEditToolMode={onOpenEditToolMode}
          tool={selectedTool}
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

