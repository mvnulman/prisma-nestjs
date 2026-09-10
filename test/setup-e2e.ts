import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const TEST_DATABASE_URL = 'file:./test.db';
const TEST_DB_FILE = resolve(process.cwd(), 'test.db');

const SQLITE_FILES = [
  TEST_DB_FILE,
  `${TEST_DB_FILE}-journal`,
  `${TEST_DB_FILE}-wal`,
  `${TEST_DB_FILE}-shm`,
];

function run(command: string) {
  execSync(command, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

export async function setup() {
  for (const file of SQLITE_FILES) {
    if (existsSync(file)) rmSync(file);
  }

  run('npx prisma generate');
  run('npx prisma migrate deploy');
}

export async function teardown() {
  for (const file of SQLITE_FILES) {
    if (existsSync(file)) rmSync(file);
  }
}
