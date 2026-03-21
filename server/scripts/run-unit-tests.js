import { readdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, '..');
const testDir = resolve(serverDir, 'test');

const unitTestFiles = readdirSync(testDir)
  .filter((file) => file.endsWith('.test.js'))
  .map((file) => resolve(testDir, file));

const result = spawnSync(process.execPath, ['--test', ...unitTestFiles], {
  cwd: serverDir,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
