# AGENTS.md

## 專案與入口

- 這是單一 `pnpm` React 19 + Vite + TypeScript 專案；`pnpm-workspace.yaml` 目前沒有額外 workspace package。
- 啟動鏈是 `src/main.tsx` -> `src/App.tsx` -> `src/app/AppRouter.tsx`。`AppRouter` 同時負責手動 History API 路由、主要資料載入與 workspace 組裝。
- 路由不是 React Router：`/` 是 home，`/workspace` 是空 workspace，`/workspace/<project>` 是專案 workspace；路由解析與導向集中在 `src/app/appRouterUtils.ts` 和 `AppRouter.tsx`。
- 目前主要區域在 `src/features/{home,workspace}`、`src/shared/components/layout`、`src/shared/components/ui`、`src/shared/api`；workspace 專用 API 在 `src/features/workspace/api`。不要只依 `DESIGN.md` 的「future feature split」推測尚未建立的路徑。
- `@/*` 解析到 `src/*`，Vite 與 TypeScript 都已設定；新增跨目錄 import 優先使用 `@/...`。

## 開發與驗證

- 安裝依賴：`pnpm install`。依賴版本以 `pnpm-lock.yaml` 為準，不要改用 npm/yarn 更新 lockfile。
- 開發伺服器：`pnpm dev`（Vite 綁定 `0.0.0.0`）。預覽 production build：`pnpm preview`。
- 完整驗證：`pnpm lint`，再執行 `pnpm build`；build 會先跑 `tsc -b` 再跑 `vite build`。
- 單檔或聚焦 ESLint 可用 `pnpm exec eslint src/path/to/file.tsx`；目前沒有 `test`、formatter 或獨立 `typecheck` script，也沒有已配置的測試套件。
- `.env` 由 `.gitignore` 排除，預設 `VITE_BFF_BASE_URL=http://127.0.0.1:8000`。`src/shared/api/client.ts` 會用它組 API URL；未設定時仍回退到相同的 `127.0.0.1:8000`。
- 真實專案、session、agent、provider、檔案與 runtime 操作需要可連線的 BFF；本 repo 沒有後端或 Docker 配置，不要在此目錄猜測後端啟動命令。無 BFF 時部分畫面會使用 `src/app/data/mockWorkspace.ts` 的示例資料。

## 實作規則

- TypeScript 設定是 strict，且啟用 `noUnusedLocals`、`noUnusedParameters`、`noUncheckedSideEffectImports` 等檢查；完成改動至少跑 `pnpm lint` 與 `pnpm build`。
- `src/shared/components/ui` 是 coss/shadcn registry primitives 的安裝位置；可重用 UI primitive 放這裡，應用布局與功能元件放現有的 `src/shared/components/layout` 或對應 feature 目錄，不要任意改成另一套 UI 目錄。
- UI 改動先讀 `DESIGN.md`；其中的繁體中文產品文案、coss semantic tokens、響應式斷點與無障礙要求是本專案約定。優先使用 `bg-background`、`bg-card`、`text-foreground`、`text-muted-foreground` 等語意 class。
- Tailwind v4 的實際 CSS 入口是 `src/index.css`。`components.json` 的 `tailwind.css` 仍指向不存在的 `src/app/global.css`，不要依該欄位建立或修改錯誤入口。
- API 呼叫集中經由 `src/shared/api/client.ts` 的 `apiRequest`，並使用 `AbortSignal` 取消依賴路由或專案切換時的請求；新增 BFF endpoint 時沿用現有 API wrapper，不要在元件內直接重複 URL/錯誤解析。
- `dist/` 是 Vite 產生物且已被忽略，不要手動修改或把 build artifact 當作 source of truth。
