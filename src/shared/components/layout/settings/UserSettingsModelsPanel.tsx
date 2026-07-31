import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import type { ModelProvider } from "./UserSettingsModal";

export function ModelsPanel({
  modelSearch,
  modelProviders,
  onModelSearchChange,
  onModelToggle,
}: {
  modelSearch: string;
  modelProviders: ModelProvider[];
  onModelSearchChange: (value: string) => void;
  onModelToggle: (modelKey: string, enabled: boolean) => void;
}) {
  const [collapsedProviderIds, setCollapsedProviderIds] = useState<Set<string>>(() => new Set());
  const keyword = modelSearch.trim().toLowerCase();
  const connectedProviders = modelProviders
    .filter((provider) => provider.connected)
    .map((provider) => ({
      ...provider,
      availableModels: (provider.availableModels ?? []).filter((model) => {
        if (!keyword) return true;
        return (
          model.name.toLowerCase().includes(keyword) ||
          model.id.toLowerCase().includes(keyword) ||
          provider.name.toLowerCase().includes(keyword)
        );
      }),
    }))
    .filter((provider) => provider.availableModels.length > 0);

  return (
    <div className="mx-auto grid max-w-[720px] gap-8 pr-8">
      <div className="grid gap-6">
        <h3 className="font-semibold text-lg tracking-[-0.01em]">模型</h3>
        <InputGroup data-size="sm">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="搜尋模型"
            onChange={(event) => onModelSearchChange(event.target.value)}
            placeholder="搜尋模型"
            value={modelSearch}
          />
        </InputGroup>
      </div>

      {connectedProviders.length === 0 ? (
        <p className="rounded-md border border-dashed bg-background px-3 py-8 text-center text-muted-foreground text-sm">
          尚無可用模型。請先連接模型商，或調整搜尋條件。
        </p>
      ) : (
        <div className="grid gap-6">
          {connectedProviders.map((provider) => (
            <section aria-label={`${provider.name} 模型`} className="grid gap-3" key={provider.id}>
              <button
                aria-expanded={!collapsedProviderIds.has(provider.id)}
                className="flex w-fit items-center gap-2 rounded-md font-semibold text-sm outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setCollapsedProviderIds((current) => {
                    const next = new Set(current);
                    if (next.has(provider.id)) {
                      next.delete(provider.id);
                    } else {
                      next.add(provider.id);
                    }
                    return next;
                  });
                }}
                type="button"
              >
                <ChevronDownIcon
                  aria-hidden="true"
                  className={`size-4 text-muted-foreground transition-transform ${collapsedProviderIds.has(provider.id) ? "-rotate-90" : "rotate-0"}`}
                />
                <span className="grid size-5 place-items-center font-bold text-sm">{provider.icon}</span>
                <span>{provider.name}</span>
                <Badge size="sm" variant="secondary">
                  {provider.availableModels.length}
                </Badge>
              </button>

              {!collapsedProviderIds.has(provider.id) ? (
                <div className="overflow-hidden rounded-xl border bg-muted/25">
                  {provider.availableModels.map((model) => (
                    <div
                      className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-border/70 border-b px-4 py-3 last:border-b-0"
                      key={model.key}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium text-sm">{model.name}</span>
                          {model.status && model.status !== "active" ? (
                            <Badge size="sm" variant="secondary">
                              {model.status}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-muted-foreground text-xs">
                          {model.id}
                          {model.contextLimit ? ` · context ${model.contextLimit}` : ""}
                          {model.outputLimit ? ` · output ${model.outputLimit}` : ""}
                        </p>
                      </div>

                      <Switch
                        aria-label={`${model.name} ${model.enabled ? "停用" : "啟用"}`}
                        checked={model.enabled}
                        onCheckedChange={(checked) => onModelToggle(model.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
