# QA visual-operativa de entrega

- Fecha: 12/3/2026, 19:00:36
- Base URL: http://127.0.0.1:3001
- Stamp: 20260312235951-8YXU
- Resultado: 19 PASS / 2 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260312235951-8YXU se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
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
| PASS | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260312235951-8YXU. | [captura](screenshots/admin-loan-detail.png) |
| PASS | Admin | Préstamo activo | El préstamo PRE-2026-010 queda activo tras la originación. | [captura](screenshots/admin-loan-active.png) |
| PASS | Admin | Preparar mora controlada | Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas. | - |
| PASS | Admin | Cierre del flujo de solicitud | La solicitud cambia a desembolsada después de originar el préstamo. | [captura](screenshots/admin-application-disbursed.png) |
| FAIL | Admin | Búsqueda global | La búsqueda global encuentra el cliente recién originado. | [captura](screenshots/admin-global-search.png) |
| FAIL | General | Ejecución QA visual | Admin :: Búsqueda global -> La búsqueda global encuentra el cliente recién originado. | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: 34e91e71-9f10-49e3-bfdc-9415779110e2
- Solicitud: 3cdf8181-a394-4a61-9b27-0053860c2f95
- Préstamo: a30b46b2-30db-494f-9b2f-aef8d77668f2
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: c2ba36c5-c2ec-4da4-8aee-dd14c6c33e2d
