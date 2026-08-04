import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/shared/api";
import { loadPlatformExtensionFrontend } from "@/shared/api/platformExtensions";
import { ModalShell } from "@/shared/components/layout/dialogs/ModalShell";
import { createOrUpdateProjectFile, readProjectFileContent } from "@/features/workspace/api/files";

type ExtensionModule = {
  activate?: (host: ExtensionHost) => Promise<ExtensionRuntime>;
  deactivate?: () => Promise<void>;
};

type ExtensionHost = {
  extensionId: string;
  hostVersion: string;
  api: {
    readProjectFile: (path: string) => Promise<unknown>;
    writeProjectFile: (input: { content: string; encoding?: "base64"; path: string }) => Promise<void>;
    executeSessionCommand: (input: unknown) => Promise<unknown>;
  };
  ui: {
    announce: (message: string) => void;
    showError: (message: string) => void;
  };
};

type ExtensionRuntime = {
  extensionId?: string;
  version?: string;
  capabilities?: string[];
  mindMap?: {
    mountEditor?: (container: HTMLElement, context: unknown) => Promise<{ destroy?: () => void } | void>;
  };
};

export function ExtensionHostDialog({
  extensionId,
  onClose,
  open,
  projectName,
  projectPath,
}: {
  extensionId: string;
  onClose: () => void;
  open: boolean;
  projectName?: string;
  projectPath?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("尚未載入外部 Extension。");
  const projectError = open && (!projectPath || !projectName)
    ? "請先開啟 Project，才能載入外部 Extension。"
    : null;

  useEffect(() => {
    if (!open) return;

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
      setNotice("正在載入外部 Extension frontend...");

      try {
        const source = await loadPlatformExtensionFrontend(extensionId, { project: extensionProjectName, scope: "project" }, { signal: controller.signal });
        if (controller.signal.aborted || !containerRef.current) return;

        objectURL = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        module = await import(/* @vite-ignore */ objectURL) as ExtensionModule;
        if (controller.signal.aborted || disposed) return;
        if (!module.activate) throw new Error("Extension frontend 缺少 activate()。");

        const host: ExtensionHost = {
          extensionId,
          hostVersion: "1.0.0",
          api: {
            executeSessionCommand: async () => {
              throw new Error("Extension Host 尚未連接 session command API。");
            },
            readProjectFile: async (path) => readProjectFileContent(extensionProjectPath, path, { signal: controller.signal }),
            writeProjectFile: async (input) => {
              await createOrUpdateProjectFile({
                content: input.content,
                directory: extensionProjectPath,
                ...(input.encoding ? { encoding: input.encoding } : {}),
                overwrite: true,
                path: input.path,
              }, { signal: controller.signal });
            },
          },
          ui: {
            announce: setNotice,
            showError: setError,
          },
        };
        runtime = await module.activate(host);
        if (controller.signal.aborted || disposed) return;

        const mountEditor = runtime?.mindMap?.mountEditor;
        if (mountEditor && containerRef.current) {
          editorHandle = await mountEditor(containerRef.current, { projectName: extensionProjectName, projectPath: extensionProjectPath }) ?? undefined;
          setNotice("外部 Extension 已啟用。");
        } else {
          setNotice("Extension 已載入，但沒有提供可掛載的 mermind editor。");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(loadError));
          setNotice("");
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
  }, [extensionId, open, projectName, projectPath]);

  return (
    <ModalShell
      ariaLabel={`${extensionId} Extension`}
      bodyClassName="grid min-h-0 gap-3 p-4"
      closeAriaLabel="關閉 Extension"
      maxWidth="max-w-[960px]"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
      panelClassName="h-[min(86dvh,720px)]"
      title={extensionId}
    >
      {(projectError ?? error) && <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{projectError ?? error}</p>}
      {!projectError && notice && <p aria-live="polite" className="rounded-lg bg-info/8 px-3 py-2 text-info-foreground text-xs">{notice}</p>}
      {loading && <p className="text-muted-foreground text-xs" role="status">載入中...</p>}
      <div
        aria-label={`${extensionId} editor host`}
        className="grid min-h-0 flex-1 place-items-stretch overflow-auto rounded-xl border border-border bg-muted/20"
        ref={containerRef}
        tabIndex={0}
      />
    </ModalShell>
  );
}
