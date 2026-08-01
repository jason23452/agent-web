import type {
  AgentForm,
  CommandForm,
  McpForm,
  PluginForm,
  SkillForm,
  ToolForm,
} from "@/shared/types/app-sidebar"

export const emptyMcpForm: McpForm = {
  name: "",
  type: "remote",
  url: "",
  command: "",
  cwd: "",
  environment: [{ key: "", value: "" }],
  headers: [{ key: "", value: "" }],
  oauth: { clientId: "", clientSecret: "", scope: "", disabled: false },
  enabled: true,
  timeout: "5000",
}

export const emptyPluginForm: PluginForm = {
  method: "npm",
  name: "",
  description: "",
  entry: "",
  installTarget: "project",
  archiveName: "",
  code: `import type { Plugin } from "@opencode-ai/plugin";

export const MyPlugin: Plugin = async () => ({});
`,
  useOfficialExample: false,
  officialExample: "basic",
  customPluginEnabled: false,
  useInProject: false,
}

export const officialPluginExamples = [
  {
    id: "basic",
    name: "基本 Plugin",
    description: "官方基本結構範例。",
    code: `export const ExamplePlugin = async ({ client, directory, worktree }) => {
  await client.app.log({
    body: {
      service: "example-plugin",
      level: "info",
      message: "Plugin initialized",
      extra: { directory, worktree },
    },
  });

  return {};
};
`,
  },
  {
    id: "env-protection",
    name: ".env 保護",
    description: "阻止 OpenCode 讀取 .env 檔案。",
    code: `export const EnvProtection = async () => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool === "read" && output.args.filePath.includes(".env")) {
      throw new Error("Do not read .env files");
    }
  },
});
`,
  },
] as const

export const emptySkillForm: SkillForm = {
  method: "remote",
  useInProject: true,
  name: "",
  description: "",
  installTarget: "project",
  license: "",
  compatibility: "opencode",
  archiveName: "",
  sources: "",
  archiveFiles: [],
}

export const modelVariants = ["", "none", "minimal", "low", "medium", "high", "xhigh", "max"]
export const agentColors = ["", "primary", "secondary", "accent", "success", "warning", "error", "info"]

export const emptyAgentForm: AgentForm = {
  name: "",
  installTarget: "project",
  description: "",
  mode: "subagent",
  model: "",
  temperature: "",
  top_p: "",
  variant: "",
  steps: "",
  disable: false,
  hidden: false,
  color: "",
  promptSource: "inline",
  promptFile: "",
  providerOptionsJson: "",
  permissionRulesJson: "",
  tools: [],
  toolGuidance: {},
  skillGuidance: {},
  skills: [],
  subagents: [],
  subagentGuidance: {},
  permission: {},
  systemPrompt: "",
}

export const emptyToolForm: ToolForm = {
  name: "",
  description: "",
  category: "Custom",
  installTarget: "project",
  runtime: "js-ts",
  entry: "./.opencode/tools/my-tool.ts",
  code: `import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "Echo the provided input.",
  args: {
    input: tool.schema.string().describe("Text to echo"),
  },
  async execute(args, context) {
    context.metadata({ title: "Echo tool" });
    return { title: "Echo result", output: \`Echo: \${args.input}\` };
  },
});
`,
  testInput: '{"input":"hello"}',
}

export const emptyCommandForm: CommandForm = {
  name: "",
  installTarget: "project",
  description: "",
  agent: "",
  model: "",
  subtask: false,
  template: "",
}
