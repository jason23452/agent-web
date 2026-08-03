import type { Dispatch, SetStateAction } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell";
import type {
  AgentConfigMode,
  CommandConfigMode,
  CommandDefinition,
  CommandForm,
  AgentDialogView,
  AgentEditMode,
  AgentForm,
  AgentToolTab,
  AgentDefinition,
  InstallResult,
  ToolDefinition,
  ToolEditMode,
  ToolForm,
} from "@/shared/types/app-sidebar";
import type { ModelOption } from "@/shared/types/workspace";
import {
  AgentsToolsList,
  AgentConfigPanel,
  AgentDetailPanel,
  CommandConfigPanel,
  CommandDetailPanel,
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
  availableModels: string[];
  modelOptions?: ModelOption[];
  availableSkillNames: string[];
  connectedMcpNames?: string[];
  connectedPluginNames?: string[];
  batchUpdateNotice: string;
  commandEditMode: "add" | "edit";
  commandConfigMode: CommandConfigMode;
  commandDocument: string;
  commandForm: CommandForm;
  commands: CommandDefinition[];
  commandsError?: string | null;
  commandsLoading?: boolean;
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
  onCancelBatchUpdate: () => void;
  onCommandFormChange: Dispatch<SetStateAction<CommandForm>>;
  onCommandConfigModeChange: (mode: CommandConfigMode) => void;
  onCommandDocumentChange: (content: string) => void;
  onDeleteCommand: (command: CommandDefinition) => void;
  onDeleteGlobalCommand: (command: CommandDefinition) => void;
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
  onOpenAddCommandMode: () => void;
  onOpenAddToolMode: () => void;
  onOpenChange: (open: boolean) => void;
  onOpenAgentDetail: (agent: AgentDefinition) => void;
  onOpenEditAgentMode: (agent: AgentDefinition) => void;
  onOpenEditCommandMode: (command: CommandDefinition) => void;
  onOpenEditGlobalCommandMode: (command: CommandDefinition) => void;
  onOpenEditToolMode: (tool: ToolDefinition) => void;
  onOpenCommandDetail: (command: CommandDefinition) => void;
  onOpenToolDetail: (tool: ToolDefinition) => void;
  onRemoveFormSubagent: (subagentId: string) => void;
  onRunToolCallTest: () => Promise<void> | void;
  onSkillToAddChange: (value: string) => void;
  onSubagentToAddChange: (value: string) => void;
  onSubmitAgentConfig: () => void;
  onSubmitCommandConfig: () => void;
  onSubmitToolConfig: () => void;
  onToolFormChange: Dispatch<SetStateAction<ToolForm>>;
  onToolTestResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  onToolToAddChange: (value: string) => void;
  onUpdateSkillGuidance: (skill: string, value: string) => void;
  onUpdateSubagentGuidance: (subagentId: string, value: string) => void;
  onUpdateToolGuidance: (tool: string, value: string) => void;
  open: boolean;
  selectedAgent: AgentDefinition | null;
  selectedCommand: CommandDefinition | null;
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
  projectRequired?: boolean;
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
  availableModels,
  modelOptions,
  availableSkillNames,
  connectedMcpNames,
  connectedPluginNames,
  batchUpdateNotice,
  commandEditMode,
  commandConfigMode,
  commandDocument,
  commandForm,
  commands,
  commandsError,
  commandsLoading = false,
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
  onCancelBatchUpdate,
  onCommandFormChange,
  onCommandConfigModeChange,
  onCommandDocumentChange,
  onDeleteCommand,
  onDeleteGlobalCommand,
  onDeleteAgent,
  onDeleteTool,
  onGetCallableSubagentOptions,
  onGuidanceSkillChange,
  onGuidanceSubagentChange,
  onGuidanceToolChange,
  onOpenAddAgentMode,
  onOpenAddCommandMode,
  onOpenAddToolMode,
  onOpenChange,
  onOpenAgentDetail,
  onOpenCommandDetail,
  onOpenEditCommandMode,
  onOpenEditGlobalCommandMode,
  onOpenEditAgentMode,
  onOpenEditToolMode,
  onOpenToolDetail,
  onRemoveFormSubagent,
  onRunToolCallTest,
  onSkillToAddChange,
  onSubagentToAddChange,
  onSubmitAgentConfig,
  onSubmitCommandConfig,
  onSubmitToolConfig,
  onToolFormChange,
  onToolTestResultChange,
  onToolToAddChange,
  onUpdateSkillGuidance,
  onUpdateSubagentGuidance,
  onUpdateToolGuidance,
  open,
  selectedAgent,
  selectedCommand,
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
  projectRequired = false,
}: AgentsToolsModalProps) {
  return (
    <ModalShell
      ariaLabel="智能體、工具與 Commands"
      backButton={
        view !== "list"
          ? {
               ariaLabel: "返回智能體與工具列表",
                onClick: () => onAgentDialogViewChange("list"),
              }
            : undefined
      }
      bodyClassName="p-0"
      closeAriaLabel="關閉智能體、工具與 Commands"
      description={
        view === "list"
            ? agentsLoading && agentToolTab === "agents"
             ? "載入 OpenCode 智能體..."
              : toolsLoading && agentToolTab === "tools"
                ? "載入 OpenCode 工具..."
                : commandsLoading && agentToolTab === "commands"
                  ? "載入 OpenCode Commands..."
              : `共 ${agentToolTab === "agents" ? agents.length : agentToolTab === "tools" ? toolDefinitions.length : commands.length} 筆`
          : view === "tool-config"
            ? "JS / TS 自訂工具"
            : view === "tool-detail"
              ? "OpenCode 工具說明"
              : view === "command-config"
                ? "介面新增 / 文件新增"
                : "介面設定 / YAML 設定"
        }
         footer={(
          <>
            <p className="text-muted-foreground text-xs">
              請在儲存後重新整理 OpenCode 伺服器以套用變更。
            </p>
            <div className="flex items-center gap-2">
               <Button onClick={onCancelBatchUpdate} size="lg" variant="outline">
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
        )}
        headerActions={
            view === "list" && (!projectRequired || agentToolTab === "commands") && (
             <Button
               onClick={
                 agentToolTab === "tools"
                   ? onOpenAddToolMode
                   : agentToolTab === "commands"
                     ? onOpenAddCommandMode
                     : onOpenAddAgentMode
               }
              size="sm"
              variant="outline"
            >
              <PlusIcon aria-hidden="true" />
               {agentToolTab === "tools"
                 ? "新增工具"
                 : agentToolTab === "commands"
                   ? "新增 Command"
                   : "新增智能體"}
            </Button>
          )
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="h-[min(86dvh,640px)]"
        title={
        view === "list"
            ? "智能體 / 工具 / Commands"
           : view === "detail"
              ? "智能體設定"
               : view === "tool-config"
                 ? selectedTool?.inherited
                   ? "建立 Project Tool Override"
                   : toolEditMode === "add"
                   ? "新增工具"
                   : "編輯工具"
                 : view === "tool-detail"
                   ? "工具說明"
                   : view === "command-config"
                     ? selectedCommand?.inherited && commandForm.installTarget !== "global"
                        ? "建立 Project Command Override"
                        : commandEditMode === "add"
                          ? "新增 Command"
                          : commandForm.installTarget === "global"
                            ? "編輯 Global Command"
                            : "編輯 Command"
                     : view === "command-detail"
                       ? "Command 說明"
                       : selectedAgent?.inherited
                         ? "建立 Project Agent Override"
                         : agentEditMode === "add"
                           ? "新增智能體"
                           : "編輯智能體"
      }
    >
      {view === "list" && (
        <AgentsToolsList
          agents={agents}
          agentsError={agentsError}
           agentsLoading={agentsLoading}
            agentToolTab={agentToolTab}
          commands={commands}
          commandsError={commandsError}
          commandsLoading={commandsLoading}
             projectRequired={projectRequired}
           onAgentToolTabChange={onAgentToolTabChange}
          onDeleteCommand={onDeleteCommand}
          onDeleteGlobalCommand={onDeleteGlobalCommand}
          onDeleteAgent={onDeleteAgent}
          onDeleteTool={onDeleteTool}
           onOpenAgentDetail={onOpenAgentDetail}
          onOpenCommandDetail={onOpenCommandDetail}
          onOpenEditCommandMode={onOpenEditCommandMode}
          onOpenEditGlobalCommandMode={onOpenEditGlobalCommandMode}
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

      {view === "command-detail" && selectedCommand && (
        <CommandDetailPanel
          command={selectedCommand}
          onDeleteGlobalCommand={onDeleteGlobalCommand}
          onOpenEditGlobalCommandMode={onOpenEditGlobalCommandMode}
          onOpenEditCommandMode={onOpenEditCommandMode}
        />
      )}

      {view === "command-config" && (
           <CommandConfigPanel
             commandConfigMode={commandConfigMode}
             commandDocument={commandDocument}
             commandEditMode={commandEditMode}
             commandForm={commandForm}
             modelOptions={modelOptions}
             onCommandConfigModeChange={onCommandConfigModeChange}
          onCommandDocumentChange={onCommandDocumentChange}
          onCommandFormChange={onCommandFormChange}
          onSubmitCommandConfig={onSubmitCommandConfig}
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
           availableModels={availableModels}
           modelOptions={modelOptions}
           availableSkillNames={availableSkillNames}
           connectedMcpNames={connectedMcpNames}
           connectedPluginNames={connectedPluginNames}
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

