import { apiRequest } from "@/shared/api";
import type { Project } from "@/shared/types/workspace";

export type ManagedProject = {
  configPath: string;
  description?: string;
  displayName?: string;
  name: string;
  path: string;
  registryRoot: string;
  sdkDirectory: string;
  sdkProxy: {
    directoryQuery: string;
    sessionListPath: string;
    v2SessionListPath: string;
  };
};

export type ManagedProjectsResponse = {
  projects: ManagedProject[];
  root: string;
};

export type CreateManagedProjectInput = {
  description?: string;
  displayName?: string;
  initializeReadme?: boolean;
  name: string;
  overwrite?: boolean;
};

export type CreateManagedProjectResponse = {
  created: boolean;
  project: ManagedProject;
};

export type DeleteManagedProjectResponse = {
  deleted: boolean;
  path: string;
  projectName: string;
};

export function listManagedProjects() {
  return apiRequest<ManagedProjectsResponse>("/bff/opencode-volume/projects");
}

export function createManagedProject(body: CreateManagedProjectInput) {
  return apiRequest<CreateManagedProjectResponse>("/bff/opencode-volume/projects", {
    body,
    method: "POST",
  });
}

export function deleteManagedProject(projectName: string) {
  return apiRequest<DeleteManagedProjectResponse>(`/bff/opencode-volume/projects/${encodeURIComponent(projectName)}`, {
    method: "DELETE",
    query: { force: true },
  });
}

export function toWorkspaceProject(project: ManagedProject): Project {
  return {
    description: project.description,
    displayName: project.displayName,
    id: project.name,
    name: project.name,
    path: project.sdkDirectory || project.path,
  };
}
