import type { Dispatch, SetStateAction } from "react";
import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { ModalShell } from "@/shared/components/layout/ModalShell";
import type {
  InstallResult,
  PluginDefinition,
  PluginForm,
  PluginInstallMethod,
  PluginSkillDialogView,
  PluginSkillTab,
  SkillDefinition,
  SkillForm,
  SkillInstallTarget,
} from "./types";

type PluginSkillModalProps = {
  batchUpdateNotice: string;
  filteredPlugins: PluginDefinition[];
  filteredSkillSettings: SkillDefinition[];
  hasChanges: boolean;
  onAddPlugin: () => void;
  onAddSkill: () => void;
  onConfirmBatchUpdate: () => void;
  onOpenChange: (open: boolean) => void;
  onPluginFormChange: Dispatch<SetStateAction<PluginForm>>;
  onPluginInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  onSearchChange: Dispatch<SetStateAction<string>>;
  onSkillFormChange: Dispatch<SetStateAction<SkillForm>>;
  onSkillInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  onTabChange: Dispatch<SetStateAction<PluginSkillTab>>;
  onTogglePlugin: (pluginId: string) => void;
  onToggleSkill: (skillId: string) => void;
  onViewChange: Dispatch<SetStateAction<PluginSkillDialogView>>;
  open: boolean;
  pluginForm: PluginForm;
  pluginInstallResult: InstallResult | null;
  plugins: PluginDefinition[];
  search: string;
  skillForm: SkillForm;
  skillInstallResult: InstallResult | null;
  skillSettings: SkillDefinition[];
  tab: PluginSkillTab;
  view: PluginSkillDialogView;
};

