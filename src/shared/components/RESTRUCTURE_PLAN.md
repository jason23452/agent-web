# Shared Components 整理規劃

## 已完成盤點
- `agent-web/src/shared/components/ui` 目前有 54 個元件檔（不含 `index.ts`）。
- `agent-web/src/shared/components/layout` 目前有 27 個檔案（含 `app-sidebar` 子目錄）。
- 全域 import 主要以直接檔名路徑為主，現況為 `@/shared/components/ui/<component>` 與 `@/shared/components/layout/<component>`。
- 你目前要求：**先不做 UI 分群**，先集中整理 `layout` 目錄。

## 目標方向（先做 layout 分群）
- 目標：建立 `layout` 功能群組並重組資料夾，不改變對外可用 API。
- 策略：先建立新分群目錄與分群 index，將所有 import 更新到新路徑，再逐步移除舊 shim。

## 建議的 Layout 分群

### `shared/components/layout/app`
`AppShell`, `AppTopbar`, `TopNav`, `AppSidebar`, `Sidebar`, `AgentSwitcher`

### `shared/components/layout/context`
`AppContextPanel`, `FileTree`, `ChatComposer`, `ContextMeter`

### `shared/components/layout/dialogs`
`ModalShell`, `AppFilePreviewDialog`

### `shared/components/layout/settings`
`UserSettingsModal`, `UserSettingsSidebar`, `UserSettingsModelProviders`, `UserSettingsNpmPackagesPanel`, `UserSettingsPlatformPanels`

### `shared/components/layout/app-sidebar`
`AppSidebarPanel`, `AgentsToolsModal`, `AgentsToolsModalSections`, `McpServersDialog`, `PluginSkillModal`, `PluginSkillModalSections`, `ProjectDialog`, `config`, `types`, `utils`

## 逐步執行（建議）
1. 先新增 `shared/components/layout/{app,context,dialogs,settings,app-sidebar}` 目錄。
2. 搬移 layout 實體元件到新目錄。
3. 將專案 imports 全部改到新群組路徑後，移除舊 shim，確保實際引用都走新分群。
4. 補齊 `shared/components/layout/index.ts` 作為彙總匯出。
5. 跑一次 `TypeScript`/`vite` 型別與 build 檢查。

## 風險與注意
- `layout/app-sidebar/*` 有大量共用型別（`types/config/utils`）與其他 layout 組件互相依賴，建議與 `app-sidebar` 目錄同時搬遷。
- `AppSidebar` 內部目前透過 `app-sidebar` 的子組件及設定檔直接引用，搬移後建議先跑 import 掃描確認。
