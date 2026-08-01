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

export type ToolScriptTestResponse = {
  diagnostics?: string[];
  message: string;
  output?: string;
  runtime: "js-ts";
  stderr?: string;
  status: "success" | "error";
  stdout?: string;
};

export type ToolScriptTestBody = {
  code: string;
  entry?: string;
  project?: string;
  runtime: "js-ts";
  scope?: OpenCodeRegistryScope;
  testInput?: string;
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

export function listOpenCodeRegistryEntries(
  scope: OpenCodeRegistryScope,
  kind: OpenCodeRegistryKind,
  project?: string,
  includeGlobal = false,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeRegistryListResponse>(
    `/bff/opencode-registry/${scope}/${kind}`,
    {
      ...config,
      query: {
        ...config?.query,
        project: scope === "project" ? project : undefined,
        includeGlobal: scope === "project" && includeGlobal ? true : undefined,
      },
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

export function readSkillRegistryEntry(scope: OpenCodeRegistryScope, name: string, project?: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeRegistryReadResponse>(`/bff/opencode-registry/${scope}/skills/${encodeURIComponent(name)}`, {
    ...config,
    query: { ...config?.query, project: scope === "project" ? project : undefined },
  });
}

export function upsertSkillRegistryEntry(scope: OpenCodeRegistryScope, name: string, body: OpenCodeRegistryUpsertBody, project?: string, config?: ApiRequestConfig) {
  return apiRequest(`/bff/opencode-registry/${scope}/skills/${encodeURIComponent(name)}`, {
    ...config,
    body,
    method: "PUT",
    query: { ...config?.query, project: scope === "project" ? project : undefined },
  });
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

export function upsertPluginRegistryEntry(
  scope: OpenCodeRegistryScope,
  name: string,
  body: OpenCodeRegistryUpsertBody,
  project?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest(`/bff/opencode-registry/${scope}/plugins/${encodeURIComponent(name)}`, {
    ...config,
    body,
    method: "PUT",
    query: { ...config?.query, project: scope === "project" ? project : undefined },
  });
}

export function deletePluginRegistryEntry(
  scope: OpenCodeRegistryScope,
  name: string,
  project?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest(`/bff/opencode-registry/${scope}/plugins/${encodeURIComponent(name)}`, {
    ...config,
    method: "DELETE",
    query: { ...config?.query, project: scope === "project" ? project : undefined, restart: false, wait: false },
  });
}

export function testToolScript(body: ToolScriptTestBody, config?: ApiRequestConfig) {
  return apiRequest<ToolScriptTestResponse>("/bff/opencode-registry/tools/test", {
    ...config,
    body,
    method: "POST",
  });
}
