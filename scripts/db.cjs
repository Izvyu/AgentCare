const { spawnSync } = require('node:child_process');
const process = require('node:process');

const action = process.argv[2];
const allowed = new Set(['status', 'validate', 'migrate']);
if (!allowed.has(action)) {
  console.error('Usage: node scripts/db.cjs <status|validate|migrate>');
  process.exit(1);
}

const result = spawnSync('dotnet', [
  'run',
  '--project',
  'Dotnet/AgentCare.DbMigrator/AgentCare.DbMigrator.csproj',
  '--',
  action,
], { stdio: 'inherit', env: process.env });

process.exit(result.status ?? 1);
