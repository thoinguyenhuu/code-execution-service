export const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const envConfig = {
  port: parseNumber(process.env.PORT, 3000),
  executionTimeoutMs: parseNumber(process.env.EXECUTION_TIMEOUT_MS, 3000),
  queueMaxWaiting: parseNumber(process.env.QUEUE_MAX_WAITING, 1000),
  workerConcurrency: parseNumber(process.env.WORKER_CONCURRENCY, 5),
};
