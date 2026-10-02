using System.Data;
using System.Security.Claims;
using AgentCare.Api.Controllers;
using AgentCare.Api.DTOs;
using AgentCare.Api.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace AgentCare.Api.Tests;

public sealed class AuthEndpointTests
{
    [Fact]
    public async Task LoginRejectsInvalidCredentialsWithoutCookie()
    {
        var controller = CreateController(new FakeRepository());

        var result = await controller.Login(new LoginRequestDto { Account = "person", Password = "wrong", SelectedCompanyCode = "C3" });

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.False(controller.Response.Headers.ContainsKey("Set-Cookie"));
    }

    [Fact]
    public async Task LoginRejectsMultipleAgentCareRolesWithoutCookie()
    {
        var repository = new FakeRepository { Users = Users(("7", "12"), ("8", "12")), Companies = Companies("C3") };
        var controller = CreateController(repository);

        var result = await controller.Login(new LoginRequestDto { Account = "person", Password = "valid", SelectedCompanyCode = "C3" });

        Assert.Equal(409, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.False(controller.Response.Headers.ContainsKey("Set-Cookie"));
    }

    [Fact]
    public async Task LoginRejectsCompanyOutsideAuthorization()
    {
        var repository = new FakeRepository { Users = Users(("7", "12")), Companies = Companies("C3") };
        var controller = CreateController(repository);

        var result = await controller.Login(new LoginRequestDto { Account = "person", Password = "valid", SelectedCompanyCode = "OTHER" });

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.False(controller.Response.Headers.ContainsKey("Set-Cookie"));
    }

    [Fact]
    public async Task LoginIssuesAgentCareScopedHttpOnlyCookie()
    {
        var repository = new FakeRepository { Users = Users(("7", "12")), Companies = Companies("C3") };
        var controller = CreateController(repository);

        var result = await controller.Login(new LoginRequestDto { Account = "person", Password = "valid", SelectedCompanyCode = "C3" });

        Assert.IsType<OkObjectResult>(result);
        var cookie = controller.Response.Headers.SetCookie.ToString();
        Assert.Contains("AgentCare_AccessToken=", cookie);
        Assert.Contains("path=/AgentCare_API", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SessionRejectsRevokedRoleOrCompany()
    {
        var repository = new FakeRepository { Users = Users(("8", "12")), Companies = Companies("C3") };
        var controller = CreateController(repository, "7", "C3");
        Assert.IsType<UnauthorizedObjectResult>(await controller.Session());

        repository.Users = Users(("7", "12"));
        repository.Companies = Companies("OTHER");
        Assert.IsType<UnauthorizedObjectResult>(await controller.Session());
    }

    [Fact]
    public async Task MenuRejectsRoleMismatchWithoutQuery()
    {
        var repository = new FakeRepository();
        var controller = CreateController(repository, "7", "C3");

        var result = await controller.SideMenu(new SideMenuRequestDto { RoleID = 8 });

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.Equal(0, repository.MenuCalls);
    }

    [Fact]
    public async Task SessionReturnsAuthorizedCompaniesAfterRecheckingSso()
    {
        var repository = new FakeRepository { Users = Users(("7", "12")), Companies = Companies("C3", "C4") };
        var controller = CreateController(repository, "7", "C3");

        var result = await controller.Session();

        var response = Assert.IsType<ApiResponse<LoginResponseDto>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(2, response.Data!.CompanyInfo.Count);
        Assert.Equal("7", response.Data.User.RoleID);
    }

    [Fact]
    public async Task MenuReturnsSsoTreeSearchListAndAuthForCurrentRole()
    {
        var tree = MenuTable();
        tree.Rows.Add("1", "", "0", "", "Root", "", "", "folder");
        tree.Rows.Add("2", "1", "1", "Report", "Report", "報表", "UnknownReport", "file");
        var flat = MenuTable();
        flat.Rows.Add("2", "1", "1", "Report", "Report", "報表", "UnknownReport", "file");
        var auth = new DataTable();
        foreach (var name in new[] { "SideMenuID", "AuthValue", "ActionName" }) auth.Columns.Add(name);
        auth.Rows.Add("2", "read", "View");
        var menu = new DataSet();
        menu.Tables.Add(tree);
        menu.Tables.Add(flat);
        menu.Tables.Add(auth);
        var repository = new FakeRepository { Users = Users(("7", "12")), Companies = Companies("C3"), Menu = menu };
        var controller = CreateController(repository, "7", "C3");

        var result = await controller.SideMenu(new SideMenuRequestDto { RoleID = 7, LanguageKey = "zh-tw" });

        var response = Assert.IsType<ApiResponse<SideMenuResponseDto>>(Assert.IsType<OkObjectResult>(result).Value);
        var child = Assert.Single(Assert.Single(response.Data!.Rows).Children);
        Assert.Equal("UnknownReport", child.ComponentName);
        Assert.Equal("報表", child.LabelTranslation);
        Assert.Equal("read", Assert.Single(child.Auth!).AuthValue);
        Assert.Single(response.Data.Rows2);
    }

    [Fact]
    public async Task PasswordChangeUsesAuthenticatedPidAndKeepsSession()
    {
        var repository = new FakeRepository { Users = Users(("7", "12")), Companies = Companies("C3") };
        var controller = CreateController(repository, "7", "C3");

        var result = await controller.ChangePassword(new ChangePasswordRequestDto { OldPassword = "oldpass", NewPassword = "newpass", ConfirmPassword = "newpass" });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("42", repository.PasswordPid);
        Assert.False(controller.Response.Headers.ContainsKey("Set-Cookie"));
    }

    private static DataTable MenuTable()
    {
        var table = new DataTable();
        foreach (var name in new[] { "SideMenuID", "Parent_id", "LV", "FunctionName", "Label", "LabelTranslation", "ComponentName", "Icon" }) table.Columns.Add(name);
        return table;
    }

    private static AuthController CreateController(FakeRepository repository, string? roleId = null, string? companyCode = null)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "a-test-only-key-with-at-least-32-bytes!",
            ["Jwt:Issuer"] = "AgentCare.Api",
            ["Jwt:Audience"] = "AgentCare.Client",
            ["Jwt:ExpireMinutes"] = "60",
        }).Build();
        var claims = new List<Claim> { new("PID", "42"), new("ApplicationID", "12") };
        if (roleId is not null) claims.Add(new Claim("RoleID", roleId));
        if (companyCode is not null) claims.Add(new Claim("CompanyCode", companyCode));
        return new AuthController(repository, configuration, NullLogger<AuthController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test")) } },
        };
    }

