import {
  GitBranchIcon,
  GlobeIcon,
  HardDriveIcon,
  MailIcon,
  MonitorIcon,
  PresentationIcon,
  PuzzleIcon,
  Table2Icon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getApiErrorMessage } from "@/shared/api";
import {
  installPlatformExtension,
  listPlatformExtensions,
  type PlatformExtension,
} from "@/shared/api/platformExtensions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

export function ExtensionsPanel({ activeProjectName }: { activeProjectName?: string }) {
  const [extensions, setExtensions] = useState<PlatformExtension[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [scope, setScope] = useState<"global" | "project">(activeProjectName ? "project" : "global");
  const [installTargetID, setInstallTargetID] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    void listPlatformExtensions({ signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setExtensions(response.extensions);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const effectiveScope = scope === "project" && !activeProjectName ? "global" : scope;

  function choosePackage(extensionID: string) {
    setInstallTargetID(extensionID);
    setError(null);
    fileInputRef.current?.click();
  }

  async function installPackage(file: File) {
    if (effectiveScope === "project" && !activeProjectName) {
      setError("請先開啟 Project，或改用 Global 安裝。");
      return;
    }

    setInstalling(true);
    setError(null);
    try {
      const response = await installPlatformExtension(file, {
        overwrite,
        project: activeProjectName,
        scope: effectiveScope,
      });
      setExtensions((current) => {
        const next = current.filter((extension) => extension.id !== response.extension.id);
        return [...next, response.extension].sort((first, second) => first.displayName.localeCompare(second.displayName));
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setInstalling(false);
      setInstallTargetID(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-[720px] gap-6 pr-8 max-sm:pr-0">
      <div className="grid gap-1">
        <h3 className="font-semibold text-lg">擴充套件</h3>
        <p className="text-muted-foreground text-sm">
          從外部 Plugin 市場安裝 `.aicxt` package；package 內容不會編譯進 AICaht core。
        </p>
      </div>

      <section className="grid gap-3 rounded-xl bg-muted/45 p-4" aria-labelledby="extension-install-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm" id="extension-install-title">安裝外部 package</h4>
            <p className="mt-0.5 text-muted-foreground text-xs">BFF 會驗證 ZIP、manifest、integrity 與資源路徑後再寫入 workspace。</p>
          </div>
          <label className="grid gap-1 text-muted-foreground text-xs">
            安裝範圍
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setScope(event.target.value as "global" | "project")}
              value={effectiveScope}
            >
              {activeProjectName && <option value="project">目前 Project · {activeProjectName}</option>}
              <option value="global">Global</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-muted-foreground text-xs">
          <input checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} type="checkbox" />
          發生同名資源時允許 overwrite
        </label>
        <input
          accept=".aicxt,application/zip"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void installPackage(file);
          }}
          ref={fileInputRef}
          type="file"
        />
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs" role="alert">{error}</p>}
        {installTargetID && <p aria-live="polite" className="text-muted-foreground text-xs">請選擇 `{installTargetID}` 的 `.aicxt` package。</p>}
      </section>

      {loading ? (
        <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-8 text-center text-muted-foreground text-sm" role="status">正在讀取外部擴充套件市場...</p>
      ) : extensions.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-8 text-center text-muted-foreground text-sm">目前沒有可用的外部擴充套件。</p>
      ) : (
        <ul className="grid grid-cols-1 border-border/70 border-t sm:grid-cols-2 sm:gap-x-10">
          {extensions.map((extension) => (
            <li className="flex min-w-0 items-center gap-3 border-border/70 border-b py-4" key={extension.id}>
              <ExtensionIcon extension={extension} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h4 className="truncate font-semibold text-sm">{extension.displayName}</h4>
                  {extension.version && <Badge size="sm" variant="outline">v{extension.version}</Badge>}
                </div>
                <p className="mt-1 truncate text-muted-foreground text-xs">{extension.description ?? "External AICaht Extension package"}</p>
              </div>
              <Button
                disabled={installing}
                loading={installing && installTargetID === extension.id}
                onClick={() => choosePackage(extension.id)}
                size="sm"
                variant={extension.installed ? "outline" : "default"}
              >
                {extension.installed ? "更新" : "安裝"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExtensionIcon({ extension }: { extension: PlatformExtension }) {
  const iconClassName = "size-5";
  const icon = extension.icon ?? (extension.id === "mermind" ? "mindmap" : undefined);

  if (icon === "browser") return <ExtensionIconShell className="border border-border bg-background text-foreground"><GlobeIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  if (icon === "computer") return <ExtensionIconShell className="bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 text-white"><MonitorIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  if (icon === "drive") return <ExtensionIconShell className="bg-blue-500/12 text-blue-600"><HardDriveIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  if (icon === "mail") return <ExtensionIconShell className="bg-red-500/12 text-red-600"><MailIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  if (icon === "presentation") return <ExtensionIconShell className="bg-amber-500/15 text-amber-600"><PresentationIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  if (icon === "spreadsheet") return <ExtensionIconShell className="bg-emerald-600/15 text-emerald-600"><Table2Icon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  if (icon === "mindmap") return <ExtensionIconShell className="bg-violet-500/15 text-violet-600"><GitBranchIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
  return <ExtensionIconShell className="bg-muted text-muted-foreground"><PuzzleIcon aria-hidden="true" className={iconClassName} /></ExtensionIconShell>;
}

function ExtensionIconShell({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${className}`}>{children}</span>;
}
