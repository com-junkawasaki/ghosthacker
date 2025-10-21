import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("producer");

export async function withNodeSpan<T>(node: { id: string; type: string }, fn: () => Promise<T>) {
  return await tracer.startActiveSpan(`node:${node.type}`, async (span) => {
    span.setAttributes({ "node.id": node.id, "node.type": node.type });
    try {
      const out = await fn();
      return out;
    } catch (e: any) {
      span.recordException(e);
      throw e;
    } finally {
      span.end();
    }
  });
}


