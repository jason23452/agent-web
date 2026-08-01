import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeMcpTestScope = "project" | "global";

export type OpenCodeMcpTestResult = {
  ok: boolean;
  type: "local" | "remote";
  message: string;
  statusCode?: number;
};

export function testOpenCodeMcpConnection(
  scope: OpenCodeMcpTestScope,
  server: Record<string, unknown>,
  project?: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeMcpTestResult>("/bff/opencode-mcp/test", {
    ...config,
    body: { project: scope === "project" ? project : undefined, scope, server },
    method: "POST",
  });
}