    private static DataTable Users(params (string roleId, string applicationId)[] roles)
    {
        var table = new DataTable();
        foreach (var name in new[] { "PID", "Account", "Name", "RoleID", "ApplicationID" }) table.Columns.Add(name);
        foreach (var (roleId, applicationId) in roles) table.Rows.Add("42", "person", "Person", roleId, applicationId);
        return table;
    }

    private static DataTable Companies(params string[] codes)
    {
        var table = new DataTable();
        foreach (var name in new[] { "ComID", "ComCode", "ComAbbr", "ComName" }) table.Columns.Add(name);
        foreach (var code in codes) table.Rows.Add("3", code, code, code);
        return table;
    }

    private sealed class FakeRepository : IAuthRepository
    {
        public DataTable Users { get; set; } = Users();
        public DataTable Companies { get; set; } = Companies();
        public int MenuCalls { get; private set; }
        public DataSet Menu { get; set; } = new();
        public string? PasswordPid { get; private set; }

        public Task<(DataTable UserInfo, DataTable Companies)> LoginAsync(string account, string password) => Task.FromResult((Users, Companies));
        public Task<DataTable> GetCompaniesAsync() => Task.FromResult(Companies);
        public Task<(DataTable UserInfo, DataTable Companies)> GetSessionContextAsync(string pid) => Task.FromResult((Users, Companies));
        public Task<bool> ChangePasswordAsync(string pid, string oldPassword, string newPassword) { PasswordPid = pid; return Task.FromResult(true); }
        public Task<DataSet> GetRolesSideMenuAsync(int roleId, string languageKey) { MenuCalls++; return Task.FromResult(Menu); }
    }
}
