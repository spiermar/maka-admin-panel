import { performance } from 'perf_hooks';

export async function wrapWithConstantTime<T>(
  operation: () => Promise<T>,
  targetDurationMs: number = 500
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const elapsedTime = performance.now() - startTime;
    const remainingDelay = Math.max(0, targetDurationMs - elapsedTime);

    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }

    return result;
  } catch (error) {
    const elapsedTime = performance.now() - startTime;
    const remainingDelay = Math.max(0, targetDurationMs - elapsedTime);

    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }

    throw error;
  }
}

function getConstantTimeDelay(): number {
  const fromEnv = process.env.AUTH_CONSTANT_TIME_DELAY_MS;
  if (fromEnv) {
    return parseInt(fromEnv, 10);
  }

  return process.env.NODE_ENV === 'production' ? 500 : 100;
}

export { getConstantTimeDelay };
