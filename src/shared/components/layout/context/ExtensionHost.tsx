import { useEffect, useRef, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { getApiErrorMessage } from "@/shared/api";
import {
  listPlatformExtensions,
  loadPlatformExtensionConfiguration,
  loadPlatformExtensionFrontend,
  PLATFORM_EXTENSIONS_CHANGED_EVENT,
  type PlatformExtension,
} from "@/shared/api/platformExtensions";
import { createExtensionHost, type ExtensionModule, type ExtensionRuntime } from "@/shared/extensions/platformExtensionRuntime";

export function ExtensionHostActions({
  onOpenExtension,
  projectName,
  projectPath,
}: {
  onOpenExtension: (extensionId: string) => void;
  projectName?: string;
  projectPath?: string | null;
}) {
  const [extensions, setExtensions] = useState<PlatformExtension[]>([]);
  const [contextActionExtensionIds, setContextActionExtensionIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!projectName || !projectPath) return;

    const controller = new AbortController();
    const refresh = () => {
      void listPlatformExtensions({ project: projectName, scope: "project" }, { signal: controller.signal })
        .then((response) => {
          if (!controller.signal.aborted) setExtensions(response.extensions.filter((extension) => extension.installed));
        })
        .catch(() => undefined);
    };

    refresh();
    window.addEventListener(PLATFORM_EXTENSIONS_CHANGED_EVENT, refresh);

    return () => {
      controller.abort();
      window.removeEventListener(PLATFORM_EXTENSIONS_CHANGED_EVENT, refresh);
    };
  }, [projectName, projectPath]);

  useEffect(() => {
    if (!projectName || !projectPath || extensions.length === 0) {
      return;
    }

    const controller = new AbortController();
    const extensionProjectName = projectName;
    const extensionProjectPath = projectPath;
    let disposed = false;

    async function findContextActionExtensions() {
      const ids = await Promise.all(extensions.map(async (extension) => {
        const extensionId = canonicalExtensionId(extension.extensionId ?? extension.id);
        let objectURL: string | undefined;
        let module: ExtensionModule | undefined;
        try {
          const source = await loadPlatformExtensionFrontend(extensionId, { project: extensionProjectName, scope: "project" }, { signal: controller.signal });
          if (controller.signal.aborted) return undefined;
          objectURL = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
          module = await import(/* @vite-ignore */ objectURL) as ExtensionModule;
          if (!module.activate) return undefined;
          const runtime = await module.activate(createExtensionHost(extensionId, extensionProjectPath, controller.signal, () => undefined, () => undefined, extensionProjectName));
          return runtime?.contextAction?.mount ? extensionId : undefined;
        } catch {
          return undefined;
        } finally {
          await module?.deactivate?.();
          if (objectURL) URL.revokeObjectURL(objectURL);
        }
      }));

      if (!disposed && !controller.signal.aborted) {
        setContextActionExtensionIds(ids.filter((id): id is string => Boolean(id)));
      }
    }

    void findContextActionExtensions();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [extensions, projectName, projectPath]);

  const availableContextActionExtensionIds = contextActionExtensionIds.filter((id) => extensions.some((extension) => canonicalExtensionId(extension.extensionId ?? extension.id) === id));
  if (availableContextActionExtensionIds.length === 0) return null;

  const firstContextActionExtension = extensions.find((extension) => availableContextActionExtensionIds.includes(canonicalExtensionId(extension.extensionId ?? extension.id)));
  const triggerMark = firstContextActionExtension?.displayName.slice(0, 1).toUpperCase() || "E";

  return (
    <div className="relative inline-flex">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="開啟已安裝的擴充套件"
        className="extension-context-action-button grid size-8 place-items-center rounded-lg border border-input bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((value) => !value)}
        title="已安裝的擴充套件"
        type="button"
      >
        <span aria-hidden="true" className="text-xs font-bold">{triggerMark}</span>
        <span aria-hidden="true" className="absolute -right-1 -bottom-1 rounded bg-background text-[10px] leading-none">⌄</span>
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+8px)] right-0 z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl" role="listbox" aria-label="已安裝的擴充套件">
          {extensions.map((extension) => {
            const extensionId = canonicalExtensionId(extension.extensionId ?? extension.id);
            return (
              <div
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                key={`${extensionId}:${extension.installedAt ?? extension.version ?? ""}`}
                role="option"
              >
                <span className="grid size-6 place-items-center rounded-md bg-muted text-xs font-semibold" aria-hidden="true">
                  {extensionId === "xmind" ? "X" : extension.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{extension.displayName}</span>
                <button
                  aria-label={`開啟 ${extension.displayName}`}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setOpen(false);
                    onOpenExtension(extensionId);
                  }}
                  title={`開啟 ${extension.displayName}`}
                  type="button"
                >
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ExtensionHostPage({
  extensionId,
  initialFilePath,
  onBack,
  projectLoading = false,
  projectName,
  projectPath,
}: {
  extensionId: string;
  initialFilePath?: string;
  onBack: () => void;
  projectLoading?: boolean;
  projectName?: string;
  projectPath?: string | null;
}) {
  const runtimeExtensionId = canonicalExtensionId(extensionId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const projectError = !projectLoading && (!projectPath || !projectName)
    ? "請先開啟 Project，才能載入外部 Extension。"
    : null;

  useEffect(() => {
    if (!projectPath || !projectName) {
      return;
    }
    const extensionProjectName = projectName;
    const extensionProjectPath = projectPath;

    const controller = new AbortController();
    let runtime: ExtensionRuntime | undefined;
    let module: ExtensionModule | undefined;
    let objectURL: string | undefined;
    let editorHandle: { destroy?: () => void } | undefined;
    let disposed = false;

    async function loadExtension() {
      setLoading(true);
      setError(null);

      try {
         const [source, configuration] = await Promise.all([
           loadPlatformExtensionFrontend(runtimeExtensionId, { project: extensionProjectName, scope: "project" }, { signal: controller.signal }),
           runtimeExtensionId === "open-design" || runtimeExtensionId === "xmind"
             ? Promise.resolve({})
             : loadPlatformExtensionConfiguration(runtimeExtensionId, { project: extensionProjectName, scope: "project" }, { signal: controller.signal }).catch(() => ({})),
         ]);
        if (controller.signal.aborted || !containerRef.current) return;

        objectURL = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        module = await import(/* @vite-ignore */ objectURL) as ExtensionModule;
        if (controller.signal.aborted || disposed) return;
        if (!module.activate) throw new Error("Extension frontend 缺少 activate()。");

        const host = createExtensionHost(runtimeExtensionId, extensionProjectPath, controller.signal, () => undefined, setError, extensionProjectName);
        runtime = await module.activate(host);
        if (controller.signal.aborted || disposed) return;

        const mountEditor = runtime?.editor?.mount;
        if (mountEditor && containerRef.current) {
           editorHandle = await mountEditor(containerRef.current, {
             configuration,
             initialFilePath,
             onBack,
             projectName: extensionProjectName,
             projectPath: extensionProjectPath,
           }) ?? undefined;
        } else {
          throw new Error("Extension 已載入，但沒有提供可掛載的 editor。");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadExtension();

    return () => {
      disposed = true;
      controller.abort();
      editorHandle?.destroy?.();
      void module?.deactivate?.();
      if (objectURL) URL.revokeObjectURL(objectURL);
      runtime = undefined;
    };
  }, [runtimeExtensionId, initialFilePath, onBack, projectName, projectPath]);

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <section className="relative h-full min-h-0 overflow-auto">
        {(projectError ?? error) ? <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{projectError ?? error}</p> : null}
        {loading || projectLoading ? <p className="absolute inset-0 z-10 grid place-items-center bg-background/70 text-muted-foreground text-sm backdrop-blur-sm" role="status">正在載入 Extension...</p> : null}
        <div
          aria-label={`${extensionId} editor host`}
          className="grid h-full min-h-[640px] place-items-stretch overflow-hidden bg-background"
          ref={containerRef}
          tabIndex={0}
        />
      </section>
    </main>
  );
}

function canonicalExtensionId(extensionId: string) {
  return extensionId === "opendesign" ? "open-design" : extensionId;
}
