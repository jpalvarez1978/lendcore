# QA visual-operativa de entrega

- Fecha: 12/3/2026, 19:13:11
- Base URL: http://127.0.0.1:3001
- Stamp: 20260313001129-2GI0
- Resultado: 28 PASS / 1 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260313001129-2GI0 se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
| PASS | Analyst | Búsqueda en clientes | La búsqueda parcial encuentra el cliente recién creado. | [captura](screenshots/analyst-clients-search.png) |
| PASS | Analyst | Ficha de cliente | La ficha muestra el DNI desencriptado y legible. | [captura](screenshots/analyst-client-detail.png) |
| PASS | Analyst | Formulario de solicitud | El alta de solicitud carga sin errores visuales. | [captura](screenshots/analyst-application-form.png) |
| PASS | Analyst | Solicitud creada | La solicitud nueva aparece en el listado con estado borrador. | [captura](screenshots/analyst-application-list.png) |
| PASS | Acceso | Pantalla de login admin | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/admin-login.png) |
| PASS | Acceso | Login admin | La sesión de admin redirige correctamente al dashboard. | [captura](screenshots/admin-dashboard.png) |
| PASS | Admin | Detalle de solicitud | La solicitud muestra identidad legible y no expone datos cifrados. | [captura](screenshots/admin-application-detail.png) |
| PASS | Admin | Enviar a revisión | La solicitud cambia a revisión desde la misma vista. | [captura](screenshots/admin-application-under-review.png) |
| PASS | Admin | Aprobación de solicitud | La aprobación se refleja con trazabilidad y siguiente paso operativo. | [captura](screenshots/admin-application-approved.png) |
| PASS | Admin | Originación desde solicitud | La vista de originación hereda correctamente la solicitud aprobada. | [captura](screenshots/admin-loan-origin.png) |
| PASS | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260313001129-2GI0. | [captura](screenshots/admin-loan-detail.png) |
| PASS | Admin | Préstamo activo | El préstamo PRE-2026-014 queda activo tras la originación. | [captura](screenshots/admin-loan-active.png) |
| PASS | Admin | Preparar mora controlada | Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas. | - |
| PASS | Admin | Cierre del flujo de solicitud | La solicitud cambia a desembolsada después de originar el préstamo. | [captura](screenshots/admin-application-disbursed.png) |
| PASS | Admin | Búsqueda global | La búsqueda global encuentra el cliente recién originado. | [captura](screenshots/admin-global-search.png) |
| PASS | Acceso | Pantalla de login collection | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/collection-login.png) |
| PASS | Acceso | Login collection | La sesión de collection redirige correctamente al dashboard. | [captura](screenshots/collection-dashboard.png) |
| PASS | Collection | Acceso a registrar pago | El cobrador ve la acción operativa de registrar pago en el detalle del préstamo. | [captura](screenshots/collection-loan-detail.png) |
| PASS | Collection | Formulario de pago | La pantalla de registro de pago carga cuotas pendientes y datos del préstamo. | [captura](screenshots/collection-payment-form.png) |
| PASS | Collection | Pago registrado | El pago parcial queda visible en el historial del préstamo. | [captura](screenshots/collection-loan-payment-history.png) |
| PASS | Collection | Listado de pagos | El pago aparece en el historial global y se puede ubicar por búsqueda. | [captura](screenshots/collection-payments-search.png) |
| PASS | Collection | Recibo PDF | El recibo se descarga con nombre legible (recibo-REC-PRE-2026-014-001.pdf) y contenido PDF válido. | [captura](screenshots/collection-receipt-ready.png) |
| PASS | Collection | Caso priorizado en cobranza | La mora controlada aparece en cobranza y expone gestión rápida. | [captura](screenshots/collection-dashboard.png) |
| FAIL | General | Ejecución QA visual | locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: /^Resultado$/i })[22m
 | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: 61bac92a-2026-4921-ae34-27ecc1c82da2
- Solicitud: b0c4ad0b-7381-4203-8e79-a8a7d64578eb
- Préstamo: e476693b-c7be-4204-a1c0-9805b00a9a6c
- Pago: 1d51439a-6ab7-406d-8c62-7521d2450c40
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: 2f2a0afa-0011-4cd8-98aa-a32714ba5255
