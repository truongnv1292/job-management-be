import { config } from '../config.js';
import { runLoadTest } from '../runner.js';

export const name = 'GET /api/health';

export async function testHealth(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;

  return runLoadTest({
    name,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => ({
      url: `${baseUrl}/api/health`,
      init: { method: 'GET' },
    }),
  });
}
