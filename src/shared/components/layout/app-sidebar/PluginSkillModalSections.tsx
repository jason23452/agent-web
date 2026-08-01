import type { Dispatch, SetStateAction } from "react"
import { MoreHorizontalIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/shared/components/ui/menu"
import type {
  InstallResult,
  PluginDefinition,
  PluginForm,
  SkillDefinition,
  SkillForm,
  SkillInstallTarget,
  PluginEditorMode,
} from "@/shared/types/app-sidebar"
import { officialPluginExamples } from "./config"

type PluginsListProps = {
  filteredPlugins: PluginDefinition[]
  onEditPlugin: (plugin: PluginDefinition) => void
  onViewPlugin: (plugin: PluginDefinition) => void
  onDeletePlugin: (pluginId: string) => void
  plugins: PluginDefinition[]
  onTogglePluginProject?: (plugin: PluginDefinition, enabled: boolean) => void
}

export function PluginsList({
  filteredPlugins,
  onEditPlugin,
  onViewPlugin,
  onDeletePlugin,
  plugins,
  onTogglePluginProject,
}: PluginsListProps) {
  return (
    <section className="grid gap-2" aria-labelledby="plugins-settings-title">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide" id="plugins-settings-title">
          已設定 Plugin
        </h3>
        <Badge size="sm" variant="secondary">
          {plugins.length}
        </Badge>
      </div>
      <ul className="grid gap-1">
        {filteredPlugins.map((plugin) => (
          <li className="rounded-lg bg-muted/55 px-3 py-3 transition-colors hover:bg-accent" key={plugin.id}>
            <div className="group flex w-full items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold text-sm">{plugin.name}</span>
                  <Badge size="sm" variant={plugin.source === "local" ? "info" : "outline"}>
                    {plugin.source === "local" ? "自訂外掛" : "遠端外掛"}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
                  {plugin.description || (plugin.source === "local" ? "Project local Plugin" : "NPM Plugin")}
                </p>
                {plugin.source === "local" && (
                  <p className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
                    {plugin.entry}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {plugin.installTarget === "global" && onTogglePluginProject && (
                  <label className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Checkbox checked={plugin.useInProject !== false} onCheckedChange={(checked) => onTogglePluginProject(plugin, checked === true)} />
                    <span className="whitespace-nowrap">此 Project 使用 Global Plugin</span>
                  </label>
                )}
              <Menu>
                <MenuTrigger aria-label={`${plugin.name} 操作`} className="ms-auto grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                </MenuTrigger>
                <MenuPopup align="end" className="min-w-36">
                  <MenuItem onClick={() => onViewPlugin(plugin)}>檢視</MenuItem>
                  <MenuItem onClick={() => onEditPlugin(plugin)}>編輯</MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={() => onDeletePlugin(plugin.id)} variant="destructive">刪除</MenuItem>
                </MenuPopup>
              </Menu>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {filteredPlugins.length === 0 && (
        <p className="rounded-md border border-dashed bg-background px-3 py-6 text-center text-muted-foreground text-sm">
          找不到符合的外掛。
        </p>
      )}
    </section>
  )
}

type SkillsListProps = {
  filteredSkillSettings: SkillDefinition[]
  onToggleSkill: (skillId: string) => void
  onDeleteSkill?: (skill: SkillDefinition) => void
  onEditSkill?: (skill: SkillDefinition) => void
  onToggleGlobalSkill?: (skill: SkillDefinition, enabled: boolean) => void
  skillSettings: SkillDefinition[]
}

export function SkillsList({
  filteredSkillSettings,
  onToggleSkill,
  onDeleteSkill,
  onEditSkill,
  onToggleGlobalSkill,
  skillSettings,
}: SkillsListProps) {
  return (
    <section className="grid gap-2" aria-labelledby="skills-settings-title">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm" id="skills-settings-title">
          Skills
        </h3>
        <Badge size="sm" variant="secondary">
          {skillSettings.filter((skill) => skill.enabled).length} enabled
        </Badge>
      </div>
      <ul className="grid gap-2">
        {filteredSkillSettings.map((skill) => (
          <li
            className="flex items-start justify-between gap-3 rounded-lg bg-muted/55 px-4 py-3"
            key={skill.id}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-sm">{skill.name}</span>
                <Badge size="sm" variant={skill.enabled ? "success" : "secondary"}>
                  {skill.enabled ? "enabled" : "disabled"}
                </Badge>
                <Badge size="sm" variant="outline">
                  {skill.scope}
                </Badge>
                {skill.installTarget && (
                  <Badge size="sm" variant="info">
                    {skill.installTarget}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground text-xs leading-5">
                {skill.description}
              </p>
              {skill.archiveName && (
                <p className="mt-1 truncate text-muted-foreground text-xs">
                  Archive: {skill.archiveName}
                </p>
              )}
              <p className="mt-1 truncate font-mono text-muted-foreground text-xs">
                {skill.path}
              </p>
            </div>
            {skill.inherited && onToggleGlobalSkill ? (
              <label className="flex shrink-0 items-center gap-2 text-xs">
                <Checkbox checked={skill.enabled} onCheckedChange={(checked) => onToggleGlobalSkill(skill, checked === true)} />
                <span>此 Project 使用 Global Skill</span>
              </label>
            ) : (
              <Button onClick={() => onToggleSkill(skill.id)} size="sm" variant={skill.enabled ? "outline" : "secondary"}>
                {skill.enabled ? "停用" : "啟用"}
              </Button>
            )}
            {onEditSkill && <Button onClick={() => onEditSkill(skill)} size="sm" variant="ghost">編輯</Button>}
            {onDeleteSkill && <Button onClick={() => onDeleteSkill(skill)} size="sm" variant="ghost">刪除</Button>}
          </li>
        ))}
      </ul>
      {filteredSkillSettings.length === 0 && (
        <p className="rounded-md border border-dashed bg-background px-3 py-6 text-center text-muted-foreground text-sm">
          找不到符合的技能。
        </p>
      )}
    </section>
  )
}

export function SkillEditorForm({ content, name, scope, onCancel, onChange, onScopeChange, onSubmit }: { content: string; name: string; scope: "project" | "global"; onCancel: () => void; onChange: (value: string) => void; onScopeChange: (scope: "project" | "global") => void; onSubmit: () => void }) {
  return (
    <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
      <div>
        <h3 className="font-semibold text-sm">編輯 Skill：{name}</h3>
        <p className="mt-1 text-muted-foreground text-xs">只能編輯 OpenCode 的 Project 或 Global SKILL.md。</p>
      </div>
      <label className="grid gap-1 text-muted-foreground text-xs">編輯 scope
        <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" onChange={(event) => onScopeChange(event.target.value as "project" | "global")} value={scope}>
          <option value="project">Project</option>
          <option value="global">Global</option>
        </select>
      </label>
      <label className="grid gap-1 text-muted-foreground text-xs" htmlFor="skill-document">SKILL.md</label>
      <Textarea className="min-h-[min(56dvh,480px)] font-mono text-xs" id="skill-document" onChange={(event) => onChange(event.target.value)} value={content} />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="outline">取消</Button>
        <Button onClick={onSubmit} size="sm">儲存編輯</Button>
      </div>
    </div>
  )
}

type AddPluginFormProps = {
  form: PluginForm
  installResult: InstallResult | null
  onCancel: () => void
  onFormChange: Dispatch<SetStateAction<PluginForm>>
  onInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>
  onSubmit: () => void
  loading?: boolean
  readOnly?: boolean
  currentProjectName?: string
  editorMode: PluginEditorMode
}

export function AddPluginForm({
  form,
  installResult,
  onCancel,
  onFormChange,
  onInstallResultChange,
  onSubmit,
  readOnly = false,
  currentProjectName,
  editorMode,
}: AddPluginFormProps) {
  return (
    <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
      <div className="grid gap-1">
        <h3 className="font-semibold text-sm">
          {editorMode === "view" ? "檢視 Plugin" : editorMode === "edit" ? "編輯 Plugin" : "新增 Plugin"}
        </h3>
        <p className="text-muted-foreground text-xs leading-5">
          遠端外掛從套件來源載入；自訂外掛會建立在目前的 .opencode/plugins/ 目錄。
        </p>
      </div>
      {(
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Plugin 新增模式">
          <button
            disabled={readOnly}
          aria-selected={form.method === "npm"}
          className={`h-8 rounded-md font-medium text-sm transition ${form.method === "npm" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => {
            onInstallResultChange(null)
            onFormChange((current) => ({ ...current, method: "npm" }))
          }}
          type="button"
        >
          遠端外掛
        </button>
          <button
            disabled={readOnly}
          aria-selected={form.method === "local"}
          className={`h-8 rounded-md font-medium text-sm transition ${form.method === "local" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => {
            onInstallResultChange(null)
            onFormChange((current) => ({ ...current, method: "local" }))
          }}
          type="button"
        >
          自訂外掛
        </button>
      </div>
      )}
      {form.method === "local" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={form.customPluginEnabled}
              onCheckedChange={(checked) => onFormChange((current) => ({ ...current, customPluginEnabled: checked === true }))}
            />
          <span>是否開啟自訂 Plugin</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">
            {form.method === "npm" ? "設定範圍" : "檔案範圍"}
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={readOnly}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                installTarget: event.target.value as "project" | "global",
              }))
            }
            value={form.installTarget}
          >
            <option value="project">project</option>
            <option value="global">global</option>
          </select>
        </label>
      </div>
      {form.installTarget === "global" && currentProjectName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={form.useInProject} disabled={readOnly} onCheckedChange={(checked) => onFormChange((current) => ({ ...current, useInProject: checked === true }))} />
          <span>此專案使用此 Global Plugin</span>
        </div>
      )}
      {form.method === "npm" ? (
        <label className="grid gap-1 text-muted-foreground text-xs">
          遠端外掛名稱（可輸入多個，以逗號、空白或換行分隔）
          <Input
            aria-label="Plugin 名稱"
            autoFocus={!readOnly}
            disabled={readOnly}
            onChange={(event) => {
              onInstallResultChange(null)
              onFormChange((current) => ({
                ...current,
                name: event.target.value,
              }))
            }}
              placeholder="opencode-helicone-session, opencode-wakatime"
            value={form.name}
          />
        </label>
      ) : (
        <>
          <label className="grid gap-1 text-muted-foreground text-xs">
            Plugin 檔案名稱
            <Input aria-label="Plugin 檔案名稱" disabled={readOnly || !form.customPluginEnabled} onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))} placeholder="my-plugin" value={form.name} />
          </label>
          <label className="grid gap-1 text-muted-foreground text-xs">
            Plugin 程式碼
            <Textarea aria-label="Plugin 程式碼" className="min-h-56 font-mono text-xs" disabled={readOnly || !form.customPluginEnabled} onChange={(event) => onFormChange((current) => ({ ...current, code: event.target.value }))} value={form.code} />
          </label>
          <label className="flex items-center gap-2 text-muted-foreground text-xs">
            <Checkbox checked={form.useOfficialExample} disabled={readOnly || !form.customPluginEnabled} onCheckedChange={(checked) => onFormChange((current) => ({ ...current, useOfficialExample: checked === true }))} />
            使用 OpenCode 官方範例
          </label>
          {form.useOfficialExample && (
            <label className="grid gap-1 text-muted-foreground text-xs">
              官方範例
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" disabled={readOnly || !form.customPluginEnabled} onChange={(event) => {
                const example = officialPluginExamples.find((item) => item.id === event.target.value)
                onFormChange((current) => ({ ...current, officialExample: event.target.value, code: example?.code ?? current.code }))
              }} value={form.officialExample}>
                {officialPluginExamples.map((example) => <option key={example.id} value={example.id}>{example.name}</option>)}
              </select>
              <span>{officialPluginExamples.find((item) => item.id === form.officialExample)?.description}</span>
            </label>
          )}
        </>
      )}
      <label className="grid gap-1 text-muted-foreground text-xs">
        描述
        <Input
          aria-label="Plugin 描述"
          disabled={readOnly || (form.method === "local" && !form.customPluginEnabled)}
          onChange={(event) =>
            onFormChange((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="可留空"
          value={form.description}
        />
      </label>
      {installResult && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${installResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {installResult.message}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        {form.method === "npm" ? "會寫入目前 scope 的 opencode.jsonc plugin 陣列。" : "會寫入目前 scope 的 .opencode/plugins/ 目錄，並由 OpenCode 自動載入。"}
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="outline">
          取消
        </Button>
        {!readOnly && <Button onClick={onSubmit} size="sm" type="button">{editorMode === "edit" ? "儲存編輯" : "新增"}</Button>}
      </div>
    </div>
  )
}

type AddSkillFormProps = {
  form: SkillForm
  installResult: InstallResult | null
  onCancel: () => void
  onFormChange: Dispatch<SetStateAction<SkillForm>>
  onInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>
  onSubmit: () => void
  loading?: boolean
}

export function AddSkillForm({
  form,
  installResult,
  onCancel,
  onFormChange,
  onInstallResultChange,
  onSubmit,
  loading = false,
}: AddSkillFormProps) {
  return (
    <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
      <div className="grid gap-1">
        <h3 className="font-semibold text-sm">新增 Skill</h3>
        <p className="text-muted-foreground text-xs leading-5">
          選擇 Skill 的來源，匯入完成後會重新讀取目前清單。
        </p>
      </div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Skill 匯入方式">
        <button
          aria-selected={form.method === "remote"}
          className={`h-9 rounded-md font-medium text-sm transition ${form.method === "remote" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          disabled={loading}
          onClick={() => {
            onInstallResultChange(null)
            onFormChange((current) => ({ ...current, method: "remote", archiveFiles: [], archiveName: "" }))
          }}
          role="tab"
          type="button"
        >
          遠端下載 Skill
        </button>
        <button
          aria-selected={form.method === "upload"}
          className={`h-9 rounded-md font-medium text-sm transition ${form.method === "upload" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
          disabled={loading}
          onClick={() => {
            onInstallResultChange(null)
            onFormChange((current) => ({ ...current, method: "upload", sources: "" }))
          }}
          role="tab"
          type="button"
        >
          上傳 Skill
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">
          Install target
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                installTarget: event.target.value as SkillInstallTarget,
              }))
            }
            value={form.installTarget}
          >
            <option value="project">Project</option>
            <option value="global">Global</option>
          </select>
        </label>
      </div>
      {form.method === "remote" ? (
        <label className="grid gap-1 text-muted-foreground text-xs">
          skills.sh URL 或 npx skills add 指令（每行一筆）
          <Textarea aria-label="Skill 來源" className="min-h-24 font-mono text-xs" disabled={loading} onChange={(event) => { onInstallResultChange(null); onFormChange((current) => ({ ...current, sources: event.target.value })) }} placeholder="https://www.skills.sh/anthropics/skills/frontend-design" value={form.sources} />
        </label>
      ) : null}
      {form.method === "upload" ? (
        <label className="grid gap-1 text-muted-foreground text-xs">
          上傳 Skill 壓縮檔（可一次選取多個）
          <Input
            aria-label="Skill archive"
            accept=".zip,.tar,.tgz,.tar.gz"
            multiple
            disabled={loading}
            onChange={(event) => {
              onInstallResultChange(null)
              const files = Array.from(event.target.files ?? [])
              onFormChange((current) => ({
                ...current,
                archiveName: files.map((file) => file.name).join(", "),
                archiveFiles: files,
              }))
            }}
            type="file"
          />
        </label>
      ) : null}
      {form.archiveName && (
        <p className="truncate text-muted-foreground text-xs">
          已選擇：{form.archiveName}
        </p>
      )}
      {installResult && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${installResult.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {installResult.message}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        {form.method === "remote"
          ? "支援 skills.sh URL 或固定格式的 npx skills add 指令；Skill name 與 description 會自動偵測。"
          : "壓縮檔需包含有效的 SKILL.md；名稱與 description 會從 frontmatter 自動偵測。"}
      </p>
      <div className="flex justify-end gap-2">
        <Button disabled={loading} onClick={onCancel} size="sm" variant="outline">
          取消
        </Button>
        <Button disabled={loading} loading={loading} onClick={onSubmit} size="sm" type="button">
          {loading ? (form.method === "remote" ? "下載中..." : "上傳中...") : "新增 Skill"}
        </Button>
      </div>
    </div>
  )
}
