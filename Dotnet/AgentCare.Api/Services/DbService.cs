using System.Data;
using Microsoft.Data.SqlClient;

namespace AgentCare.Api.Services;

public interface IDbService
{
    Task<DataTable> QueryStoredProcedureAsync(string name, SqlParameter[]? parameters = null);
    Task<DataSet> QueryStoredProcedureDataSetAsync(string name, SqlParameter[]? parameters = null);
    Task<object?> ExecuteScalarAsync(string name, SqlParameter[]? parameters = null);
}

public interface ISsoDbService : IDbService;

public class DbService : IDbService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;
    private readonly string _connectionName;

    public DbService(IConfiguration configuration, ILogger<DbService> logger) : this(configuration, logger, "AgentCare") { }

    protected DbService(IConfiguration configuration, ILogger logger, string connectionName)
    {
        _configuration = configuration;
        _logger = logger;
        _connectionName = connectionName;
    }

    public async Task<DataTable> QueryStoredProcedureAsync(string name, SqlParameter[]? parameters = null)
    {
        var data = await QueryStoredProcedureDataSetAsync(name, parameters);
        return data.Tables.Count > 0 ? data.Tables[0] : new DataTable();
    }

    public async Task<DataSet> QueryStoredProcedureDataSetAsync(string name, SqlParameter[]? parameters = null)
    {
        return await WithCommand(name, parameters, async command =>
        {
            var data = new DataSet();
            await using var reader = await command.ExecuteReaderAsync();
            do
            {
                if (reader.FieldCount == 0) continue;
                var table = new DataTable();
                for (var i = 0; i < reader.FieldCount; i++) table.Columns.Add(reader.GetName(i), typeof(object));
                while (await reader.ReadAsync())
                {
                    var values = new object[reader.FieldCount];
                    reader.GetValues(values);
                    table.Rows.Add(values);
                }
                data.Tables.Add(table);
            } while (await reader.NextResultAsync());
            return data;
        });
    }

    public async Task<object?> ExecuteScalarAsync(string name, SqlParameter[]? parameters = null)
    {
        return await WithCommand(name, parameters, command => command.ExecuteScalarAsync());
    }

    private async Task<T> WithCommand<T>(string name, SqlParameter[]? parameters, Func<SqlCommand, Task<T>> action)
    {
        var connectionString = _configuration.GetConnectionString(_connectionName);
        if (string.IsNullOrWhiteSpace(connectionString)) throw new InvalidOperationException($"ConnectionStrings:{_connectionName} is not configured.");
        try
        {
            await using var connection = new SqlConnection(connectionString);
            await using var command = new SqlCommand(name, connection) { CommandType = CommandType.StoredProcedure, CommandTimeout = 30 };
            if (parameters is not null) command.Parameters.AddRange(parameters);
            await connection.OpenAsync();
            return await action(command);
        }
        catch (Exception ex)
        {
            _logger.LogError("Stored Procedure {StoredProcedure} failed on {ConnectionName} ({ErrorType})", name, _connectionName, ex.GetType().Name);
            throw;
        }
    }
}

public sealed class SsoDbService(IConfiguration configuration, ILogger<SsoDbService> logger)
    : DbService(configuration, logger, "EasyWealthSSO"), ISsoDbService;
