import { useState } from "react"
import type { ModelOption } from "@/shared/types/workspace"
import { buildThinkingVariantOptions, getAgentModelKey } from "@/shared/utils/openCodeModelUtils"

export function useWorkflowAiRuntimeSelection(modelOptions: ModelOption[]) {
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(() => modelOptions[0]?.key ?? null)
  const [selectedVariant, setSelectedVariant] = useState("default")
  const effectiveModelKey = selectedModelKey && modelOptions.some((model) => model.key === selectedModelKey)
    ? selectedModelKey
    : modelOptions[0]?.key ?? null
  const selectedModel = modelOptions.find((model) => model.key === effectiveModelKey) ?? null
  const thinkingVariants = buildThinkingVariantOptions(selectedModel)
  const effectiveVariant = thinkingVariants.some((variant) => variant.key === selectedVariant) ? selectedVariant : "default"

  return {
    model: selectedModel ? getAgentModelKey(selectedModel) : undefined,
    selectedModel,
    selectedModelKey: effectiveModelKey,
    selectedVariant: effectiveVariant,
    setSelectedModelKey,
    setSelectedVariant,
    thinkingVariants,
    variant: effectiveVariant === "default" ? undefined : effectiveVariant,
  }
}