export function PluginSkillModal({
  batchUpdateNotice,
  filteredPlugins,
  filteredSkillSettings,
  hasChanges,
  onAddPlugin,
  onAddSkill,
  onConfirmBatchUpdate,
  onOpenChange,
  onPluginFormChange,
  onPluginInstallResultChange,
  onSearchChange,
  onSkillFormChange,
  onSkillInstallResultChange,
  onTabChange,
  onTogglePlugin,
  onToggleSkill,
  onViewChange,
  open,
  pluginForm,
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
      description={
        <>
          Plugins {plugins.length} · Skills {skillSettings.length}
        </>
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
            onClick={() =>
              onViewChange(tab === "plugins" ? "add-plugin" : "add-skill")
            }
            size="sm"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
            {tab === "plugins" ? "新增 Plugin" : "新增 Skill"}
          </Button>
        )
      }
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) onViewChange("list");
      }}
      open={open}
      title={
        view === "add-plugin"
          ? "新增 Plugin"
          : view === "add-skill"
            ? "新增 Skill"
            : "外掛/技能"
      }
    >
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6">
        {view === "list" ? (
          <>
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
              <button
                className={`h-8 rounded-md font-medium text-sm transition ${tab === "plugins" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => {
                  onTabChange("plugins");
                  onSearchChange("");
                }}
                type="button"
              >
                外掛
              </button>
              <button
                className={`h-8 rounded-md font-medium text-sm transition ${tab === "skills" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => {
                  onTabChange("skills");
                  onSearchChange("");
                }}
                type="button"
              >
                技能
              </button>
            </div>

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
                onTogglePlugin={onTogglePlugin}
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
        ) : view === "add-plugin" ? (
          <AddPluginForm
            form={pluginForm}
            installResult={pluginInstallResult}
            onCancel={() => onViewChange("list")}
            onFormChange={onPluginFormChange}
            onInstallResultChange={onPluginInstallResultChange}
            onSubmit={onAddPlugin}
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
  );
}

function PluginsList({
  filteredPlugins,
  onTogglePlugin,
  plugins,
}: {
  filteredPlugins: PluginDefinition[];
  onTogglePlugin: (pluginId: string) => void;
  plugins: PluginDefinition[];
}) {
  return (
    <section className="grid gap-2" aria-labelledby="plugins-settings-title">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm" id="plugins-settings-title">
          Plugins
        </h3>
        <Badge size="sm" variant="secondary">
          {plugins.filter((plugin) => plugin.enabled).length} enabled
        </Badge>
      </div>
      <ul className="grid gap-2">
        {filteredPlugins.map((plugin) => (
          <li className="rounded-lg bg-muted/55 px-4 py-3" key={plugin.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-sm">
                    {plugin.name}
                  </span>
                  <Badge size="sm" variant={plugin.enabled ? "success" : "secondary"}>
                    {plugin.enabled ? "enabled" : "disabled"}
                  </Badge>
                  <Badge size="sm" variant="outline">
                    {plugin.source}
                  </Badge>
                  {plugin.installTarget && (
                    <Badge size="sm" variant="info">
                      {plugin.installTarget}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground text-xs leading-5">
                  {plugin.description}
                </p>
                {plugin.archiveName && (
                  <p className="mt-1 truncate text-muted-foreground text-xs">
                    Archive: {plugin.archiveName}
                  </p>
                )}
                <p className="mt-1 truncate font-mono text-muted-foreground text-xs">
                  {plugin.entry}
                </p>
              </div>
              <Button
                onClick={() => onTogglePlugin(plugin.id)}
                size="sm"
                variant={plugin.enabled ? "outline" : "secondary"}
              >
                {plugin.enabled ? "停用" : "啟用"}
              </Button>
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
  );
}

function SkillsList({
  filteredSkillSettings,
  onToggleSkill,
  skillSettings,
}: {
  filteredSkillSettings: SkillDefinition[];
  onToggleSkill: (skillId: string) => void;
  skillSettings: SkillDefinition[];
}) {
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
            <Button
              onClick={() => onToggleSkill(skill.id)}
              size="sm"
              variant={skill.enabled ? "outline" : "secondary"}
            >
              {skill.enabled ? "停用" : "啟用"}
            </Button>
          </li>
        ))}
      </ul>
      {filteredSkillSettings.length === 0 && (
        <p className="rounded-md border border-dashed bg-background px-3 py-6 text-center text-muted-foreground text-sm">
          找不到符合的技能。
        </p>
      )}
    </section>
  );
}

function AddPluginForm({
  form,
  installResult,
  onCancel,
  onFormChange,
  onInstallResultChange,
  onSubmit,
}: {
  form: PluginForm;
  installResult: InstallResult | null;
  onCancel: () => void;
  onFormChange: Dispatch<SetStateAction<PluginForm>>;
  onInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
      <div className="grid gap-1">
        <h3 className="font-semibold text-sm">新增 Plugin</h3>
        <p className="text-muted-foreground text-xs leading-5">
          依 OpenCode 官方方式載入：npm 寫入 config，local/archive 放到 plugins 目錄。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">
          來源
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => {
              onInstallResultChange(null);
              onFormChange((current) => ({
                ...current,
                method: event.target.value as PluginInstallMethod,
              }));
            }}
            value={form.method}
          >
            <option value="npm">npm package</option>
            <option value="local">local file</option>
            <option value="archive">archive</option>
          </select>
        </label>
        <label className="grid gap-1 text-muted-foreground text-xs">
          Install target
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={form.method === "npm"}
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
      {form.method === "archive" ? (
        <label className="grid gap-1 text-muted-foreground text-xs">
          Plugin archive
          <Input
            aria-label="Plugin 壓縮檔"
            accept=".zip,.tar,.tgz,.gz"
            onChange={(event) => {
              onInstallResultChange(null);
              onFormChange((current) => ({
                ...current,
                archiveName: event.target.files?.[0]?.name ?? "",
              }));
            }}
            type="file"
          />
        </label>
      ) : (
        <label className="grid gap-1 text-muted-foreground text-xs">
          {form.method === "npm" ? "NPM package" : "Plugin name"}
          <Input
            aria-label="Plugin 名稱"
            autoFocus
            onChange={(event) => {
              onInstallResultChange(null);
              onFormChange((current) => ({
                ...current,
                name: event.target.value,
              }));
            }}
            placeholder={
              form.method === "npm" ? "opencode-helicone-session" : "project-hooks"
            }
            value={form.name}
          />
        </label>
      )}
      {form.method === "local" && (
        <label className="grid gap-1 text-muted-foreground text-xs">
          Local entry
          <Input
            aria-label="Local plugin entry"
            onChange={(event) => {
              onInstallResultChange(null);
              onFormChange((current) => ({
                ...current,
                entry: event.target.value,
              }));
            }}
            placeholder="./.opencode/plugins/my-plugin.ts"
            value={form.entry}
          />
        </label>
      )}
      <label className="grid gap-1 text-muted-foreground text-xs">
        描述
        <Input
          aria-label="Plugin 描述"
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
      {form.method === "archive" && form.archiveName && (
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
        npm: `plugin` config array；local: `.opencode/plugins/` 或
        `~/.config/opencode/plugins/`；archive: 解壓到 plugin directory。
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="outline">
          取消
        </Button>
        <Button onClick={onSubmit} size="sm" type="button">
          新增 Plugin
        </Button>
      </div>
    </div>
  );
}

function AddSkillForm({
  form,
  installResult,
  onCancel,
  onFormChange,
  onInstallResultChange,
  onSubmit,
}: {
  form: SkillForm;
  installResult: InstallResult | null;
  onCancel: () => void;
  onFormChange: Dispatch<SetStateAction<SkillForm>>;
  onInstallResultChange: Dispatch<SetStateAction<InstallResult | null>>;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
      <div className="grid gap-1">
        <h3 className="font-semibold text-sm">新增 Skill</h3>
        <p className="text-muted-foreground text-xs leading-5">
          依 OpenCode 官方方式建立 name/SKILL.md，可放在 OpenCode、Claude 或 Agents
          相容目錄。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">
          Skill name
          <Input
            aria-label="Skill name"
            autoFocus
            onChange={(event) => {
              onInstallResultChange(null);
              onFormChange((current) => ({
                ...current,
                name: event.target.value,
              }));
            }}
            placeholder="git-release"
            value={form.name}
          />
        </label>
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
            <option value="project-opencode">project .opencode</option>
            <option value="global-opencode">global opencode</option>
            <option value="project-claude">project .claude</option>
            <option value="global-claude">global claude</option>
            <option value="project-agents">project .agents</option>
            <option value="global-agents">global agents</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-muted-foreground text-xs">
        Description
        <Input
          aria-label="Skill description"
          onChange={(event) => {
            onInstallResultChange(null);
            onFormChange((current) => ({
              ...current,
              description: event.target.value,
            }));
          }}
          placeholder="Create consistent releases and changelogs"
          value={form.description}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">
          License
          <Input
            aria-label="Skill license"
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                license: event.target.value,
              }))
            }
            placeholder="MIT"
            value={form.license}
          />
        </label>
        <label className="grid gap-1 text-muted-foreground text-xs">
          Compatibility
          <Input
            aria-label="Skill compatibility"
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                compatibility: event.target.value,
              }))
            }
            placeholder="opencode"
            value={form.compatibility}
          />
        </label>
      </div>
      <label className="grid gap-1 text-muted-foreground text-xs">
        Archive import optional
        <Input
          aria-label="Skill archive"
          accept=".zip,.tar,.tgz,.gz"
          onChange={(event) => {
            onInstallResultChange(null);
            onFormChange((current) => ({
              ...current,
              archiveName: event.target.files?.[0]?.name ?? "",
            }));
          }}
          type="file"
        />
      </label>
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
        官方規則：名稱需符合 `^[a-z0-9]+(-[a-z0-9]+)*$`，目錄名需與 SKILL.md
        frontmatter 的 `name` 一致。
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="outline">
          取消
        </Button>
        <Button onClick={onSubmit} size="sm" type="button">
          新增 Skill
        </Button>
      </div>
    </div>
  );
}
