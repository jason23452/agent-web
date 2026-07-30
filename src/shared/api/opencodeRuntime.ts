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

export type OpenCodeRuntimeOperationResponse = {
  operation: OpenCodeRuntimeOperation;
};

export type OpenCodeRuntimeStatusResponse = {
  enabled: boolean;
  operation: OpenCodeRuntimeOperation | null;
  lastOperation: OpenCodeRuntimeOperation | null;
  upstream: {
    error?: string;
    ready: boolean;
    statusCode?: number;
  };
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

export function getOpenCodeRuntimeOperation(
  operationID: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeRuntimeOperationResponse>(
    `/bff/opencode-runtime/operations/${encodeURIComponent(operationID)}`,
    config,
  );
}

export function getOpenCodeRuntimeStatus(config?: ApiRequestConfig) {
  return apiRequest<OpenCodeRuntimeStatusResponse>("/bff/opencode-runtime/status", config);
}
