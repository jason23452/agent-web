import type { ModelProvider } from "@/shared/components/layout/settings/UserSettingsModal";
import type {
  AgentDefinition,
  AgentForm,
  CommandForm,
  McpForm,
  McpServer,
  PluginDefinition,
  PluginForm,
  SkillDefinition,
  SkillForm,
  ToolDefinition,
  ToolForm,
} from "@/shared/types/app-sidebar";

export const initialMcpServers: McpServer[] = [
  {
    id: "lan-mcp",
    url: "http://192.168.1.104:8787",
    name: "Localhost",
    username: "",
    password: "",
    version: "v1.16.2",
    isDefault: true,
  },
];

export const emptyMcpForm: McpForm = {
  url: "http://localhost:4096",
  name: "Localhost",
  username: "opencode",
  password: "",
};

export const agentDefinitions: AgentDefinition[] = [
  {
    id: "build",
    name: "build",
    description:
      "The default agent. Executes tools based on configured permissions.",
    scope: "system",
    mode: "primary",
    model: "openai/gpt-5.5",
    tools: ["read", "grep", "glob", "bash", "apply_patch"],
    skills: ["react-vite-feature-based", "coss"],
    subagents: ["explore", "general", "plan"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      bash: "allow",
      edit: "allow",
      task: "allow",
    },
    systemPrompt:
      "You are the default build agent. Implement requested changes directly and verify your work.",
  },
  {
    id: "explore",
    name: "explore",
    description:
      "Fast agent specialized for exploring codebases and answering repository questions.",
    scope: "system",
    mode: "subagent",
    model: "openai/gpt-5.5-mini",
    tools: ["read", "grep", "glob", "task"],
    skills: ["react-vite-feature-based"],
    subagents: ["plan"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      edit: "deny",
      bash: "ask",
      task: "allow",
    },
    systemPrompt:
      "Explore the codebase quickly and return concise findings. Do not edit files.",
  },
  {
    id: "general",
    name: "general",
    description:
      "General-purpose agent for researching complex questions and executing multi-step tasks.",
    scope: "system",
    mode: "subagent",
    model: "openai/gpt-5.5",
    tools: ["read", "grep", "glob", "bash", "task"],
    skills: ["playwright-e2e-testing", "accessibility-compliance"],
    subagents: ["explore", "plan"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      bash: "ask",
      edit: "ask",
      task: "allow",
    },
    systemPrompt:
      "Research complex questions and execute multi-step work with clear verification.",
  },
  {
    id: "plan",
    name: "plan",
    description: "Plan mode. Disallows all edit tools.",
    scope: "system",
    mode: "subagent",
    model: "openai/gpt-5.5-mini",
    tools: ["read", "grep", "glob"],
    skills: ["information-architecture"],
    subagents: [],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      bash: "ask",
      edit: "deny",
      task: "deny",
    },
    systemPrompt: "Analyze and plan. Do not modify files.",
  },
  {
    id: "docs-implement",
    name: "Docs Implement",
    description:
      "掃描 docs 中需求實作的文件，平行派 subagent 實作，完成後更新狀態。",
    scope: "custom",
    mode: "subagent",
    model: "openai/gpt-5.5",
    tools: ["read", "grep", "glob", "task", "apply_patch"],
    skills: ["react-vite-feature-based", "coss"],
    subagents: ["explore", "docs-plan"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      bash: "ask",
      edit: "allow",
      task: "allow",
    },
    systemPrompt:
      "Read implementation docs, coordinate subagents, implement requested changes, and update status notes.",
  },
  {
    id: "docs-plan",
    name: "Docs Plan",
    description:
      "像內建 plan 一樣規劃工作，但可在 docs 新增或修改規劃文件並標記。",
    scope: "custom",
    mode: "subagent",
    model: "openai/gpt-5.5-mini",
    tools: ["read", "grep", "glob"],
    skills: ["information-architecture"],
    subagents: ["plan"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      bash: "ask",
      edit: "ask",
      task: "deny",
    },
    systemPrompt:
      "Plan documentation-driven work and write concise implementation plans when needed.",
  },
];

export const availableSkills = [
  "react-vite-feature-based",
  "coss",
  "playwright-e2e-testing",
  "accessibility-compliance",
  "information-architecture",
  "responsive-design",
];

