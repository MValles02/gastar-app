import { mkdirSync, readdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, '..');
const testDir = resolve(serverDir, 'test');

const unitTestFiles = readdirSync(testDir)
  .filter((file) => file.endsWith('.test.js'))
  .map((file) => resolve(testDir, file));

const shouldCollectCoverage = process.argv.includes('--coverage');
const coverageDir = resolve(serverDir, 'coverage');
const args = ['--test'];

if (shouldCollectCoverage) {
  mkdirSync(coverageDir, { recursive: true });
  args.push(
    '--experimental-test-coverage',
    '--test-reporter=lcov',
    `--test-reporter-destination=${resolve(coverageDir, 'unit.lcov.info')}`
  );
}

const result = spawnSync(process.execPath, [...args, ...unitTestFiles], {
  cwd: serverDir,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
