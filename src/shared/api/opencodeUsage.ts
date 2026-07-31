import { apiRequest, type ApiRequestConfig } from "./client";
import type { TokenUsage } from "@/shared/types/workspace";

export type OpenCodeUsageEntry = {
  label: string;
  limit?: number;
  remaining?: number;
  resetAt?: string;
  used?: number;
  usedPercent?: number;
  valueLabel?: string;
};

export type OpenCodeUsageResponse = {
  entries: OpenCodeUsageEntry[];
  error?: string;
  fetchedAt: string;
  providerID: string;
  source: "anthropic-oauth" | "openai-wham" | "unsupported";
};

export type OpenCodeSessionContextUsageResponse = TokenUsage & {
  modelID?: string;
  providerID?: string;
};

export function getOpenCodeCurrentUsage(providerID: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeUsageResponse>("/bff/opencode-usage/current", {
    ...config,
    method: "GET",
    query: { ...config?.query, providerID },
  });
}

export function getOpenCodeSessionContextUsage(sessionID: string, directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeSessionContextUsageResponse>(`/bff/opencode-usage/session/${encodeURIComponent(sessionID)}/context`, {
    ...config,
    method: "GET",
    query: { ...config?.query, directory },
  });
}
