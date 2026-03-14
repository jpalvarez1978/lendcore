# QA Test Plan

Validación integral previa a entrega para `JEAN PAUL Servicios Financieros`.

## Objetivo

Probar el sistema como si operara con préstamos reales, validando:

- consistencia del negocio
- trazabilidad de solicitudes
- originación de préstamos
- pagos y asignaciones
- cobranza y promesas
- reportes ejecutivos
- estabilidad técnica (`lint`, `tsc`, `build`)

## Batería automatizada

Comando principal:

```bash
npm run smoke:real
```

La suite:

1. crea clientes reales de prueba
2. valida desencriptación y búsqueda parcial
3. crea solicitudes
4. recorre `borrador -> revisión -> aprobación/rechazo`
5. origina un préstamo desde una solicitud aprobada
6. crea un préstamo vencido de control para aging/cobranza
7. registra pagos automáticos y dirigidos
8. valida asignaciones y recalculo
9. registra gestión de cobranza
10. crea promesa de pago
11. valida métricas y prioridades de cobranza
12. valida reportes de cartera, aging, cobranza y rentabilidad
13. valida secuencia de auditoría
14. limpia automáticamente los datos de prueba

Para conservar datos de prueba:

```bash
KEEP_SMOKE_DATA=1 npm run smoke:real
```

## Validaciones técnicas obligatorias

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Validación manual recomendada

### Admin

1. Crear solicitud
2. Entrar al detalle
3. Enviar a revisión
4. Aprobar
5. Crear préstamo desde la solicitud
6. Verificar que el historial muestre `CREATE -> UPDATE_STATUS -> APPROVE -> DISBURSE`

### Analyst

1. Crear cliente
2. Crear solicitud
3. Enviar a revisión
4. Confirmar que no puede aprobar ni rechazar si la política sigue reservando eso para `ADMIN`

### Collection

1. Registrar pago
2. Crear promesa de pago
3. Registrar gestión rápida
4. Confirmar actualización en cobranza y reportes

### Documentos

1. Descargar recibo PDF desde pagos
2. Confirmar que abre en una sola página
3. Verificar número de comprobante legible

### Reportes

1. Revisar cartera
2. Revisar aging
3. Revisar cobranza
4. Revisar rentabilidad por préstamo
5. Confirmar que ganancia, tasa y prórrogas coinciden con operaciones reales

## Criterio de salida

La entrega queda lista cuando:

- `smoke:real` pasa completo
- `lint`, `tsc` y `build` pasan
- no hay errores visuales críticos en UI
- solicitud, préstamo, pago, cobranza y reportes mantienen trazabilidad coherente
