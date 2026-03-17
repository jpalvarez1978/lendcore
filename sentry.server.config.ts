import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Porcentaje de transacciones a capturar
  tracesSampleRate: 0.1,

  // Capturar errores en producción
  enabled: process.env.NODE_ENV === "production",
});
