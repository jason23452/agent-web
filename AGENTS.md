# AGENTS.md

## 專案現況

- 這是單一 package 的 `pnpm` React 19 + Vite 8 + TypeScript 專案；`pnpm-workspace.yaml` 沒有額外 workspace package。依賴與 lockfile 以 `pnpm` 為準，不要用 npm/yarn 改寫 lockfile。
- 執行入口是 `src/main.tsx` -> `src/App.tsx` -> `src/app/AppRouter.tsx`。`AppRouter` 不只是路由器，也集中管理 History API 導航、BFF 載入、專案/session/agent 狀態，以及 `AppShell` 組裝。
- 沒有 React Router。`/` 進入 home，`/workspace` 是未選專案頁，`/workspace/<projectName>` 是專案路由；解析與 URL 生成在 `src/app/appRouterUtils.ts`、各 feature 的 `router/index.tsx`，實際導航在 `AppRouter.tsx` 的 `pushState`/`popstate`。
- 主要邊界是 `src/app/`（應用組裝、路由工具、mock）、`src/features/home/`、`src/features/workspace/`（workspace route 與專用 API）、`src/shared/components/layout/`（應用布局/功能布局）、`src/shared/components/ui/`（coss/shadcn primitives）和 `src/shared/api/`（共用 BFF wrapper）。不要按 `DESIGN.md` 的 future feature tree 猜測尚未存在的檔案。
- `@/*` 在 Vite 與 TypeScript 都指向 `src/*`；跨目錄 import 使用 `@/...`。

## 命令與驗證

- 安裝：`pnpm install`
- 開發：`pnpm dev`（Vite 綁定 `0.0.0.0`）
- lint：`pnpm lint`；聚焦檢查可用 `pnpm exec eslint src/path/to/file.tsx`
- production build：`pnpm build`；此命令依序執行 `tsc -b` 再執行 `vite build`
- 預覽：`pnpm preview`（同樣綁定 `0.0.0.0`）
- 完成程式改動後至少依序執行 `pnpm lint`、`pnpm build`。目前沒有 test script、測試框架、formatter、獨立 typecheck、codegen 或 migration 命令，不要假設可執行 `pnpm test` 等命令。
- TypeScript 是 strict，並啟用 `noUnusedLocals`、`noUnusedParameters`、`erasableSyntaxOnly`、`noFallthroughCasesInSwitch`、`noUncheckedSideEffectImports`；未使用的 import/參數會阻止 build。

## BFF 與資料流

- 前端不包含後端或 Docker 配置；需要真實專案、session、agent、provider、檔案或 OpenCode runtime 時，必須有可連線的 BFF。不要在此 repo 猜測或新增後端啟動命令。
- BFF base URL 使用 `VITE_BFF_BASE_URL`，未設定時 `src/shared/api/client.ts` 回退到 `http://127.0.0.1:8000`；`.env` 被 `.gitignore` 排除。
- 所有 API 必須經 `src/shared/api/client.ts` 的 `apiRequest`，由既有 wrapper（`src/shared/api/` 或 `src/features/workspace/api/`）集中 endpoint、query、JSON body 和 `ApiError` 處理；不要在 component 內直接重複 `fetch`、URL 或錯誤解析。
- 路由或專案切換相關的非同步載入要沿用 `AbortController`/`AbortSignal`，並在 response 回來前檢查是否已取消，避免舊專案資料覆蓋新狀態。
- `src/app/data/mockWorkspace.ts` 提供初始示例專案/檔案樹/附件；真實專案與檔案樹載入失敗時，`AppRouter` 對部分狀態會回退到示例資料。不要把 mock 當作 API schema 或真實 persistence。

## UI 實作規則

- UI 規格與繁體中文文案、響應式斷點、coss semantic tokens、無障礙要求以 `DESIGN.md` 為設計參考；產品 UI 文案使用繁體中文，技術名稱如 `OpenCode`、`agent`、`token` 可保留英文。
- Tailwind v4 的實際 CSS 入口是 `src/index.css`。`components.json` 的 `tailwind.css` 仍錯指不存在的 `src/app/global.css`，`DESIGN.md` 也有相同過時路徑；不要建立或修改該不存在的入口來修正問題。
- 可重用 registry primitive 放 `src/shared/components/ui/`；應用 shell/布局放 `src/shared/components/layout/`；feature-specific component、hook、type/API 放對應 `src/features/<feature>/`；route entry 放 feature 的 `router/`。
- 優先使用 semantic classes，例如 `bg-background`、`bg-card`、`text-foreground`、`text-muted-foreground`、`border-input`，以及既有 coss variant；不要另建一套 UI primitive 或任意改用 raw color utilities。
- icon-only button 必須有 `aria-label`，裝飾 icon 使用 `aria-hidden="true"`；自訂 dialog、tabs、meter、streaming message 要遵守 `DESIGN.md` 的 ARIA 與鍵盤互動要求。

## 產物與設定陷阱

- `dist/` 是 Vite build artifact，已被忽略；不要手動修改或以它作為 source of truth。
- ESLint 只明確忽略 `dist`；新增檔案若被 `pnpm lint` 納入，就必須符合現有 flat config 與 React Hooks 規則。`src/shared/components/ui/**/*.{ts,tsx}` 另有 registry component 的 `react-refresh/only-export-components` 例外。
