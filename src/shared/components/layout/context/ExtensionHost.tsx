import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/shared/api";
import {
  listPlatformExtensions,
  loadPlatformExtensionFrontend,
  PLATFORM_EXTENSIONS_CHANGED_EVENT,
  type PlatformExtension,
} from "@/shared/api/platformExtensions";
import { createOrUpdateProjectFile, readProjectFileContent } from "@/features/workspace/api/files";
import { abortSession, listSessionMessages, sendSessionPrompt } from "@/features/workspace/api/messages";
import { createProjectSession } from "@/features/workspace/api/sessions";

type ExtensionAgentPromptInput = {
  agent: string;
  prompt: string;
  timeoutMs?: number;
  title?: string;
};

type ExtensionModule = {
  activate?: (host: ExtensionHost) => Promise<ExtensionRuntime>;
  deactivate?: () => Promise<void>;
};

type ExtensionActionContext = {
  openEditor: () => void;
  projectName: string;
  projectPath: string;
};

type ExtensionActionHandle = {
  destroy?: () => void;
};

type ExtensionHost = {
  extensionId: string;
  hostVersion: string;
  api: {
    readProjectFile: (path: string) => Promise<unknown>;
    writeProjectFile: (input: { content: string; encoding?: "base64"; path: string }) => Promise<void>;
    executeAgentPrompt: (input: ExtensionAgentPromptInput) => Promise<unknown>;
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
  contextAction?: {
    mount?: (container: HTMLElement, context: ExtensionActionContext) => Promise<ExtensionActionHandle | void> | ExtensionActionHandle | void;
  };
  editor?: {
    mount?: (container: HTMLElement, context: unknown) => Promise<{ destroy?: () => void } | void>;
  };
};

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

  useEffect(() => {
    if (!projectName || !projectPath) return;

    const controller = new AbortController();
    const refresh = () => {
      void listPlatformExtensions({ signal: controller.signal })
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

  return (
    <>
      {extensions.map((extension) => {
        const extensionId = extension.extensionId ?? extension.id;
        return (
          <ExtensionHostAction
            extensionId={extensionId}
            key={`${extensionId}:${extension.installedAt ?? extension.version ?? ""}`}
            onOpenEditor={() => onOpenExtension(extensionId)}
            projectName={projectName}
            projectPath={projectPath}
          />
        );
      })}
    </>
  );
}

export function ExtensionHostAction({
  extensionId,
  onOpenEditor,
  projectName,
  projectPath,
}: {
  extensionId: string;
  onOpenEditor: () => void;
  projectName?: string;
  projectPath?: string | null;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!projectPath || !projectName) {
      containerRef.current?.replaceChildren();
      return;
    }
    const actionContainer = containerRef.current;
    if (!actionContainer) return;
    const stableActionContainer: HTMLSpanElement = actionContainer;

    const controller = new AbortController();
    const extensionProjectName = projectName;
    const extensionProjectPath = projectPath;
    let module: ExtensionModule | undefined;
    let objectURL: string | undefined;
    let actionHandle: ExtensionActionHandle | undefined;
    let disposed = false;

    async function loadAction() {
      try {
        const source = await loadPlatformExtensionFrontend(extensionId, { project: extensionProjectName, scope: "project" }, { signal: controller.signal });
        if (controller.signal.aborted || disposed) return;

        objectURL = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        module = await import(/* @vite-ignore */ objectURL) as ExtensionModule;
        if (controller.signal.aborted || disposed) return;
        if (!module.activate) throw new Error("Extension frontend 缺少 activate()。");

        const host = createExtensionHost(extensionId, extensionProjectPath, controller.signal, () => undefined, () => undefined);
        const runtime = await module.activate(host);
        if (controller.signal.aborted || disposed) return;

        const mountAction = runtime?.contextAction?.mount;
        if (!mountAction) return;
        const mounted = await mountAction(stableActionContainer, {
          openEditor: onOpenEditor,
          projectName: extensionProjectName,
          projectPath: extensionProjectPath,
        });
        if (controller.signal.aborted || disposed) {
          mounted?.destroy?.();
          return;
        }
        actionHandle = mounted ?? undefined;
      } catch {
        if (!controller.signal.aborted && !disposed) stableActionContainer.replaceChildren();
      }
    }

    void loadAction();

    return () => {
      disposed = true;
      controller.abort();
      actionHandle?.destroy?.();
      void module?.deactivate?.();
      if (objectURL) URL.revokeObjectURL(objectURL);
      stableActionContainer.replaceChildren();
    };
  }, [extensionId, onOpenEditor, projectName, projectPath]);

  return <span className="inline-flex" ref={containerRef} />;
}

export function ExtensionHostPage({
  extensionId,
  onBack,
  projectLoading = false,
  projectName,
  projectPath,
}: {
  extensionId: string;
  onBack: () => void;
  projectLoading?: boolean;
  projectName?: string;
  projectPath?: string | null;
}) {
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
        const source = await loadPlatformExtensionFrontend(extensionId, { project: extensionProjectName, scope: "project" }, { signal: controller.signal });
        if (controller.signal.aborted || !containerRef.current) return;

        objectURL = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        module = await import(/* @vite-ignore */ objectURL) as ExtensionModule;
        if (controller.signal.aborted || disposed) return;
        if (!module.activate) throw new Error("Extension frontend 缺少 activate()。");

        const host = createExtensionHost(extensionId, extensionProjectPath, controller.signal, () => undefined, setError);
        runtime = await module.activate(host);
        if (controller.signal.aborted || disposed) return;

        const mountEditor = runtime?.editor?.mount;
        if (mountEditor && containerRef.current) {
          editorHandle = await mountEditor(containerRef.current, { onBack, projectName: extensionProjectName, projectPath: extensionProjectPath }) ?? undefined;
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
  }, [extensionId, onBack, projectName, projectPath]);

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

function createExtensionHost(
  extensionId: string,
  projectPath: string,
  signal: AbortSignal,
  announce: (message: string) => void,
  showError: (message: string) => void,
): ExtensionHost {
  return {
    extensionId,
    hostVersion: "1.0.0",
    api: {
      executeAgentPrompt: async (input) => {
        const agent = input.agent?.trim();
        const prompt = input.prompt?.trim();
        if (!agent) throw new Error("Extension agent prompt 缺少 agent。");
        if (!prompt) throw new Error("Extension agent prompt 缺少 prompt。");
        const timeoutMs = Math.max(15_000, Math.min(120_000, input.timeoutMs ?? 90_000));
        const session = await createProjectSession(projectPath, {
          title: input.title?.trim() || `${extensionId} extension agent`,
        }, { signal });

        try {
          await sendSessionPrompt(session.id, projectPath, { agent, text: prompt }, { signal });
          const deadline = Date.now() + timeoutMs;
          while (Date.now() <= deadline) {
            const messages = await listSessionMessages(session.id, projectPath, { signal });
            const response = [...messages].reverse().find((message) => message.info.role === "assistant");
            const responseError = response?.info.error?.data?.message;
            if (responseError) throw new Error(responseError);
            if (response?.info.time?.completed) return response;
            await waitForExtensionAgent(750, signal);
          }
          throw new Error(`Agent 在 ${Math.round(timeoutMs / 1000)} 秒內未完成。`);
        } catch (error) {
          await abortSession(session.id, projectPath).catch(() => undefined);
          throw error;
        }
      },
      readProjectFile: async (path) => readProjectFileContent(projectPath, path, { signal }),
      writeProjectFile: async (input) => {
        await createOrUpdateProjectFile({
          content: input.content,
          directory: projectPath,
          ...(input.encoding ? { encoding: input.encoding } : {}),
          overwrite: true,
          path: input.path,
        }, { signal });
      },
    },
    ui: {
      announce,
      showError,
    },
  };
}

function waitForExtensionAgent(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("The operation was aborted", "AbortError"));
      return;
    }
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    const abort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("The operation was aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}
