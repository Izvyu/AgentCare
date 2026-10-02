using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace AgentCare.Api.DTOs;

public sealed class LoginRequestDto
{
    [Required] public string Account { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
    [Required] public string SelectedCompanyCode { get; set; } = string.Empty;
}

public sealed class UserInfoDto
{
    public string PID { get; init; } = string.Empty;
    public string Account { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string RoleID { get; init; } = string.Empty;
    public string ApplicationID { get; init; } = string.Empty;
}

public sealed class CompanyInfoDto
{
    public string ComID { get; init; } = string.Empty;
    public string ComCode { get; init; } = string.Empty;
    public string ComAbbr { get; init; } = string.Empty;
    public string ComName { get; init; } = string.Empty;
}

public sealed class LoginResponseDto
{
    public UserInfoDto User { get; init; } = new();
    public List<CompanyInfoDto> CompanyInfo { get; init; } = [];
}

public sealed class ChangePasswordRequestDto
{
    public string OldPassword { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
    public string ConfirmPassword { get; init; } = string.Empty;

    public string? Validate()
    {
        if (string.IsNullOrWhiteSpace(OldPassword) || string.IsNullOrWhiteSpace(NewPassword) || string.IsNullOrWhiteSpace(ConfirmPassword)) return "請完整填寫密碼欄位";
        const string policy = "密碼僅允許 20 碼內可列印 ASCII 字元，且不可包含空白";
        if (!Regex.IsMatch(OldPassword, @"^[\x21-\x7E]{1,20}$") || !Regex.IsMatch(NewPassword, @"^[\x21-\x7E]{1,20}$") || !Regex.IsMatch(ConfirmPassword, @"^[\x21-\x7E]{1,20}$")) return policy;
        if (!string.Equals(NewPassword, ConfirmPassword, StringComparison.Ordinal)) return "新密碼與確認密碼不一致";
        if (string.Equals(NewPassword, OldPassword, StringComparison.Ordinal)) return "新密碼不可與舊密碼相同";
        return null;
    }
}

public sealed class SideMenuRequestDto
{
    [Range(1, int.MaxValue)] public int RoleID { get; init; }
    public string LanguageKey { get; init; } = "zh-tw";
}

public sealed class SideMenuResponseDto
{
    public int TotalRecord { get; init; }
    public List<SideMenuItemDto> Rows { get; init; } = [];
    public List<SideMenuItemDto> Rows2 { get; init; } = [];
}

public sealed class SideMenuItemDto
{
    public string SideMenuID { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public string LabelTranslation { get; init; } = string.Empty;
    public bool Open { get; init; }
    public string Parent_id { get; init; } = string.Empty;
    public string LV { get; init; } = string.Empty;
    public string FunctionName { get; init; } = string.Empty;
    public string ComponentName { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public List<SideMenuItemDto> Children { get; init; } = [];
    public List<SideMenuAuthDto>? Auth { get; init; }
}

public sealed class SideMenuAuthDto
{
    public string SideMenuID { get; init; } = string.Empty;
    public string AuthValue { get; init; } = string.Empty;
    public string ActionName { get; init; } = string.Empty;
}
