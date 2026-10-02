# AgentCare

AgentCare 的初版基礎包含 React 登入與 Dashboard、.NET API、EasyWealthSSO 登入整合，以及只管理 AgentCare 資料庫的 FluentMigrator 遷移。需求與驗收條件見 `openspec/changes/add-agentcare-foundation/`。

## 本機設定

1. 複製 `Dotnet/AgentCare.Api/appsettings.example.json` 為 `Dotnet/AgentCare.Api/appsettings.Development.json`，填入 AgentCare 與 EasyWealthSSO 連線字串、獨立的隨機 `Jwt:Key`。Development 檔案已忽略，不要提交密碼、測試帳號或 token。
2. 執行 `npm run install:all`。需要 .NET 9 SDK 或可執行 net9.0 專案的較新 SDK。
3. 執行 `npm start`。API 預設在 `http://127.0.0.1:44311/AgentCare_API`，UI 在 `http://127.0.0.1:3000/AgentCare_UI/`。啟動會等待 API 健康檢查，不會執行資料庫遷移。
4. 執行 `npm stop` 只通知本次 AgentCare 啟動程序結束；其他專案占用相同埠時，啟動會失敗，不會終止其他程序。

## 資料庫

`npm run db:status` 只讀取 AgentCare 遷移版本。`npm run db:validate` 只讀預檢目標資料庫、首次移轉所需的空白 schema（或已套用的單一版本與三個程序）、SSO 跨資料庫讀取權限、選單與密碼程序執行權限、ApplicationID 12 的角色及 GroupId 3 的公司。預檢失敗時不會套用遷移。確認預檢通過後才執行 `npm run db:migrate`；此命令只建立 AgentCare 的三個登入查詢程序及版本紀錄，無自動回復或 SSO schema 寫入。

SSO 的角色、授權公司和動態選單由 SSO 管理；AgentCare 不會建立或修改它們。密碼修改是唯一的 SSO 寫入，透過 SSO 既有 `prc_sp_update_Personnel` 的 `CHANGEPW` 動作執行。

## 驗證

執行 `npm test` 與 `npm run build`。GitHub Actions 只測試與建置，不需要正式資料庫憑證，也不套用遷移或部署 IIS。真實 SSO 帳號登入、公司切換與動態選單由使用者在可連線環境手動驗收。
