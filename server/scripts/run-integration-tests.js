import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const serverDir = resolve(__dirname, '..');

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

function run(command, args) {
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
run(process.execPath, ['--test', 'test/integration']);
