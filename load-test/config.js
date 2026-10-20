/**
 * Cấu hình mặc định cho load test.
 * Override qua biến môi trường hoặc tham số CLI.
 */

export const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  concurrency: Number(process.env.LOAD_CONCURRENCY || 10),
  totalRequests: Number(process.env.LOAD_TOTAL || 100),
  warmupRequests: Number(process.env.LOAD_WARMUP || 5),

  // Auth — dùng cho các API protected
  email: process.env.LOAD_TEST_EMAIL || 'loadtest@example.com',
  password: process.env.LOAD_TEST_PASSWORD || '12345678',
  token: process.env.TOKEN || '',

  // Users — dùng cho GET/PUT/DELETE/avatar theo ID
  userId: process.env.LOAD_TEST_USER_ID || '',

  // Avatar upload
  avatarPath: process.env.LOAD_TEST_AVATAR || '',
};

export function parseCliArgs(argv = process.argv.slice(2)) {
  const endpoint = argv[0] || 'health';
  const options = {};

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = Number(argv[++i]);
    } else if (arg === '--total' || arg === '-n') {
      options.totalRequests = Number(argv[++i]);
    } else if (arg === '--url') {
      options.baseUrl = argv[++i];
    } else if (arg === '--token') {
      options.token = argv[++i];
    } else if (arg === '--user-id') {
      options.userId = argv[++i];
    }
  }

  return { endpoint, options };
}
