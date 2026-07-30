import { apiRequest, type ApiRequestConfig } from "./client";

export type NpmPackageScope = "project" | "global";

export type NpmPackageEntry = {
  name: string;
  version: string;
};

export type NpmPackageListResponse = {
  packageJsonPath: string;
  packages: NpmPackageEntry[];
  project?: string;
  root: string;
  scope: NpmPackageScope;
};

export type NpmPackageInstallResponse = NpmPackageListResponse & {
  installed: string[];
  stderr: string;
  stdout: string;
};

export function listOpenCodeNpmPackages(
  scope: NpmPackageScope,
  project?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<NpmPackageListResponse>("/bff/opencode-npm-packages", {
    ...config,
    query: { ...config?.query, project: scope === "project" ? project : undefined, scope },
  });
}

export function installOpenCodeNpmPackages(
  body: { packages: string[]; project?: string; scope: NpmPackageScope },
  config?: ApiRequestConfig,
) {
  return apiRequest<NpmPackageInstallResponse>("/bff/opencode-npm-packages/install", {
    ...config,
    body,
    method: "POST",
  });
}
