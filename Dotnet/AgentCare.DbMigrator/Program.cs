using System.Reflection;
using AgentCare.Migrations;
using FluentMigrator;
using FluentMigrator.Runner;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

var action = args.FirstOrDefault()?.ToLowerInvariant();
if (action is not ("status" or "validate" or "migrate"))
{
    Console.Error.WriteLine("Usage: dotnet run --project Dotnet/AgentCare.DbMigrator -- <status|validate|migrate>");
    return 1;
}

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("Dotnet/AgentCare.Api/appsettings.json", optional: false)
    .AddJsonFile("Dotnet/AgentCare.Api/appsettings.Development.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var versions = typeof(MigrationsAssemblyMarker).Assembly.GetTypes()
    .Select(type => type.GetCustomAttribute<MigrationAttribute>()?.Version)
    .Where(version => version is not null)
    .Select(version => version!.Value)
    .OrderBy(version => version)
    .ToArray();
if (versions.Length != 1 || versions.Distinct().Count() != versions.Length)
{
    Console.Error.WriteLine("Expected one unique AgentCare foundation migration.");
    return 1;
}
var resourceNames = typeof(MigrationsAssemblyMarker).Assembly.GetManifestResourceNames();
foreach (var name in new[] { "prc_sp_query_Companies.sql", "prc_sp_query_Personnel_Login.sql", "prc_sp_query_Personnel_SessionContext.sql" })
{
    if (resourceNames.Count(resource => resource.EndsWith(name, StringComparison.OrdinalIgnoreCase)) != 1)
    {
        Console.Error.WriteLine($"Expected one embedded AgentCare SQL resource: {name}");
        return 1;
    }
}

var connectionString = configuration.GetConnectionString("AgentCare");
if (configuration["Sso:ApplicationId"] != "12" || configuration["Sso:CompanyGroupId"] != "3")
{
    Console.Error.WriteLine("AgentCare requires SSO ApplicationID 12 and Company GroupId 3.");
    return 1;
}
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("ConnectionStrings:AgentCare is required in ignored local settings or environment.");
    return 1;
}

if (!string.Equals(new SqlConnectionStringBuilder(connectionString).InitialCatalog, "AgentCare", StringComparison.OrdinalIgnoreCase))
{
    Console.Error.WriteLine("Migration target must be the AgentCare database.");
    return 1;
}

try
{
    await using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();
    var databaseName = await ScalarString(connection, "SELECT DB_NAME()");
    if (!string.Equals(databaseName, "AgentCare", StringComparison.OrdinalIgnoreCase))
        throw new PreflightException("Connected database is not AgentCare.");

    if (action == "status")
    {
        var exists = await ScalarInt(connection, "SELECT COUNT(*) FROM sys.tables WHERE name = N'VersionInfo' AND schema_id = SCHEMA_ID(N'dbo')");
        var version = exists == 0 ? "none" : await ScalarString(connection, "SELECT CONVERT(NVARCHAR(30), MAX([Version])) FROM [dbo].[VersionInfo]") ?? "none";
        Console.WriteLine($"AgentCare migration history: {version}");
        return 0;
    }

    var ssoConnectionString = configuration.GetConnectionString("EasyWealthSSO");
    if (string.IsNullOrWhiteSpace(ssoConnectionString)
        || !string.Equals(new SqlConnectionStringBuilder(ssoConnectionString).InitialCatalog, "EasyWealthSSO", StringComparison.OrdinalIgnoreCase))
        throw new PreflightException("ConnectionStrings:EasyWealthSSO must target the EasyWealthSSO database.");
    await using var ssoConnection = new SqlConnection(ssoConnectionString);
    await ssoConnection.OpenAsync();
    if (!string.Equals(await ScalarString(ssoConnection, "SELECT DB_NAME()"), "EasyWealthSSO", StringComparison.OrdinalIgnoreCase))
        throw new PreflightException("Connected SSO database is not EasyWealthSSO.");

    await ValidatePreflight(connection, ssoConnection, versions[0]);
    Console.WriteLine($"AgentCare preflight passed; {versions.Length} migration available.");
    if (action == "validate") return 0;

    using var services = new ServiceCollection()
        .AddFluentMigratorCore()
        .ConfigureRunner(runner => runner.AddSqlServer().WithGlobalConnectionString(connectionString)
            .ScanIn(typeof(MigrationsAssemblyMarker).Assembly).For.Migrations())
        .AddLogging(logging => logging.AddFluentMigratorConsole())
        .BuildServiceProvider(false);
    services.GetRequiredService<IMigrationRunner>().MigrateUp();
    Console.WriteLine("AgentCare migration completed.");
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"AgentCare {action} failed: {ex.GetType().Name}. {SafeMessage(ex)}");
    return 1;
}

