const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const apiPort = Number(process.env.AGENTCARE_API_PORT || 44311);
const uiPort = Number(process.env.AGENTCARE_REACT_PORT || 3000);
const runtimeFile = path.resolve('.runtime/agentcare-start.json');
const children = [];
let stopping = false;

function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

function spawnChild(command, args, env = process.env) {
  const child = spawn(command, args, { cwd: path.resolve('.'), env, stdio: 'inherit', shell: false });
  children.push(child);
  child.once('exit', (code) => {
    if (!stopping) {
      console.error(`[start] ${command} exited (${code ?? 'signal'}); stopping AgentCare.`);
      shutdown(1);
    }
  });
  return child;
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  try {
    const record = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
    if (record.pid === process.pid) fs.unlinkSync(runtimeFile);
  } catch { /* no owned record */ }
  process.exitCode = code;
}

async function waitForApi(child) {
  const deadline = Date.now() + 45000;
  const url = `http://127.0.0.1:${apiPort}/AgentCare_API/health`;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('API exited before becoming healthy.');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* API is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('API readiness timed out.');
}

async function main() {
  if (![apiPort, uiPort].every((port) => Number.isInteger(port) && port > 0 && port < 65536) || apiPort === uiPort)
    throw new Error('Configure two different valid AgentCare ports.');
  if (!(await portIsFree(apiPort)) || !(await portIsFree(uiPort)))
    throw new Error(`AgentCare port ${apiPort} or ${uiPort} is occupied; no other process was stopped.`);
  if (fs.existsSync(runtimeFile)) {
    const old = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
    try { process.kill(old.pid, 0); throw new Error('An AgentCare start process is already recorded.'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  fs.mkdirSync(path.dirname(runtimeFile), { recursive: true });
  fs.writeFileSync(runtimeFile, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { mode: 0o600 });

  console.log(`[start] starting AgentCare API on ${apiPort}`);
  const api = spawnChild('dotnet', ['run', '--project', 'Dotnet/AgentCare.Api/AgentCare.Api.csproj', '--no-launch-profile'], {
    ...process.env, ASPNETCORE_URLS: `http://127.0.0.1:${apiPort}`, ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT || 'Development',
  });
  await waitForApi(api);
  console.log('[start] API is healthy; starting UI');
  spawnChild(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--prefix', 'Reactjs', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', String(uiPort), '--strictPort']);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
main().catch((error) => { console.error(`[start] ${error.message}`); shutdown(1); });
