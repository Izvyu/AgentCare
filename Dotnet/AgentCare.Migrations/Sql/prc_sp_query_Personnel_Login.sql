CREATE OR ALTER PROCEDURE [dbo].[prc_sp_query_Personnel_Login]
    @Account NVARCHAR(30),
    @Password NVARCHAR(30),
    @ApplicationID NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT CAST(P.PID AS NVARCHAR(50)) AS PID,
           P.Account,
           P.Name,
           CAST(RP.RoleID AS NVARCHAR(50)) AS RoleID,
           CAST(R.ApplicationID AS NVARCHAR(10)) AS ApplicationID
    FROM [EasyWealthSSO].[dbo].[Personnel] AS P
    INNER JOIN [EasyWealthSSO].[dbo].[RolesPersonnel] AS RP ON RP.PID = P.PID
    INNER JOIN [EasyWealthSSO].[dbo].[Roles] AS R ON R.RoleID = RP.RoleID
    WHERE P.Account = @Account
      AND P.Password = @Password
      AND ISNULL(P.isStop, 0) = 0
      AND R.ApplicationID = @ApplicationID
      AND R.ApplicationID = 12;

    SELECT DISTINCT CAST(C.ComID AS NVARCHAR(50)) AS ComID,
           C.ComCode,
           C.ComAbbr,
           C.ComName
    FROM [EasyWealthSSO].[dbo].[Personnel] AS P
    INNER JOIN [EasyWealthSSO].[dbo].[RolesPersonnel] AS RP ON RP.PID = P.PID
    INNER JOIN [EasyWealthSSO].[dbo].[Roles] AS R ON R.RoleID = RP.RoleID
    INNER JOIN [EasyWealthSSO].[dbo].[RolePersonnelCompanies] AS RPC ON RPC.RolePersonId = RP.RolePersonId
    INNER JOIN [EasyWealthSSO].[dbo].[Company] AS C ON C.ComID = RPC.ComID
    WHERE P.Account = @Account
      AND P.Password = @Password
      AND ISNULL(P.isStop, 0) = 0
      AND R.ApplicationID = @ApplicationID
      AND R.ApplicationID = 12
      AND C.GroupId = 3;
END;
