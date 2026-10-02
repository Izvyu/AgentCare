using FluentMigrator;

namespace AgentCare.Migrations.Migrations;

[Migration(202610020001, "AgentCare: initial read-only SSO login queries")]
public sealed class Migration_202610020001_AddAgentCareAuthProcedures : Migration
{
    public override void Up()
    {
        Execute.Sql(ReadSql("prc_sp_query_Companies.sql"));
        Execute.Sql(ReadSql("prc_sp_query_Personnel_Login.sql"));
        Execute.Sql(ReadSql("prc_sp_query_Personnel_SessionContext.sql"));
    }

    public override void Down() => throw new NotSupportedException("AgentCare authentication procedures require a reviewed manual rollback.");

    private static string ReadSql(string filename)
    {
        var assembly = typeof(MigrationsAssemblyMarker).Assembly;
        var resource = assembly.GetManifestResourceNames().Single(name => name.EndsWith(filename, StringComparison.OrdinalIgnoreCase));
        using var stream = assembly.GetManifestResourceStream(resource)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
