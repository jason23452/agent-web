import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/shared/api";
import {
  listPlatformExtensions,
  loadPlatformExtensionConfiguration,
  type PlatformExtension,
} from "@/shared/api/platformExtensions";
import { Badge } from "@/shared/components/ui/badge";

type PlatformEntry = {
  capabilities?: string[];
  description?: string;
  displayName: string;
  id: string;
  shortName?: string;
  tone?: string;
};

type ExtensionPlatformEntry = PlatformEntry & {
  extension: PlatformExtension;
};

export function PlatformManagementPanel({
  activeProjectName,
  onOpenExtension,
}: {
  activeProjectName?: string;
  onOpenExtension?: (extensionId: string) => void;
}) {
  const { entries, error, loading } = useConfiguredPlatforms(activeProjectName, "platforms");

  return (
    <ConfiguredPlatformPanel
      activeProjectName={activeProjectName}
      description="由已安裝的 AICXT package 動態提供平台連線與認證設定。"
      entries={entries}
      error={error}
      heading="平台管理"
      loading={loading}
      onOpenExtension={onOpenExtension}
      sectionId="platform-management"
      emptyLabel="目前沒有 package 宣告可用平台。"
    />
  );
}

export function DeploymentPlatformsPanel({
  activeProjectName,
  onOpenExtension,
}: {
  activeProjectName?: string;
  onOpenExtension?: (extensionId: string) => void;
}) {
  const { entries, error, loading } = useConfiguredPlatforms(activeProjectName, "deploymentPlatforms");

  return (
    <ConfiguredPlatformPanel
      activeProjectName={activeProjectName}
      description="由 package configuration 動態提供 CI/CD、Build、Release 與環境設定。"
      entries={entries}
      error={error}
      heading="自動部屬平台"
      loading={loading}
      onOpenExtension={onOpenExtension}
      sectionId="deployment-platforms"
      emptyLabel="目前沒有 package 宣告 CI/CD 平台。"
    />
  );
}

function ConfiguredPlatformPanel({
  activeProjectName,
  description,
  emptyLabel,
  entries,
  error,
  heading,
  loading,
  onOpenExtension,
  sectionId,
}: {
  activeProjectName?: string;
  description: string;
  emptyLabel: string;
  entries: ExtensionPlatformEntry[];
  error: string | null;
  heading: string;
  loading: boolean;
  onOpenExtension?: (extensionId: string) => void;
  sectionId: string;
}) {
  return (
    <div className="mx-auto grid max-w-[680px] gap-6 pr-8 max-sm:pr-0">
      <div className="grid gap-1">
        <h3 className="font-semibold text-lg">{heading}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {!activeProjectName ? (
        <p className="rounded-lg border border-destructive/35 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm" role="alert">
          請先開啟 Project，才能載入 package configuration。
        </p>
      ) : null}
      {error ? <p className="rounded-lg border border-destructive/35 bg-destructive/8 px-4 py-3 text-destructive-foreground text-sm" role="alert">{error}</p> : null}

      <section className="grid gap-3" aria-labelledby={`${sectionId}-title`}>
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-sm" id={`${sectionId}-title`}>可用平台</h4>
          <Badge size="sm" variant="secondary">{loading ? "..." : entries.length}</Badge>
        </div>
        {loading && activeProjectName ? (
          <p className="rounded-lg border border-dashed bg-muted/35 px-4 py-8 text-center text-muted-foreground text-sm" role="status">正在讀取 package configuration...</p>
        ) : entries.length === 0 && activeProjectName ? (
          <p className="rounded-lg border border-dashed bg-muted/35 px-4 py-8 text-center text-muted-foreground text-sm">{emptyLabel}</p>
        ) : (
          <ul className="grid gap-3">
            {entries.map((entry) => (
              <li key={`${entry.extension.id}:${entry.id}`}>
                <button
                  className="flex min-h-16 w-full items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-65"
                  disabled={!entry.extension.installed || !onOpenExtension}
                  onClick={() => onOpenExtension?.(entry.extension.extensionId ?? entry.extension.id)}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg font-semibold text-sm text-white ${entry.tone === "deployment" ? "bg-emerald-600" : "bg-[#0078d4]"}`}>
                      {entry.shortName ?? entry.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <strong className="truncate font-semibold text-sm">{entry.displayName}</strong>
                      <p className="mt-0.5 truncate text-muted-foreground text-xs">{entry.description ?? "由外部 package 提供的設定。"}</p>
                    </div>
                  </div>
                  <Badge size="sm" variant={entry.extension.installed ? "secondary" : "outline"}>
                    {entry.extension.installed ? "可設定" : "需安裝"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function useConfiguredPlatforms(
  activeProjectName: string | undefined,
  key: "platforms" | "deploymentPlatforms",
): { entries: ExtensionPlatformEntry[]; error: string | null; loading: boolean } {
  const [entries, setEntries] = useState<ExtensionPlatformEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const requestKey = `${activeProjectName ?? ""}:${key}`;

  useEffect(() => {
    if (!activeProjectName) {
      return;
    }

    const controller = new AbortController();

    void listPlatformExtensions({ project: activeProjectName, scope: "project" }, { signal: controller.signal })
      .then(async (response) => {
        const configured = await Promise.all(response.extensions.map(async (extension) => {
          try {
            const configuration = await loadPlatformExtensionConfiguration(extension.id, {
              project: activeProjectName,
              scope: "project",
            }, { signal: controller.signal });
            return toEntries(configuration[key], extension);
          } catch {
            return [];
          }
        }));
        if (!controller.signal.aborted) {
          setEntries(configured.flat());
          setLoadedKey(requestKey);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setEntries([]);
          setError(getApiErrorMessage(requestError));
          setLoadedKey(requestKey);
        }
      });

    return () => controller.abort();
  }, [activeProjectName, key, requestKey]);

  return { entries, error, loading: Boolean(activeProjectName && loadedKey !== requestKey) };
}

function toEntries(value: unknown, extension: PlatformExtension): ExtensionPlatformEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ExtensionPlatformEntry[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.displayName !== "string") return [];
    return [{
      extension,
      id: record.id,
      displayName: record.displayName,
      ...(typeof record.description === "string" ? { description: record.description } : {}),
      ...(typeof record.shortName === "string" ? { shortName: record.shortName } : {}),
      ...(typeof record.tone === "string" ? { tone: record.tone } : {}),
      ...(Array.isArray(record.capabilities) ? { capabilities: record.capabilities.filter((item): item is string => typeof item === "string") } : {}),
    }];
  });
}
