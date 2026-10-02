using System.Data;
using AgentCare.Api.Repositories;
using AgentCare.Api.Services;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AgentCare.Api.Tests;

public sealed class PasswordBoundaryTests
{
    [Fact]
    public async Task PasswordChangeCallsOnlyTheSsoUpdateProcedureWithChangePasswordAction()
    {
        var agentCareDb = new RecordingDb();
        var ssoDb = new RecordingSsoDb();
        var repository = new AuthRepository(agentCareDb, ssoDb, new ConfigurationBuilder().Build());

        var changed = await repository.ChangePasswordAsync("person-42", "old-secret", "new-secret");

        Assert.True(changed);
        Assert.Equal(0, agentCareDb.Calls);
        Assert.Equal(1, ssoDb.Calls);
        Assert.Equal("prc_sp_update_Personnel", ssoDb.Procedure);
        Assert.Equal("CHANGEPW", ssoDb.Parameters.Single(parameter => parameter.ParameterName == "@ACTION").Value);
        Assert.Equal("person-42", ssoDb.Parameters.Single(parameter => parameter.ParameterName == "@PID").Value);
        Assert.Equal("old-secret", ssoDb.Parameters.Single(parameter => parameter.ParameterName == "@Password").Value);
        Assert.Equal("new-secret", ssoDb.Parameters.Single(parameter => parameter.ParameterName == "@NewPassword").Value);
        Assert.Equal(ParameterDirection.Output, ssoDb.Parameters.Single(parameter => parameter.ParameterName == "@ErrMsg").Direction);
    }

    private class RecordingDb : IDbService
    {
        public int Calls { get; private set; }
        public Task<DataTable> QueryStoredProcedureAsync(string name, SqlParameter[]? parameters = null)
        {
            Calls++;
            return Task.FromResult(new DataTable());
        }
        public Task<DataSet> QueryStoredProcedureDataSetAsync(string name, SqlParameter[]? parameters = null)
        {
            Calls++;
            return Task.FromResult(new DataSet());
        }
        public Task<object?> ExecuteScalarAsync(string name, SqlParameter[]? parameters = null)
        {
            Calls++;
            return Task.FromResult<object?>(null);
        }
    }

    private sealed class RecordingSsoDb : RecordingDb, ISsoDbService
    {
        public string? Procedure { get; private set; }
        public SqlParameter[] Parameters { get; private set; } = [];

        public new Task<DataSet> QueryStoredProcedureDataSetAsync(string name, SqlParameter[]? parameters = null)
        {
            Procedure = name;
            Parameters = parameters ?? [];
            Parameters.Single(parameter => parameter.ParameterName == "@ErrMsg").Value = "1";
            return base.QueryStoredProcedureDataSetAsync(name, parameters);
        }
    }
}
