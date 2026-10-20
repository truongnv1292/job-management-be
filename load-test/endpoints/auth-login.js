import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { ensureAuth } from '../helpers.js';

export const name = 'POST /api/auth/login';

export async function testLogin(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const email = options.email || config.email;
  const password = options.password || config.password;

  // Đảm bảo user tồn tại trước khi load test login
  await ensureAuth({ baseUrl, email, password });

  return runLoadTest({
    name,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => ({
      url: `${baseUrl}/api/auth/login`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
    }),
  });
}
