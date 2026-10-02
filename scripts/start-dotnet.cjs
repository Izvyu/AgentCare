const { spawn } = require('node:child_process');

const port = Number(process.env.AGENTCARE_API_PORT || 44311);
const child = spawn('dotnet', ['run', '--project', 'Dotnet/AgentCare.Api/AgentCare.Api.csproj', '--no-launch-profile'], {
  stdio: 'inherit',
  env: { ...process.env, ASPNETCORE_URLS: `http://localhost:${port}`, ASPNETCORE_ENVIRONMENT: 'Development' },
});

['SIGINT', 'SIGTERM'].forEach((signal) => process.once(signal, () => child.kill(signal)));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
