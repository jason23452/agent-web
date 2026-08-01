import { MinusIcon, PlusIcon, ServerIcon } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/components/ui/empty";
import { Input } from "@/shared/components/ui/input";
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import type { OpenCodeMcpTestResult } from "@/shared/api/opencodeMcpTest";
import type { McpConfigMode, McpDialogView, McpForm, McpKeyValueField, McpOAuthForm, McpServer } from "@/shared/types/app-sidebar";

type McpServersDialogProps = {
  configDocument: string;
  configLoading: boolean;
  configMode: McpConfigMode;
  currentProjectName?: string;
  filteredServers: McpServer[];
  form: McpForm;
  hasChanges: boolean;
  mcpTestLoading: boolean;
  mcpTestResult: OpenCodeMcpTestResult | null;
  onApplyChanges: () => void;
  onCancelChanges: () => void;
  onClose: () => void;
  onConfigModeChange: (mode: McpConfigMode) => void;
  onDeleteServer: (serverId: string) => void;
  onDocumentChange: (content: string) => void;
  onEditServer: (server: McpServer) => void;
  onFormChange: (updates: Partial<McpForm>) => void;
  onOpenAddServer: () => void;
  onRefresh: () => void;
  onSubmit: () => void;
  onTestConnection: () => void;
  onToggleServer: (serverId: string, enabled: boolean) => void;
  onViewChange: (view: McpDialogView) => void;
  onScopeChange: (scope: "project" | "global") => void;
  open: boolean;
  projectRequired?: boolean;
  scope: "project" | "global";
  view: McpDialogView;
};

export function McpServersDialog({
  configDocument,
  configLoading,
  configMode,
  currentProjectName,
  filteredServers,
  form,
  hasChanges,
  mcpTestLoading,
  mcpTestResult,
  onApplyChanges,
  onCancelChanges,
  onClose,
  onConfigModeChange,
  onDeleteServer,
  onDocumentChange,
  onEditServer,
  onFormChange,
  onOpenAddServer,
  onRefresh,
  onSubmit,
  onTestConnection,
  onToggleServer,
  onViewChange,
  onScopeChange,
  open,
  projectRequired = false,
  scope,
  view,
}: McpServersDialogProps) {
  const isEditor = !projectRequired && (view === "add" || view === "edit");

  return (
    <ModalShell
      ariaLabel="MCP Server 設定"
      backButton={!projectRequired && view !== "list" ? { ariaLabel: "返回 MCP Server 列表", onClick: () => onViewChange("list") } : undefined}
      bodyClassName="p-0"
      closeAriaLabel="關閉 MCP Server 設定"
      description={projectRequired ? "尚未開啟專案" : view === "list" ? "Global · Project" : scope === "project" ? "Project" : "Global"}
      footer={!projectRequired && (
        <>
          <p className="text-muted-foreground text-xs">按下更新會重新啟動 OpenCode server。</p>
          <div className="flex items-center gap-2">
            <Button disabled={!hasChanges} onClick={onCancelChanges} size="lg" variant="outline">取消</Button>
            <Button disabled={!hasChanges} onClick={onApplyChanges} size="lg">更新</Button>
          </div>
        </>
      )}
      headerActions={!projectRequired && view === "list" ? (
        <Button onClick={onOpenAddServer} size="sm" variant="outline">
          <PlusIcon aria-hidden="true" />
          新增 MCP
        </Button>
      ) : undefined}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
      panelClassName="h-[min(86dvh,640px)]"
      title={projectRequired || view === "list" ? "MCP Server" : view === "add" ? "新增 MCP" : "編輯 MCP"}
    >
      <div className="grid min-h-[420px] min-w-0 flex-1 content-start gap-5 overflow-y-auto px-6 pb-6">
        {projectRequired ? (
          <div className="rounded-lg border border-destructive/35 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm" role="alert">
            請先開啟專案後再查看 OpenCode MCP。
          </div>
        ) : view === "list" ? (
          <McpServerList
            configLoading={configLoading}
            servers={filteredServers}
            onDeleteServer={onDeleteServer}
            onEditServer={onEditServer}
            onToggleServer={onToggleServer}
          />
        ) : null}
        {isEditor && (
          <McpEditor
            configDocument={configDocument}
            configLoading={configLoading}
            configMode={configMode}
            currentProjectName={currentProjectName}
            form={form}
            onCancel={() => onViewChange("list")}
            onChange={onFormChange}
            onConfigModeChange={onConfigModeChange}
            onDocumentChange={onDocumentChange}
            onRefresh={onRefresh}
            onScopeChange={onScopeChange}
            onSubmit={onSubmit}
            onTestConnection={onTestConnection}
            scope={scope}
            testLoading={mcpTestLoading}
            testResult={mcpTestResult}
            view={view}
          />
        )}
      </div>
    </ModalShell>
  );
}

