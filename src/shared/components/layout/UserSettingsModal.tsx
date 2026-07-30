import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  KeyRoundIcon,
  PackageIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  TerminalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { NpmPackageEntry, NpmPackageScope } from "@/shared/api/opencodeNpmPackages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { ModalShell } from "@/shared/components/layout/ModalShell";
import { cn } from "@/shared/utils/cn";

export type UserSettingsSection =
  | "model-providers"
  | "npm-packages"
  | "platform-management"
  | "deployment-platforms";

export type ModelProvider = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  connected: boolean;
  enabled: boolean;
  npm: string;
  baseUrl: string;
  apiKey: string;
  headersJson: string;
  defaultModel: string;
  modelDisplayName: string;
  contextLimit: string;
  outputLimit: string;
  whitelist: string;
  blacklist: string;
  authMethods: string[];
};

type UserSettingsModalProps = {
  activeProjectName?: string;
  filteredModelProviders: ModelProvider[];
  modelProviderSearch: string;
  npmPackageInput: string;
  npmPackageJsonPath?: string;
  npmPackageRoot?: string;
  npmPackages: NpmPackageEntry[];
  npmPackagesApplying?: boolean;
  npmPackagesError?: string | null;
  npmPackagesLoading?: boolean;
  npmPackagesToInstall: string[];
  npmPackagesToDelete: string[];
  npmPackageTarget: NpmPackageScope;
  onClose: () => void;
  onApplyNpmPackageChanges: () => Promise<void> | void;
  onCancelNpmPackageChanges: () => void;
  onClearNpmPackageDelete: () => void;
  onModelProviderSearchChange: (value: string) => void;
  onNpmPackageInputChange: (value: string) => void;
  onNpmPackageTargetChange: (target: NpmPackageScope) => void;
  onOpenChange: (open: boolean) => void;
  onProviderAuthMethodChange: (method: string) => void;
  onProviderSelect: (providerId: string) => void;
  onProviderUpdate: (providerId: string, updates: Partial<ModelProvider>) => void;
  onProviderViewBack: () => void;
  onRefreshNpmPackages: () => Promise<void> | void;
  onRemoveNpmPackageInstall: (packageSpec: string) => void;
  onSectionChange: (section: UserSettingsSection) => void;
  onStageNpmPackageInstalls: () => void;
  onToggleNpmPackageDelete: (packageName: string) => void;
  open: boolean;
  section: UserSettingsSection;
  selectedAuthMethod: string | null;
  selectedProvider: ModelProvider | null;
};