export const initialPlugins: PluginDefinition[] = [
  {
    id: "helicone-session",
    name: "opencode-helicone-session",
    description:
      "將 OpenCode session telemetry 送到 Helicone，方便追蹤模型呼叫與成本。",
    source: "remote",
    entry: "opencode-helicone-session",
    enabled: true,
    config: '{"sampleRate":1}',
  },
  {
    id: "project-hooks",
    name: "project-hooks",
    description: "專案本地 plugin，可提供自訂 hooks、工具與整合流程。",
    source: "local",
    entry: "./.opencode/plugins/project-hooks.ts",
    enabled: false,
    config: "{}",
  },
];

export const emptyPluginForm: PluginForm = {
  method: "npm",
  name: "",
  description: "",
  entry: "",
  installTarget: "project",
  archiveName: "",
  code: `import type { Plugin } from "@opencode-ai/plugin";

export const MyPlugin: Plugin = async () => ({
  // Add plugin hooks here.
});
`,
  useOfficialExample: false,
  officialExample: "basic",
  customPluginEnabled: false,
  useInProject: false,
};

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
  {
    id: "inject-env",
    name: "注入環境變數",
    description: "將環境變數注入 Shell 執行。",
    code: `export const InjectEnvPlugin = async () => ({
  "shell.env": async (input, output) => {
    output.env.PROJECT_ROOT = input.cwd;
  },
});
`,
  },
  {
    id: "custom-tools",
    name: "自訂工具",
    description: "透過 Plugin 新增自訂工具。",
    code: `import { type Plugin, tool } from "@opencode-ai/plugin";

export const CustomToolsPlugin: Plugin = async () => ({
  tool: {
    hello: tool({
      description: "Say hello.",
      args: {},
      async execute() {
        return "Hello from OpenCode plugin";
      },
    }),
  },
});
`,
  },
] as const;

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
};

export const initialSkillSettings: SkillDefinition[] = availableSkills.map(
  (skill, index) => ({
    id: skill,
    name: skill,
    description:
      index < 2
        ? "目前專案常用技能，可被 Agent 載入並套用對應工作流。"
        : "可選技能，啟用後可提供給 Agent 設定使用。",
    scope: index < 3 ? "project" : "global",
    enabled: index < 4,
    path:
      index < 3
        ? `.opencode/skills/${skill}/SKILL.md`
        : `~/.config/opencode/skills/${skill}/SKILL.md`,
  }),
);

