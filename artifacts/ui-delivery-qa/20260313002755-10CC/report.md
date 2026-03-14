# QA visual-operativa de entrega

- Fecha: 12/3/2026, 19:30:33
- Base URL: http://127.0.0.1:3001
- Stamp: 20260313002755-10CC
- Resultado: 40 PASS / 0 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260313002755-10CC se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
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
| PASS | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260313002755-10CC. | [captura](screenshots/admin-loan-detail.png) |
| PASS | Admin | Préstamo activo | El préstamo PRE-2026-018 queda activo tras la originación. | [captura](screenshots/admin-loan-active.png) |
| PASS | Admin | Preparar mora controlada | Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas. | - |
| PASS | Admin | Cierre del flujo de solicitud | La solicitud cambia a desembolsada después de originar el préstamo. | [captura](screenshots/admin-application-disbursed.png) |
| PASS | Admin | Búsqueda global | La búsqueda global encuentra el cliente recién originado. | [captura](screenshots/admin-global-search.png) |
| PASS | Acceso | Pantalla de login collection | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/collection-login.png) |
| PASS | Acceso | Login collection | La sesión de collection redirige correctamente al dashboard. | [captura](screenshots/collection-dashboard.png) |
| PASS | Collection | Acceso a registrar pago | El cobrador ve la acción operativa de registrar pago en el detalle del préstamo. | [captura](screenshots/collection-loan-detail.png) |
| PASS | Collection | Formulario de pago | La pantalla de registro de pago carga cuotas pendientes y datos del préstamo. | [captura](screenshots/collection-payment-form.png) |
| PASS | Collection | Pago registrado | El pago parcial queda visible en el historial del préstamo. | [captura](screenshots/collection-loan-payment-history.png) |
| PASS | Collection | Listado de pagos | El pago aparece en el historial global y se puede ubicar por búsqueda. | [captura](screenshots/collection-payments-search.png) |
| PASS | Collection | Recibo PDF | El recibo se descarga con nombre legible (recibo-REC-PRE-2026-018-001.pdf) y contenido PDF válido. | [captura](screenshots/collection-receipt-ready.png) |
| PASS | Collection | Caso priorizado en cobranza | La mora controlada aparece en cobranza y expone gestión rápida. | [captura](screenshots/collection-dashboard.png) |
| PASS | Collection | Promesa y gestión rápida | La gestión crea la acción de cobranza y la promesa de pago asociada. | [captura](screenshots/collection-promise-created.png) |
| PASS | Acceso | Pantalla de login admin-reports | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/admin-reports-login.png) |
| PASS | Acceso | Login admin-reports | La sesión de admin-reports redirige correctamente al dashboard. | [captura](screenshots/admin-reports-dashboard.png) |
| PASS | Reportes | Carga del workspace | El módulo de reportes carga sus pestañas principales sin errores visuales. | [captura](screenshots/reports-portfolio.png) |
| PASS | Reportes | Aging | La vista de vencimientos responde y resume la cartera vencida. | [captura](screenshots/reports-aging.png) |
| PASS | Reportes | Cobranza | El reporte de cobranza refleja la mora y las métricas operativas. | [captura](screenshots/reports-collection.png) |
| PASS | Reportes | Rentabilidad | La operación creada aparece en rentabilidad y se puede filtrar por cliente. | [captura](screenshots/reports-profitability.png) |
| PASS | Reportes | Exportación CSV | La exportación de rentabilidad descarga un CSV utilizable (rentabilidad_prestamos_2026-03-13.csv). | [captura](screenshots/reports-profitability-export.png) |
| PASS | Acceso | Pantalla de login viewer | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/viewer-login.png) |
| PASS | Acceso | Login viewer | La sesión de viewer redirige correctamente al dashboard. | [captura](screenshots/viewer-dashboard.png) |
| PASS | Viewer | Consulta de reportes | El perfil viewer puede consultar reportes sin acciones de creación. | [captura](screenshots/viewer-reports.png) |
| PASS | Viewer | Bloqueo server-side | El viewer recibe bloqueo explícito al intentar abrir un alta restringida. | [captura](screenshots/viewer-access-denied.png) |
| PASS | General | Limpieza QA | Los datos temporales fueron eliminados tras una corrida limpia. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: d484cb07-3466-4354-bcf4-3da4fe03b69d
- Solicitud: 4e2fa67e-b89e-4954-93f0-7aef14ce55cf
- Préstamo: 95d65de4-3be2-40b2-9e35-e2c43f69f060
- Pago: 0147e0ea-56e0-46d5-bafe-cb6328557384
- Promesa: ba223338-2b49-4801-8a3a-021d0da5fe19
- Gestión: faa3f41a-9117-47c8-a929-e955f0d7e035
- Viewer temporal: fd6dd614-f047-48bb-8765-377907d7f4cd
