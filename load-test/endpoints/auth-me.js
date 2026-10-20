import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { ensureAuth } from '../helpers.js';

export const name = 'GET /api/auth/me';

export async function testMe(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const { token } = await ensureAuth(options);

  return runLoadTest({
    name,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => ({
      url: `${baseUrl}/api/auth/me`,
      init: {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    }),
  });
}
