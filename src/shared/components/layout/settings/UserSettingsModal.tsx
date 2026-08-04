import { XIcon } from "lucide-react";
import type { NpmPackageEntry, NpmPackageScope } from "@/shared/api/opencodeNpmPackages";
import type { OpenCodeAuthMethod } from "@/shared/api/opencodeProviders";
import { Button } from "@/shared/components/ui/button";
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell";
import { cn } from "@/shared/utils/cn";
import { DeploymentPlatformsPanel, PlatformManagementPanel } from "./UserSettingsPlatformPanels";
import { ModelProvidersPanel } from "./UserSettingsModelProviders";
import { ModelsPanel } from "./UserSettingsModelsPanel";
import { NpmPackagesPanel } from "./UserSettingsNpmPackagesPanel";
import { ExtensionsPanel } from "./UserSettingsExtensionsPanel";
import { SettingsSidebar } from "./UserSettingsSidebar";

export type UserSettingsSection =
  | "model-providers"
  | "models"
  | "npm-packages"
  | "extensions"
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
  authMethodDetails?: OpenCodeAuthMethod[];
  availableModels?: Array<{
    contextLimit?: string;
    enabled: boolean;
    id: string;
    key: string;
    name: string;
    outputLimit?: string;
    status?: "alpha" | "beta" | "deprecated" | "active";
  }>;
  verificationCode?: string;
  verificationInstructions?: string;
  verificationMethodIndex?: number;
  verificationMethod?: "auto" | "code";
  verificationUrl?: string;
};

type UserSettingsModalProps = {
  activeProjectName?: string;
  filteredModelProviders: ModelProvider[];
  modelProviders: ModelProvider[];
  modelProviderSearch: string;
  modelSearch: string;
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
  modelSettingsApplying?: boolean;
  modelSettingsChanged?: boolean;
  onClose: () => void;
  onApplyModelSettings: () => Promise<void> | void;
  onApplyNpmPackageChanges: () => Promise<void> | void;
  onCancelModelSettings: () => void;
  onCancelNpmPackageChanges: () => void;
  onClearNpmPackageDelete: () => void;
  disconnectingProviderId: string | null;
  onModelProviderSearchChange: (value: string) => void;
  onModelSearchChange: (value: string) => void;
  onModelToggle: (modelKey: string, enabled: boolean) => void;
  onNpmPackageInputChange: (value: string) => void;
  onNpmPackageTargetChange: (target: NpmPackageScope) => void;
  onOpenChange: (open: boolean) => void;
  onProviderAuthMethodChange: (method: string, inputs?: Record<string, string>) => void;
  onProviderApiKeySubmit: (providerId: string, key: string, inputs?: Record<string, string>) => Promise<void> | void;
  onProviderDisconnect: (providerId: string) => Promise<void> | void;
  onProviderSelect: (providerId: string) => void;
  onProviderViewBack: () => void;
  onRefreshNpmPackages: () => Promise<void> | void;
  onRemoveNpmPackageInstall: (packageSpec: string) => void;
  onSectionChange: (section: UserSettingsSection) => void;
  onStageNpmPackageInstalls: () => void;
  onToggleNpmPackageDelete: (packageName: string) => void;
  open: boolean;
  section: UserSettingsSection;
  selectedAuthMethod: string | null;
  providerAuthApplying: boolean;
  selectedProvider: ModelProvider | null;
};

export function UserSettingsModal({
  activeProjectName,
  filteredModelProviders,
  modelProviders,
  modelProviderSearch,
  modelSearch,
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
  modelSettingsApplying = false,
  modelSettingsChanged = false,
  onClose,
  onApplyModelSettings,
  onApplyNpmPackageChanges,
  onCancelModelSettings,
  onCancelNpmPackageChanges,
  onClearNpmPackageDelete,
  disconnectingProviderId,
  onModelProviderSearchChange,
  onModelSearchChange,
  onModelToggle,
  onNpmPackageInputChange,
  onNpmPackageTargetChange,
  onOpenChange,
  onProviderAuthMethodChange,
  onProviderApiKeySubmit,
  onProviderDisconnect,
  onProviderSelect,
  onProviderViewBack,
  onRefreshNpmPackages,
  onRemoveNpmPackageInstall,
  onSectionChange,
  onStageNpmPackageInstalls,
  onToggleNpmPackageDelete,
  open,
  section,
  selectedAuthMethod,
  providerAuthApplying,
  selectedProvider,
}: UserSettingsModalProps) {
  const hasNpmPackageChanges = npmPackagesToInstall.length > 0 || npmPackagesToDelete.length > 0;
  const showBatchFooter = section === "npm-packages" || section === "models";

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

        <div className={cn("grid min-h-0", showBatchFooter ? "grid-rows-[minmax(0,1fr)_auto]" : "grid-rows-[minmax(0,1fr)]")}>
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
                disconnectingProviderId={disconnectingProviderId}
                filteredModelProviders={filteredModelProviders}
                modelProviderSearch={modelProviderSearch}
                onProviderAuthMethodChange={onProviderAuthMethodChange}
                onProviderApiKeySubmit={onProviderApiKeySubmit}
                onProviderDisconnect={onProviderDisconnect}
                onProviderSearchChange={onModelProviderSearchChange}
                onProviderSelect={onProviderSelect}
                onProviderViewBack={onProviderViewBack}
                selectedAuthMethod={selectedAuthMethod}
                providerAuthApplying={providerAuthApplying}
                selectedProvider={selectedProvider}
              />
            ) : section === "models" ? (
              <ModelsPanel
                modelProviders={modelProviders}
                modelSearch={modelSearch}
                onModelSearchChange={onModelSearchChange}
                onModelToggle={onModelToggle}
              />
            ) : section === "npm-packages" ? (
              <NpmPackagesPanel
                activeProjectName={activeProjectName}
                applying={npmPackagesApplying}
                error={npmPackagesError}
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
                target={npmPackageTarget}
              />
            ) : section === "extensions" ? (
              <ExtensionsPanel activeProjectName={activeProjectName} />
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
                  {hasNpmPackageChanges
                    ? `待新增 ${npmPackagesToInstall.length} 個，待刪除 ${npmPackagesToDelete.length} 個。按更新後才會正式安裝/刪除。`
                    : "安裝與刪除會先加入前端暫存清單，不會立即下載或移除。"}
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

          {section === "models" && (
            <div
              className={cn(
                "flex shrink-0 flex-wrap items-center justify-between gap-3 border-border/70 border-t bg-background px-10 py-4 max-sm:px-5",
                modelSettingsChanged && "border-amber-300 bg-amber-50/80",
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  {modelSettingsChanged ? "模型開關變更尚未更新" : "尚未變更模型開關"}
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {modelSettingsChanged
                    ? "按更新後才會正式寫入 OpenCode volume 的 model-settings.json。"
                    : "模型開關會先暫存在前端，不會立即寫入 JSON。"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={modelSettingsApplying || !modelSettingsChanged}
                  onClick={onCancelModelSettings}
                  size="lg"
                  variant="outline"
                >
                  取消
                </Button>
                <Button
                  disabled={modelSettingsApplying || !modelSettingsChanged}
                  loading={modelSettingsApplying}
                  onClick={() => void onApplyModelSettings()}
                  size="lg"
                >
                  {modelSettingsApplying ? "更新中..." : "更新"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
