import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeRuntimeCommand = {
  agent?: string;
  description?: string;
  hints?: string[];
  model?: string;
  name: string;
  source?: "command" | "mcp" | "skill";
  subtask?: boolean;
  template: string;
};

export function listOpenCodeCommands(
  directory?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeRuntimeCommand[]>("/bff/opencode-commands", {
    ...config,
    query: { ...config?.query, directory },
  });
}
