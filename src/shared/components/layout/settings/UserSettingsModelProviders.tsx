import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  KeyRoundIcon,
  XIcon,
  PlusIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import { type ReactNode } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import type { ModelProvider } from "./UserSettingsModal";

export function ModelProvidersPanel({
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
