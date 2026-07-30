import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeRegistryScope = "project" | "global";
export type OpenCodeRegistryKind = "agents" | "skills" | "tools" | "plugins";

export type OpenCodeRegistryEntry = {
  inherited?: boolean;
  kind: OpenCodeRegistryKind;
  name: string;
  overridesGlobal?: boolean;
  path: string;
  project?: string;
  scope: OpenCodeRegistryScope;
  type: "file" | "directory";
};

export type OpenCodeRegistryListResponse = {
  entries: OpenCodeRegistryEntry[];
  globalRoot?: string;
  includeGlobal?: true;
  kind: OpenCodeRegistryKind;
  project?: string;
  root: string;
  scope: OpenCodeRegistryScope;
};

export type OpenCodeRegistryReadResponse = {
  content?: string;
  file?: string;
  files?: Record<string, string>;
  kind: OpenCodeRegistryKind;
  name: string;
  project?: string;
  root: string;
  scope: OpenCodeRegistryScope;
};

export type OpenCodeRegistryUpsertBody = {
  content?: string;
  filename?: string;
  files?: Record<string, string>;
  reason?: string;
  restart?: boolean;
  wait?: boolean;
};

export function listEffectiveProjectTools(
  project: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeRegistryListResponse>(
    "/bff/opencode-registry/project/tools",
    {
      ...config,
      query: { ...config?.query, includeGlobal: true, project },
    },
  );
}

export function readToolRegistryEntry(
  scope: OpenCodeRegistryScope,
  name: string,
  project?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeRegistryReadResponse>(
    `/bff/opencode-registry/${scope}/tools/${encodeURIComponent(name)}`,
    {
      ...config,
      query: { ...config?.query, project: scope === "project" ? project : undefined },
    },
  );
}

export function upsertToolRegistryEntry(
  scope: OpenCodeRegistryScope,
  name: string,
  body: OpenCodeRegistryUpsertBody,
  project?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest(`/bff/opencode-registry/${scope}/tools/${encodeURIComponent(name)}`, {
    ...config,
    body,
    method: "PUT",
    query: { ...config?.query, project: scope === "project" ? project : undefined },
  });
}
