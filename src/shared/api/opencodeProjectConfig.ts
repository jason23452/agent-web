import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeConfigScope = "project" | "global";

export type OpenCodeConfigResponse = {
  config: Record<string, unknown>;
  content: string;
  effective: Record<string, unknown>;
  effectivePlugins?: string[];
  exists: boolean;
  path: string;
  project?: string;
  scope: OpenCodeConfigScope;
};

export type OpenCodeConfigApplyBody = {
  config?: Record<string, unknown>;
  content?: string;
  reason?: string;
  restart?: boolean;
  wait?: boolean;
};

export function getOpenCodeConfig(
  scope: OpenCodeConfigScope,
  project?: string,
  config?: ApiRequestConfig,
) {
  const endpoint = scope === "global" ? "/bff/opencode-global/config" : "/bff/opencode-project/config";
  return apiRequest<OpenCodeConfigResponse>(endpoint, {
    ...config,
    query: { ...config?.query, project: scope === "project" ? project : undefined },
  });
}

export function applyOpenCodeConfig(
  scope: OpenCodeConfigScope,
  body: OpenCodeConfigApplyBody,
  project?: string,
  config?: ApiRequestConfig,
) {
  const endpoint = scope === "global" ? "/bff/opencode-global/apply" : "/bff/opencode-project/apply";
  return apiRequest<OpenCodeConfigResponse>(endpoint, {
    ...config,
    body,
    method: "POST",
    query: { ...config?.query, project: scope === "project" ? project : undefined },
  });
}

export function syncOpenCodePluginConfig(body: {
  globalPlugins: string[];
  globalFiles?: Record<string, string>;
  globalDeletes?: string[];
  project: string;
  projectPlugins: string[];
  projectFiles?: Record<string, string>;
  projectDeletes?: string[];
  reason?: string;
  restart?: boolean;
  wait?: boolean;
}, config?: ApiRequestConfig) {
  return apiRequest("/bff/opencode-plugins/apply", {
    ...config,
    body,
    method: "POST",
  });
}
