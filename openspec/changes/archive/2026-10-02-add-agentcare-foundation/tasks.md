## 1. 基礎與文件
- [x] 1.0 在根目錄 `AGENTS.md` 標示目前文件與規劃中的應用程式目錄，指向本 change、語彙及 SSO 資料邊界。
- [x] 1.1 建立單一倉庫指引、非敏感設定範例、安裝／啟停／測試／建置指令及埠占用保護；實作後核對 `AGENTS.md` 的目錄導覽與實際檔案一致。
- [x] 1.2 建立 React 19／Vite 與 .NET 9 API、測試專案、FluentMigrator library/CLI；設定隔離路徑、Cookie 與儲存前綴。
- [x] 1.3 建立只執行測試與建置的 GitHub Actions；不放入資料庫憑證或遷移步驟。

## 2. SSO 與資料庫
- [x] 2.1 建立只修改 AgentCare 的初版 migration：公司清單、登入、session 查詢程序；涵蓋 ApplicationID 12、GroupId 3、單一角色與授權公司規則。
- [x] 2.2 建立 `db:status`、`db:validate`、`db:migrate`，確認唯讀指令不修改資料庫。
- [x] 2.3 實作公司、登入、session、選單、修改密碼、登出與健康檢查的 API 契約；為 Cookie、401／403／409 與密碼寫入邊界加入外部行為測試。

## 3. 使用者介面
- [x] 3.1 依 AssetMgmt_UI 實作 AgentCare 登入版面、公司選擇、欄位錯誤、記住帳號／公司、語系及 API 訊息 Snackbar。
- [x] 3.2 實作 Dashboard 的固定 Home、授權公司切換、SSO 選單樹與搜尋、分頁、修改密碼與登出；未知元件顯示 ComingSoon。
- [x] 3.3 驗證載入、空白、失敗、重試、側欄收合與行動尺寸等使用者可見行為。
  - 登入頁行動尺寸、公司載入失敗與重試已驗證；真實 SSO 帳號與選單仍由使用者手動驗收。

## 4. 驗證與首次套用
- [x] 4.1 執行 OpenSpec 嚴格驗證、React 測試／建置、.NET 測試／建置、migration 靜態驗證與 `git diff --check`。
- [x] 4.2 唯讀預檢 AgentCare 資料庫、SSO 應用／群組／依賴資料與待執行版本；異常時停止，不套用或清理。
  - 2026-10-02：重新檢查 `db:status` 為 `202610020001`，`db:validate` 通過。
- [x] 4.3 預檢通過後明確執行初版 `db:migrate`，核對版本與三個程序；記錄真實 SSO 登入與選單仍待使用者手動驗收。
  - 2026-10-02：資料庫已有 `202610020001` 版本與三個程序；API 健康檢查及公司清單均回傳 HTTP 200。真實 SSO 登入與選單仍待使用者手動驗收。
