import {
  ArrowLeftIcon,
  CopyIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { ModalShell } from "@/shared/components/layout/ModalShell";

export type UserSettingsSection = "model-providers" | "platform-management";

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
  filteredModelProviders: ModelProvider[];
  modelProviderSearch: string;
  onClose: () => void;
  onModelProviderSearchChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onProviderAuthMethodChange: (method: string) => void;
  onProviderSelect: (providerId: string) => void;
  onProviderUpdate: (providerId: string, updates: Partial<ModelProvider>) => void;
  onProviderViewBack: () => void;
  onSectionChange: (section: UserSettingsSection) => void;
  open: boolean;
  section: UserSettingsSection;
  selectedAuthMethod: string | null;
  selectedProvider: ModelProvider | null;
};

export function UserSettingsModal({
  filteredModelProviders,
  modelProviderSearch,
  onClose,
  onModelProviderSearchChange,
  onOpenChange,
  onProviderAuthMethodChange,
  onProviderSelect,
  onProviderUpdate,
  onProviderViewBack,
  onSectionChange,
  open,
  section,
  selectedAuthMethod,
  selectedProvider,
}: UserSettingsModalProps) {
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
          ) : (
            <PlatformManagementPanel />
          )}
        </main>
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
    <aside className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-border/70 border-r bg-muted/25 px-3 py-5 max-sm:border-r-0 max-sm:border-b">
      <div className="mb-5 px-2">
        <h2 className="font-semibold text-base">設定</h2>
        <p className="mt-1 text-muted-foreground text-xs">模型商與平台管理。</p>
      </div>

      <nav aria-label="使用者設定分類" className="grid content-start gap-1">
        <SettingsNavButton
          active={activeSection === "model-providers"}
          icon={<SettingsIcon aria-hidden="true" className="size-4" />}
          label="模型商"
          onClick={() => onSectionChange("model-providers")}
        />
        <SettingsNavButton
          active={activeSection === "platform-management"}
          icon={<ServerIcon aria-hidden="true" className="size-4" />}
          label="平台管理"
          onClick={() => onSectionChange("platform-management")}
        />
      </nav>

      <div className="px-2 pt-6 text-muted-foreground text-xs">
        <p className="font-semibold">OpenCode Desktop</p>
        <p className="mt-1">v1.16.0</p>
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
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-left font-medium text-sm transition ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"}`}
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
    <div className="mx-auto grid max-w-[680px] gap-7">
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
        <h3 className="font-semibold text-lg">
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
      className="grid gap-3 pr-8"
      aria-labelledby="provider-auth-methods-title"
    >
      <p className="text-muted-foreground text-sm" id="provider-auth-methods-title">
        選擇 {selectedProvider.name} 的登錄方式。
      </p>
      <div className="grid gap-1 pl-4">
        {selectedProvider.authMethods.map((method) => (
          <button
            className="flex min-h-9 w-full items-center rounded-lg px-3 text-left font-medium text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={method}
            onClick={() => onProviderAuthMethodChange(method)}
            type="button"
          >
            {method}
          </button>
        ))}
      </div>
    </section>
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
