import type { NpmPackageEntry, NpmPackageScope } from "@/shared/api/opencodeNpmPackages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { cn } from "@/shared/utils/cn";
import { Trash2Icon, XIcon } from "lucide-react";

type NpmPackagesPanelProps = {
  activeProjectName?: string;
  applying: boolean;
  error?: string | null;
  input: string;
  loading: boolean;
  onClearDeleteSelection: () => void;
  onInputChange: (value: string) => void;
  onRemoveInstallPackage: (packageSpec: string) => void;
  onRefresh: () => Promise<void> | void;
  onStageInstalls: () => void;
  onTargetChange: (target: NpmPackageScope) => void;
  onToggleDeletePackage: (packageName: string) => void;
  packageJsonPath?: string;
  packages: NpmPackageEntry[];
  packagesToInstall: string[];
  packagesToDelete: string[];
  root?: string;
  target: NpmPackageScope;
};

export function NpmPackagesPanel({
  activeProjectName,
  applying,
  error,
  input,
  loading,
  onClearDeleteSelection,
  onInputChange,
  onRemoveInstallPackage,
  onRefresh,
  onStageInstalls,
  onTargetChange,
  onToggleDeletePackage,
  packageJsonPath,
  packages,
  packagesToInstall,
  packagesToDelete,
  root,
  target,
}: NpmPackagesPanelProps) {
  const projectTargetUnavailable = target === "project" && !activeProjectName;
  const pendingInstallCount = new Set(input.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)).size;
  const pendingDeleteCount = packagesToDelete.length;
  const stagedInstallCount = packagesToInstall.length;
  const hasStagedChanges = stagedInstallCount > 0 || pendingDeleteCount > 0;

  return (
    <div className="mx-auto grid max-w-[680px] gap-6">
      <div className="grid gap-1 pr-8">
        <h3 className="font-semibold text-lg">NPM 套件</h3>
        <p className="text-muted-foreground text-sm">
          安裝 JS/TS tool 會 import 的 npm 套件，可選擇安裝到當前 Project 或 Global。
        </p>
      </div>

      <section className="grid gap-4 rounded-xl bg-muted/45 p-4" aria-labelledby="npm-package-install-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm" id="npm-package-install-title">
              批次套件變更
            </h4>
            <p className="mt-0.5 text-muted-foreground text-xs">
              支援 registry package，例如 zod、lodash@latest、@scope/pkg@1.2.3。按新增只會加入待更新清單。
            </p>
          </div>
          <Button disabled={loading || applying} onClick={() => void onRefresh()} size="sm" variant="outline">
            重新整理
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-2 text-muted-foreground text-sm">
            安裝位置
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => onTargetChange(event.target.value as NpmPackageScope)}
              value={target}
            >
              <option value="project">當前 Project</option>
              <option value="global">Global</option>
            </select>
          </label>
          <label className="grid gap-2 text-muted-foreground text-sm">
            套件名稱
            <InputGroup>
              <InputGroupInput
                disabled={applying}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="zod lodash@latest @scope/pkg"
                value={input}
              />
            </InputGroup>
          </label>
          <Button
            disabled={loading || applying || projectTargetUnavailable || pendingInstallCount === 0}
            onClick={onStageInstalls}
          >
            新增到待更新
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge size="sm" variant={stagedInstallCount > 0 ? "secondary" : "outline"}>
            待新增 {stagedInstallCount}
          </Badge>
          <Badge size="sm" variant={pendingDeleteCount > 0 ? "secondary" : "outline"}>
            待刪除 {pendingDeleteCount}
          </Badge>
          <span className="text-muted-foreground">
            底部按更新後才會正式安裝/刪除。
          </span>
        </div>

        {projectTargetUnavailable && (
          <p className="rounded-lg border border-dashed bg-background px-3 py-2 text-muted-foreground text-xs">
            請先開啟一個 project，才能修改當前 Project。
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs">
            {error}
          </p>
        )}
      </section>

      {hasStagedChanges && (
        <section className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4" aria-labelledby="npm-package-pending-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-sm" id="npm-package-pending-title">
                待更新清單
              </h4>
              <p className="mt-0.5 text-muted-foreground text-xs">
                這些變更目前只存在前端，底部按更新後才會執行。
              </p>
            </div>
            <Badge size="sm" variant="secondary">
              {stagedInstallCount + pendingDeleteCount}
            </Badge>
          </div>

          {packagesToInstall.length > 0 && (
            <div className="grid gap-2">
              <p className="font-medium text-xs text-muted-foreground">待新增</p>
              <div className="flex flex-wrap gap-2">
                {packagesToInstall.map((packageSpec) => (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-emerald-800 text-xs transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={applying}
                    key={packageSpec}
                    onClick={() => onRemoveInstallPackage(packageSpec)}
                    type="button"
                  >
                    + {packageSpec}
                    <XIcon aria-hidden="true" className="size-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {packagesToDelete.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-muted-foreground text-xs">待刪除</p>
                <Button disabled={applying} onClick={onClearDeleteSelection} size="xs" variant="ghost">
                  清除刪除選取
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {packagesToDelete.map((packageName) => (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-red-700 text-xs transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={applying}
                    key={packageName}
                    onClick={() => onToggleDeletePackage(packageName)}
                    type="button"
                  >
                    - {packageName}
                    <XIcon aria-hidden="true" className="size-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-3" aria-labelledby="npm-package-installed-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm" id="npm-package-installed-title">
              已安裝套件
            </h4>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {target === "global" ? "Global" : activeProjectName ? `Project: ${activeProjectName}` : "Project"}
            </p>
          </div>
          <Badge size="sm" variant="secondary">
            {packages.length}
          </Badge>
        </div>

        {(root || packageJsonPath) && (
          <div className="grid gap-1 rounded-2xl border border-border/70 bg-gradient-to-r from-muted/60 to-background px-4 py-3 text-xs shadow-sm">
            {root && <p className="break-all text-muted-foreground">root: <span className="font-mono text-foreground">{root}</span></p>}
            {packageJsonPath && <p className="break-all text-muted-foreground">package.json: <span className="font-mono text-foreground">{packageJsonPath}</span></p>}
          </div>
        )}

        {loading ? (
          <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-4 text-center text-muted-foreground text-sm">
            正在讀取 npm packages...
          </p>
        ) : packages.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-4 text-center text-muted-foreground text-sm">
            目前沒有 dependencies。
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {packages.map((item) => {
              const selectedForDelete = packagesToDelete.includes(item.name);

              return (
                <li
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/55 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                    selectedForDelete && "border-destructive/50 from-destructive/6 to-destructive/10",
                  )}
                  key={item.name}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-semibold text-primary text-xs">
                      npm
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-mono font-semibold text-sm leading-5">
                        {item.name}
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {target === "global" ? "Global dependency" : "Project dependency"}
                      </p>
                    </div>
                    <Button
                      aria-pressed={selectedForDelete}
                      className={selectedForDelete ? undefined : "text-destructive hover:text-destructive"}
                      disabled={applying}
                      onClick={() => onToggleDeletePackage(item.name)}
                      size="xs"
                      variant={selectedForDelete ? "destructive" : "destructive-outline"}
                    >
                      <Trash2Icon aria-hidden="true" className="size-4" />
                      {selectedForDelete ? "待刪除" : "刪除"}
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Badge size="sm" variant="outline">
                      {item.version}
                    </Badge>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-[11px] uppercase tracking-wide">
                      package.json
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
