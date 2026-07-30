import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeRuntimeOperationStatus = "restarting" | "waiting" | "ready" | "failed";

export type OpenCodeRuntimeOperation = {
  error?: string;
  finishedAt?: string;
  operationID: string;
  reason: string;
  startedAt: string;
  status: OpenCodeRuntimeOperationStatus;
};

export type RestartOpenCodeRuntimeResponse = {
  operation: OpenCodeRuntimeOperation;
  operationID: string;
  reason: string;
  restarting: boolean;
  status: OpenCodeRuntimeOperationStatus;
};

export function restartOpenCodeRuntime(
  body: { reason?: string; wait?: boolean },
  config?: ApiRequestConfig,
) {
  return apiRequest<RestartOpenCodeRuntimeResponse>("/bff/opencode-runtime/restart", {
    ...config,
    body,
    method: "POST",
  });
}
