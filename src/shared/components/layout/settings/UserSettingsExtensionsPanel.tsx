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
import { useEffect, useState, type ReactNode } from "react";
import { getApiErrorMessage } from "@/shared/api";
import {
  downloadPlatformExtensionPackage,
  installPlatformExtension,
  listPlatformExtensions,
  type PlatformExtension,
} from "@/shared/api/platformExtensions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell";

export function ExtensionsPanel({ activeProjectName }: { activeProjectName?: string }) {
  const [extensions, setExtensions] = useState<PlatformExtension[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extend, setExtend] = useState(true);
  const [scope, setScope] = useState<"global" | "project">(activeProjectName ? "project" : "global");
  const [installTargetID, setInstallTargetID] = useState<string | null>(null);

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
  const installTarget = extensions.find((extension) => extension.id === installTargetID);

  function choosePackage(extensionID: string) {
    setInstallTargetID(extensionID);
    setError(null);
    setNotice(null);
  }

  async function installPackage(file: File) {
    if (effectiveScope === "project" && !activeProjectName) {
      setError("請先開啟 Project，或改用 Global 安裝。");
      return;
    }

    setInstalling(true);
    setError(null);
    setNotice(null);
    try {
      const response = await installPlatformExtension(file, {
        extend,
        project: activeProjectName,
        scope: effectiveScope,
      });
      setExtensions((current) => {
        const next = current.filter((extension) => extension.id !== response.extension.id);
        return [...next, response.extension].sort((first, second) => first.displayName.localeCompare(second.displayName));
      });
      setNotice(response.workflows?.length
        ? "Workflow JSON 與 Command 已建立並發布到 workspace，可直接使用；後續自訂配置請從 Workflow Command 修改。"
        : "外部 package 已安裝。");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setInstalling(false);
      setInstallTargetID(null);
    }
  }

  async function downloadAndInstallPackage() {
    if (!installTarget) return;
    if (effectiveScope === "project" && !activeProjectName) {
      setError("請先開啟 Project，或改用 Global 安裝。");
      return;
    }

    setInstalling(true);
    setError(null);
    setNotice(null);
    try {
      const file = await downloadPlatformExtensionPackage(installTarget.id);
      await installPackage(file);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
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

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 text-xs" role="status">{notice}</p>}

      {loading ? (
        <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-8 text-center text-muted-foreground text-sm" role="status">正在讀取外部擴充套件市場...</p>
      ) : extensions.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-8 text-center text-muted-foreground text-sm">目前沒有可用的外部擴充套件。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {extensions.map((extension) => (
            <li className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm" key={extension.id}>
              <ExtensionIcon extension={extension} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h4 className="truncate font-semibold text-sm">{extension.displayName}</h4>
                  {extension.version && <Badge size="sm" variant="outline">v{extension.version}</Badge>}
                  <Badge size="sm" variant={extension.installed ? "success" : "outline"}>{extension.installed ? "已安裝" : "未安裝"}</Badge>
                </div>
                <p className="mt-1 truncate text-muted-foreground text-xs">{extension.description ?? "External extension package"}</p>
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

      <ModalShell
        ariaLabel="安裝外部 package"
        bodyClassName="grid gap-4 p-5"
        closeAriaLabel="取消安裝"
        description="選擇安裝範圍後，從 marketplace API 下載並安裝 package。"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <Button disabled={installing} onClick={() => setInstallTargetID(null)} size="sm" variant="ghost">取消</Button>
            <Button disabled={installing || !installTarget} loading={installing} onClick={() => void downloadAndInstallPackage()} size="sm">下載並安裝</Button>
          </div>
        )}
        onOpenChange={(open) => {
          if (!open && !installing) setInstallTargetID(null);
        }}
        open={Boolean(installTargetID)}
        title={installTarget ? `${installTarget.displayName} 安裝設定` : "安裝設定"}
      >
        <label className="grid gap-1 text-muted-foreground text-xs">
          安裝範圍
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setScope(event.target.value as "global" | "project")}
            value={effectiveScope}
          >
            <option disabled={!activeProjectName} value="project">目前 Project · {activeProjectName ?? "尚未開啟"}</option>
            <option value="global">Global</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-muted-foreground text-xs">
          <input checked={extend} onChange={(event) => setExtend(event.target.checked)} type="checkbox" />
          在既有功能上 extend package
        </label>
      </ModalShell>
    </div>
  );
}

function ExtensionIcon({ extension }: { extension: PlatformExtension }) {
  const iconClassName = "size-5";
  const icon = extension.icon ?? (extension.packageFormat === ".aicxt" ? "mindmap" : undefined);

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
