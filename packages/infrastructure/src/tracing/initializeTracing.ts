// ponytail: OpenTelemetry tracing initialization
// For MVP, spans are logged to stdout in development mode.
// Production deployment can integrate with Jaeger, Datadog, or other APM platforms.

export function initializeTracing(_serviceName: string): void {
  // Placeholder for OpenTelemetry setup.
  // Installation blocked on @opentelemetry/exporter-trace-jaeger-http availability.
  // When implementing, use:
  // - @opentelemetry/sdk-trace-node for tracing
  // - @opentelemetry/auto-instrumentations-node for auto-instrumentation of Express, pg, http
  // - Custom exporter matching your APM platform (Jaeger, Datadog, etc.)

  if (process.env.OTEL_ENABLED === 'true') {
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry tracing enabled (requires pnpm add dependencies)')
  }
}

