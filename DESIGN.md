# AICaht OpenCode Agent Design Spec

本文件定義 `agent-web` 的產品視覺、資訊架構、互動模式與 React/coss 實作方向。設計來源為 `design/brand-spec.md` 與 `design/aicaht-opencode-agent.html`。

## Design Intent

AICaht 是面向 OpenCode agent 的低干擾工作台。介面應像 ChatGPT 式對話產品一樣安靜、留白充足，但保留開發者需要的 agent、檔案、token、工具狀態與編輯上下文。

核心姿態：

- 中央任務優先，初始視覺焦點落在對話與 composer。
- 側欄與右側面板是輔助資訊，不應搶主畫面。
- 黑白灰是主視覺，狀態色只用於 success、warning、danger。
- 技術 trace 以小尺寸資訊列、狀態 pill、popover 或面板呈現。
- 圓角柔和、陰影克制，不使用高彩度 dashboard 風格。

## Source Files

- `design/brand-spec.md`：品牌 token、字體、介面姿態規則。
- `design/aicaht-opencode-agent.html`：完整 prototype，包含 layout、CSS tokens、互動腳本與 responsive 行為。
- `src/features/home/components/CossShowcase.tsx`：目前 React/coss starter showcase，非最終 workspace UI。
- `src/shared/components/ui/`：coss primitives 安裝位置。
- `src/app/global.css`：Tailwind v4 與 coss semantic tokens 入口。

## Visual Tokens

Prototype token source:

```css
:root {
  --bg: oklch(97.6% 0 0);
  --surface: oklch(100% 0 0);
  --fg: oklch(17% 0 0);
  --muted: oklch(58% 0 0);
  --border: oklch(91.5% 0 0);
  --accent: oklch(18% 0 0);
  --accent-on: oklch(100% 0 0);
  --success: oklch(58% 0.15 145);
  --warn: oklch(74% 0.15 86);
  --danger: oklch(57% 0.2 28);
}
```

Implementation should map these concepts to coss semantic tokens:

- `--bg` maps to `--background`.
- `--surface` maps to `--card` and `--popover`.
- `--fg` maps to `--foreground` and `--primary`.
- `--muted` maps to `--muted-foreground`.
- `--border` maps to `--border` and `--input`.
- `--accent` maps to `--primary` for primary actions and selected UI.
- `--success`, `--warn`, `--danger` map to coss success, warning, and destructive families.

Do not replace coss `--alpha()` expressions in `src/app/global.css`; they are valid Tailwind v4 theme functions.

## Typography

- Display: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui`, `sans-serif`.
- Body: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui`, `sans-serif`.
- Mono: `ui-monospace`, `JetBrains Mono`, `SF Mono`, `Menlo`, `monospace`.
- Body text default: `16px`, line-height near `1.5`.
- Small UI text: `12px` to `14px`.
- Page title: `30px` to `42px` in prototype, fluid on responsive screens.
- Technical metadata uses mono font and muted foreground.

## Shape, Elevation, And Motion

- Small radius: `8px` for compact controls and tree rows.
- Medium radius: `12px` for cards, popovers, menus, panel controls.
- Large radius: `20px` to `26px` for composer and large surfaces.
- Pill radius: `999px` for icon buttons, chips, status pills, segmented controls.
- Raised shadow: only for composer, popovers, dialogs, and mobile off-canvas panels.
- Soft shadow: only for selected segmented controls and subtle card depth.
- Motion should stay between `120ms` and `300ms`.
- Popups use fade plus slight upward slide.
- Collapsible preview and pin bars use `grid-template-rows` transitions.

## Information Architecture

Desktop layout uses a three-region app shell:

```text
app-shell
  session-sidebar 260px
  chat-main minmax(0, 1fr)
  context-panel 332px
```

Primary regions:

- `session-sidebar` contains brand, primary nav, recent session search/history, and profile.
- `chat-main` contains topbar, conversation scroll area, message list, and bottom composer.
- `context-panel` contains file library and edit agent tabs.
- `preview-popup` is a modal file preview and file-scoped agent editing surface.

Secondary regions:

- `workspace-breadcrumbs` shows current project path.
- `agent-switcher` changes active agent.
- `agent-status-chip` shows provider/context usage.
- `token-popover` explains token usage for current provider.
- `attach-preview` shows files attached to the composer.
- `composer-pinbar` shows pinned file or selected content context.

## Workspace Layout

### Sidebar

The sidebar should feel quiet and utilitarian.

- Width: `260px` desktop, `240px` below `1180px`.
- Background: surface mixed with page background.
- Active item: soft accent tint, never saturated color.
- Nav items use icons plus labels.
- Recent sessions use title and mono metadata.
- Search expands inline inside the Recent section.
- Profile remains pinned to the bottom.

Recommended coss primitives:

