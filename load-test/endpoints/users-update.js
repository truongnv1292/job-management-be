import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { ensureAuth, resolveUserId } from '../helpers.js';

export const name = 'PUT /api/users/:id';

export async function testUserUpdate(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const { token } = await ensureAuth(options);
  const userId = await resolveUserId({ ...options, token });
  let counter = 0;

  return runLoadTest({
    name: `${name} (${userId})`,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => {
      counter++;
      return {
        url: `${baseUrl}/api/users/${userId}`,
        init: {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: `Load Test ${counter}` }),
        },
      };
    },
  });
}
