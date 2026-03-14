# QA visual-operativa de entrega

- Fecha: 12/3/2026, 18:53:51
- Base URL: http://127.0.0.1:3001
- Stamp: 20260312235304-8E4X
- Resultado: 12 PASS / 2 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260312235304-8E4X se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
| PASS | Analyst | Búsqueda en clientes | La búsqueda parcial encuentra el cliente recién creado. | [captura](screenshots/analyst-clients-search.png) |
| PASS | Analyst | Ficha de cliente | La ficha muestra el DNI desencriptado y legible. | [captura](screenshots/analyst-client-detail.png) |
| PASS | Analyst | Formulario de solicitud | El alta de solicitud carga sin errores visuales. | [captura](screenshots/analyst-application-form.png) |
| PASS | Analyst | Solicitud creada | La solicitud nueva aparece en el listado con estado borrador. | [captura](screenshots/analyst-application-list.png) |
| PASS | Acceso | Pantalla de login admin | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/admin-login.png) |
| PASS | Acceso | Login admin | La sesión de admin redirige correctamente al dashboard. | [captura](screenshots/admin-dashboard.png) |
| PASS | Admin | Detalle de solicitud | La solicitud muestra identidad legible y no expone datos cifrados. | [captura](screenshots/admin-application-detail.png) |
| FAIL | Admin | Enviar a revisión | La solicitud cambia a revisión desde la misma vista. | [captura](screenshots/admin-application-under-review.png) |
| FAIL | General | Ejecución QA visual | Admin :: Enviar a revisión -> La solicitud cambia a revisión desde la misma vista. | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: dcdf260a-04ba-4349-8856-7c3a508369a4
- Solicitud: 0f9cf9ce-f7c0-4e69-9d2e-f7d4b6e80d80
- Préstamo: n/a
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: 5522e1f6-05a2-46f0-82cf-009189ecfefa
