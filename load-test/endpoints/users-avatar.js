import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { runLoadTest } from '../runner.js';
import { ensureAuth, resolveUserId } from '../helpers.js';

export const name = 'POST /api/users/:id/avatar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_AVATAR = resolve(__dirname, '../fixtures/sample.png');

function loadAvatarBuffer(avatarPath) {
  const path = avatarPath || config.avatarPath || DEFAULT_AVATAR;
  return readFileSync(path);
}

export async function testUserAvatar(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const { token } = await ensureAuth(options);
  const userId = await resolveUserId({ ...options, token });
  const avatarBuffer = loadAvatarBuffer(options.avatarPath);

  return runLoadTest({
    name: `${name} (${userId})`,
    concurrency: options.concurrency ?? Math.min(config.concurrency, 5),
    totalRequests: options.totalRequests ?? Math.min(config.totalRequests, 20),
    warmupRequests: options.warmupRequests ?? config.warmupRequests,
    requestFn: () => {
      const formData = new FormData();
      formData.append(
        'avatar',
        new Blob([avatarBuffer], { type: 'image/png' }),
        'avatar.png'
      );

      return {
        url: `${baseUrl}/api/users/${userId}/avatar`,
        init: {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      };
    },
  });
}
