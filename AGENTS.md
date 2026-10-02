<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AgentCare 專案指引

- 不要批量刪除；批量刪除前先詢問使用者。
- 以下目錄是 AgentCare 基礎專案的實作位置；以實際檔案及 `openspec/specs/` 的現行規格為準。

| 路徑 | 職責 |
| --- | --- |
| 根目錄 | npm 安裝、啟停、測試與建置指令的協調入口 |
| `Reactjs/` | 登入頁、Dashboard 與 SSO 動態選單 |
| `Dotnet/AgentCare.Api/` | .NET API 與 SSO 登入、授權端點 |
| `Dotnet/AgentCare.Api.Tests/` | API 與授權契約測試 |
| `Dotnet/AgentCare.Migrations/` | 只管理 AgentCare 資料庫的 FluentMigrator migration |
| `Dotnet/AgentCare.DbMigrator/` | 明確執行資料庫狀態、驗證與遷移的 CLI |
| `.github/workflows/` | 測試與建置 CI |
| `openspec/specs/` | 基礎專案、SSO 登入與 Dashboard 的現行規格 |
| `openspec/changes/archive/2026-10-02-add-agentcare-foundation/` | 初版提案、設計、任務與驗證紀錄 |

- 本機安裝、啟停、測試及明確執行資料庫預檢／遷移的方式見 `README.md`；敏感設定只放忽略的 Development 設定或環境變數。
- 修改基礎專案、SSO 登入或 Dashboard 時，先讀 `openspec/specs/project-foundation/spec.md`、`application-auth/spec.md`、`dashboard-shell/spec.md`；需要初版設計取捨與驗證紀錄時，再讀 `openspec/changes/archive/2026-10-02-add-agentcare-foundation/`。
- 涉及使用者、角色、公司或 SSO 資料邊界時，讀 `CONTEXT.md` 與 `docs/adr/0001-sso-data-boundary.md`。
- 變更需求或架構時，依 `openspec/AGENTS.md` 維護對應的 OpenSpec change。
