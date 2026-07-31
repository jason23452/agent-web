import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeModelSettingsResponse = {
  disabledModelKeys: string[];
  models: Record<string, boolean>;
  path: string;
  updatedAt?: string;
};

export function getOpenCodeModelSettings(config?: ApiRequestConfig) {
  return apiRequest<OpenCodeModelSettingsResponse>("/bff/opencode-model-settings", {
    ...config,
    method: "GET",
  });
}

export function updateOpenCodeModelSettings(
  body: { disabledModelKeys: string[] } | { enabled: boolean; modelKey: string } | { modelKeys: string[] },
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeModelSettingsResponse>("/bff/opencode-model-settings", {
    ...config,
    body,
    method: "PATCH",
  });
}
