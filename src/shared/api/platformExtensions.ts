import { apiRequest, type ApiRequestConfig } from "./client";

export type PlatformExtensionIcon =
  | "browser"
  | "computer"
  | "drive"
  | "mail"
  | "presentation"
  | "spreadsheet";

export type PlatformExtension = {
  description: string;
  displayName: string;
  icon: PlatformExtensionIcon;
  id: string;
  installed: boolean;
  installedAt?: string;
};

export type PlatformExtensionListResponse = {
  extensions: PlatformExtension[];
};

export type PlatformExtensionInstallResponse = {
  extension: PlatformExtension;
};

export function listPlatformExtensions(config?: ApiRequestConfig) {
  return apiRequest<PlatformExtensionListResponse>("/bff/extensions", config);
}

export function installPlatformExtension(extensionId: string, config?: ApiRequestConfig) {
  return apiRequest<PlatformExtensionInstallResponse>("/bff/extensions/install", {
    ...config,
    body: { extensionId },
    method: "POST",
  });
}
