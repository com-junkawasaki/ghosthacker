import { trace } from "@opentelemetry/api";
import { NodeSDK } from '@opentelemetry/sdk-node';

const tracer = trace.getTracer("producer");

export function traceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}


