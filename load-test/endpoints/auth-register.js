import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { uniqueEmail } from '../helpers.js';

export const name = 'POST /api/auth/register';

export async function testRegister(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  let counter = 0;

  return runLoadTest({
    name,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => {
      counter++;
      const email = uniqueEmail(`register-${counter}`);
      return {
        url: `${baseUrl}/api/auth/register`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: config.password,
            name: `Load Test ${counter}`,
          }),
        },
      };
    },
  });
}
