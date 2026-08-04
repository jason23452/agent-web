import { apiRequest, apiRequestText, type ApiRequestConfig } from "./client";

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

export type ExtensionInstallOptions = {
  overwrite: boolean;
  project?: string;
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

export function listPlatformExtensions(config?: ApiRequestConfig) {
  return apiRequest<PlatformExtensionListResponse>("/bff/extensions", config);
}

export function installPlatformExtension(file: File, options: ExtensionInstallOptions, config?: ApiRequestConfig) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("scope", options.scope);
  form.append("overwrite", String(options.overwrite));
  if (options.project) form.append("project", options.project);

  return apiRequest<PlatformExtensionInstallResponse>("/bff/extensions/install", {
    ...config,
    body: form,
    method: "POST",
  });
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
