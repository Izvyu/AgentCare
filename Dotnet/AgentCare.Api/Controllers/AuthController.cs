using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgentCare.Api.DTOs;
using AgentCare.Api.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace AgentCare.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController(IAuthRepository repository, IConfiguration configuration, ILogger<AuthController> logger) : ControllerBase
{
    private const string CookieName = "AgentCare_AccessToken";
    private const string CookiePath = "/AgentCare_API";
    private const string ApplicationId = "12";

    [HttpGet("companies")]
    [AllowAnonymous]
    public async Task<IActionResult> Companies()
    {
        try { return Ok(ApiResponse<List<CompanyInfoDto>>.Ok(MapCompanies(await repository.GetCompaniesAsync()))); }
        catch (Exception ex) { logger.LogError("Failed to load AgentCare companies ({ErrorType})", ex.GetType().Name); return StatusCode(500, ApiResponse<object>.Fail("公司清單載入失敗")); }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequestDto request)
    {
        if (!ModelState.IsValid || string.IsNullOrWhiteSpace(request.Account) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.SelectedCompanyCode))
            return BadRequest(ApiResponse<object>.Fail("請完整填寫登入資料"));
        try
        {
            var (users, companyRows) = await repository.LoginAsync(request.Account.Trim(), request.Password);
            var roles = AgentCareRoles(users);
            if (roles.Count == 0) return Unauthorized(ApiResponse<object>.Fail("帳號或密碼錯誤"));
            if (roles.Count > 1) return StatusCode(409, ApiResponse<object>.Fail("此帳號有多個 AgentCare 角色，請聯繫 SSO 管理員修正"));
            var companies = MapCompanies(companyRows);
            var selectedCompany = companies.FirstOrDefault(company => string.Equals(company.ComCode, request.SelectedCompanyCode.Trim(), StringComparison.OrdinalIgnoreCase));
            if (selectedCompany is null) return StatusCode(403, ApiResponse<object>.Fail("您沒有權限登入此公司"));
            var user = MapUser(users.Rows.Cast<DataRow>().First(row => Value(row, "ApplicationID") == ApplicationId && Value(row, "RoleID") == roles[0]));
            Response.Cookies.Append(CookieName, CreateToken(user, selectedCompany.ComCode), CookieOptions());
            return Ok(ApiResponse<LoginResponseDto>.Ok(new LoginResponseDto { User = user, CompanyInfo = companies }, "登入成功"));
        }
        catch (Exception ex) { logger.LogError("AgentCare login failed ({ErrorType})", ex.GetType().Name); return StatusCode(500, ApiResponse<object>.Fail("伺服器內部錯誤，請稍後再試")); }
    }

    [HttpGet("session")]
    [Authorize]
    public async Task<IActionResult> Session()
    {
        var context = await CurrentContext();
        if (context is null) return Unauthorized(ApiResponse<object>.Fail("登入狀態已失效，請重新登入"));
        return Ok(ApiResponse<LoginResponseDto>.Ok(context));
    }

    [HttpPost("side-menu")]
    [Authorize]
    public async Task<IActionResult> SideMenu(SideMenuRequestDto request)
    {
        if (!ModelState.IsValid || request.RoleID <= 0) return BadRequest(ApiResponse<object>.Fail("RoleID 不正確"));
        if (!int.TryParse(User.FindFirstValue("RoleID"), out var roleId) || roleId != request.RoleID)
            return StatusCode(403, ApiResponse<object>.Fail("沒有權限讀取此角色選單"));
        if (await CurrentContext() is null) return Unauthorized(ApiResponse<object>.Fail("登入狀態已失效，請重新登入"));
        try
        {
            var data = await repository.GetRolesSideMenuAsync(roleId, request.LanguageKey);
            var auth = TableAt(data, 2);
            var tree = MapMenuTree(TableAt(data, 0), auth);
            var flat = MapMenuList(TableAt(data, 1), auth);
            return Ok(ApiResponse<SideMenuResponseDto>.Ok(new SideMenuResponseDto { TotalRecord = tree.Count, Rows = tree, Rows2 = flat }));
        }
        catch (Exception ex) { logger.LogError("Failed to load AgentCare menu ({ErrorType})", ex.GetType().Name); return StatusCode(500, ApiResponse<object>.Fail("功能選單載入失敗")); }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto request)
    {
        var validation = request.Validate();
        if (validation is not null) return BadRequest(ApiResponse<object>.Fail(validation));
        if (await CurrentContext() is null) return Unauthorized(ApiResponse<object>.Fail("登入狀態已失效，請重新登入"));
        var pid = User.FindFirstValue("PID")!;
        try
        {
            var changed = await repository.ChangePasswordAsync(pid, request.OldPassword, request.NewPassword);
            return changed ? Ok(ApiResponse<object>.Ok(null, "密碼修改成功，下次登入請使用新密碼")) : BadRequest(ApiResponse<object>.Fail("舊密碼不正確"));
        }
        catch (Exception ex) { logger.LogError("AgentCare password change failed ({ErrorType})", ex.GetType().Name); return StatusCode(500, ApiResponse<object>.Fail("密碼修改失敗，請稍後再試")); }
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(CookieName, new CookieOptions { Path = CookiePath });
        return Ok(ApiResponse<object>.Ok(null, "登出成功"));
    }

    private async Task<LoginResponseDto?> CurrentContext()
    {
        var pid = User.FindFirstValue("PID");
        var roleId = User.FindFirstValue("RoleID");
        var companyCode = User.FindFirstValue("CompanyCode");
        if (string.IsNullOrWhiteSpace(pid) || string.IsNullOrWhiteSpace(roleId) || string.IsNullOrWhiteSpace(companyCode)
            || User.FindFirstValue("ApplicationID") != ApplicationId) return null;
        try
        {
            var (users, companyRows) = await repository.GetSessionContextAsync(pid);
            var roles = AgentCareRoles(users);
            if (roles.Count != 1 || !string.Equals(roles[0], roleId, StringComparison.Ordinal)) return null;
            var companies = MapCompanies(companyRows);
            if (!companies.Any(company => string.Equals(company.ComCode, companyCode, StringComparison.OrdinalIgnoreCase))) return null;
            var userRow = users.Rows.Cast<DataRow>().First(row => Value(row, "ApplicationID") == ApplicationId && Value(row, "RoleID") == roles[0]);
            return new LoginResponseDto { User = MapUser(userRow), CompanyInfo = companies };
        }
        catch (Exception ex) { logger.LogError("AgentCare session lookup failed ({ErrorType})", ex.GetType().Name); return null; }
    }

    private static List<string> AgentCareRoles(DataTable users) => users.Rows.Cast<DataRow>()
        .Where(row => Value(row, "ApplicationID") == ApplicationId)
        .Select(row => Value(row, "RoleID"))
        .Where(role => !string.IsNullOrWhiteSpace(role))
        .Distinct(StringComparer.Ordinal)
        .ToList();

    private string CreateToken(UserInfoDto user, string companyCode)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var claims = new[] { new Claim("PID", user.PID), new Claim("Account", user.Account), new Claim("Name", user.Name), new Claim("RoleID", user.RoleID), new Claim("ApplicationID", ApplicationId), new Claim("CompanyCode", companyCode) };
        var minutes = configuration.GetValue("Jwt:ExpireMinutes", 60);
        var token = new JwtSecurityToken(configuration["Jwt:Issuer"], configuration["Jwt:Audience"], claims, expires: DateTime.UtcNow.AddMinutes(minutes), signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private CookieOptions CookieOptions() => new()
    {
        HttpOnly = true,
        Secure = Request.IsHttps,
        SameSite = SameSiteMode.Lax,
        Path = CookiePath,
        Expires = DateTimeOffset.UtcNow.AddMinutes(configuration.GetValue("Jwt:ExpireMinutes", 60)),
    };

    private static UserInfoDto MapUser(DataRow row) => new() { PID = Value(row, "PID"), Account = Value(row, "Account"), Name = Value(row, "Name"), RoleID = Value(row, "RoleID"), ApplicationID = Value(row, "ApplicationID") };

    private static List<CompanyInfoDto> MapCompanies(DataTable table) => table.Rows.Cast<DataRow>().Select(row => new CompanyInfoDto
    {
        ComID = Value(row, "ComID"), ComCode = Value(row, "ComCode"), ComAbbr = Value(row, "ComAbbr"), ComName = Value(row, "ComName"),
    }).GroupBy(company => company.ComCode, StringComparer.OrdinalIgnoreCase).Select(group => group.First()).ToList();

    private static List<SideMenuItemDto> MapMenuTree(DataTable table, DataTable auth)
    {
        var items = MapMenuList(table, auth);
        var byId = items.ToDictionary(item => item.SideMenuID, StringComparer.OrdinalIgnoreCase);
        var roots = new List<SideMenuItemDto>();
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Parent_id) || !byId.TryGetValue(item.Parent_id, out var parent) || ReferenceEquals(parent, item)) roots.Add(item);
            else parent.Children.Add(item);
        }
        return roots;
    }

    private static List<SideMenuItemDto> MapMenuList(DataTable table, DataTable auth) => table.Rows.Cast<DataRow>().Select(row =>
    {
        var id = Value(row, "SideMenuID");
        var permissions = auth.Rows.Cast<DataRow>().Where(permission => Value(permission, "SideMenuID") == id).Select(permission => new SideMenuAuthDto
        {
            SideMenuID = id, AuthValue = Value(permission, "AuthValue"), ActionName = Value(permission, "ActionName"),
        }).ToList();
        return new SideMenuItemDto
        {
            SideMenuID = id, Parent_id = Value(row, "Parent_id"), LV = Value(row, "LV"),
            Label = Value(row, "Label"), LabelTranslation = Value(row, "LabelTranslation"),
            FunctionName = Value(row, "FunctionName"), ComponentName = Value(row, "ComponentName"), Icon = Value(row, "Icon"),
            Auth = permissions.Count == 0 ? null : permissions,
        };
    }).ToList();

    private static DataTable TableAt(DataSet data, int index) => data.Tables.Count > index ? data.Tables[index] : new DataTable();
    private static string Value(DataRow row, string column) => row.Table.Columns.Contains(column) && row[column] != DBNull.Value ? row[column]?.ToString() ?? "" : "";
}
