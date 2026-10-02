## Context

AgentCare Git 倉庫沒有既有應用程式碼。AgentCare 資料庫已建立、尚無業務表；提供的 AssetMgmt 連線僅是主機與格式範例，不是第三個資料來源。EasyWealthSSO 已有 AgentCare 的 ApplicationID 12、Company GroupId 3、角色、使用者授權與選單。真實 SSO 帳號登入由使用者手動驗收。

## Goals / Non-Goals

- Goals: 可啟動、可測試的登入與 Dashboard；隔離其他應用的 Cookie、儲存與資料庫；明確可控的首次遷移。
- Non-goals: AgentCare 業務資料表與頁面、Flutter、IIS 自動部署、SSO 應用／角色／選單管理。

## 規劃目錄與 AI 指引

根目錄 `AGENTS.md` 保留 OpenSpec 管理區塊，並提供本變更的目錄導覽與文件閱讀入口。以下是本變更的目標目錄；實作時須核對 `AGENTS.md` 與實際目錄一致。

| 路徑 | 預定用途 |
| --- | --- |
| 根目錄 | `package.json` 協調安裝、啟停、測試與建置，不使用 npm workspaces |
| `Reactjs/` | React 19／Vite 登入頁與 Dashboard |
| `Dotnet/AgentCare.Api/` | .NET 9 Controller、Repository 與 DbService |
| `Dotnet/AgentCare.Api.Tests/` | API 契約與授權行為測試 |
| `Dotnet/AgentCare.Migrations/` | AgentCare 資料庫的 FluentMigrator migration library |
| `Dotnet/AgentCare.DbMigrator/` | 唯讀狀態／驗證與明確遷移的 CLI |
| `.github/workflows/` | 僅測試與建置的 GitHub Actions |

AI 處理本變更時，從 `openspec/changes/add-agentcare-foundation/` 的 proposal、design、tasks 與相關 delta specs 確認待實作範圍；遇到 SSO 術語與資料邊界時，再讀根目錄 `CONTEXT.md` 和 `docs/adr/0001-sso-data-boundary.md`。

## Decisions