export const modelVariants = [
  "",
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export const agentColors = [
  "",
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "error",
  "info",
];

export const availableModels = [
  "openai/gpt-5.5",
  "openai/gpt-5.5-mini",
  "opencode/gpt-5.1-codex",
  "anthropic/claude-opus-4-5-20251101",
  "anthropic/claude-sonnet-4-5-20250929",
  "google/gemini-3-pro",
  "minimax/minimax-m2.1",
];

export const initialModelProviders: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "使用 ChatGPT Pro/Plus 或 API 密鑰連接",
    icon: "◎",
    connected: true,
    enabled: true,
    npm: "@ai-sdk/openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "{env:OPENAI_API_KEY}",
    headersJson: "",
    defaultModel: "openai/gpt-5.5",
    modelDisplayName: "GPT 5.5",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: [
      "ChatGPT Pro/Plus (browser)",
      "ChatGPT Pro/Plus (headless)",
      "API 密鑰",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "使用 Claude Pro/Max 或 API 密鑰連接",
    icon: "AI",
    connected: false,
    enabled: true,
    npm: "@ai-sdk/anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "{env:ANTHROPIC_API_KEY}",
    headersJson: "",
    defaultModel: "anthropic/claude-sonnet-4-5-20250929",
    modelDisplayName: "Claude Sonnet 4.5",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "claude-opus-4-5-20251101",
    authMethods: [
      "Claude Pro/Max (browser)",
      "Claude Pro/Max (headless)",
      "API 密鑰",
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "使用 Google 帳號或 API 密鑰連接",
    icon: "✦",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "{env:GOOGLE_GENERATIVE_AI_API_KEY}",
    headersJson: "",
    defaultModel: "google/gemini-3-pro",
    modelDisplayName: "Gemini 3 Pro",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: [
      "Google OAuth (browser)",
      "Google OAuth (headless)",
      "API 密鑰",
    ],
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    description: "使用 OpenCode Zen 或 API 密鑰連接",
    icon: "Z",
    badge: "推薦",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.opencode.ai/v1",
    apiKey: "{env:OPENCODE_API_KEY}",
    headersJson: "",
    defaultModel: "opencode/gpt-5.1-codex",
    modelDisplayName: "GPT 5.1 Codex",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["OpenCode Zen", "API 密鑰"],
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    description: "適合所有人的低成本訂閱",
    icon: "G",
    badge: "推薦",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.opencode.ai/v1",
    apiKey: "{env:OPENCODE_GO_API_KEY}",
    headersJson: "",
    defaultModel: "opencode/gpt-5.1-codex",
    modelDisplayName: "GPT 5.1 Codex",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["OpenCode Go", "API 密鑰"],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "使用 Copilot 或 API 密鑰連接",
    icon: "⌘",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://api.githubcopilot.com/v1",
    apiKey: "{env:GITHUB_TOKEN}",
    headersJson: "",
    defaultModel: "github-copilot/gpt-4.1",
    modelDisplayName: "GPT 4.1",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["GitHub OAuth (browser)", "Device code", "API 密鑰"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "使用 OpenRouter 帳號或 API 密鑰連接",
    icon: "↢",
    connected: false,
    enabled: false,
    npm: "@ai-sdk/openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "{env:OPENROUTER_API_KEY}",
    headersJson: "",
    defaultModel: "openrouter/openai/gpt-4.1",
    modelDisplayName: "GPT 4.1 via OpenRouter",
    contextLimit: "",
    outputLimit: "",
    whitelist: "",
    blacklist: "",
    authMethods: ["OpenRouter OAuth", "API 密鑰", "自訂 headers"],
  },
];

export const initialToolDefinitions: ToolDefinition[] = [
  {
    id: "read",
    name: "read",
    description: "Read files from the current workspace.",
    category: "Files",
    source: "built-in",
  },
  {
    id: "grep",
    name: "grep",
    description: "Search file contents using regular expressions.",
    category: "Search",
    source: "built-in",
  },
  {
    id: "glob",
    name: "glob",
    description: "Find files by path pattern across the workspace.",
    category: "Search",
    source: "built-in",
  },
  {
    id: "bash",
    name: "bash",
    description:
      "Run approved terminal commands for verification and development tasks.",
    category: "Runtime",
    source: "built-in",
  },
  {
    id: "apply_patch",
    name: "apply_patch",
    description: "Apply precise file edits through patch operations.",
    category: "Edit",
    source: "built-in",
  },
  {
    id: "task",
    name: "task",
    description:
      "Launch subagents for larger exploration or implementation work.",
    category: "Agent",
    source: "built-in",
  },
  {
    id: "database",
    name: "database",
    description: "Query project database records, schema, and persisted data.",
    category: "Custom",
    source: "custom",
    installTarget: "project",
  },
  {
    id: "cms_publish",
    name: "cms_publish",
    description:
      "Publish or validate CMS content through a project-specific tool.",
    category: "Custom",
    source: "custom",
    installTarget: "project",
  },
];

export const emptyAgentForm: AgentForm = {
  name: "",
  installTarget: "project",
  description: "",
  mode: "subagent",
  model: "openai/gpt-5.5",
  temperature: "0.3",
  top_p: "1",
  variant: "",
  steps: "",
  disable: false,
  hidden: false,
  color: "",
  promptSource: "inline",
  promptFile: "",
  providerOptionsJson: "",
  permissionRulesJson: "",
  tools: ["read", "grep", "glob"],
  toolGuidance: {},
  skillGuidance: {},
  skills: ["react-vite-feature-based"],
  subagents: [],
  subagentGuidance: {},
  permission: {
    read: "allow",
    grep: "allow",
    glob: "allow",
    list: "allow",
    bash: "ask",
    edit: "ask",
    task: "deny",
    skill: "allow",
    webfetch: "ask",
    websearch: "ask",
    lsp: "allow",
    question: "ask",
    todowrite: "ask",
    external_directory: "ask",
    doom_loop: "ask",
  },
  systemPrompt: "",
};

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
    return {
      title: "Echo result",
      output: \`Echo: \${args.input}\`,
    };
  },
});
`,
  testInput: '{"input":"hello"}',
};

export const emptyCommandForm: CommandForm = {
  name: "",
  installTarget: "project",
  description: "",
  agent: "",
  model: "",
  subtask: false,
  template: "",
};
