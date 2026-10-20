/**
 * Chạy lệnh CLI với biến môi trường đã load từ .env.{APP_ENV}
 * Dùng cho prisma migrate/deploy theo từng môi trường
 *
 * Usage: node scripts/run-with-env.mjs <dev|staging|prod> <command...>
 * Ví dụ: node scripts/run-with-env.mjs staging prisma migrate deploy
 */

import { spawnSync } from 'child_process';

const [appEnv, ...command] = process.argv.slice(2);

if (!appEnv || command.length === 0) {
  console.error('Usage: node scripts/run-with-env.mjs <dev|staging|prod> <command...>');
  process.exit(1);
}

process.env.APP_ENV = appEnv;

await import('../src/config/env.js');

const result = spawnSync(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