- 根目錄只做 npm 指令協調，不使用 npm workspaces。React 使用 React 19、Vite、MUI、Redux Persist、react-intl；API 使用 .NET 9 的 Controller → Repository → DbService → SQL Server Stored Procedure。專案可參考 Rental 的依賴與結構，但不可複製其 ApplicationID、GroupId 或業務內容。
- UI basename 為 `/AgentCare_UI/`，API path base 為 `/AgentCare_API`；本機 UI/API 埠為 3000/44311。Cookie 名稱為 `AgentCare_AccessToken`、路徑為 `/AgentCare_API`，並使用獨立 JWT issuer/audience/key 與 `AgentCare_` 瀏覽器儲存前綴；Cookie 採 HttpOnly、SameSite Lax，HTTPS 時須為 Secure。根目錄 `npm start` 先啟動 API、等待 `/AgentCare_API/health`，再啟動 UI；不執行 migration。`npm stop` 僅停止本次 AgentCare 啟動記錄的 PID，若埠屬於其他專案則拒絕終止。
- `ConnectionStrings:AgentCare` 指向既有 AgentCare 資料庫，`ConnectionStrings:EasyWealthSSO` 指向共用 SSO。連線字串與 JWT key 只由忽略的本機設定或環境變數注入；追蹤檔、測試、記錄與 issue 不含密碼或 token。
- FluentMigrator library 與 CLI 分離。初版 migration 只在 AgentCare 建立三個查詢程序：群組 3 的公司清單、ApplicationID 12 的登入與授權公司、ApplicationID 12 的 session 與授權公司；FluentMigrator 另有自己的版本紀錄。程序讀取跨資料庫 SSO 表，但 migration 不更新 SSO 資料或 schema。`db:status` 與 `db:validate` 唯讀，`db:migrate` 必須明確執行。
- 登入只接受一個不同的 AgentCare 角色；多角色回 409 且不發 Cookie。登入公司必須同時屬於 GroupId 3 與該角色／使用者授權公司，否則回 403。未登入或失效 session 回 401；選單請求的 `roleID` 不等於 JWT 角色回 403。公司切換限於當次 session 重新取得的授權公司清單；日後每個業務 API 必須在伺服器重新核對公司權限。
- API 使用一致的 `success`、`message`、`data` 回應。登入回傳使用者與授權公司，並設定 AgentCare 專屬 HttpOnly JWT Cookie；不把 JWT 放在回應或瀏覽器儲存。選單回應的 `data.rows` 是樹、`data.rows2` 是搜尋清單，節點保留 `FunctionName`、`ComponentName`、`SideMenuID`、`Auth`。`GET /health` 用於啟動就緒檢查。
- 修改密碼僅以 JWT 中的 PID，呼叫 SSO 既有 `prc_sp_update_Personnel` 的 `CHANGEPW` 動作；舊密碼、新密碼與確認欄位依現有 SSO UI 規則驗證。成功後保留當前 AgentCare session，不增加其他 SSO 寫入。
- Login/Dashboard 依 AssetMgmt_UI 的實際元件與樣式結構對齊。登入頁保留雙欄品牌／表單、公司 Autocomplete、密碼顯示切換、語系切換、記住帳號／公司、忘記密碼與頁尾佔位入口；欄位錯誤貼近控制項，API 錯誤 Snackbar 顯示後端 `message`。首頁是固定且不可關閉的 TopBar 分頁，Sidebar 僅顯示 SSO 動態選單，不再另放固定 Home。公司切換位於 Sidebar 品牌區，選單搜尋占滿可用寬度，包含 Autocomplete 選項的命中字元以綠色粗體顯示。桌面 Sidebar 收合時寬度與最小寬度歸零並讓主區擴展；TopBar 直接顯示使用者名稱，分頁選項緊鄰通知，登出在 Sidebar 底部。缺少或未知 `ComponentName` 顯示 `ComingSoon`；SSO 選單名稱保持來源資料，不建立虛構翻譯。公司、選單與搜尋要有載入、空白、失敗與重試狀態，不製造選單或通知數量。
- GitHub Actions 只在 main push、pull request 與手動觸發時測試／建置 React、API 與 migrations；不含 IIS 部署、資料庫憑證與自動資料庫遷移。

## API Contracts

API 路徑皆以 `/AgentCare_API` 為前綴：`GET /api/auth/companies`、`POST /api/auth/login`（帳號、密碼、選定公司代碼）、`GET /api/auth/session`、`POST /api/auth/side-menu`（`roleID` 與可選語系）、`POST /api/auth/change-password`（舊密碼、新密碼、確認）、`POST /api/auth/logout`、`GET /health`。端點使用與參考專案相同的 JSON 命名與成功／錯誤 envelope；登入、session 與選單成功案例及 401／403／409 例外須有契約測試。

## Risks / Trade-offs

- 本機 3000/44311 與其他專案預設埠相同；啟動應偵測占用並明確失敗，停止指令不得誤殺其他專案。
- SSO 仍是共用資料來源；預檢需確認應用、群組、所需表／程序及跨庫讀取權限。修改密碼需要對既有 SSO 程序的限定執行權限。
- 多角色使用者需由 SSO 管理員調整為單一 AgentCare 角色；不得任選第一筆或合併權限。

## Migration Plan

先完成程式、契約測試與 `db:validate`。首次套用前，唯讀確認連線的資料庫名稱確為 AgentCare、現有 schema 符合空庫預期、SSO ApplicationID 12／GroupId 3 與相依資料可讀，並查看 `db:status`。預檢成功後，由實作者明確執行一次 `db:migrate`，再核對版本與三個程序。若發現既有不明物件或預檢失敗，停止並報告；不批量刪除或自動回復。正式環境仍不由 CI 自動遷移。
