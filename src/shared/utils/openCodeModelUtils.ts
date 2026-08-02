import type { OpenCodeSession } from "@/features/workspace/api/sessions"
import type { OpenCodeProviderListResponse } from "@/shared/api/opencodeProviders"
import type { Agent, ModelOption, ThinkingVariantOption, TokenUsage } from "@/shared/types/workspace"

export const DEFAULT_THINKING_VARIANTS: ThinkingVariantOption[] = [
  { key: "default", label: "Default" },
  { key: "none", label: "None" },
  { key: "minimal", label: "Minimal" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "xhigh", label: "Xhigh" },
  { key: "max", label: "Max" },
]

export function getModelKey(providerID: string, modelID: string, variant?: string) {
  return variant ? `${providerID}:${modelID}:${variant}` : `${providerID}:${modelID}`
}

export function getModelSettingsKey(providerID: string, modelID: string) {
  return `${providerID}/${modelID}`
}

const DEFAULT_AGENT_VARIANTS = DEFAULT_THINKING_VARIANTS.map((variant) => variant.key === "default" ? "" : variant.key)

export function getAgentModelKey(model: Pick<ModelOption, "providerID" | "id">) {
  return `${model.providerID}/${model.id}`
}

export function buildAgentModelKeys(models: ModelOption[]) {
  return [...new Set(models.map(getAgentModelKey))]
}

export function buildAgentVariantOptions(modelKey: string, models: ModelOption[]) {
  if (!modelKey) return [""]
  const selected = models.find((model) => getAgentModelKey(model) === modelKey)
  if (selected?.variants?.length) return ["", ...new Set(selected.variants.filter(Boolean))]
  if (selected?.reasoning || !selected) return DEFAULT_AGENT_VARIANTS
  return [""]
}

function getModelVariants(variants: unknown) {
  if (Array.isArray(variants)) {
    return variants
      .map((variant) => {
        if (typeof variant === "string") return variant
        if (variant && typeof variant === "object" && "id" in variant && typeof variant.id === "string") return variant.id
        return null
      })
      .filter((variant): variant is string => Boolean(variant))
  }

  if (variants && typeof variants === "object") return Object.keys(variants)
  return []
}

export function buildTokenUsage(session: OpenCodeSession | undefined, providers: OpenCodeProviderListResponse | null): TokenUsage[] {
  if (!session?.model) return [{ label: "Context", used: 0, limit: 0 }]

  const provider = providers?.all.find((item) => item.id === session.model?.providerID)
  const model = provider?.models[session.model.id]
  const tokens = session.tokens
  const input = tokens?.input ?? 0
  const output = tokens?.output ?? 0
  const reasoning = tokens?.reasoning ?? 0
  const cacheRead = tokens?.cache.read ?? 0
  const cacheWrite = tokens?.cache.write ?? 0

  return [{
    cacheRead,
    cacheWrite,
    input,
    label: "Context",
    limit: model?.limit?.context ?? 0,
    modelLabel: `${provider?.name ?? session.model.providerID} / ${model?.name ?? session.model.id}`,
    output,
    providerLabel: provider?.name ?? session.model.providerID,
    reasoning,
    used: input + output + reasoning + cacheRead + cacheWrite,
  }]
}

export function buildOpenCodeModelOptions(providers: OpenCodeProviderListResponse | null): ModelOption[] {
  if (!providers) return []
  const connectedProviderIDs = new Set(providers.connected)

  return providers.all
    .filter((provider) => connectedProviderIDs.has(provider.id))
    .flatMap((provider) => Object.values(provider.models).map((model) => ({
      contextLimit: model.limit?.context,
      id: model.id,
      key: getModelKey(provider.id, model.id, model.variant),
      name: model.name,
      providerID: provider.id,
      providerName: provider.name,
      reasoning: model.capabilities?.reasoning,
      status: model.status,
      variant: model.request?.variant ?? model.variant,
      variants: getModelVariants(model.variants),
    })))
}

function formatThinkingVariantLabel(variant: string) {
  if (variant === "xhigh") return "Xhigh"
  return variant.charAt(0).toUpperCase() + variant.slice(1)
}

export function buildThinkingVariantOptions(model: ModelOption | null): ThinkingVariantOption[] {
  if (!model) return []
  const variants = buildAgentVariantOptions(getAgentModelKey(model), [model])
  if (variants.length <= 1) return []
  return variants.map((variant) => ({
    key: variant || "default",
    label: variant ? formatThinkingVariantLabel(variant) : "Default",
  }))
}

export function getOpenCodeDefaultModelKey(providers: OpenCodeProviderListResponse | null) {
  if (!providers) return null
  for (const [providerID, modelID] of Object.entries(providers.default)) {
    if (providers.connected.includes(providerID)) return getModelKey(providerID, modelID)
  }
  return null
}

export function getPreferredModelKey(
  session: OpenCodeSession | undefined,
  agent: Agent,
  models: ModelOption[],
  providers: OpenCodeProviderListResponse | null,
) {
  const variantKey = session?.model ? getModelKey(session.model.providerID, session.model.id, session.model.variant) : null
  const modelKey = session?.model ? getModelKey(session.model.providerID, session.model.id) : null

  if (variantKey && models.some((model) => model.key === variantKey)) return variantKey
  if (modelKey && models.some((model) => model.key === modelKey)) return modelKey
  if (agent.providerID && agent.modelID) return getModelKey(agent.providerID, agent.modelID)
  return getOpenCodeDefaultModelKey(providers) ?? models[0]?.key ?? null
}
