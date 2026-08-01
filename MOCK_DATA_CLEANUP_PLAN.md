# Mock/Fallback Data Cleanup Plan

## 目標

移除前端會顯示或操作假資料的路徑，讓 `agent-web` 在 BFF 成功時只呈現真實資料，在 BFF 失敗或尚未連線時呈現 loading、empty 或 error state，不再回填 mock、sample 或 seed data。

## 範圍

- 清理 `src/app/data/mockWorkspace.ts` 及所有引用。
- 清理檔案樹、專案列表、附件、檔案預覽、Agent 修改建議的假資料行為。
- 清理 sidebar 設定中的 seed/fallback data，包括 MCP server、model provider、agent model dropdown、skill/tool 預設清單。
- 保留表單 placeholder、空狀態文案、官方 plugin example、tool template 等不會被誤認為真實資料的範例內容。

## 非目標

- 不新增後端 API。
- 不重構整體路由或資料流。
- 不改變 BFF endpoint contract。
- 不處理登入使用者資料來源，除非後續明確要求。

## 修改計畫

### 1. 移除 workspace mock data source

檔案：

- `src/app/data/mockWorkspace.ts`
- `src/app/AppRouter.tsx`

修改：

- 將 `projects` 初始值由 `recentProjects` 改為 `[]`。
- 將 `contextFileTree` 初始值由 `mockFileTree` 改為 `[]`。
- 檔案樹載入失敗時只設定 `contextFileTreeError`，不要 `setContextFileTree(mockFileTree)`。
- 移除 `recentProjects[0]` 與 `/workspace/projects/test-web` fallback。
- 若沒有 active route project，`activeProjectPath` 維持 `null`，讓現有空狀態處理。
- 移除 `starterAttachments` 使用。
- 刪除 `src/app/data/mockWorkspace.ts`。

驗收：

- BFF 未連線時，專案列表顯示錯誤或空狀態，不顯示 `test-web`、`agent-web`、`build-example`。
- 檔案樹 API 失敗時，Context panel 顯示錯誤，不顯示 `src/docs/package.json` 的假 tree。
- 全 repo 搜尋不到 `mockWorkspace`。

### 2. 清理 composer fake attachments

檔案：

- `src/app/AppRouter.tsx`
- `src/shared/components/layout/context/ChatComposer.tsx`

修改：

- 移除 `addAttachment()` 中從 `starterAttachments` 取假附件的邏輯。
- 在真實檔案庫 picker/local upload 尚未接上前，先將「從檔案庫選取」與「上傳本機檔案」按鈕 disable，或隱藏 attachment menu。
- 移除 `ChatComposer.tsx` 底部「目前使用 mock data」提示。

驗收：

- 點擊 composer 附件入口不會加入 `spec-設計規格.pdf` 或 `wireframe-v2.png`。
- UI 不再顯示 mock data 原型提示。

### 3. 清理 file preview sample content 與 fake agent response

檔案：

- `src/shared/components/layout/dialogs/AppFilePreviewDialog.tsx`

修改：

- 刪除 `getFileSample()`。
- `getFilePreviewContent()` 只使用 `file.content`；沒有內容時顯示空字串或明確空狀態。
- 保留 binary/error/loading branch。
- 移除 `submitAgentPrompt()` 產生的 canned response。
- 移除 `applyAgentSuggestion()` 對草稿追加 `Agent note` 的假修改。
- 在真實 agent API 尚未接上前，將「執行修改」按鈕 disable，並顯示「Agent 修改尚未接入」類型的狀態訊息。

驗收：

- 未載入內容的檔案不會顯示 sample HTML/CSS/TS/MD/JSON。
- 點擊 Agent 修改不會產生假的「Agent 已讀取...」回覆。

### 4. 清理 MCP seed data

檔案：

- `src/shared/components/layout/app-sidebar/config.ts`
- `src/shared/components/layout/app/AppSidebar.tsx`

修改：

- 移除 `initialMcpServers` 或改成空陣列。
- `mcpServers` 初始值改成 `[]`。
- `emptyMcpForm` 的 `url`、`name`、`username`、`password` 改成空字串。
- 表單 placeholder 可以保留 `http://localhost:4096`、`Localhost`。

驗收：

- MCP dialog 初次打開不顯示 `192.168.1.104:8787`。
- 新增 MCP server 表單不再預填 URL 或 username。

