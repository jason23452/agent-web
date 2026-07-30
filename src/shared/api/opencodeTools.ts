import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeToolId = string;

export function listProjectToolIds(
  directory: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeToolId[]>("/bff/opencode-proxy/experimental/tool/ids", {
    ...config,
    query: { ...config?.query, directory },
  });
}
