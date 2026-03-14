# QA visual-operativa de entrega

- Fecha: 12/3/2026, 18:56:26
- Base URL: http://127.0.0.1:3001
- Stamp: 20260312235539-0AAR
- Resultado: 15 PASS / 2 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260312235539-0AAR se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
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
| FAIL | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260312235539-0AAR. | [captura](screenshots/admin-loan-detail.png) |
| FAIL | General | Ejecución QA visual | Admin :: Creación de préstamo -> La originación redirige al detalle del préstamo creado para QA Visual 20260312235539-0AAR. | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: 07c9a1a0-e145-4945-b7c3-6fdd83261ea7
- Solicitud: 491f231e-96d0-49b8-aa0a-bc98587f5997
- Préstamo: n/a
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: 731b003d-9739-4a54-9d64-f77a25ed2d4d
