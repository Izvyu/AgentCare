using System.Text;
using System.Text.Json;
using AgentCare.Api.Controllers;
using AgentCare.Api.DTOs;
using AgentCare.Api.Repositories;
using AgentCare.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

await AgentCareHost.Build(args).RunAsync();

public static class AgentCareHost
{
    public static WebApplication Build(
        string[] args,
        Action<ConfigurationManager>? configureConfiguration = null,
        Action<IServiceCollection>? configureServices = null)
    {
        var builder = WebApplication.CreateBuilder(args);
        configureConfiguration?.Invoke(builder.Configuration);
        var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly).ConfigureApiBehaviorOptions(options =>
            options.InvalidModelStateResponseFactory = _ =>
                new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(ApiResponse<object>.Fail("輸入資料格式不正確")));
        builder.Services.AddScoped<IDbService, DbService>();
        builder.Services.AddScoped<ISsoDbService, SsoDbService>();
        builder.Services.AddScoped<IAuthRepository, AuthRepository>();
        configureServices?.Invoke(builder.Services);

        var jwtKey = builder.Configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.StartsWith("__SET_", StringComparison.Ordinal) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
            throw new InvalidOperationException("Jwt:Key must be supplied through local configuration and contain at least 32 bytes.");
        if (builder.Configuration["Sso:ApplicationId"] != "12" || builder.Configuration.GetValue<int>("Sso:CompanyGroupId") != 3)
            throw new InvalidOperationException("AgentCare requires SSO ApplicationID 12 and Company GroupId 3.");

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    if (context.Request.Cookies.TryGetValue("AgentCare_AccessToken", out var token)) context.Token = token;
                    return Task.CompletedTask;
                },
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(ApiResponse<object>.Fail("登入狀態已失效，請重新登入"), jsonOptions));
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = 403;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(ApiResponse<object>.Fail("沒有權限執行此操作"), jsonOptions));
                },
            };
        });

        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"];
        builder.Services.AddCors(options => options.AddPolicy("AgentCareFrontend", policy =>
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

        var app = builder.Build();
        app.UsePathBase("/AgentCare_API");
        app.UseRouting();
        app.UseCors("AgentCareFrontend");
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        return app;
    }
}

public partial class Program;
