# QA visual-operativa de entrega

- Fecha: 12/3/2026, 18:58:43
- Base URL: http://127.0.0.1:3001
- Stamp: 20260312235824-1B4W
- Resultado: 18 PASS / 1 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260312235824-1B4W se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
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
| PASS | Admin | Creación de préstamo | La originación redirige al detalle del préstamo creado para QA Visual 20260312235824-1B4W. | [captura](screenshots/admin-loan-detail.png) |
| PASS | Admin | Préstamo activo | El préstamo PRE-2026-009 queda activo tras la originación. | [captura](screenshots/admin-loan-active.png) |
| PASS | Admin | Preparar mora controlada | Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas. | - |
| FAIL | General | Ejecución QA visual | locator.isVisible: Error: strict mode violation: getByText(/Solicitud desembolsada/i) resolved to 2 elements:
    1) <p class="text-sm font-semibold text-foreground">Solicitud desembolsada</p> aka getByText('Solicitud desembolsada').first()
    2) <p class="text-sm font-semibold text-foreground">Solicitud desembolsada</p> aka getByText('Solicitud desembolsada').nth(1)

Call log:
[2m    - checking visibility of getByText(/Solicitud desembolsada/i)[22m
 | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: b1e17e3e-99a6-496f-a501-8f400109e449
- Solicitud: 8f112522-6202-47e2-97e2-22be8e24b56c
- Préstamo: 9fa0974b-cfc7-4c14-894e-a444a8cb96cc
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: 844b6959-162a-49dd-a42b-40105e942b9c
