import { apiRequest, apiRequestBlob, apiRequestText, type ApiRequestConfig } from "./client";

export const PLATFORM_EXTENSIONS_CHANGED_EVENT = "agent-system:platform-extensions-changed";

export type PlatformExtensionIcon =
  | "browser"
  | "computer"
  | "drive"
  | "mail"
  | "mindmap"
  | "presentation"
  | "spreadsheet";

export type PlatformExtension = {
  description?: string;
  displayName: string;
  effectiveScope?: "global" | "project";
  extensionId?: string;
  icon?: PlatformExtensionIcon;
  id: string;
  installed: boolean;
  installedAt?: string;
  installedScopes?: Array<"global" | "project">;
  packageFormat?: ".aicxt";
  version?: string;
};

export type PlatformExtensionListResponse = {
  extensions: PlatformExtension[];
};

export type PlatformExtensionListOptions = {
  project: string;
  scope: "project";
};

export type ExtensionInstallOptions = {
  extend: boolean;
  project: string;
  scope: "global" | "project";
};

export type PlatformExtensionInstallResponse = {
  extension: PlatformExtension;
  manifest: {
    extensionId: string;
    installedAt: string;
    packageSha256: string;
    scope: "global" | "project";
    version: string;
  };
  package: {
    packageSha256: string;
    storePath: string;
  };
  workflows?: Array<{
    project?: string;
    scope: "global" | "project";
    workflowID: string;
    workspace: { published: boolean; restartRequested: boolean; target: string; verified: boolean };
  }>;
};

export function listPlatformExtensions(options: PlatformExtensionListOptions, config?: ApiRequestConfig) {
  return apiRequest<PlatformExtensionListResponse>("/bff/extensions", {
    ...config,
    query: {
      ...config?.query,
      project: options.project,
      scope: options.scope,
    },
  });
}

export async function installPlatformExtension(file: File, options: ExtensionInstallOptions, config?: ApiRequestConfig) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("scope", options.scope);
  form.append("extend", String(options.extend));
  form.append("project", options.project);

  const response = await apiRequest<PlatformExtensionInstallResponse>("/bff/extensions/install", {
    ...config,
    body: form,
    method: "POST",
  });

  window.dispatchEvent(new Event(PLATFORM_EXTENSIONS_CHANGED_EVENT));
  return response;
}

export async function downloadPlatformExtensionPackage(extensionId: string, project: string, config?: ApiRequestConfig) {
  const blob = await apiRequestBlob(`/bff/extensions/${encodeURIComponent(extensionId)}/package`, {
    ...config,
    query: { ...config?.query, project },
  });
  return new File([blob], `${extensionId}.aicxt`, { type: "application/octet-stream" });
}

export function loadPlatformExtensionFrontend(
  extensionId: string,
  options: { project?: string; scope: "global" | "project" },
  config?: ApiRequestConfig,
) {
  return apiRequestText(`/bff/extensions/${encodeURIComponent(extensionId)}/frontend`, {
    ...config,
    query: { ...config?.query, project: options.scope === "project" ? options.project : undefined, scope: options.scope },
  });
}
