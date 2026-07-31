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
import { type ReactNode, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toastManager } from "@/shared/components/ui/toast";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import type { OpenCodeAuthMethod, OpenCodeAuthMethodPrompt } from "@/shared/api/opencodeProviders";
import type { ModelProvider } from "./UserSettingsModal";

export function ModelProvidersPanel({
  filteredModelProviders,
  modelProviderSearch,
  onProviderAuthMethodChange,
  onProviderApiKeySubmit,
  onProviderDisconnect,
  onProviderSearchChange,
  onProviderSelect,
  onProviderViewBack,
  selectedAuthMethod,
  providerAuthApplying,
  disconnectingProviderId,
  selectedProvider,
}: {
  disconnectingProviderId: string | null;
  filteredModelProviders: ModelProvider[];
  modelProviderSearch: string;
  onProviderAuthMethodChange: (method: string, inputs?: Record<string, string>) => void;
  onProviderApiKeySubmit: (providerId: string, key: string, inputs?: Record<string, string>) => Promise<void> | void;
  onProviderDisconnect: (providerId: string) => Promise<void> | void;
  onProviderSearchChange: (value: string) => void;
  onProviderSelect: (providerId: string) => void;
  onProviderViewBack: () => void;
  providerAuthApplying: boolean;
  selectedAuthMethod: string | null;
  selectedProvider: ModelProvider | null;
}) {
  const selectedAuthMethodDetail = selectedProvider?.authMethodDetails?.find(
    (method) => method.label === selectedAuthMethod,
  );

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
          disconnectingProviderId={disconnectingProviderId}
          filteredModelProviders={filteredModelProviders}
          onProviderDisconnect={onProviderDisconnect}
          onProviderSelect={onProviderSelect}
        />
      ) : selectedAuthMethodDetail?.type === "api" ? (
        <ProviderApiKeyPanel
          applying={providerAuthApplying}
          method={selectedAuthMethodDetail}
          onSubmit={onProviderApiKeySubmit}
          selectedProvider={selectedProvider}
        />
      ) : selectedAuthMethodDetail?.prompts?.length && !selectedProvider.verificationInstructions ? (
        <ProviderPromptPanel
          applying={providerAuthApplying}
          method={selectedAuthMethodDetail}
          onSubmit={(inputs) => onProviderAuthMethodChange(selectedAuthMethodDetail.label, inputs)}
        />
      ) : selectedAuthMethod ? (
        <ProviderVerificationPanel
          selectedProvider={selectedProvider}
        />
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
  disconnectingProviderId,
  filteredModelProviders,
  onProviderDisconnect,
  onProviderSelect,
}: {
  disconnectingProviderId: string | null;
  filteredModelProviders: ModelProvider[];
  onProviderDisconnect: (providerId: string) => Promise<void> | void;
  onProviderSelect: (providerId: string) => void;
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
                disabled={disconnectingProviderId === provider.id}
                loading={disconnectingProviderId === provider.id}
                onClick={() => void onProviderDisconnect(provider.id)}
                size="sm"
                variant="ghost"
              >
                {disconnectingProviderId === provider.id ? "斷開中..." : "斷開連接"}
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
                    已連接
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

function ProviderVerificationPanel({ selectedProvider }: { selectedProvider: ModelProvider }) {
  const verificationCode = selectedProvider.verificationCode?.trim();
  const verificationInstructions = selectedProvider.verificationInstructions?.trim();
  const verificationUrl = selectedProvider.verificationUrl?.trim();
  const needsManualCompletion = Boolean(verificationCode);

  return (
    <section
      className="grid gap-6 pr-8"
      aria-labelledby="provider-verification-title"
    >
      <p
        className="text-muted-foreground text-sm leading-6"
        id="provider-verification-title"
      >
        {verificationUrl ? (
          <>
            訪問
            <a
              className="font-medium text-foreground underline underline-offset-4"
              href={verificationUrl}
              rel="noreferrer"
              target="_blank"
            >
              此鏈接
            </a>{" "}
            {verificationCode
              ? "，輸入以下代碼，"
              : "，並依照授權步驟，"}
            以連接你的帳戶並在 OpenCode 中使用 {selectedProvider.name} 模型。
          </>
        ) : (
          <>
            請依照授權步驟完成連接 {selectedProvider.name}，並回到此頁面確認。
          </>
        )}
      </p>
      {verificationInstructions && (
        <label className="grid gap-2 text-muted-foreground text-xs">
          授權指示
          <textarea
            aria-label="授權指示"
            className="min-h-20 rounded-lg border bg-muted/35 p-3 font-mono text-xs text-foreground whitespace-pre-wrap"
            readOnly
            value={verificationInstructions}
          />
        </label>
      )}

      {verificationCode ? (
        <label className="grid gap-2 text-muted-foreground text-xs">
          確認碼
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-lg border bg-muted/35">
            <input
              aria-label="確認碼"
              className="h-9 min-w-0 rounded-l-lg border-0 bg-transparent px-3 font-mono text-foreground text-sm outline-none"
              readOnly
              value={verificationCode}
            />
            <button
              aria-label="複製確認碼"
              className="grid size-9 place-items-center rounded-r-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!verificationCode}
              onClick={async () => {
                if (!verificationCode) return;
                try {
                  await navigator.clipboard?.writeText(verificationCode);
                  toastManager.add({
                    id: `provider-verification-code-copied-${Date.now()}`,
                    description: "確認碼已複製到剪貼簿。",
                    title: "已複製",
                    type: "success",
                  });
                } catch {
                  toastManager.add({
                    id: `provider-verification-code-copy-failed-${Date.now()}`,
                    description: "無法複製確認碼，請手動複製。",
                    title: "複製失敗",
                    type: "error",
                  });
                }
              }}
              type="button"
            >
              <CopyIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
        </label>
      ) : null}
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
      {needsManualCompletion ? (
        <p className="text-muted-foreground text-xs">
          完成裝置碼或 headless 授權後會自動更新連接狀態並返回模型商列表。
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Browser 授權完成後會自動更新連接狀態並返回模型商列表。
        </p>
      )}
    </section>
  );
}

function ProviderApiKeyPanel({
  applying,
  method,
  onSubmit,
  selectedProvider,
}: {
  applying: boolean;
  method: OpenCodeAuthMethod;
  onSubmit: (providerId: string, key: string, inputs?: Record<string, string>) => Promise<void> | void;
  selectedProvider: ModelProvider;
}) {
  const [apiKey, setApiKey] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const keyName = selectedProvider.apiKey || "API key";

  return (
    <section className="grid max-w-[560px] gap-5 pr-8" aria-labelledby="provider-api-key-title">
      <div className="grid gap-2">
        <p className="text-muted-foreground text-sm leading-6" id="provider-api-key-title">
          輸入 {selectedProvider.name} 的 {keyName}。這會透過 OpenCode 官方 <code className="rounded bg-muted px-1 py-0.5">PUT /auth/{selectedProvider.id}</code> 寫入認證。
        </p>
      </div>

      <label className="grid gap-2 text-muted-foreground text-xs">
        {keyName}
        <input
          autoComplete="off"
          className="h-10 rounded-lg border bg-background px-3 font-mono text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={keyName}
          type="password"
          value={apiKey}
        />
      </label>

      <PromptFields
        prompts={method.prompts ?? []}
        values={inputs}
        onChange={setInputs}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={applying || !apiKey.trim()}
          loading={applying}
          onClick={() => void onSubmit(selectedProvider.id, apiKey, collectPromptInputs(method.prompts ?? [], inputs))}
          size="sm"
        >
          {applying ? "連接中..." : "儲存並連接"}
        </Button>
        <p className="text-muted-foreground text-xs">
          儲存後會重新整理 OpenCode provider 狀態。
        </p>
      </div>
    </section>
  );
}

function ProviderPromptPanel({
  applying,
  method,
  onSubmit,
}: {
  applying: boolean;
  method: OpenCodeAuthMethod;
  onSubmit: (inputs: Record<string, string>) => Promise<void> | void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  return (
    <section className="grid max-w-[560px] gap-5 pr-8" aria-labelledby="provider-prompts-title">
      <p className="text-muted-foreground text-sm leading-6" id="provider-prompts-title">
        {method.label} 需要額外設定，請填寫後開始授權。
      </p>
      <PromptFields prompts={method.prompts ?? []} values={inputs} onChange={setInputs} />
      <Button disabled={applying} loading={applying} onClick={() => void onSubmit(collectPromptInputs(method.prompts ?? [], inputs))} size="sm">
        {applying ? "啟動中..." : "開始授權"}
      </Button>
    </section>
  );
}

function PromptFields({
  onChange,
  prompts,
  values,
}: {
  onChange: (values: Record<string, string>) => void;
  prompts: OpenCodeAuthMethodPrompt[];
  values: Record<string, string>;
}) {
  if (prompts.length === 0) return null;

  return (
    <div className="grid gap-3">
      {prompts.map((prompt) => {
        if (!shouldShowPrompt(prompt, values)) return null;

        const value = values[prompt.key] ?? "";
        const setValue = (nextValue: string) => onChange({ ...values, [prompt.key]: nextValue });

        if (prompt.type === "select") {
          return (
            <label className="grid gap-2 text-muted-foreground text-xs" key={prompt.key}>
              {prompt.message}
              <select
                className="h-10 rounded-lg border bg-background px-3 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setValue(event.target.value)}
                value={value || prompt.options[0]?.value || ""}
              >
                {prompt.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}{option.hint ? ` - ${option.hint}` : ""}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label className="grid gap-2 text-muted-foreground text-xs" key={prompt.key}>
            {prompt.message}
            <input
              className="h-10 rounded-lg border bg-background px-3 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setValue(event.target.value)}
              placeholder={prompt.placeholder}
              value={value}
            />
          </label>
        );
      })}
    </div>
  );
}

function shouldShowPrompt(prompt: OpenCodeAuthMethodPrompt, values: Record<string, string>) {
  if (!prompt.when) return true;
  const currentValue = values[prompt.when.key] ?? getPromptDefaultValue(prompt.when.key, values);
  return prompt.when.op === "eq"
    ? currentValue === prompt.when.value
    : currentValue !== prompt.when.value;
}

function collectPromptInputs(prompts: OpenCodeAuthMethodPrompt[], values: Record<string, string>) {
  const nextValues = { ...values };

  for (const prompt of prompts) {
    if (prompt.type === "select" && !nextValues[prompt.key] && prompt.options[0]) {
      nextValues[prompt.key] = prompt.options[0].value;
    }
  }

  return Object.fromEntries(
    Object.entries(nextValues).filter(([, value]) => value.trim() !== ""),
  );
}

function getPromptDefaultValue(key: string, values: Record<string, string>) {
  return values[key];
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
            const authMethod = selectedProvider.authMethodDetails?.find((item) => item.label === method);
            const detail = getAuthMethodDetail(method, authMethod?.type);
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

function getAuthMethodDetail(method: string, type?: "oauth" | "api") {
  const normalized = method.toLowerCase();

  if (normalized.includes("headless")) {
    return {
      description: "適合遠端主機、Docker 與無瀏覽器環境。",
      icon: TerminalIcon,
    };
  }

  if (type === "api" || normalized.includes("api")) {
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