### 5. 清理 model provider fallback catalog

檔案：

- `src/shared/components/layout/app-sidebar/config.ts`
- `src/shared/components/layout/app/AppSidebar.tsx`

修改：

- 不再以 `initialModelProviders` 作為 provider 初始資料或 API 失敗 fallback。
- `modelProviders` 初始值改成 `[]`。
- `loadModelProviders()` 失敗時保留 `[]`，只顯示錯誤 toast。
- `toModelProvider()` 優先使用 BFF provider/model/auth methods。
- 如需 icon、badge、description 補充，可拆成純 UI metadata map，不包含 connected/enabled/defaultModel/apiKey 等狀態資料。

驗收：

- Provider API 失敗時不顯示 OpenAI/Anthropic/Gemini 等靜態 fallback provider。
- Provider connected/enabled/model list 只來自 BFF。

### 6. 清理 agent form 的硬編碼模型與技能清單

檔案：

- `src/shared/components/layout/app-sidebar/config.ts`
- `src/shared/components/layout/app/AppSidebar.tsx`
- `src/shared/components/layout/app-sidebar/AgentsToolsModalSections.tsx`

修改：

- 移除 `availableModels` 或停止用它作為模型 dropdown 的資料源。
- Agent model 欄位改用 provider catalog 產生的模型清單，或暫時改成自由輸入。
- `skillToAdd` 初始值改成空字串。
- 可加入技能清單使用 `skillSettings.filter((skill) => skill.enabled)` 推導，不再使用硬編碼 `availableSkills`。

驗收：

- Agent 表單不再固定顯示 `openai/gpt-5.5`、`anthropic/claude...` 等硬編碼模型。
- 可加入技能清單只來自載入後的 skill 設定。

### 7. 拆除 sample custom tools 與 unused exports

檔案：

- `src/shared/components/layout/app-sidebar/config.ts`
- `src/shared/utils/app-sidebar.ts`
- `src/shared/components/layout/app/AppSidebar.tsx`

修改：

- 從 `initialToolDefinitions` 拆出真正需要的 built-in tool metadata。
- 刪除 sample custom tools：`database`、`cms_publish`。
- `toolToAdd` 初始值改成空字串，工具載入後再選第一筆可用工具。
- 刪除未使用 exports：`agentDefinitions`、`initialPlugins`、`initialSkillSettings`。
- 修掉因刪除造成的 unused imports/types。

驗收：

- 工具列表不再依賴 sample custom tools。
- TypeScript build 不出現 unused export/import 錯誤。

## 保留項目

以下內容不是 runtime mock data，暫時保留：

- 表單 placeholder，例如 `例如：agent-web`、`http://localhost:4096`。
- 空狀態文案，例如「目前沒有可顯示的專案檔案」。
- `officialPluginExamples`，因為它是明確的官方範例選項，不會自動當作真實資料顯示。
- tool template 與 test input，因為它們只在新增自訂 tool 時作為編輯模板。
- `DEFAULT_THINKING_VARIANTS`，因為它是缺少 API variants 時的 UI option fallback，不是資料紀錄。
- `EMPTY_AGENT`，因為它是 no-agent 狀態的顯示物件，不會出現在 agent 清單中。

## 可選後續

- `src/shared/components/layout/app-sidebar/AppSidebarPanel.tsx` 底部使用者名稱與方案狀態目前硬編碼為 `仲書 吳`、`Pro · Agent API 待接`。這不是本次 mock data 清理核心，但若要完全 API-only，也應改成 user/profile API 或匿名狀態。
- 若 attachment 功能要保留，需要補真實檔案庫 picker 與 local upload workflow。
- 若 file preview 的手動編輯要持久化，需要接 `createOrUpdateProjectFile` 或新增明確儲存按鈕流程；目前「套用到預覽」只更新前端 draft。

## 驗證指令

在 `agent-web` 目錄執行：

```bash
pnpm lint
pnpm build
```

手動驗證：

- BFF 正常時，專案、sessions、agents、providers、檔案樹皆來自 API。
- BFF 失敗時，UI 只顯示 loading、empty 或 error state，不出現假專案、假檔案、假附件、假 provider。
- 搜尋 `mockWorkspace`、`mock data`、`test-web`、`wireframe-v2.png`、`spec-設計規格.pdf` 應無 runtime 引用。
