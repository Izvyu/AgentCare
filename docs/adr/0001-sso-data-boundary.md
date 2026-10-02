# AgentCare 與共用 SSO 的資料邊界

狀態：proposed

EasyWealthSSO 是人員、公司、角色與動態選單的來源；AgentCare 以自己的資料庫程序讀取登入與 session 所需資料，遷移只管理 AgentCare 資料庫。這避免初版在共用 SSO 建立應用專屬物件，也讓往後業務資料留在 AgentCare。唯一的 SSO 寫入是使用者自行修改密碼，透過既有 SSO 程序以登入者身分與舊密碼驗證後執行；AgentCare 不寫入 SSO 應用、角色、選單或授權資料。
