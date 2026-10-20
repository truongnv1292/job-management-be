/**
 * CLI — chạy load test cho từng API hoặc tất cả.
 *
 * Usage:
 *   node load-test/index.js health
 *   node load-test/index.js login -c 20 -n 200
 *   node load-test/index.js all
 *   BASE_URL=http://localhost:3000 node load-test/index.js me
 */

import { config, parseCliArgs } from './config.js';
import { testHealth } from './endpoints/health.js';
import { testRegister } from './endpoints/auth-register.js';
import { testLogin } from './endpoints/auth-login.js';
import { testMe } from './endpoints/auth-me.js';
import { testUsersList } from './endpoints/users-list.js';
import { testUserGet } from './endpoints/users-get.js';
import { testUserUpdate } from './endpoints/users-update.js';
import { testUserDelete } from './endpoints/users-delete.js';
import { testUserAvatar } from './endpoints/users-avatar.js';

const endpoints = {
  health: testHealth,
  register: testRegister,
  login: testLogin,
  me: testMe,
  'users-list': testUsersList,
  'users-get': testUserGet,
  'users-update': testUserUpdate,
  'users-delete': testUserDelete,
  'users-avatar': testUserAvatar,
};

const allOrder = [
  'health',
  'register',
  'login',
  'me',
  'users-list',
  'users-get',
  'users-update',
  'users-delete',
  'users-avatar',
];

function printHelp() {
  console.log(`
Load Test — base-server-nodejs

Cách dùng:
  node load-test/index.js <endpoint> [options]

Endpoints:
  health         GET  /api/health
  register       POST /api/auth/register
  login          POST /api/auth/login
  me             GET  /api/auth/me
  users-list     GET  /api/users
  users-get      GET  /api/users/:id
  users-update   PUT  /api/users/:id
  users-delete   DELETE /api/users/:id
  users-avatar   POST /api/users/:id/avatar
  all            Chạy tuần tự tất cả endpoint

Options:
  -c, --concurrency <n>   Số request song song (mặc định: ${config.concurrency})
  -n, --total <n>         Tổng số request (mặc định: ${config.totalRequests})
  --url <url>             Base URL (mặc định: ${config.baseUrl})
  --token <jwt>           JWT cho API protected
  --user-id <id>          User ID cho users-* endpoints

Biến môi trường:
  BASE_URL, TOKEN, LOAD_CONCURRENCY, LOAD_TOTAL
  LOAD_TEST_EMAIL, LOAD_TEST_PASSWORD, LOAD_TEST_USER_ID

Ví dụ:
  node load-test/index.js health -c 50 -n 500
  BASE_URL=https://xxx.vercel.app node load-test/index.js login -n 100
`);
}

async function main() {
  const { endpoint, options } = parseCliArgs();

  if (endpoint === 'help' || endpoint === '--help' || endpoint === '-h') {
    printHelp();
    return;
  }

  const mergedOptions = {
    baseUrl: options.baseUrl || config.baseUrl,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    token: options.token || config.token,
    userId: options.userId || config.userId,
  };

  console.log(`\nTarget: ${mergedOptions.baseUrl}`);
  console.log(`Concurrency: ${mergedOptions.concurrency} | Total: ${mergedOptions.totalRequests}\n`);

  if (endpoint === 'all') {
    for (const key of allOrder) {
      const fn = endpoints[key];
      console.log(`>>> Đang chạy: ${key}`);
      await fn(mergedOptions);
    }
    return;
  }

  const fn = endpoints[endpoint];
  if (!fn) {
    console.error(`Endpoint không hợp lệ: "${endpoint}"\n`);
    printHelp();
    process.exit(1);
  }

  await fn(mergedOptions);
}

main().catch((err) => {
  console.error('\nLoad test thất bại:', err.message);
  process.exit(1);
});
