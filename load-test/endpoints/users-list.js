import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { ensureAuth } from '../helpers.js';

export const name = 'GET /api/users';

export async function testUsersList(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const { token } = await ensureAuth(options);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;

  return runLoadTest({
    name: `${name}?page=${page}&limit=${limit}`,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => ({
      url: `${baseUrl}/api/users?page=${page}&limit=${limit}`,
      init: {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    }),
  });
}
