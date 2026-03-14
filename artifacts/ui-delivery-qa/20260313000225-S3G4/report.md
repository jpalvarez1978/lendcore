# QA visual-operativa de entrega

- Fecha: 12/3/2026, 19:03:13
- Base URL: http://127.0.0.1:3001
- Stamp: 20260313000225-S3G4
- Resultado: 23 PASS / 2 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260313000225-S3G4 se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
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
| PASS | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260313000225-S3G4. | [captura](screenshots/admin-loan-detail.png) |
| PASS | Admin | Préstamo activo | El préstamo PRE-2026-011 queda activo tras la originación. | [captura](screenshots/admin-loan-active.png) |
| PASS | Admin | Preparar mora controlada | Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas. | - |
| PASS | Admin | Cierre del flujo de solicitud | La solicitud cambia a desembolsada después de originar el préstamo. | [captura](screenshots/admin-application-disbursed.png) |
| PASS | Admin | Búsqueda global | La búsqueda global encuentra el cliente recién originado. | [captura](screenshots/admin-global-search.png) |
| PASS | Acceso | Pantalla de login collection | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/collection-login.png) |
| PASS | Acceso | Login collection | La sesión de collection redirige correctamente al dashboard. | [captura](screenshots/collection-dashboard.png) |
| PASS | Collection | Acceso a registrar pago | El cobrador ve la acción operativa de registrar pago en el detalle del préstamo. | [captura](screenshots/collection-loan-detail.png) |
| FAIL | Collection | Formulario de pago | La pantalla de registro de pago carga cuotas pendientes y datos del préstamo. | [captura](screenshots/collection-payment-form.png) |
| FAIL | General | Ejecución QA visual | Collection :: Formulario de pago -> La pantalla de registro de pago carga cuotas pendientes y datos del préstamo. | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: 597a0c56-7f84-4cac-8e79-1ceabb98989b
- Solicitud: 38503d44-7e40-4bfd-8ea0-879b79b6aaa7
- Préstamo: 30bafe67-6430-4ce7-89e0-c2e834925105
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: a7f3bd9b-87b1-40e5-b503-9f8691c05445
