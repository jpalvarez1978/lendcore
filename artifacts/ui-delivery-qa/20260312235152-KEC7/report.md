# QA visual-operativa de entrega

- Fecha: 12/3/2026, 18:52:04
- Base URL: http://127.0.0.1:3001
- Stamp: 20260312235152-KEC7
- Resultado: 8 PASS / 1 FAIL

## Resumen

| Estado | Área | Paso | Detalle | Evidencia |
| --- | --- | --- | --- | --- |
| PASS | Acceso | Pantalla de login analyst | La marca y la pantalla de acceso cargan correctamente. | [captura](screenshots/analyst-login.png) |
| PASS | Acceso | Login analyst | La sesión de analyst redirige correctamente al dashboard. | [captura](screenshots/analyst-dashboard.png) |
| PASS | Analyst | Nueva ficha de cliente | El formulario de alta de cliente carga completo y con estilos. | [captura](screenshots/analyst-client-form.png) |
| PASS | Analyst | Cliente creado | El alta del cliente QA Visual 20260312235152-KEC7 se persistió correctamente. | [captura](screenshots/analyst-clients-list.png) |
| PASS | Analyst | Búsqueda en clientes | La búsqueda parcial encuentra el cliente recién creado. | [captura](screenshots/analyst-clients-search.png) |
| PASS | Analyst | Ficha de cliente | La ficha muestra el DNI desencriptado y legible. | [captura](screenshots/analyst-client-detail.png) |
| PASS | Analyst | Formulario de solicitud | El alta de solicitud carga sin errores visuales. | [captura](screenshots/analyst-application-form.png) |
| FAIL | General | Ejecución QA visual | locator.click: Error: strict mode violation: getByRole('combobox') resolved to 2 elements:
    1) <button type="button" role="combobox" data-state="closed" aria-expanded="false" aria-haspopup="dialog" aria-controls="radix-:R136vfffalt7:" class="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-backgr…>…</button> aka getByRole('combobox').filter({ hasText: 'Selecciona un cliente' })
    2) <button dir="ltr" type="button" role="combobox" data-state="closed" aria-expanded="false" aria-autocomplete="none" aria-controls="radix-:R576vfffalt7:" class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">…</button> aka getByRole('combobox').filter({ hasText: 'Mensual' })

Call log:
[2m  - waiting for getByRole('combobox')[22m
 | - |
| PASS | General | Limpieza QA | Se conservaron los datos temporales para inspeccionar el fallo encontrado. | - |

## Artefactos

- Capturas: `./screenshots`
- Descargas: `./downloads`

## Datos temporales

- Cliente: 2b4fee3f-837a-49d2-8603-db2231169049
- Solicitud: n/a
- Préstamo: n/a
- Pago: n/a
- Promesa: n/a
- Gestión: n/a
- Viewer temporal: 9872a9fd-e2ff-4072-8ebe-5b498d841957
