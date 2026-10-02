CREATE OR ALTER PROCEDURE [dbo].[prc_sp_query_Companies]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CAST(C.ComID AS NVARCHAR(50)) AS ComID,
           C.ComCode,
           C.ComAbbr,
           C.ComName
    FROM [EasyWealthSSO].[dbo].[Company] AS C
    WHERE C.GroupId = 3
    ORDER BY C.ComCode;
END;
