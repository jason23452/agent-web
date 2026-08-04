import {
  GlobeIcon,
  HardDriveIcon,
  MailIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PresentationIcon,
  Table2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/shared/api";
import {
  installPlatformExtension,
  listPlatformExtensions,
  type PlatformExtension,
} from "@/shared/api/platformExtensions";
import { Button } from "@/shared/components/ui/button";

export function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<PlatformExtension[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    void listPlatformExtensions({ signal: controller.signal })
      .then((response) => {
        setExtensions(response.extensions);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function installExtension(extensionId: string) {
    setInstallingId(extensionId);
    setError(null);

    try {
      const response = await installPlatformExtension(extensionId);
      setExtensions((current) => current.map((extension) => (
        extension.id === response.extension.id ? response.extension : extension
      )));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setInstallingId(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-[720px] gap-6 pr-8 max-sm:pr-0">
      <div className="grid gap-1">
        <h3 className="font-semibold text-lg">擴充套件</h3>
        <p className="text-muted-foreground text-sm">
          安裝可在目前平台使用的額外工具與服務。
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-8 text-center text-muted-foreground text-sm" role="status">
          正在讀取擴充套件...
        </p>
      ) : extensions.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/35 px-3 py-8 text-center text-muted-foreground text-sm">
          目前沒有可用的擴充套件。
        </p>
      ) : (
        <ul className="grid grid-cols-1 border-border/70 border-t sm:grid-cols-2 sm:gap-x-10">
          {extensions.map((extension) => (
            <li
              className="flex min-w-0 items-center gap-3 border-border/70 border-b py-4"
              key={extension.id}
            >
              <ExtensionIcon icon={extension.icon} />
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-semibold text-sm">{extension.displayName}</h4>
                <p className="mt-1 truncate text-muted-foreground text-xs">
                  {extension.description}
                </p>
              </div>
              {extension.installed ? (
                <button
                  aria-label={`${extension.displayName} 更多操作`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={`${extension.displayName} 已安裝`}
                  type="button"
                >
                  <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <Button
                  disabled={installingId !== null}
                  loading={installingId === extension.id}
                  onClick={() => void installExtension(extension.id)}
                  size="sm"
                  variant="outline"
                >
                  Install
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExtensionIcon({ icon }: { icon: PlatformExtension["icon"] }) {
  const className = "size-5";

  if (icon === "browser") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground">
        <GlobeIcon aria-hidden="true" className={className} />
      </span>
    );
  }

  if (icon === "computer") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 text-white">
        <MonitorIcon aria-hidden="true" className={className} />
      </span>
    );
  }

  if (icon === "drive") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/12 text-blue-600">
        <HardDriveIcon aria-hidden="true" className={className} />
      </span>
    );
  }

  if (icon === "mail") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/12 text-red-600">
        <MailIcon aria-hidden="true" className={className} />
      </span>
    );
  }

  if (icon === "presentation") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
        <PresentationIcon aria-hidden="true" className={className} />
      </span>
    );
  }

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600/15 text-emerald-600">
      <Table2Icon aria-hidden="true" className={className} />
    </span>
  );
}