- `Sidebar` where suitable for shell navigation.
- `Button` for icon and nav controls.
- `ScrollArea` for long session history.
- `Avatar` for profile identity.
- `Input` or `InputGroup` for recent-session search.

### Topbar

Topbar is sticky and low height.

- Height: `64px`.
- Background: translucent surface with blur.
- Left area: mobile sidebar trigger.
- Center area: mono breadcrumb path.
- Right area: agent switcher, token/context chip, mobile panel trigger.

Recommended coss primitives:

- `Breadcrumb` for project path.
- `Menu` or `Select` for agent switcher.
- `Popover` for token usage details.
- `Meter` or custom `ContextRing` for circular context usage.
- `Button` for icon controls.

### Chat Main

The chat area should stay calm and focused.

- Background: `--surface` / coss `bg-background`.
- Conversation max width: `820px`.
- Scroll padding top: wide enough to keep content away from topbar.
- Message layout: avatar column plus content column.
- Agent messages use dark avatar or primary accent.
- Tool plans use soft bordered cards, numbered rows, and status pills.
- `message-list` should use `aria-live="polite"` for streaming updates.

Recommended coss primitives:

- `Card` for plan boxes and structured tool output.
- `Badge` for status labels.
- `Progress` or `Meter` for tool status where needed.
- `Button` for inline actions like pin, retry, or copy.

### Composer

Composer is the main call to action.

- Bottom anchored inside `composer-wrap`.
- Max width: `820px`.
- Shape: large rounded rectangle, around `26px` radius.
- Primary send button: black circular button.
- Tool buttons: transparent icon buttons with muted hover.
- Attachment chips appear above the text row.
- Pin bar appears above attachment chips when context is pinned.
- Textarea auto-resizes from `44px` to around `140px`.

Recommended coss primitives:

- `Textarea` for prompt input.
- `Button` for send, voice, upload, and remove actions.
- `Popover` or `Menu` for upload source menu.
- `Badge` or custom chip for attachments.
- `Card` only if the pin preview requires richer content.

### Context Panel

Right panel provides file and edit context without dominating the chat.

- Width: `332px` desktop.
- Contains tablist with `檔案庫` and `編輯`.
- File library renders a tree with folder expansion and file metadata.
- Edit agent is single-task and stateless by design.
- Below `1180px`, right panel becomes an off-canvas panel from the right.

Recommended coss primitives:

- `Tabs` for `檔案庫` and `編輯`.
- `ScrollArea` for panel body.
- `Button` for tree rows and panel actions.
- Custom `FileTree` component for hierarchical files.
- `Textarea` and `Button` for edit agent input.

### Preview Popup

Preview popup is a modal dialog for inspecting a file and asking a file-scoped agent.

- Uses `role="dialog"` and `aria-modal="true"`.
- Width: `min(720px, 94vw)`.
- Max height: `88vh`.
- Header contains file icon, filename, metadata, pin action, insert/apply action, close.
- Body contains file-scoped agent area and collapsible file preview.
- Code preview uses line numbers and supports text selection.
- Selection shows a floating `Pin` button.
- Pinning selected lines closes popup and writes context into composer pin bar.

Recommended coss primitives:

- `Dialog` for modal shell.
- `ScrollArea` for body and code preview.
- `Button` for close, pin, insert, send.
- `Collapsible` for preview collapse.
- `Textarea` for file-scoped prompt input.

## Interaction Model

### Agent Switcher

- Trigger shows current agent name and icon.
- Dropdown uses `role="listbox"` and options use `role="option"`.
- Active agent has soft accent background and `aria-selected="true"`.
- Selection updates the visible current agent and closes the dropdown.

### Context Token Meter

- Context chip is focusable and hoverable.
- Circular meter uses `role="meter"`.
- `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-valuenow` must stay updated.
- Warning state starts near `78%`.
- Full/danger state starts near `95%`.
- Popover shows provider usage rows such as `5hr` and `1week`.

### File Tree

- Folder rows toggle expansion.
- File rows open the preview dialog.
- Tree row labels must truncate cleanly.
- File metadata appears on hover when space allows.
- Keyboard support should include focus, Enter, Space, and Escape for modal close.

### Pin Context

- Pinning full file creates a composer pin with filename and short prompt.
- Pinning selected code lines stores filename, line range, and selected text.
- Pinning selected agent response stores filename and selected dialog text.
- Composer pin can be removed with an explicit remove button.
- Remove button needs an accessible label such as `移除 Pin`.

### Attachments

- Upload menu supports library and computer sources.
- Attached files render as compact chips.
- Image files use image treatment and file metadata.
- Remove button label should include filename.

## Responsive Rules

Desktop `> 1180px`:

- Full three-column shell: sidebar, chat, context panel.
- Sidebar width `260px`.
- Context panel width `332px`.

Tablet `<= 1180px`:

- Shell becomes sidebar plus chat.
- Context panel becomes right off-canvas panel.
- Mobile panel toggle appears in topbar.

