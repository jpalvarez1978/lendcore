# QA visual-operativa de entrega

- Fecha: 12/3/2026, 18:49:17
- Base URL: http://127.0.0.1:3001
- Stamp: 20260312234908-1DFN
- Resultado: 4 PASS / 2 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| FAIL | Analyst | Cliente creado | El alta del cliente QA Visual 20260312234908-1DFN se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
| FAIL | General | Ejecución QA visual | Analyst :: Cliente creado -> El alta del cliente QA Visual 20260312234908-1DFN se persistió correctamente. | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: n/a
- Solicitud: n/a
- Préstamo: n/a
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: a611c289-874d-4378-a57c-2134360297a8
