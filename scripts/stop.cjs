const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const runtimeFile = path.resolve('.runtime/agentcare-start.json');
if (!fs.existsSync(runtimeFile)) {
  console.log('[stop] no AgentCare start process is recorded.');
  process.exit(0);
}

let record;
try { record = JSON.parse(fs.readFileSync(runtimeFile, 'utf8')); }
catch { console.error('[stop] invalid process record; refusing to stop a process.'); process.exit(1); }
if (!Number.isInteger(record.pid) || record.pid <= 0) {
  console.error('[stop] invalid PID; refusing to stop a process.');
  process.exit(1);
}

try { process.kill(record.pid, 0); }
catch (error) {
  if (error.code !== 'ESRCH') throw error;
  fs.unlinkSync(runtimeFile);
  console.log('[stop] stale AgentCare process record removed.');
  process.exit(0);
}

let command = '';
try {
  command = process.platform === 'win32'
    ? execFileSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${record.pid}").CommandLine`], { encoding: 'utf8' })
    : execFileSync('ps', ['-p', String(record.pid), '-o', 'command='], { encoding: 'utf8' });
} catch { /* refuse if ownership cannot be checked */ }

if (!command.includes('scripts/start-dev.cjs')) {
  console.error('[stop] recorded PID is not the AgentCare start process; refusing to stop it.');
  process.exit(1);
}

process.kill(record.pid, 'SIGTERM');
console.log(`[stop] sent SIGTERM to AgentCare start process ${record.pid}.`);
