using System.Data;
using AgentCare.Api.Services;
using Microsoft.Data.SqlClient;

namespace AgentCare.Api.Repositories;

public interface IAuthRepository
{
    Task<(DataTable UserInfo, DataTable Companies)> LoginAsync(string account, string password);
    Task<DataTable> GetCompaniesAsync();
    Task<(DataTable UserInfo, DataTable Companies)> GetSessionContextAsync(string pid);
    Task<bool> ChangePasswordAsync(string pid, string oldPassword, string newPassword);
    Task<DataSet> GetRolesSideMenuAsync(int roleId, string languageKey);
}

public sealed class AuthRepository(IDbService db, ISsoDbService ssoDb, IConfiguration configuration) : IAuthRepository
{
    private string ApplicationId => configuration["Sso:ApplicationId"] ?? "12";

    public async Task<(DataTable UserInfo, DataTable Companies)> LoginAsync(string account, string password)
    {
        var data = await db.QueryStoredProcedureDataSetAsync("prc_sp_query_Personnel_Login", [
            new SqlParameter("@Account", account),
            new SqlParameter("@Password", password),
            new SqlParameter("@ApplicationID", ApplicationId),
        ]);
        return (TableAt(data, 0), TableAt(data, 1));
    }

    public Task<DataTable> GetCompaniesAsync() => db.QueryStoredProcedureAsync("prc_sp_query_Companies");

    public async Task<(DataTable UserInfo, DataTable Companies)> GetSessionContextAsync(string pid)
    {
        var data = await db.QueryStoredProcedureDataSetAsync("prc_sp_query_Personnel_SessionContext", [
            new SqlParameter("@PID", pid),
            new SqlParameter("@ApplicationID", ApplicationId),
        ]);
        return (TableAt(data, 0), TableAt(data, 1));
    }

    public async Task<bool> ChangePasswordAsync(string pid, string oldPassword, string newPassword)
    {
        var errMsg = new SqlParameter("@ErrMsg", SqlDbType.NVarChar, -1) { Direction = ParameterDirection.Output };
        await ssoDb.QueryStoredProcedureDataSetAsync("prc_sp_update_Personnel", [
            new SqlParameter("@ACTION", "CHANGEPW"),
            new SqlParameter("@PID", pid),
            new SqlParameter("@Account", DBNull.Value),
            new SqlParameter("@Name", DBNull.Value),
            new SqlParameter("@Password", oldPassword),
            new SqlParameter("@NewPassword", newPassword),
            new SqlParameter("@IDNo", DBNull.Value),
            new SqlParameter("@Gender", DBNull.Value),
            new SqlParameter("@isStop", DBNull.Value),
            new SqlParameter("@GroupId", DBNull.Value),
            errMsg,
        ]);
        return string.Equals(errMsg.Value?.ToString(), "1", StringComparison.Ordinal);
    }

    public Task<DataSet> GetRolesSideMenuAsync(int roleId, string languageKey) =>
        ssoDb.QueryStoredProcedureDataSetAsync("prc_sp_query_RolesSideMenu", [
            new SqlParameter("@RoleID", roleId),
            new SqlParameter("@LanguageKey", languageKey.Equals("en", StringComparison.OrdinalIgnoreCase) ? "en-US" : "zh-tw"),
        ]);

    private static DataTable TableAt(DataSet data, int index) => data.Tables.Count > index ? data.Tables[index] : new DataTable();
}
