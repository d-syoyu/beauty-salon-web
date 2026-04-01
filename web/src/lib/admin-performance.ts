const shouldLog =
  process.env.ADMIN_PERF_LOG === "1" ||
  (process.env.NODE_ENV === "development" && process.env.ADMIN_PERF_LOG !== "0");

function nowMs() {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

export function startAdminTimer(label: string) {
  const startedAt = nowMs();

  return () => {
    if (!shouldLog) return;
    const elapsedMs = nowMs() - startedAt;
    console.log(`[admin:perf] ${label} ${elapsedMs.toFixed(1)}ms`);
  };
}

export async function measureAdminTask<T>(label: string, task: () => Promise<T>): Promise<T> {
  const end = startAdminTimer(label);
  try {
    return await task();
  } finally {
    end();
  }
}
