import type { Agent, Attachment, FileNode, Project, Session, TokenUsage, WorkspaceMessage } from "@/shared/types/workspace"

export const agents: Agent[] = [
  { id: "opencode", name: "opencode-agent", provider: "OpenAI", status: "active" },
  { id: "coder", name: "coder-agent", provider: "Anthropic", status: "idle" },
  { id: "reviewer", name: "reviewer-agent", provider: "OpenAI", status: "review" },
]

export const sessions: Session[] = [
  { id: "a", title: "OpenCode agent 串接規劃", meta: "今天 · prototype" },
  { id: "b", title: "ADO MCP 功能介紹", meta: "昨天 · research" },
  { id: "c", title: "Docker 容器進入流程", meta: "週二 · ops" },
  { id: "d", title: "HTMX 缺點分析", meta: "週一 · note" },
  { id: "e", title: "Opencode Web 介面選擇", meta: "7 月 18 日 · ui" },
]

export const recentProjects: Project[] = [
  { id: "test-web", name: "test-web", path: "/workspace/test-web/" },
  { id: "agent-web", name: "agent-web", path: "C:/Users/Bojii/Desktop/SDD/agent-web/" },
  { id: "build-example", name: "build-example", path: "C:/Users/Bojii/Desktop/SDD/build-example/" },
]

export const messages: WorkspaceMessage[] = [
  {
    id: "agent-intro",
    role: "agent",
    title: "我可以協助你把 OpenCode agent 接進前端工作台。",
    body: "目前 prototype 已拆成可落地的 React feature：左側對話歷史、中央任務流、右側檔案庫與編輯 agent。下一步可以接真實 API、工具呼叫與串流訊息。",
    plan: [
      { id: "p1", label: "建立 feature-based workspace shell", status: "done" },
      { id: "p2", label: "接上 agent、token 與檔案上下文", status: "running" },
      { id: "p3", label: "串接後端 session 與 tool logs", status: "pending" },
    ],
  },
]

export const tokenUsage: TokenUsage[] = [
  { label: "5hr", used: 144000, limit: 200000 },
  { label: "1week", used: 2900000, limit: 7000000 },
]

export const fileTree: FileNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "chat-message", name: "ChatMessage.tsx", type: "tsx", size: "4.2 KB", date: "今天 15:10" },
          { id: "sidebar", name: "Sidebar.tsx", type: "tsx", size: "3.8 KB", date: "今天 14:55" },
        ],
      },
      { id: "index-html", name: "index.html", type: "html", size: "2.4 KB", date: "今天 14:32" },
      { id: "style-css", name: "style.css", type: "css", size: "6.1 KB", date: "今天 14:28" },
      { id: "app-ts", name: "app.ts", type: "ts", size: "8.7 KB", date: "昨天 19:15" },
    ],
  },
  {
    id: "docs",
    name: "docs",
    type: "folder",
    children: [
      { id: "brand-spec", name: "brand-spec.md", type: "md", size: "1.3 KB", date: "昨天 16:00" },
      { id: "wireframe", name: "wireframe-v2.png", type: "img", size: "342 KB", date: "2026-07-23" },
      { id: "prd", name: "prd.md", type: "md", size: "12.5 KB", date: "2026-07-22" },
    ],
  },
  { id: "package-json", name: "package.json", type: "json", size: "342 B", date: "2026-07-21" },
]

export const starterAttachments: Attachment[] = [
  { id: "spec", name: "spec-設計規格.pdf", meta: "2.4 MB" },
  { id: "wireframe", name: "wireframe-v2.png", meta: "1.2 MB · 圖片", isImage: true },
]