export function UserSettingsModal({
  activeProjectName,
  filteredModelProviders,
  modelProviderSearch,
  npmPackageInput,
  npmPackageJsonPath,
  npmPackageRoot,
  npmPackages,
  npmPackagesApplying = false,
  npmPackagesError,
  npmPackagesLoading = false,
  npmPackagesToInstall,
  npmPackagesToDelete,
  npmPackageTarget,
  onClose,
  onApplyNpmPackageChanges,
  onCancelNpmPackageChanges,
  onClearNpmPackageDelete,
  onModelProviderSearchChange,
  onNpmPackageInputChange,
  onNpmPackageTargetChange,
  onOpenChange,
  onProviderAuthMethodChange,
  onProviderSelect,
  onProviderUpdate,
  onProviderViewBack,
  onRefreshNpmPackages,
  onRemoveNpmPackageInstall,
  onSectionChange,
  onStageNpmPackageInstalls,
  onToggleNpmPackageDelete,
  open,
  section,
  selectedAuthMethod,
  selectedProvider,
}: UserSettingsModalProps) {
  const hasNpmPackageChanges = npmPackagesToInstall.length > 0 || npmPackagesToDelete.length > 0;

  return (
    <ModalShell
      ariaLabel="使用者設定"
      bodyClassName="p-0"
      closeAriaLabel="關閉使用者設定"
      maxWidth="max-w-[960px]"
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="h-[min(86dvh,640px)]"
      showHeader={false}
    >
      <div className="grid h-full min-h-0 grid-cols-[200px_minmax(0,1fr)] bg-background max-sm:grid-cols-1">
        <SettingsSidebar
          activeSection={section}
          onSectionChange={onSectionChange}
        />

        <div className={cn("grid min-h-0", section === "npm-packages" ? "grid-rows-[minmax(0,1fr)_auto]" : "grid-rows-[minmax(0,1fr)]")}>
          <main className="relative min-h-0 overflow-y-auto px-10 py-8 max-sm:px-5">
            <button
              aria-label="關閉使用者設定"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
              type="button"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>

            {section === "model-providers" ? (
              <ModelProvidersPanel
                filteredModelProviders={filteredModelProviders}
                modelProviderSearch={modelProviderSearch}
                onProviderAuthMethodChange={onProviderAuthMethodChange}
                onProviderSearchChange={onModelProviderSearchChange}
                onProviderSelect={onProviderSelect}
                onProviderUpdate={onProviderUpdate}
                onProviderViewBack={onProviderViewBack}
                selectedAuthMethod={selectedAuthMethod}
                selectedProvider={selectedProvider}
              />
            ) : section === "npm-packages" ? (
              <NpmPackagesPanel
                activeProjectName={activeProjectName}
                applying={npmPackagesApplying}
                input={npmPackageInput}
                loading={npmPackagesLoading}
                onClearDeleteSelection={onClearNpmPackageDelete}
                onInputChange={onNpmPackageInputChange}
                onRemoveInstallPackage={onRemoveNpmPackageInstall}
                onRefresh={onRefreshNpmPackages}
                onStageInstalls={onStageNpmPackageInstalls}
                onTargetChange={onNpmPackageTargetChange}
                onToggleDeletePackage={onToggleNpmPackageDelete}
                packageJsonPath={npmPackageJsonPath}
                packages={npmPackages}
                packagesToInstall={npmPackagesToInstall}
                packagesToDelete={npmPackagesToDelete}
                root={npmPackageRoot}
                error={npmPackagesError}
                target={npmPackageTarget}
              />
            ) : section === "platform-management" ? (
              <PlatformManagementPanel />
            ) : (
              <DeploymentPlatformsPanel />
            )}
          </main>

          {section === "npm-packages" && (
            <div
              className={cn(
                "flex shrink-0 flex-wrap items-center justify-between gap-3 border-border/70 border-t bg-background px-10 py-4 max-sm:px-5",
                hasNpmPackageChanges && "border-amber-300 bg-amber-50/80",
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  {hasNpmPackageChanges ? "套件變更尚未更新" : "尚未選取套件變更"}
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {hasNpmPackageChanges ? `待新增 ${npmPackagesToInstall.length} 個，待刪除 ${npmPackagesToDelete.length} 個。按更新後才會正式安裝/刪除。` : "安裝與刪除會先加入前端暫存清單，不會立即下載或移除。"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={npmPackagesApplying || !hasNpmPackageChanges}
                  onClick={onCancelNpmPackageChanges}
                  size="lg"
                  variant="outline"
                >
                  取消
                </Button>
                <Button
                  disabled={npmPackagesApplying || !hasNpmPackageChanges}
                  loading={npmPackagesApplying}
                  onClick={() => void onApplyNpmPackageChanges()}
                  size="lg"
                >
                  {npmPackagesApplying ? "更新中..." : "更新"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function SettingsSidebar({
  activeSection,
  onSectionChange,
}: {
  activeSection: UserSettingsSection;
  onSectionChange: (section: UserSettingsSection) => void;
}) {
  return (
    <aside className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-border/70 border-r bg-muted/20 px-3 py-5 max-sm:border-r-0 max-sm:border-b">
      <div className="mb-6 px-2">
        <h2 className="font-semibold text-base">設定</h2>
        <p className="mt-1 text-muted-foreground text-xs">
          模型商、平台與部署管理。
        </p>
      </div>

      <nav aria-label="使用者設定分類" className="grid content-start gap-1.5">
        <SettingsNavButton
          active={activeSection === "model-providers"}
          icon={<SettingsIcon aria-hidden="true" className="size-4" />}
          label="模型商"
          onClick={() => onSectionChange("model-providers")}
        />
        <SettingsNavButton
          active={activeSection === "npm-packages"}
          icon={<PackageIcon aria-hidden="true" className="size-4" />}
          label="NPM 套件"
          onClick={() => onSectionChange("npm-packages")}
        />
        <SettingsNavButton
          active={activeSection === "platform-management"}
          icon={<ServerIcon aria-hidden="true" className="size-4" />}
          label="平台管理"
          onClick={() => onSectionChange("platform-management")}
        />
        <SettingsNavButton
          active={activeSection === "deployment-platforms"}
          icon={<RocketIcon aria-hidden="true" className="size-4" />}
          label="自動部屬平台"
          onClick={() => onSectionChange("deployment-platforms")}
        />
      </nav>

      <div className="px-2 pt-6 text-muted-foreground text-xs leading-5">
        <p className="font-semibold">OpenCode Desktop</p>
        <p>v1.16.0</p>
      </div>
    </aside>
  );
}

function SettingsNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-left font-medium text-sm transition ${active ? "bg-accent text-foreground shadow-sm/5" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function ModelProvidersPanel({
  filteredModelProviders,
  modelProviderSearch,
  onProviderAuthMethodChange,
  onProviderSearchChange,
  onProviderSelect,
  onProviderUpdate,
  onProviderViewBack,
  selectedAuthMethod,
  selectedProvider,
}: {
  filteredModelProviders: ModelProvider[];
  modelProviderSearch: string;
  onProviderAuthMethodChange: (method: string) => void;
  onProviderSearchChange: (value: string) => void;
  onProviderSelect: (providerId: string) => void;
  onProviderUpdate: (providerId: string, updates: Partial<ModelProvider>) => void;
  onProviderViewBack: () => void;
  selectedAuthMethod: string | null;
  selectedProvider: ModelProvider | null;
}) {
  return (
    <div className="mx-auto grid max-w-[680px] gap-8">
      <ModelProvidersHeader
        modelProviderSearch={modelProviderSearch}
        onProviderSearchChange={onProviderSearchChange}
        onProviderViewBack={onProviderViewBack}
        selectedProvider={selectedProvider}
      />

      {!selectedProvider ? (
        <ModelProvidersList
          filteredModelProviders={filteredModelProviders}
          onProviderSelect={onProviderSelect}
          onProviderUpdate={onProviderUpdate}
        />
      ) : selectedAuthMethod ? (
        <ProviderVerificationPanel selectedProvider={selectedProvider} />
      ) : (
        <ProviderAuthMethodsPanel
          onProviderAuthMethodChange={onProviderAuthMethodChange}
          selectedProvider={selectedProvider}
        />
      )}
    </div>
  );
}

function ModelProvidersHeader({
  modelProviderSearch,
  onProviderSearchChange,
  onProviderViewBack,
  selectedProvider,
}: {
  modelProviderSearch: string;
  onProviderSearchChange: (value: string) => void;
  onProviderViewBack: () => void;
  selectedProvider: ModelProvider | null;
}) {
  return (
    <div className="grid gap-4 pr-8">
      <div className="flex min-w-0 items-center gap-2">
        {selectedProvider && (
          <button
            aria-label="返回模型供應商列表"
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onProviderViewBack}
            type="button"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
          </button>
        )}
        <h3 className="font-semibold text-lg tracking-[-0.01em]">
          {selectedProvider ? `連接 ${selectedProvider.name}` : "模型商"}
        </h3>
      </div>

      {!selectedProvider && (
        <InputGroup data-size="sm">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="搜尋模型商"
            onChange={(event) => onProviderSearchChange(event.target.value)}
            placeholder="搜尋模型商"
            value={modelProviderSearch}
          />
          {modelProviderSearch && (
            <InputGroupAddon align="inline-end">
              <button
                aria-label="清除模型商搜尋"
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => onProviderSearchChange("")}
                type="button"
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            </InputGroupAddon>
          )}
        </InputGroup>
      )}
    </div>
  );
}

function ModelProvidersList({
  filteredModelProviders,
  onProviderSelect,
  onProviderUpdate,
}: {
  filteredModelProviders: ModelProvider[];
  onProviderSelect: (providerId: string) => void;
  onProviderUpdate: (providerId: string, updates: Partial<ModelProvider>) => void;
}) {
  const connectedProviders = filteredModelProviders.filter(
    (provider) => provider.connected,
  );
  const disconnectedProviders = filteredModelProviders.filter(
    (provider) => !provider.connected,
  );

  return (
    <div className="grid gap-8">
      <ProviderSection title="已連接模型商">
        {connectedProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            action={
              <Button
                onClick={() =>
                  onProviderUpdate(provider.id, {
                    connected: false,
                    enabled: false,
                  })
                }
                size="sm"
                variant="ghost"
              >
                斷開連接
              </Button>
            }
            provider={provider}
          />
        ))}
      </ProviderSection>

      <ProviderSection title="熱門模型商">
        {disconnectedProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            action={
              <Button
                onClick={() => onProviderSelect(provider.id)}
                size="sm"
                variant="outline"
              >
                <PlusIcon aria-hidden="true" />
                連接
              </Button>
            }
            provider={provider}
          />
        ))}
      </ProviderSection>

      {filteredModelProviders.length === 0 && (
        <p className="rounded-md border border-dashed bg-background px-3 py-8 text-center text-muted-foreground text-sm">
          找不到符合的模型商。
        </p>
      )}
    </div>
  );
}

function ProviderSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <h4 className="font-semibold text-sm">{title}</h4>
      <ul className="overflow-hidden rounded-lg bg-muted/45">{children}</ul>
    </section>
  );
}

function ProviderCard({
  action,
  provider,
}: {
  action: ReactNode;
  provider: ModelProvider;
}) {
  return (
    <li className="border-border/70 border-b last:border-b-0">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-5 shrink-0 place-items-center font-bold text-sm">
            {provider.icon}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <strong className="truncate font-semibold text-sm">
                {provider.name}
              </strong>
              {provider.connected && (
                <Badge size="sm" variant="secondary">
                  API 密鑰
                </Badge>
              )}
              {provider.badge && !provider.connected && (
                <Badge size="sm" variant="secondary">
                  {provider.badge}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-muted-foreground text-xs">
              {provider.description}
            </p>
          </div>
        </div>
        {action}
      </div>
    </li>
  );
}

function ProviderVerificationPanel({
  selectedProvider,
}: {
  selectedProvider: ModelProvider;
}) {
  return (
    <section
      className="grid gap-6 pr-8"
      aria-labelledby="provider-verification-title"
    >
      <p
        className="text-muted-foreground text-sm leading-6"
        id="provider-verification-title"
      >
        訪問{" "}
        <button
          className="font-medium text-foreground underline underline-offset-4"
          type="button"
        >
          此鏈接
        </button>{" "}
        並輸入以下代碼，以連接你的帳戶並在 OpenCode 中使用 {selectedProvider.name} 模型。
      </p>
      <label className="grid gap-2 text-muted-foreground text-xs">
        確認碼
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-lg border bg-muted/35">
          <input
            aria-label="確認碼"
            className="h-9 min-w-0 rounded-l-lg border-0 bg-transparent px-3 font-mono text-foreground text-sm outline-none"
            readOnly
            value="V58L-H67ZK"
          />
          <button
            aria-label="複製確認碼"
            className="grid size-9 place-items-center rounded-r-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <CopyIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
      </label>
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <span
          aria-hidden="true"
          className="grid size-4 grid-cols-2 gap-0.5 opacity-60"
        >
          <span className="rounded-[1px] bg-current" />
          <span className="rounded-[1px] bg-current/40" />
          <span className="rounded-[1px] bg-current/40" />
          <span className="rounded-[1px] bg-current" />
        </span>
        等待授權...
      </div>
    </section>
  );
}

function ProviderAuthMethodsPanel({
  onProviderAuthMethodChange,
  selectedProvider,
}: {
  onProviderAuthMethodChange: (method: string) => void;
  selectedProvider: ModelProvider;
}) {
  return (
    <section
      className="grid pr-8"
      aria-labelledby="provider-auth-methods-title"
    >
      <div className="grid max-w-[560px] gap-4 pt-0">
        <p
          className="text-muted-foreground text-sm leading-6"
          id="provider-auth-methods-title"
        >
          選擇登入方式，稍後可在模型商設定中切換或重新驗證。
        </p>

        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm/5">
          {selectedProvider.authMethods.map((method) => {
            const detail = getAuthMethodDetail(method);
            const Icon = detail.icon;

            return (
              <button
                className="group grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-border/70 border-b px-4 py-3.5 text-left transition last:border-b-0 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                key={method}
                onClick={() => onProviderAuthMethodChange(method)}
                type="button"
              >
                <span className="grid size-9 place-items-center rounded-xl border bg-muted/35 text-muted-foreground transition group-hover:border-foreground/20 group-hover:bg-background group-hover:text-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-sm">
                    {method}
                  </span>
                  <span className="mt-0.5 block truncate text-muted-foreground text-xs">
                    {detail.description}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-muted-foreground text-xs transition group-hover:bg-background group-hover:text-foreground">
                  選擇
                  <ChevronRightIcon aria-hidden="true" className="size-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-muted-foreground text-xs leading-5">
          建議本機開發使用 browser，伺服器或 Docker 環境使用 headless，正式環境使用 API 密鑰。
        </p>
      </div>
    </section>
  );
}

function getAuthMethodDetail(method: string) {
  const normalized = method.toLowerCase();

  if (normalized.includes("headless")) {
    return {
      description: "適合遠端主機、Docker 與無瀏覽器環境。",
      icon: TerminalIcon,
    };
  }

  if (normalized.includes("api")) {
    return {
      description: "使用環境變數或密鑰連線，適合正式部署。",
      icon: KeyRoundIcon,
    };
  }

  return {
    description: "透過瀏覽器授權，最適合本機快速連接。",
    icon: GlobeIcon,
  };
}

function NpmPackagesPanel({
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
}: {
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
}) {
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

function PlatformManagementPanel() {
  return (
    <div className="mx-auto grid max-w-[680px] gap-6">
      <div className="grid gap-1 pr-8">
        <h3 className="font-semibold text-lg">平台管理</h3>
        <p className="text-muted-foreground text-sm">
          管理可串接的工作平台與服務。
        </p>
      </div>
      <section className="grid gap-3" aria-labelledby="platform-management-title">
        <h4 className="font-semibold text-sm" id="platform-management-title">
          可用平台
        </h4>
        <button
          className="flex min-h-16 items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#0078d4] font-semibold text-sm text-white">
              AZ
            </span>
            <div className="min-w-0">
              <strong className="truncate font-semibold text-sm">
                Azure DevOps
              </strong>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                連接組織、專案、Repos 與 Boards。
              </p>
            </div>
          </div>
          <Badge size="sm" variant="secondary">
            尚未連接
          </Badge>
        </button>
      </section>
    </div>
  );
}

function DeploymentPlatformsPanel() {
  return (
    <div className="mx-auto grid max-w-[680px] gap-6">
      <div className="grid gap-1 pr-8">
        <h3 className="font-semibold text-lg">自動部屬平台</h3>
        <p className="text-muted-foreground text-sm">
          管理 CI/CD、環境變數、Build hooks 與發佈狀態。
        </p>
      </div>
      <section className="grid gap-3" aria-labelledby="deployment-platforms-title">
        <h4 className="font-semibold text-sm" id="deployment-platforms-title">
          可用平台
        </h4>
        <button
          className="flex min-h-16 items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-600 font-semibold text-sm text-white">
              CD
            </span>
            <div className="min-w-0">
              <strong className="truncate font-semibold text-sm">
                自動部屬平台
              </strong>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                連接部署流程、環境變數、Build hooks 與發佈狀態。
              </p>
            </div>
          </div>
          <Badge size="sm" variant="secondary">
            尚未連接
          </Badge>
        </button>
      </section>
    </div>
  );
}
