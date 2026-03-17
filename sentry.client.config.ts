import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Porcentaje de transacciones a capturar para performance monitoring
  tracesSampleRate: 0.1,

  // Capturar errores en producción
  enabled: process.env.NODE_ENV === "production",

  // Configuración de replay (opcional)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Ignorar errores comunes que no son relevantes
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
  ],
});
