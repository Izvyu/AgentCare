using System.Reflection;
using AgentCare.Migrations;
using Xunit;

namespace AgentCare.Api.Tests;

public sealed class MigrationContractTests
{
    [Fact]
    public void InitialQueriesStayWithinAgentCareRoleAndCompanyGroup()
    {
        var assembly = typeof(MigrationsAssemblyMarker).Assembly;
        var companies = Sql(assembly, "prc_sp_query_Companies.sql");
        var login = Sql(assembly, "prc_sp_query_Personnel_Login.sql");
        var session = Sql(assembly, "prc_sp_query_Personnel_SessionContext.sql");

        Assert.Contains("C.GroupId = 3", companies, StringComparison.Ordinal);
        Assert.Contains("R.ApplicationID = 12", login, StringComparison.Ordinal);
        Assert.Contains("R.ApplicationID = 12", session, StringComparison.Ordinal);
        Assert.Contains("C.GroupId = 3", login, StringComparison.Ordinal);
        Assert.Contains("C.GroupId = 3", session, StringComparison.Ordinal);
        Assert.DoesNotContain("UPDATE ", companies + login + session, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("DELETE ", companies + login + session, StringComparison.OrdinalIgnoreCase);
    }

    private static string Sql(Assembly assembly, string suffix)
    {
        var resource = assembly.GetManifestResourceNames().Single(name => name.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));
        using var reader = new StreamReader(assembly.GetManifestResourceStream(resource)!);
        return reader.ReadToEnd();
    }
}