function McpServerList({ configLoading, onDeleteServer, onEditServer, onToggleServer, servers }: {
  configLoading: boolean;
  onDeleteServer: (serverId: string) => void;
  onEditServer: (server: McpServer) => void;
  onToggleServer: (serverId: string, enabled: boolean) => void;
  servers: McpServer[];
}) {
  return (
    <section className="grid gap-2" aria-labelledby="mcp-server-list-title">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide" id="mcp-server-list-title">已設定 MCP Server</h3>
        <Badge size="sm" variant="secondary">{servers.length}</Badge>
      </div>
      {configLoading ? (
        <div className="grid gap-2" aria-label="載入 MCP Server 中" role="status">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : servers.length === 0 ? (
        <Empty className="rounded-lg border border-dashed bg-background px-3 py-8 md:py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ServerIcon aria-hidden="true" /></EmptyMedia>
            <EmptyTitle className="text-sm">目前沒有 MCP Server</EmptyTitle>
            <EmptyDescription className="text-xs">請按右上角新增 MCP Server。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-1">
          {servers.map((server) => (
            <li className="flex items-center gap-3 rounded-lg bg-muted/55 px-3 py-3" key={server.id}>
              <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${server.enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-sm">{server.name}</span>
                  <Badge size="sm" variant="outline">{server.scope}</Badge>
                  <Badge size="sm" variant="outline">{server.type}</Badge>
                </div>
                <p className="mt-0.5 text-muted-foreground text-xs">{server.enabled ? "已啟用" : "已停用"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Switch aria-label={`${server.name} 啟用`} checked={server.enabled} onCheckedChange={(checked) => onToggleServer(server.id, checked)} />
                <Button onClick={() => onEditServer(server)} size="sm" variant="ghost">編輯</Button>
                <Button onClick={() => onDeleteServer(server.id)} size="sm" variant="ghost">刪除</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function McpEditor({ configDocument, configLoading, configMode, currentProjectName, form, onCancel, onChange, onConfigModeChange, onDocumentChange, onRefresh, onScopeChange, onSubmit, onTestConnection, scope, testLoading, testResult, view }: {
  configDocument: string;
  configLoading: boolean;
  configMode: McpConfigMode;
  currentProjectName?: string;
  form: McpForm;
  onCancel: () => void;
  onChange: (updates: Partial<McpForm>) => void;
  onConfigModeChange: (mode: McpConfigMode) => void;
  onDocumentChange: (content: string) => void;
  onRefresh: () => void;
  onScopeChange: (scope: "project" | "global") => void;
  onSubmit: () => void;
  onTestConnection: () => void;
  scope: "project" | "global";
  testLoading: boolean;
  testResult: OpenCodeMcpTestResult | null;
  view: "add" | "edit";
}) {
  return (
    <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
      <div className="grid gap-1">
        <h3 className="font-semibold text-sm">{view === "add" ? "新增 MCP Server" : "編輯 MCP Server"}</h3>
        <p className="text-muted-foreground text-xs">{scope === "project" ? "Project" : "Global"}</p>
      </div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="MCP 編輯方式">
        <button aria-selected={configMode === "interface"} className={`h-8 rounded-md font-medium text-sm ${configMode === "interface" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground"}`} onClick={() => onConfigModeChange("interface")} role="tab" type="button">介面新增</button>
        <button aria-selected={configMode === "document"} className={`h-8 rounded-md font-medium text-sm ${configMode === "document" ? "bg-background text-foreground shadow-xs/5" : "text-muted-foreground"}`} onClick={() => onConfigModeChange("document")} role="tab" type="button">文件新增</button>
      </div>
      <label className="grid gap-1 text-muted-foreground text-xs">
        Scope
        <select
          aria-label="MCP Server scope"
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={scope === "project" && !currentProjectName}
          onChange={(event) => onScopeChange(event.target.value as "project" | "global")}
          value={scope}
        >
          <option disabled={!currentProjectName} value="project">Project</option>
          <option value="global">Global</option>
        </select>
      </label>
      {configMode === "document" ? (
        <McpDocumentEditor configDocument={configDocument} configLoading={configLoading} onChange={onDocumentChange} onRefresh={onRefresh} />
      ) : (
        <McpInterfaceForm form={form} onCancel={onCancel} onChange={onChange} onSubmit={onSubmit} onTestConnection={onTestConnection} testLoading={testLoading} testResult={testResult} view={view} />
      )}
    </div>
  );
}

function McpDocumentEditor({ configDocument, configLoading, onChange, onRefresh }: {
  configDocument: string;
  configLoading: boolean;
  onChange: (content: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-medium text-sm">文件新增</h4>
          <p className="text-muted-foreground text-xs">編輯完整 opencode.jsonc</p>
        </div>
        <Button disabled={configLoading} onClick={onRefresh} size="sm" variant="outline">重新整理</Button>
      </div>
      <Textarea aria-label="OpenCode MCP 設定文件" className="min-h-[min(56dvh,480px)] font-mono text-xs" disabled={configLoading} onChange={(event) => onChange(event.target.value)} value={configDocument} />
    </div>
  );
}

function McpInterfaceForm({ form, onCancel, onChange, onSubmit, onTestConnection, testLoading, testResult, view }: {
  form: McpForm;
  onCancel: () => void;
  onChange: (updates: Partial<McpForm>) => void;
  onSubmit: () => void;
  onTestConnection: () => void;
  testLoading: boolean;
  testResult: OpenCodeMcpTestResult | null;
  view: "add" | "edit";
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">Server 名稱<Input aria-label="MCP Server 名稱" onChange={(event) => onChange({ name: event.target.value })} placeholder="context7" value={form.name} /></label>
        <label className="grid gap-1 text-muted-foreground text-xs">類型<select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" onChange={(event) => onChange({ type: event.target.value as "local" | "remote" })} value={form.type}><option value="remote">Remote</option><option value="local">Local</option></select></label>
      </div>
      {form.type === "remote" ? (
        <label className="grid gap-1 text-muted-foreground text-xs">Remote URL<Input aria-label="MCP Remote URL" onChange={(event) => onChange({ url: event.target.value })} placeholder="https://mcp.context7.com/mcp" value={form.url} /></label>
      ) : (
        <label className="grid gap-1 text-muted-foreground text-xs">Command（每行一個參數）<Textarea aria-label="MCP Local command" className="min-h-20 font-mono text-xs" onChange={(event) => onChange({ command: event.target.value })} placeholder={'npx\n-y\n@modelcontextprotocol/server-everything'} value={form.command} /></label>
      )}
      <details className="rounded-lg border border-border/70 bg-background px-3 py-2" open>
        <summary className="cursor-pointer text-muted-foreground text-xs">進階設定</summary>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-muted-foreground text-xs">CWD<Input aria-label="MCP CWD" onChange={(event) => onChange({ cwd: event.target.value })} placeholder="." value={form.cwd} /></label>
            <label className="grid gap-1 text-muted-foreground text-xs">Timeout（毫秒）<Input aria-label="MCP timeout" inputMode="numeric" onChange={(event) => onChange({ timeout: event.target.value })} placeholder="5000" value={form.timeout} /></label>
          </div>
          {form.type === "remote" ? (
            <>
              <KeyValueEditor label="Headers" keyPlaceholder="Header 名稱" rows={form.headers} valuePlaceholder="Header 值" onChange={(headers) => onChange({ headers })} />
              <OAuthEditor form={form.oauth} onChange={(oauth) => onChange({ oauth })} />
            </>
          ) : (
            <KeyValueEditor label="Environment" keyPlaceholder="變數名稱" rows={form.environment} valuePlaceholder="變數值" onChange={(environment) => onChange({ environment })} />
          )}
        </div>
      </details>
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="outline">取消</Button>
        <Button disabled={!form.name.trim() || testLoading} onClick={onTestConnection} size="sm" variant="outline">{testLoading ? "測試中..." : "測試連線"}</Button>
        <Button disabled={!form.name.trim()} onClick={onSubmit} size="sm">{view === "add" ? "加入" : "儲存"}</Button>
      </div>
      {testResult && (
        <p aria-live="polite" className={`text-xs ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} role="status">
          {testResult.message}
        </p>
      )}
    </div>
  );
}

function KeyValueEditor({ keyPlaceholder, label, onChange, rows, valuePlaceholder }: {
  keyPlaceholder: string;
  label: string;
  onChange: (rows: McpKeyValueField[]) => void;
  rows: McpKeyValueField[];
  valuePlaceholder: string;
}) {
  const visibleRows = rows.length > 0 ? rows : [{ key: "", value: "" }];

  function updateRow(index: number, field: keyof McpKeyValueField, value: string) {
    onChange(visibleRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  function removeRow(index: number) {
    const next = visibleRows.filter((_, rowIndex) => rowIndex !== index);
    onChange(next.length > 0 ? next : [{ key: "", value: "" }]);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{label}</span>
        <Button aria-label={`新增${label}`} onClick={() => onChange([...visibleRows, { key: "", value: "" }])} size="xs" type="button" variant="outline"><PlusIcon aria-hidden="true" /></Button>
      </div>
      {visibleRows.map((row, index) => (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" key={`${label}-${index}`}>
          <Input aria-label={`${label} 名稱 ${index + 1}`} onChange={(event) => updateRow(index, "key", event.target.value)} placeholder={keyPlaceholder} value={row.key} />
          <Input aria-label={`${label} 值 ${index + 1}`} onChange={(event) => updateRow(index, "value", event.target.value)} placeholder={valuePlaceholder} value={row.value} />
          <Button aria-label={`刪除${label}第 ${index + 1} 列`} className="size-9" onClick={() => removeRow(index)} size="sm" type="button" variant="ghost"><MinusIcon aria-hidden="true" /></Button>
        </div>
      ))}
    </div>
  );
}

function OAuthEditor({ form, onChange }: { form: McpOAuthForm; onChange: (form: McpOAuthForm) => void }) {
  return (
    <div className="grid gap-2">
      <span className="text-muted-foreground text-xs">OAuth</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-muted-foreground text-xs">Client ID<Input aria-label="OAuth Client ID" onChange={(event) => onChange({ ...form, clientId: event.target.value })} placeholder="Client ID" value={form.clientId} /></label>
        <label className="grid gap-1 text-muted-foreground text-xs">Client Secret<Input aria-label="OAuth Client Secret" onChange={(event) => onChange({ ...form, clientSecret: event.target.value })} placeholder="Client Secret" type="password" value={form.clientSecret} /></label>
      </div>
      <label className="grid gap-1 text-muted-foreground text-xs">Scope<Input aria-label="OAuth Scope" onChange={(event) => onChange({ ...form, scope: event.target.value })} placeholder="tools:read tools:execute" value={form.scope} /></label>
      <label className="flex items-center gap-2 text-muted-foreground text-xs"><Checkbox checked={form.disabled} onCheckedChange={(checked) => onChange({ ...form, disabled: checked === true })} />停用自動 OAuth</label>
    </div>
  );
}
