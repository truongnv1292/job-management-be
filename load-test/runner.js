/**
 * Engine chạy load test — gửi request song song, thu thập metrics.
 */

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function formatMs(ms) {
  return `${ms.toFixed(2)}ms`;
}

export async function runLoadTest({
  name,
  requestFn,
  concurrency = 10,
  totalRequests = 100,
  warmupRequests = 0,
}) {
  const latencies = [];
  const statusCodes = {};
  let success = 0;
  let failed = 0;
  const errors = [];

  async function executeOnce() {
    const start = performance.now();
    try {
      const { url, init } = await requestFn();
      const response = await fetch(url, init);
      const elapsed = performance.now() - start;

      latencies.push(elapsed);
      statusCodes[response.status] = (statusCodes[response.status] || 0) + 1;

      if (response.ok) {
        success++;
      } else {
        failed++;
        if (errors.length < 5) {
          const body = await response.text().catch(() => '');
          errors.push({ status: response.status, body: body.slice(0, 200) });
        }
      }
    } catch (err) {
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
      failed++;
      if (errors.length < 5) {
        errors.push({ status: 'NETWORK', body: err.message });
      }
    }
  }

  // Warmup — không tính vào kết quả chính
  if (warmupRequests > 0) {
    await runBatch(executeOnce, warmupRequests, concurrency);
    latencies.length = 0;
    success = 0;
    failed = 0;
    Object.keys(statusCodes).forEach((k) => delete statusCodes[k]);
  }

  const startTime = performance.now();
  await runBatch(executeOnce, totalRequests, concurrency);
  const durationSec = (performance.now() - startTime) / 1000;

  const sorted = [...latencies].sort((a, b) => a - b);
  const total = success + failed;

  const result = {
    name,
    total,
    success,
    failed,
    successRate: total > 0 ? ((success / total) * 100).toFixed(2) + '%' : '0%',
    durationSec: durationSec.toFixed(2),
    rps: (total / durationSec).toFixed(2),
    latency: {
      min: formatMs(sorted[0] || 0),
      avg: formatMs(sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1)),
      p50: formatMs(percentile(sorted, 50)),
      p95: formatMs(percentile(sorted, 95)),
      p99: formatMs(percentile(sorted, 99)),
      max: formatMs(sorted[sorted.length - 1] || 0),
    },
    statusCodes,
    errors,
  };

  printReport(result);
  return result;
}

async function runBatch(fn, total, concurrency) {
  let index = 0;

  async function worker() {
    while (index < total) {
      index++;
      await fn();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
}

function printReport(result) {
  console.log('\n' + '='.repeat(60));
  console.log(`  LOAD TEST: ${result.name}`);
  console.log('='.repeat(60));
  console.log(`  Tổng request : ${result.total}`);
  console.log(`  Thành công   : ${result.success}`);
  console.log(`  Thất bại     : ${result.failed}`);
  console.log(`  Tỷ lệ OK     : ${result.successRate}`);
  console.log(`  Thời gian    : ${result.durationSec}s`);
  console.log(`  RPS          : ${result.rps} req/s`);
  console.log('-'.repeat(60));
  console.log('  Latency:');
  console.log(`    min  : ${result.latency.min}`);
  console.log(`    avg  : ${result.latency.avg}`);
  console.log(`    p50  : ${result.latency.p50}`);
  console.log(`    p95  : ${result.latency.p95}`);
  console.log(`    p99  : ${result.latency.p99}`);
  console.log(`    max  : ${result.latency.max}`);
  console.log('-'.repeat(60));
  console.log(`  Status codes : ${JSON.stringify(result.statusCodes)}`);

  if (result.errors.length > 0) {
    console.log('-'.repeat(60));
    console.log('  Lỗi mẫu (tối đa 5):');
    result.errors.forEach((e, i) => {
      console.log(`    [${i + 1}] ${e.status}: ${e.body}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}
