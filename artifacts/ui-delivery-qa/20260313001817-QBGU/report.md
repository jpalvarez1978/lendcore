# QA visual-operativa de entrega

- Fecha: 12/3/2026, 19:21:14
- Base URL: http://127.0.0.1:3001
- Stamp: 20260313001817-QBGU
- Resultado: 35 PASS / 1 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260313001817-QBGU se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
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
| PASS | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260313001817-QBGU. | [captura](screenshots/admin-loan-detail.png) |
| PASS | Admin | Préstamo activo | El préstamo PRE-2026-016 queda activo tras la originación. | [captura](screenshots/admin-loan-active.png) |
| PASS | Admin | Preparar mora controlada | Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas. | - |
| PASS | Admin | Cierre del flujo de solicitud | La solicitud cambia a desembolsada después de originar el préstamo. | [captura](screenshots/admin-application-disbursed.png) |
| PASS | Admin | Búsqueda global | La búsqueda global encuentra el cliente recién originado. | [captura](screenshots/admin-global-search.png) |
| PASS | Acceso | Pantalla de login collection | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/collection-login.png) |
| PASS | Acceso | Login collection | La sesión de collection redirige correctamente al dashboard. | [captura](screenshots/collection-dashboard.png) |
| PASS | Collection | Acceso a registrar pago | El cobrador ve la acción operativa de registrar pago en el detalle del préstamo. | [captura](screenshots/collection-loan-detail.png) |
| PASS | Collection | Formulario de pago | La pantalla de registro de pago carga cuotas pendientes y datos del préstamo. | [captura](screenshots/collection-payment-form.png) |
| PASS | Collection | Pago registrado | El pago parcial queda visible en el historial del préstamo. | [captura](screenshots/collection-loan-payment-history.png) |
| PASS | Collection | Listado de pagos | El pago aparece en el historial global y se puede ubicar por búsqueda. | [captura](screenshots/collection-payments-search.png) |
| PASS | Collection | Recibo PDF | El recibo se descarga con nombre legible (recibo-REC-PRE-2026-016-001.pdf) y contenido PDF válido. | [captura](screenshots/collection-receipt-ready.png) |
| PASS | Collection | Caso priorizado en cobranza | La mora controlada aparece en cobranza y expone gestión rápida. | [captura](screenshots/collection-dashboard.png) |
| PASS | Collection | Promesa y gestión rápida | La gestión crea la acción de cobranza y la promesa de pago asociada. | [captura](screenshots/collection-promise-created.png) |
| PASS | Acceso | Pantalla de login admin-reports | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/admin-reports-login.png) |
| PASS | Acceso | Login admin-reports | La sesión de admin-reports redirige correctamente al dashboard. | [captura](screenshots/admin-reports-dashboard.png) |
| PASS | Reportes | Carga del workspace | El módulo de reportes carga sus pestañas principales sin errores visuales. | [captura](screenshots/reports-portfolio.png) |
| PASS | Reportes | Aging | La vista de vencimientos responde y resume la cartera vencida. | [captura](screenshots/reports-aging.png) |
| PASS | Reportes | Cobranza | El reporte de cobranza refleja la mora y las métricas operativas. | [captura](screenshots/reports-collection.png) |
| PASS | Reportes | Rentabilidad | La operación creada aparece en rentabilidad y se puede filtrar por cliente. | [captura](screenshots/reports-profitability.png) |
| FAIL | General | Ejecución QA visual | page.waitForEvent: Timeout 30000ms exceeded while waiting for event "download"
=========================== logs ===========================
waiting for event "download"
============================================================ | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: cd810340-b242-4019-83a9-c8fc25876cd0
- Solicitud: 89254ad0-9875-4f6a-9fe9-00903260f7a3
- Préstamo: 33e7181d-55c8-444e-bf8d-8d06b81e65a8
- Pago: 320c4def-2e5d-4c42-96c0-dfd2eb73b00e
- Promesa: 97241d2a-a3f5-4b55-957f-f9862d556d4a
- Gestión: 4141113f-30e1-4607-8a45-1b42c9017d6b
- Viewer temporal: 0c471da8-39bc-4162-95ed-69960fa72ec6
