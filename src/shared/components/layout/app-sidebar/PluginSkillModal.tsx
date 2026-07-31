import type { Dispatch, SetStateAction } from "react"
import { PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group"
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell"
import type {
  InstallResult,
  PluginDefinition,
  PluginConfigMode,
  PluginConfigScope,
  PluginForm,
  PluginSkillDialogView,
  PluginSkillTab,
  SkillDefinition,
  SkillForm,
} from "@/shared/types/app-sidebar"
import {
  AddPluginForm,
  AddSkillForm,
  PluginsList,
  SkillsList,
} from "./PluginSkillModalSections"

type PluginSkillModalProps = {
  batchUpdateNotice: string
  filteredPlugins: PluginDefinition[]
  filteredSkillSettings: SkillDefinition[]
  hasChanges: boolean
  onAddPlugin: () => void
  onAddSkill: () => void
  onConfirmBatchUpdate: () => void
  onCancelBatchUpdate: () => void
  onOpenChange: (open: boolean) => void
  onPluginFormChange: Dispatch<SetStateAction<PluginForm>>
  onPluginInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>
  onPluginConfigScopeChange: (scope: PluginConfigScope) => void
  onPluginConfigModeChange: (mode: PluginConfigMode) => void
  onPluginDocumentChange: (content: string) => void
  onPluginRefresh: () => void
  onSearchChange: Dispatch<SetStateAction<string>>
  onSkillFormChange: Dispatch<SetStateAction<SkillForm>>
  onSkillInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>
  onTabChange: Dispatch<SetStateAction<PluginSkillTab>>
  onEditPlugin: (plugin: PluginDefinition) => void
  onViewPlugin: (plugin: PluginDefinition) => void
  onDeletePlugin: (pluginId: string) => void
  onToggleSkill: (skillId: string) => void
  onViewChange: Dispatch<SetStateAction<PluginSkillDialogView>>
  open: boolean
  pluginForm: PluginForm
  pluginConfigMode: PluginConfigMode
  pluginConfigScope: PluginConfigScope
  pluginDocument: string
  pluginConfigLoading: boolean
  pluginReadOnly: boolean
  pluginInstallResult: InstallResult | null
  plugins: PluginDefinition[]
  search: string
  skillForm: SkillForm
  skillInstallResult: InstallResult | null
  skillSettings: SkillDefinition[]
  tab: PluginSkillTab
  view: PluginSkillDialogView
}

export function PluginSkillModal({
  batchUpdateNotice,
  filteredPlugins,
  filteredSkillSettings,
  hasChanges,
  onAddPlugin,
  onAddSkill,
  onConfirmBatchUpdate,
  onCancelBatchUpdate,
  onOpenChange,
  onPluginFormChange,
  onPluginInstallResultChange,
  onPluginConfigScopeChange,
  onPluginConfigModeChange,
  onPluginDocumentChange,
  onPluginRefresh,
  onSearchChange,
  onSkillFormChange,
  onSkillInstallResultChange,
  onTabChange,
  onEditPlugin,
  onViewPlugin,
  onDeletePlugin,
  onToggleSkill,
  onViewChange,
  open,
  pluginForm,
  pluginConfigMode,
  pluginConfigScope,
  pluginDocument,
  pluginConfigLoading,
  pluginReadOnly,
  pluginInstallResult,
  plugins,
  search,
  skillForm,
  skillInstallResult,
  skillSettings,
  tab,
  view,
}: PluginSkillModalProps) {
  return (
    <ModalShell
      ariaLabel="外掛與技能設定"
      backButton={
        view !== "list"
          ? {
              ariaLabel: "返回外掛與技能列表",
              onClick: () => onViewChange("list"),
            }
          : undefined
      }
      bodyClassName="p-0"
      closeAriaLabel="關閉外掛與技能設定"
       description={<>Plugin {plugins.length} · Skill {skillSettings.length}</>}
      footer={
        <>
          <p className="text-muted-foreground text-xs">
            按下更新會重新啟動 OpenCode server。
          </p>
          <div className="flex items-center gap-2">
             <Button disabled={!hasChanges} onClick={onCancelBatchUpdate} size="lg" variant="outline">
               取消
            </Button>
             <Button disabled={!hasChanges} onClick={onConfirmBatchUpdate} size="lg">
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
        view === "list" && (
          <Button
            onClick={() => onViewChange(tab === "plugins" ? "add-plugin" : "add-skill")}
            size="sm"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
            {tab === "plugins" ? "新增 Plugin" : "新增 Skill"}
          </Button>
        )
      }
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) onViewChange("list")
      }}
      open={open}
      title={
        view === "add-plugin" || view === "plugin-detail"
          ? "新增 Plugin"
          : view === "add-skill"
            ? "新增 Skill"
            : "外掛/技能"
      }
    >
       <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 pb-6">
        {view === "list" ? (
          <>
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
              <button
                className={`h-8 rounded-md font-medium text-sm transition ${tab === "plugins" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => {
                onTabChange("plugins")
                  onPluginConfigModeChange("interface")
                  onSearchChange("")
                }}
                type="button"
              >
                外掛
              </button>
              <button
                className={`h-8 rounded-md font-medium text-sm transition ${tab === "skills" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => {
                  onTabChange("skills")
                  onSearchChange("")
                }}
                type="button"
              >
                技能
              </button>
             </div>

             {tab === "plugins" && pluginConfigMode === "document" ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button className="text-muted-foreground text-xs hover:text-foreground" onClick={() => onPluginConfigModeChange("interface")} type="button">
                      返回 Plugin 清單
                    </button>
                    <span className="text-muted-foreground">/</span>
                    <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Plugin 文件</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select aria-label="Plugin 設定範圍" className="h-8 rounded-md border border-input bg-background px-2 text-xs" onChange={(event) => onPluginConfigScopeChange(event.target.value as PluginConfigScope)} value={pluginConfigScope}>
                      <option value="project">當前 Project</option>
                      <option value="global">Global</option>
                    </select>
                    <Button disabled={pluginConfigLoading} onClick={onPluginRefresh} size="xs" variant="outline">重新整理</Button>
                  </div>
                </div>
                <label className="text-muted-foreground text-xs" htmlFor="opencode-plugin-document">直接編輯 opencode.jsonc</label>
                <textarea className="min-h-96 rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring" id="opencode-plugin-document" onChange={(event) => onPluginDocumentChange(event.target.value)} value={pluginDocument} />
              </div>
            ) : (
            <>

            <InputGroup data-size="sm">
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="搜尋外掛或技能"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={
                  tab === "plugins"
                    ? "搜尋外掛名稱、描述或 entry"
                    : "搜尋技能名稱、描述或路徑"
                }
                value={search}
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <button
                    aria-label="清除搜尋"
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => onSearchChange("")}
                    type="button"
                  >
                    <XIcon aria-hidden="true" className="size-3.5" />
                  </button>
                </InputGroupAddon>
             )}
            </InputGroup>

            {tab === "plugins" && (
                  <PluginsList
                filteredPlugins={filteredPlugins}
                onEditPlugin={onEditPlugin}
                onViewPlugin={onViewPlugin}
                onDeletePlugin={onDeletePlugin}
                plugins={plugins}
              />
            )}

            {tab === "skills" && (
              <SkillsList
                filteredSkillSettings={filteredSkillSettings}
                onToggleSkill={onToggleSkill}
                skillSettings={skillSettings}
              />
            )}
             </>
             )}
           </>
        ) : view === "add-plugin" || view === "plugin-detail" ? (
          <AddPluginForm
            form={pluginForm}
            installResult={pluginInstallResult}
            onCancel={() => onViewChange("list")}
            onFormChange={onPluginFormChange}
            onInstallResultChange={onPluginInstallResultChange}
            onSubmit={onAddPlugin}
            readOnly={pluginReadOnly}
          />
        ) : (
          <AddSkillForm
            form={skillForm}
            installResult={skillInstallResult}
            onCancel={() => onViewChange("list")}
            onFormChange={onSkillFormChange}
            onInstallResultChange={onSkillInstallResultChange}
            onSubmit={onAddSkill}
          />
        )}
      </div>
    </ModalShell>
  )
}
