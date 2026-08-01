import { initialToolDefinitions } from "@/shared/components/layout/app-sidebar/config";
import type {
  AgentDefinition,
  PermissionAction,
  PermissionValue,
  SkillDefinition,
  SkillInstallTarget,
  ToolDefinition,
} from "@/shared/types/app-sidebar";

export function getToolPermissionKey(tool: string) {
  if (tool === "apply_patch" || tool === "write" || tool === "edit")
    return "edit";
  return tool;
}

export function isCustomTool(toolName: string, tools = initialToolDefinitions) {
  return tools.some(
    (tool) => tool.name === toolName && tool.source === "custom",
  );
}

export function permissionToYaml(permission: Record<string, PermissionValue>) {
  return Object.entries(permission)
    .map(([key, value]) => {
      if (typeof value === "string") return `  ${key}: ${value}`;
      const rules = Object.entries(value)
        .map(([pattern, action]) => `    ${JSON.stringify(pattern)}: ${action}`)
        .join("\n");
      return `  ${key}:\n${rules}`;
    })
    .join("\n");
}

export function providerOptionsToYaml(optionsJson?: string) {
  if (!optionsJson?.trim()) return "";

  try {
    const options = JSON.parse(optionsJson) as Record<string, unknown>;
    return Object.entries(options)
      .map(([key, value]) => {
        if (typeof value === "string") return `${key}: ${value}`;
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join("\n");
  } catch {
    return "# Provider options JSON is invalid and was not emitted.";
  }
}

export function parseJsonObject<T>(json?: string) {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as T;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function getPermissionVariant(value: PermissionValue) {
  if (typeof value !== "string") return "info" as const;
  if (value === "allow") return "success" as const;
  if (value === "deny") return "error" as const;
  return "warning" as const;
}

export function getPermissionLabel(value: PermissionValue) {
  return typeof value === "string" ? value : "rules";
}

export function taskPermissionFor(subagents: string[]) {
  if (subagents.length === 0) return "deny" as PermissionAction;
  return {
    "*": "deny" as const,
    ...Object.fromEntries(
      subagents.map((subagent) => [subagent, "allow" as const]),
    ),
  };
}

export function getSkillBasePath(target: SkillInstallTarget) {
  const paths: Record<SkillInstallTarget, string> = {
    project: ".opencode/skills",
    global: "~/.config/opencode/skills",
  };
  return paths[target];
}

export function getSkillScope(
  target: SkillInstallTarget,
): SkillDefinition["scope"] {
  return target.startsWith("global") ? "global" : "project";
}

export function isValidSkillName(name: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) && name.length <= 64;
}

export function agentToYaml(
  agent: Pick<AgentDefinition, "name" | "description"> &
    Partial<AgentDefinition>,
) {
  const tools = agent.tools?.length ? agent.tools : ["read", "grep", "glob"];
  const skills = agent.skills?.length
    ? agent.skills
    : ["react-vite-feature-based"];
  const subagents = agent.subagents?.length ? agent.subagents : [];
  const permission: Record<string, PermissionValue> =
    "permission" in agent && agent.permission
      ? (agent.permission as AgentDefinition["permission"])
      : {
          edit: "allow",
          bash: "ask",
          read: "allow",
          grep: "allow",
          glob: "allow",
        };
  const permissionRules = parseJsonObject<Record<string, PermissionValue>>(
    agent.permissionRulesJson,
  );
  const effectivePermission: Record<string, PermissionValue> = {
    ...permission,
    ...permissionRules,
    task: taskPermissionFor(subagents),
  };
  const systemPrompt =
    "systemPrompt" in agent && agent.systemPrompt
      ? agent.systemPrompt
      : "You are a focused opencode agent. Follow the user's request and use the configured tools responsibly.";
  const toolGuidance =
    "toolGuidance" in agent && agent.toolGuidance ? agent.toolGuidance : {};
  const skillGuidance =
    "skillGuidance" in agent && agent.skillGuidance ? agent.skillGuidance : {};
  const subagentGuidance =
    "subagentGuidance" in agent && agent.subagentGuidance
      ? agent.subagentGuidance
      : {};
  const guidanceText = tools
    .map((tool) => ({ tool, guidance: toolGuidance[tool]?.trim() }))
    .filter((item) => item.guidance)
    .map((item) => `- ${item.tool}: ${item.guidance}`)
    .join("\n");
  const skillGuidanceText = skills
    .map((skill) => ({ skill, guidance: skillGuidance[skill]?.trim() }))
    .filter((item) => item.guidance)
    .map((item) => `- ${item.skill}: ${item.guidance}`)
    .join("\n");
  const subagentGuidanceText = subagents
    .map((subagent) => ({
      subagent,
      guidance: subagentGuidance[subagent]?.trim(),
    }))
    .filter((item) => item.guidance)
    .map((item) => `- ${item.subagent}: ${item.guidance}`)
    .join("\n");
  const providerOptionsYaml = providerOptionsToYaml(agent.providerOptionsJson);
  const promptFile =
    agent.promptSource === "file" && agent.promptFile?.trim()
      ? `prompt: "{file:${agent.promptFile.trim()}}"\n`
      : "";
  return `---\nname: ${agent.name || "my-agent"}\ndescription: ${agent.description || "Describe when this agent should be used."}\nmode: ${agent.mode ?? "subagent"}\nmodel: ${"model" in agent && agent.model ? agent.model : "openai/gpt-5.5"}\ntemperature: ${"temperature" in agent && agent.temperature ? agent.temperature : "0.3"}\ntop_p: ${"top_p" in agent && agent.top_p ? agent.top_p : "1"}\n${"variant" in agent && agent.variant ? `variant: ${agent.variant}\n` : ""}${"steps" in agent && agent.steps ? `steps: ${agent.steps}\n` : ""}${agent.disable ? "disable: true\n" : ""}${agent.hidden ? "hidden: true\n" : ""}${agent.color ? `color: ${agent.color}\n` : ""}${promptFile}${providerOptionsYaml ? `${providerOptionsYaml}\n` : ""}tools:\n${tools.map((tool) => `  ${tool}: true`).join("\n")}\nskills:\n${skills.map((skill) => `  - ${skill}`).join("\n")}\npermission:\n${permissionToYaml(effectivePermission)}\n---\n${agent.promptSource === "file" ? "" : systemPrompt}${guidanceText ? `\n\n## Tool usage guidance\n${guidanceText}` : ""}${skillGuidanceText ? `\n\n## Skill usage guidance\n${skillGuidanceText}` : ""}${subagentGuidanceText ? `\n\n## Subagent usage guidance\n${subagentGuidanceText}` : ""}\n`;
}

export type ToolCollection = ToolDefinition[];
