import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { ensureAuth, resolveUserId } from '../helpers.js';

export const name = 'GET /api/users/:id';

export async function testUserGet(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const { token } = await ensureAuth(options);
  const userId = await resolveUserId({ ...options, token });

  return runLoadTest({
    name: `${name} (${userId})`,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => ({
      url: `${baseUrl}/api/users/${userId}`,
      init: {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    }),
  });
}