Mobile `<= 760px`:

- Shell becomes single-column chat.
- Sidebar becomes left off-canvas panel.
- Upload trigger can be hidden to preserve composer space.
- Agent chip can be hidden; context detail remains available through panel or future compact control.
- Breadcrumb can be hidden.
- Quick actions stack to one column.
- Composer row uses input plus action column.

## Accessibility Requirements

- Every icon-only button needs an `aria-label`.
- Decorative icons use `aria-hidden="true"`.
- Use visible focus states matching `--focus-ring` or coss focus ring tokens.
- Interactive targets should be at least `40px`, and preferably `44px` on coarse pointers.
- Dialogs must support Escape close, focus management, and backdrop semantics.
- Streaming message output uses `aria-live="polite"`.
- Tabs must keep `role="tablist"`, `role="tab"`, and `aria-selected` states synchronized if custom tabs are used.
- Meters must expose numeric values through ARIA, not color alone.
- Status colors must also have text labels or state classes.

## coss Implementation Guidance

This project already uses coss primitives through shadcn registry output.

- Import UI primitives from `@/shared/components/ui/<component>`.
- Keep coss-generated primitives in `src/shared/components/ui/`.
- Keep feature-specific workspace components in `src/features/<feature-name>/components/`.
- Keep route entry components in `src/features/<feature-name>/router/`.
- Keep app-level composition in `src/app/`.
- Use `lucide-react` icons and set `aria-hidden="true"` when decorative.
- Prefer coss variants before custom class overrides.
- Prefer semantic classes such as `bg-background`, `bg-card`, `text-muted-foreground`, `border-input`, and `text-foreground`.
- Avoid raw color utility classes except in file/code preview areas where dark code surface is intentional.

Recommended future feature split:

```text
src/features/workspace/
  router/
    WorkspacePage.tsx
  components/
    WorkspaceShell.tsx
    SessionSidebar.tsx
    WorkspaceTopbar.tsx
    AgentSwitcher.tsx
    ContextMeter.tsx
    ChatMessageList.tsx
    ChatComposer.tsx
    ContextPanel.tsx
    FileTree.tsx
    FilePreviewDialog.tsx
  hooks/
    useComposerAttachments.ts
    useContextMeter.ts
    useFileTree.ts
  types/
    workspace.ts
```

## Component Mapping

| Prototype area | React component target | coss primitives |
| --- | --- | --- |
| `app-shell` | `WorkspaceShell` | layout + `Sidebar` optional |
| `session-sidebar` | `SessionSidebar` | `Button`, `ScrollArea`, `Avatar`, `InputGroup` |
| `topbar` | `WorkspaceTopbar` | `Breadcrumb`, `Button`, `Popover` |
| `agent-switcher` | `AgentSwitcher` | `Menu` or `Select` |
| `context-ring` | `ContextMeter` | custom SVG + `Popover` |
| `message-list` | `ChatMessageList` | `Card`, `Badge`, `Button` |
| `chat-composer` | `ChatComposer` | `Textarea`, `Button`, `Popover`, `Badge` |
| `context-panel` | `ContextPanel` | `Tabs`, `ScrollArea`, `Button` |
| file tree | `FileTree` | custom tree rows + `Button` |
| `preview-popup` | `FilePreviewDialog` | `Dialog`, `ScrollArea`, `Collapsible`, `Button` |
| edit agent | `EditAgentPanel` | `Textarea`, `Button`, `Card` |

## Content Guidelines

- Product UI copy should use Traditional Chinese.
- Technical labels can remain English, such as `OpenCode`, `MCP Server`, `token`, `agent`, `prototype`.
- Primary prompt placeholder: `詢問 AICaht，或請 opencode-agent 開始工作`.
- Empty states should explain next action, not only describe emptiness.
- Metadata should be concise and mono-styled, for example `今天 · prototype`.

## Acceptance Checklist

- Desktop shows three-column workspace without horizontal overflow.
- Tablet opens context panel as right off-canvas surface.
- Mobile opens sidebar as left off-canvas surface.
- Composer remains the strongest affordance on initial screen.
- Token/context meter is keyboard accessible and screen-reader meaningful.
- File preview dialog traps focus and closes with Escape.
- Pinning a file or selected text creates a removable composer context chip.
- All icon-only controls have accessible labels.
- `pnpm build` and `pnpm lint` pass after implementation changes.

## Current Implementation Status

- React/Vite/TypeScript project is initialized.
- coss UI primitives are installed in `src/shared/components/ui/`.
- Tailwind v4 and coss tokens are configured in `src/app/global.css`.
- The home route now loads `src/features/workspace/router/WorkspacePage.tsx`.
- The AICaht workspace has been ported into feature-based React components under `src/features/workspace/` using mock data.
- Remaining integration work is wiring real OpenCode agent API, session persistence, tool logs, streaming, and real file IO.
