import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { registerUser, uniqueEmail } from '../helpers.js';

export const name = 'DELETE /api/users/:id';

/**
 * Load test DELETE — tạo user mới cho mỗi request rồi xóa.
 * Tránh xóa user production.
 */
export async function testUserDelete(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  let counter = 0;

  return runLoadTest({
    name,
    concurrency: options.concurrency ?? config.concurrency,
    totalRequests: options.totalRequests ?? config.totalRequests,
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: async () => {
      counter++;
      const { token, user } = await registerUser(
        baseUrl,
        uniqueEmail(`delete-${counter}`),
        config.password,
        `Delete Test ${counter}`
      );

      return {
        url: `${baseUrl}/api/users/${user.id}`,
        init: {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      };
    },
  });
}
