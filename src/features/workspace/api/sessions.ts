import { apiRequest, type ApiRequestConfig } from "@/shared/api";
import type { Session } from "@/shared/types/workspace";

export type OpenCodeSession = {
  directory: string;
  id: string;
  model?: {
    id: string;
    providerID: string;
    variant?: string;
  };
  parentID?: string;
  projectID: string;
  tokens?: {
    cache: {
      read: number;
      write: number;
    };
    input: number;
    output: number;
    reasoning: number;
  };
  title: string;
  time: {
    compacting?: number;
    created: number;
    updated: number;
  };
  version: string;
};

export type CreateProjectSessionInput = {
  parentID?: string;
  title?: string;
};

export function listProjectSessions(directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeSession[]>("/bff/opencode-proxy/session", {
    ...config,
    query: { ...config?.query, directory },
  });
}

export function getProjectSession(sessionID: string, directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeSession>(`/bff/opencode-proxy/session/${encodeURIComponent(sessionID)}`, {
    ...config,
    query: { ...config?.query, directory },
  });
}

export function createProjectSession(directory: string, body: CreateProjectSessionInput = {}, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeSession>("/bff/opencode-proxy/session", {
    ...config,
    body,
    method: "POST",
    query: { ...config?.query, directory },
  });
}

export function toWorkspaceSession(session: OpenCodeSession): Session {
  return {
    id: session.id,
    meta: formatSessionMeta(session),
    title: session.title || "未命名對話",
  };
}

function formatSessionMeta(session: OpenCodeSession): string {
  const updatedAt = session.time.updated || session.time.created;
  const date = new Date(updatedAt < 1_000_000_000_000 ? updatedAt * 1000 : updatedAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? "剛剛"
    : date.toLocaleString("zh-TW", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
      });
  const projectName = session.directory.replace(/\\/g, "/").split("/").filter(Boolean).at(-1);

  return projectName ? `${dateLabel} · ${projectName}` : dateLabel;
}
