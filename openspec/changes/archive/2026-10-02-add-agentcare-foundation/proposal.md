# Change: 建立 AgentCare 基礎專案與 SSO 登入

## Why

AgentCare 倉庫尚無可運作的應用。已建立但沒有業務表的 AgentCare 資料庫，以及既有 EasyWealthSSO 身分與授權資料，需要一個獨立、安全且可測試的登入與 Dashboard 基礎。

## What Changes

- 建立 React 19／Vite 與 .NET 9 API 的單一倉庫基礎、開發指令及僅建置與測試的 CI。
- 以 AgentCare 專屬連線與 FluentMigrator 管理登入查詢程序；使用 EasyWealthSSO 的 ApplicationID 12 與 Company GroupId 3。
- 提供公司清單、登入、session、動態選單、修改密碼、登出及健康檢查；使用獨立 HttpOnly Cookie。
- 建立與 AssetMgmt_UI 結構及互動一致的登入頁和 Dashboard，保留真實選單與狀態，不加入業務頁面。
- 首次資料庫遷移由實作者完成預檢後明確執行，開發啟動及 CI 均不自動套用。

## Impact

- Affected specs: project-foundation, application-auth, dashboard-shell（皆為新增能力）。
- Affected code and guidance: 根目錄 `AGENTS.md` 的目錄導覽、repository orchestration、React UI、.NET API、AgentCare migration library/CLI、build-only GitHub Actions。
- Shared SSO: 讀取身分與授權資料；使用者自行修改密碼是唯一寫入例外。不得遷移或種入 SSO 資料。