static async Task ValidatePreflight(SqlConnection connection, SqlConnection ssoConnection, long expectedVersion)
{
    var hasHistory = await ScalarInt(connection, "SELECT COUNT(*) FROM sys.tables WHERE name = N'VersionInfo' AND schema_id = SCHEMA_ID(N'dbo')") == 1;
    if (!hasHistory)
    {
        var existingObjects = await ScalarInt(connection, """
            SELECT (SELECT COUNT(*) FROM sys.objects WHERE is_ms_shipped = 0)
                 + (SELECT COUNT(*) FROM sys.types WHERE is_user_defined = 1)
            """);
        if (existingObjects != 0) throw new PreflightException("First AgentCare migration requires an empty user schema; inspect existing objects before migrating.");
    }
    else
    {
        await using var versionCommand = new SqlCommand("SELECT COUNT(*) FROM [dbo].[VersionInfo] WHERE [Version] = @Version", connection);
        versionCommand.Parameters.AddWithValue("@Version", expectedVersion);
        if (Convert.ToInt32(await versionCommand.ExecuteScalarAsync()) != 1
            || await ScalarInt(connection, "SELECT COUNT(*) FROM [dbo].[VersionInfo]") != 1)
            throw new PreflightException("AgentCare migration history does not match this foundation migration.");
    }

    var unexpected = await ScalarInt(connection, """
        SELECT (SELECT COUNT(*) FROM sys.objects
                WHERE is_ms_shipped = 0
                  AND NOT (
                    (schema_id = SCHEMA_ID(N'dbo') AND
                      ((type = 'U' AND name = N'VersionInfo') OR
                       (type = 'P' AND name IN (N'prc_sp_query_Companies', N'prc_sp_query_Personnel_Login', N'prc_sp_query_Personnel_SessionContext'))))
                    OR (type = 'PK' AND parent_object_id = OBJECT_ID(N'dbo.VersionInfo', N'U'))
                  ))
             + (SELECT COUNT(*) FROM sys.types WHERE is_user_defined = 1)
        """);
    if (unexpected != 0) throw new PreflightException("AgentCare has unexpected schema objects; inspect them before migrating.");
    if (hasHistory)
    {
        var expectedProcedures = await ScalarInt(connection, """
            SELECT COUNT(*) FROM sys.procedures
            WHERE schema_id = SCHEMA_ID(N'dbo')
              AND name IN (N'prc_sp_query_Companies', N'prc_sp_query_Personnel_Login', N'prc_sp_query_Personnel_SessionContext')
            """);
        if (expectedProcedures != 3) throw new PreflightException("AgentCare migration history exists but its procedures are incomplete.");
    }

    var ssoReady = await ScalarInt(connection, """
        SELECT CASE WHEN
          OBJECT_ID(N'EasyWealthSSO.dbo.Applications', N'U') IS NOT NULL AND
          OBJECT_ID(N'EasyWealthSSO.dbo.Personnel', N'U') IS NOT NULL AND
          OBJECT_ID(N'EasyWealthSSO.dbo.Roles', N'U') IS NOT NULL AND
          OBJECT_ID(N'EasyWealthSSO.dbo.RolesPersonnel', N'U') IS NOT NULL AND
          OBJECT_ID(N'EasyWealthSSO.dbo.RolePersonnelCompanies', N'U') IS NOT NULL AND
          OBJECT_ID(N'EasyWealthSSO.dbo.Company', N'U') IS NOT NULL
        THEN 1 ELSE 0 END
        """);
    if (ssoReady != 1) throw new PreflightException("Required EasyWealthSSO tables are unavailable to the AgentCare connection.");

    foreach (var table in new[] { "Applications", "Personnel", "Roles", "RolesPersonnel", "RolePersonnelCompanies", "Company" })
    {
        try
        {
            await using var read = new SqlCommand($"SELECT TOP (0) 1 FROM [EasyWealthSSO].[dbo].[{table}]", connection);
            await using var reader = await read.ExecuteReaderAsync();
        }
        catch (SqlException)
        {
            throw new PreflightException($"AgentCare connection lacks cross-database read access to EasyWealthSSO.dbo.{table}.");
        }
    }

    var canExecuteSsoProcedures = await ScalarInt(ssoConnection, """
        SELECT CASE WHEN
          OBJECT_ID(N'dbo.prc_sp_query_RolesSideMenu', N'P') IS NOT NULL AND
          OBJECT_ID(N'dbo.prc_sp_update_Personnel', N'P') IS NOT NULL AND
          HAS_PERMS_BY_NAME(N'dbo.prc_sp_query_RolesSideMenu', N'OBJECT', N'EXECUTE') = 1 AND
          HAS_PERMS_BY_NAME(N'dbo.prc_sp_update_Personnel', N'OBJECT', N'EXECUTE') = 1
        THEN 1 ELSE 0 END
        """);
    if (canExecuteSsoProcedures != 1)
        throw new PreflightException("SSO connection lacks EXECUTE permission on menu or password-change procedure.");

    var missing = new List<string>();
    if (await ScalarInt(connection, "SELECT COUNT(*) FROM [EasyWealthSSO].[dbo].[Applications] WHERE ApplicationID = 12") == 0)
        missing.Add("ApplicationID 12");
    if (await ScalarInt(connection, "SELECT COUNT(*) FROM [EasyWealthSSO].[dbo].[Roles] WHERE ApplicationID = 12") == 0)
        missing.Add("roles for ApplicationID 12");
    if (await ScalarInt(connection, "SELECT COUNT(*) FROM [EasyWealthSSO].[dbo].[Company] WHERE GroupId = 3") == 0)
        missing.Add("companies in GroupId 3");
    if (missing.Count != 0) throw new PreflightException($"EasyWealthSSO is missing: {string.Join(", ", missing)}.");
}

static async Task<int> ScalarInt(SqlConnection connection, string sql)
{
    await using var command = new SqlCommand(sql, connection);
    return Convert.ToInt32(await command.ExecuteScalarAsync());
}

static async Task<string?> ScalarString(SqlConnection connection, string sql)
{
    await using var command = new SqlCommand(sql, connection);
    return (await command.ExecuteScalarAsync())?.ToString();
}

static string SafeMessage(Exception exception) => exception is PreflightException ? exception.Message : "Check local connection and database permissions; details are intentionally omitted.";

sealed class PreflightException(string message) : Exception(message);
