import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodePermissionAction = "allow" | "ask" | "deny";

export type OpenCodePermissionRule = {
  action: OpenCodePermissionAction;
  pattern: string;
  permission: string;
};

export type OpenCodeAgent = {
  builtIn?: boolean;
  color?: string;
  description?: string;
  hidden?: boolean;
  mode: "all" | "primary" | "subagent";
  model?: {
    modelID: string;
    providerID: string;
  };
  name: string;
  native?: boolean;
  options?: Record<string, unknown>;
  permission?:
    | OpenCodePermissionRule[]
    | Record<
        string,
        OpenCodePermissionAction | Record<string, OpenCodePermissionAction>
      >;
  prompt?: string;
  steps?: number;
  temperature?: number;
  topP?: number;
  variant?: string;
};

export function listProjectAgents(
  directory: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeAgent[]>("/bff/opencode-proxy/agent", {
    ...config,
    query: { ...config?.query, directory },
  });
}
