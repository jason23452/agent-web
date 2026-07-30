import { apiRequest, type ApiRequestConfig } from "@/shared/api";
import type { Agent } from "@/shared/types/workspace";

export type OpenCodeAgent = {
  builtIn?: boolean;
  color?: string;
  description?: string;
  hidden?: boolean;
  mode: "all" | "primary" | "subagent";
  model?: {
    modelID: string;
    providerID: string;
  };
  name: string;
  native?: boolean;
};

const INTERNAL_PRIMARY_AGENT_NAMES = new Set(["compaction", "summary", "title"]);

export function listProjectPrimaryAgents(directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeAgent[]>("/bff/opencode-proxy/agent", {
    ...config,
    query: { ...config?.query, directory },
  }).then((agents) => agents.filter(isSelectablePrimaryAgent).sort(sortPrimaryAgents).map(toWorkspaceAgent));
}

function isSelectablePrimaryAgent(agent: OpenCodeAgent): boolean {
  return agent.mode === "primary" && !agent.hidden && !INTERNAL_PRIMARY_AGENT_NAMES.has(agent.name);
}

function sortPrimaryAgents(a: OpenCodeAgent, b: OpenCodeAgent): number {
  const aBuiltIn = isBuiltInAgent(a);
  const bBuiltIn = isBuiltInAgent(b);
  if (aBuiltIn !== bBuiltIn) return aBuiltIn ? -1 : 1;

  return a.name.localeCompare(b.name);
}

function isBuiltInAgent(agent: OpenCodeAgent): boolean {
  return Boolean(agent.builtIn ?? agent.native);
}

function toWorkspaceAgent(agent: OpenCodeAgent): Agent {
  const builtIn = isBuiltInAgent(agent);

  return {
    builtIn,
    color: agent.color,
    description: agent.description,
    id: agent.name,
    mode: agent.mode,
    modelID: agent.model?.modelID,
    name: agent.name,
    provider: agent.model ? `${agent.model.providerID}/${agent.model.modelID}` : builtIn ? "built-in" : "custom",
    providerID: agent.model?.providerID,
    status: "idle",
  };
}
