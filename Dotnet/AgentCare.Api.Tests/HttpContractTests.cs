using System.Data;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text.Json;
using AgentCare.Api.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace AgentCare.Api.Tests;

public sealed class HttpContractTests
{
    [Fact]
    public async Task AuthEndpointsEnforceStatusEnvelopeAndAgentCareCookieOverHttp()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();

        var repository = new FakeRepository { CompanyCodes = ["C3"] };
        var app = AgentCareHost.Build([], configuration => configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "agentcare-http-contract-test-key-at-least-32-bytes",
            ["Jwt:Issuer"] = "AgentCare.Api",
            ["Jwt:Audience"] = "AgentCare.Client",
            ["Sso:ApplicationId"] = "12",
            ["Sso:CompanyGroupId"] = "3",
        }), services => services.AddScoped<IAuthRepository>(_ => repository));
        app.Urls.Add($"http://127.0.0.1:{port}");
        await app.StartAsync();
        try
        {
            using var client = new HttpClient(new HttpClientHandler { UseCookies = false })
            {
                BaseAddress = new Uri($"http://127.0.0.1:{port}/AgentCare_API/"),
                Timeout = TimeSpan.FromSeconds(5),
            };

            using var anonymousSession = await client.GetAsync("api/auth/session");
            await AssertEnvelope(anonymousSession, HttpStatusCode.Unauthorized);
            using var anonymousMenu = await client.PostAsJsonAsync("api/auth/side-menu", new { roleID = 7 });
            await AssertEnvelope(anonymousMenu, HttpStatusCode.Unauthorized);
            using var invalidLogin = await client.PostAsJsonAsync("api/auth/login", new { });
            await AssertEnvelope(invalidLogin, HttpStatusCode.BadRequest);

            using var wrongCredentials = await client.PostAsJsonAsync("api/auth/login", new { account = "person", password = "wrong", selectedCompanyCode = "C3" });
            await AssertEnvelope(wrongCredentials, HttpStatusCode.Unauthorized);
            Assert.False(wrongCredentials.Headers.Contains("Set-Cookie"));

            repository.RoleIds = ["7", "8"];
            using var multiRole = await client.PostAsJsonAsync("api/auth/login", new { account = "person", password = "valid", selectedCompanyCode = "C3" });
            await AssertEnvelope(multiRole, HttpStatusCode.Conflict);
            Assert.False(multiRole.Headers.Contains("Set-Cookie"));

            repository.RoleIds = ["7"];
            using var wrongCompany = await client.PostAsJsonAsync("api/auth/login", new { account = "person", password = "valid", selectedCompanyCode = "OTHER" });
            await AssertEnvelope(wrongCompany, HttpStatusCode.Forbidden);
            Assert.False(wrongCompany.Headers.Contains("Set-Cookie"));

            using var login = await client.PostAsJsonAsync("api/auth/login", new { account = "person", password = "valid", selectedCompanyCode = "C3" });
            await AssertEnvelope(login, HttpStatusCode.OK);
            var setCookie = Assert.Single(login.Headers.GetValues("Set-Cookie"));
            Assert.StartsWith("AgentCare_AccessToken=", setCookie);
            Assert.Contains("path=/AgentCare_API", setCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
            var cookie = setCookie.Split(';', 2)[0];

            using var sessionRequest = new HttpRequestMessage(HttpMethod.Get, "api/auth/session");
            sessionRequest.Headers.Add("Cookie", cookie);
            using var session = await client.SendAsync(sessionRequest);
            await AssertEnvelope(session, HttpStatusCode.OK);

            using var wrongRoleRequest = new HttpRequestMessage(HttpMethod.Post, "api/auth/side-menu") { Content = JsonContent.Create(new { roleID = 8 }) };
            wrongRoleRequest.Headers.Add("Cookie", cookie);
            using var wrongRole = await client.SendAsync(wrongRoleRequest);
            await AssertEnvelope(wrongRole, HttpStatusCode.Forbidden);

            using var menuRequest = new HttpRequestMessage(HttpMethod.Post, "api/auth/side-menu") { Content = JsonContent.Create(new { roleID = 7 }) };
            menuRequest.Headers.Add("Cookie", cookie);
            using var menu = await client.SendAsync(menuRequest);
            await AssertEnvelope(menu, HttpStatusCode.OK);
            using var menuBody = JsonDocument.Parse(await menu.Content.ReadAsStringAsync());
            Assert.True(menuBody.RootElement.GetProperty("data").TryGetProperty("rows", out _));
            Assert.True(menuBody.RootElement.GetProperty("data").TryGetProperty("rows2", out _));

            using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "api/auth/logout");
            logoutRequest.Headers.Add("Cookie", cookie);
            using var logout = await client.SendAsync(logoutRequest);
            await AssertEnvelope(logout, HttpStatusCode.OK);
            var clearCookie = Assert.Single(logout.Headers.GetValues("Set-Cookie"));
            Assert.StartsWith("AgentCare_AccessToken=", clearCookie);
            Assert.Contains("path=/AgentCare_API", clearCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("expires=", clearCookie, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }

    private static async Task AssertEnvelope(HttpResponseMessage response, HttpStatusCode expectedStatus)
    {
        Assert.Equal(expectedStatus, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(body.RootElement.TryGetProperty("success", out var success));
        Assert.Equal(expectedStatus == HttpStatusCode.OK, success.GetBoolean());
        Assert.True(body.RootElement.TryGetProperty("message", out var message));
        Assert.True(message.ValueKind is JsonValueKind.String or JsonValueKind.Null);
        Assert.True(body.RootElement.TryGetProperty("data", out _));
    }

    private sealed class FakeRepository : IAuthRepository
    {
        public string[] RoleIds { get; set; } = [];
        public string[] CompanyCodes { get; set; } = [];

        public Task<(DataTable UserInfo, DataTable Companies)> LoginAsync(string account, string password) => Task.FromResult((Users(), Companies()));
        public Task<DataTable> GetCompaniesAsync() => Task.FromResult(Companies());
        public Task<(DataTable UserInfo, DataTable Companies)> GetSessionContextAsync(string pid) => Task.FromResult((Users(), Companies()));
        public Task<bool> ChangePasswordAsync(string pid, string oldPassword, string newPassword) => Task.FromResult(false);
        public Task<DataSet> GetRolesSideMenuAsync(int roleId, string languageKey) => Task.FromResult(new DataSet());

        private DataTable Users()
        {
            var table = new DataTable();
            foreach (var name in new[] { "PID", "Account", "Name", "RoleID", "ApplicationID" }) table.Columns.Add(name);
            foreach (var roleId in RoleIds) table.Rows.Add("42", "person", "Person", roleId, "12");
            return table;
        }

        private DataTable Companies()
        {
            var table = new DataTable();
            foreach (var name in new[] { "ComID", "ComCode", "ComAbbr", "ComName" }) table.Columns.Add(name);
            foreach (var code in CompanyCodes) table.Rows.Add("3", code, code, code);
            return table;
        }
    }
}
