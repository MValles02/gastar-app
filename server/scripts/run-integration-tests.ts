import { mkdirSync, rmSync, readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const serverDir = resolve(__dirname, '..');
const integrationTestDir = resolve(serverDir, 'test/integration');

dotenv.config({ path: resolve(rootDir, '.env') });

if (!process.env.DATABASE_URL_TEST) {
  console.error('DATABASE_URL_TEST is required to run integration tests.');
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL_TEST,
};

const shouldCollectCoverage = process.argv.includes('--coverage');
const coverageDir = resolve(serverDir, 'coverage');

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: serverDir,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npx', ['prisma', 'migrate', 'deploy']);

if (shouldCollectCoverage) {
  mkdirSync(coverageDir, { recursive: true });
  rmSync(resolve(coverageDir, 'integration.lcov.info'), { force: true });
}

const integrationTestFiles = readdirSync(integrationTestDir)
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => resolve(integrationTestDir, file));

const testArgs = ['--import=tsx/esm', '--test'];

if (shouldCollectCoverage) {
  testArgs.push(
    '--experimental-test-coverage',
    '--test-reporter=lcov',
    `--test-reporter-destination=${resolve(coverageDir, 'integration.lcov.info')}`
  );
}

run(process.execPath, [...testArgs, ...integrationTestFiles]);
