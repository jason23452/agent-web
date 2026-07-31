import { apiRequest, type ApiRequestConfig } from "./client";

export type OpenCodeModel = {
  api?: {
    id: string;
    npm: string;
    url: string;
  };
  id: string;
  name: string;
  providerID: string;
  capabilities?: {
    reasoning?: boolean;
  };
  request?: {
    variant?: string;
  };
  status?: "alpha" | "beta" | "deprecated" | "active";
  variant?: string;
  variants?: unknown;
  limit?: {
    context?: number;
    output?: number;
    input?: number;
  };
};

export type OpenCodeProvider = {
  env: string[];
  id: string;
  key?: string;
  models: Record<string, OpenCodeModel>;
  name: string;
  options: Record<string, unknown>;
  source: "env" | "config" | "custom" | "api";
};

export type OpenCodeProviderListResponse = {
  all: OpenCodeProvider[];
  connected: string[];
  default: Record<string, string>;
};

export type OpenCodeAuthMethodPrompt =
  | {
      type: "text";
      key: string;
      message: string;
      placeholder?: string;
      when?: {
        key: string;
        op: "eq" | "neq";
        value: string;
      };
    }
  | {
      options: Array<{ label: string; value: string; hint?: string }>;
      type: "select";
      key: string;
      message: string;
      when?: {
        key: string;
        op: "eq" | "neq";
        value: string;
      };
    };

export type OpenCodeAuthMethod = {
  label: string;
  prompts?: OpenCodeAuthMethodPrompt[];
  type: "oauth" | "api";
};

export type OpenCodeAuthMethodsResponse = Record<string, OpenCodeAuthMethod[]>;

export type OpenCodeAuthStartResponse = {
  instructions: string;
  method: "auto" | "code";
  url: string;
};

export type OpenCodeOAuthStatusResponse = {
  completed: boolean;
  completedAt?: number;
};

export function listOpenCodeProviders(config?: ApiRequestConfig) {
  return apiRequest<OpenCodeProviderListResponse>("/bff/opencode-proxy/provider", {
    ...config,
    query: { ...config?.query },
    method: "GET",
  });
}

export function getOpenCodeProviderOAuthStatus(providerId: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeOAuthStatusResponse>("/bff/opencode-oauth/status", {
    ...config,
    query: { ...config?.query, providerId },
    method: "GET",
  });
}

export function startOpenCodeProviderAuth(
  providerId: string,
  method: number,
  inputs?: Record<string, string>,
  config?: ApiRequestConfig,
) {
  return apiRequest<OpenCodeAuthStartResponse>(
    `/bff/opencode-proxy/provider/${encodeURIComponent(providerId)}/oauth/authorize`,
    {
      ...config,
      body: { method, ...(inputs ? { inputs } : {}) },
      method: "POST",
    },
  );
}

export function completeOpenCodeProviderAuth(
  providerId: string,
  method: number,
  config?: ApiRequestConfig,
) {
  return apiRequest<boolean>(
    `/bff/opencode-proxy/provider/${encodeURIComponent(providerId)}/oauth/callback`,
    {
      ...config,
      body: { method },
      method: "POST",
    },
  );
}

export function setOpenCodeProviderApiKey(
  providerId: string,
  key: string,
  inputs?: Record<string, string>,
  config?: ApiRequestConfig,
) {
  return apiRequest<boolean>(
    `/bff/opencode-proxy/auth/${encodeURIComponent(providerId)}`,
    {
      ...config,
      body: { type: "api", key, ...(inputs ?? {}) },
      method: "PUT",
    },
  );
}

export function disconnectOpenCodeProviderAuth(
  providerId: string,
  config?: ApiRequestConfig,
) {
  return apiRequest<boolean>(
    `/bff/opencode-proxy/auth/${encodeURIComponent(providerId)}`,
    {
      ...config,
      method: "DELETE",
    },
  );
}

export function disposeOpenCodeInstance(config?: ApiRequestConfig) {
  return apiRequest<boolean>("/bff/opencode-proxy/instance/dispose", {
    ...config,
    method: "POST",
  });
}

export function getOpenCodeProviderAuthMethods(config?: ApiRequestConfig) {
  return apiRequest<OpenCodeAuthMethodsResponse>("/bff/opencode-proxy/provider/auth", {
    ...config,
    query: { ...config?.query },
    method: "GET",
  });
}
