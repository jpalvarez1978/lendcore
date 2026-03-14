# PLAN DE PRUEBAS COMPLETO - LENDCORE
**Fecha:** 10 de Marzo, 2026
**URL:** http://localhost:3001

---

## 📋 CHECKLIST DE PRUEBAS

### ✅ FASE 1: AUTENTICACIÓN
- [ ] 1.1 - Acceder a http://localhost:3001
- [ ] 1.2 - Ver pantalla de login
- [ ] 1.3 - Probar login con credenciales incorrectas (debe fallar)
- [ ] 1.4 - Login exitoso con: admin@lendcore.com / Admin123!
- [ ] 1.5 - Verificar que redirija al dashboard

**Credenciales de Prueba:**
```
ADMIN:     admin@lendcore.com     / Admin123!
ANALYST:   analyst@lendcore.com   / Analyst123!
COLLECTOR: collector@lendcore.com / Collector123!
```

---

### ✅ FASE 2: DASHBOARD PRINCIPAL
- [ ] 2.1 - Ver KPIs principales (Total Cartera, Préstamos Activos, Tasa Morosidad, etc.)
- [ ] 2.2 - Verificar que los números se muestren correctamente
- [ ] 2.3 - Ver gráficos (Portfolio, Morosidad por Tiempo)
- [ ] 2.4 - Verificar navegación del sidebar
- [ ] 2.5 - Verificar que el header muestre el nombre del usuario

---

### ✅ FASE 3: GESTIÓN DE CLIENTES
#### 3.1 - Listar Clientes
- [ ] Navegar a "Clientes" en sidebar
- [ ] Ver lista de clientes existentes
- [ ] Probar búsqueda
- [ ] Probar filtros (Tipo, Estado, Riesgo)

#### 3.2 - Crear Cliente Individual
- [ ] Clic en "Nuevo Cliente"
- [ ] Seleccionar tipo: "INDIVIDUAL"
- [ ] Llenar formulario:
  - Nombre: Juan
  - Apellidos: Pérez García
  - DNI: 12345678A
  - Teléfono: +34600123456
  - Email: juan.perez@example.com
  - Fecha Nacimiento: 01/01/1990
  - Dirección: Calle Mayor 123, Bilbao
  - Cupo Crédito: 5000
  - Nivel Riesgo: MEDIUM
- [ ] Guardar y verificar que se cree correctamente
- [ ] Verificar que el DNI esté encriptado (no debe verse en BD)

#### 3.3 - Crear Cliente Empresa
- [ ] Clic en "Nuevo Cliente"
- [ ] Seleccionar tipo: "BUSINESS"
- [ ] Llenar formulario:
  - Razón Social: Comercial López S.L.
  - CIF: B12345678
  - Teléfono: +34944123456
  - Email: info@comerciallopez.com
  - Dirección Fiscal: Avenida Libertad 45, Bilbao
  - Cupo Crédito: 10000
  - Nivel Riesgo: LOW
- [ ] Guardar y verificar

#### 3.4 - Ver Detalle de Cliente
- [ ] Clic en un cliente de la lista
- [ ] Verificar que muestre:
  - Información básica
  - Préstamos del cliente
  - Historial de pagos
  - Notas
- [ ] Verificar que los datos encriptados se muestren correctamente

---

### ✅ FASE 4: CREACIÓN DE PRÉSTAMOS (CRÍTICO)
#### 4.1 - Navegar al Formulario
- [ ] Ir a "Préstamos" → "Nuevo Préstamo"
- [ ] Verificar que cargue el formulario completo

#### 4.2 - Crear Préstamo Americano (99% de casos)
- [ ] Seleccionar Cliente: Juan Pérez García
- [ ] Verificar que tipo de préstamo default sea "AMERICAN" ⭐
- [ ] Configurar términos:
  - Monto: 1000 €
  - Plazo: 2 meses
  - Tipo Interés: Porcentaje Mensual
  - Tasa: 1.0 %
  - Frecuencia: Mensual
  - Primera Fecha: (hoy + 30 días)
  - Permitir Sábados: ✓
  - Permitir Domingos: ✓

#### 4.3 - Verificar Preview en Tiempo Real
- [ ] Confirmar que el preview se muestra en columna derecha
- [ ] Verificar KPIs mostrados:
  - Capital: 1,000.00 €
  - Intereses: 20.00 €
  - Total a Pagar: 1,020.00 €
  - Número de Cuotas: 2
- [ ] Verificar información del tipo AMERICAN:
  - Cuotas Regulares: 10.00 €
  - Última Cuota: 1,010.00 €
- [ ] Verificar tabla de cronograma:
  - Cuota 1: Capital 0€, Interés 10€, Total 10€
  - Cuota 2: Capital 1,000€, Interés 10€, Total 1,010€
- [ ] **CAMBIAR** el monto a 2000€ y verificar que el preview se actualice automáticamente
- [ ] **CAMBIAR** el plazo a 3 meses y verificar actualización
- [ ] **VOLVER** a 1000€ y 2 meses

#### 4.4 - Agregar Garantías (Opcional)
- [ ] Marcar "Tiene garante"
- [ ] Llenar datos del garante:
  - Nombre: María López
  - DNI: 87654321B
  - Teléfono: +34600999888
  - Dirección: Calle Paz 78, Bilbao
- [ ] Agregar notas de garantías: "Aval solidario firmado"

#### 4.5 - Agregar Notas
- [ ] Notas Internas: "Cliente con buen historial de pago"
- [ ] Instrucciones Cliente: "Pagar antes del día 5 de cada mes"
- [ ] Verificar checkbox "Enviar email": ✓

#### 4.6 - Crear el Préstamo
- [ ] Clic en "Crear Préstamo"
- [ ] Verificar que muestre spinner "Creando..."
- [ ] Verificar que redirija a página de detalle del préstamo
- [ ] Verificar que muestre:
  - Número de préstamo (PRE-2026-XXX)
  - Estado: ACTIVE
  - Monto: 1,000.00 €
  - Cronograma completo con 2 cuotas
  - Datos del garante
  - Notas

#### 4.7 - Crear Préstamo Francés (Comparación)
- [ ] Crear nuevo préstamo con mismo cliente
- [ ] Cambiar tipo a "FRENCH"
- [ ] Mismos términos: 1000€, 2 meses, 1%
- [ ] Verificar en preview:
  - Cuotas fijas: ~507.51 €
  - Total intereses: ~15.01 €
- [ ] Crear y verificar

#### 4.8 - Crear Préstamo Alemán (Comparación)
- [ ] Crear nuevo préstamo
- [ ] Tipo: "GERMAN"
- [ ] Mismos términos
- [ ] Verificar preview:
  - Cuota 1: ~510.00 €
  - Cuota 2: ~505.00 €
  - Total intereses: ~15.00 €
- [ ] Crear y verificar

---

### ✅ FASE 5: GESTIÓN DE PRÉSTAMOS
#### 5.1 - Lista de Préstamos
- [ ] Ir a "Préstamos"
- [ ] Ver lista de todos los préstamos
- [ ] Verificar que muestre 3 préstamos creados
- [ ] Probar búsqueda por número de préstamo
- [ ] Probar filtros por estado

#### 5.2 - Detalle de Préstamo
- [ ] Clic en el préstamo americano
- [ ] Verificar secciones:
  - Información General
  - Cronograma de Cuotas
  - Historial de Pagos (vacío)
  - Acciones (Registrar Pago, etc.)

---

### ✅ FASE 6: REGISTRO DE PAGOS
#### 6.1 - Pagar Primera Cuota Completa
- [ ] En detalle del préstamo americano
- [ ] Clic en "Registrar Pago"
- [ ] Llenar formulario:
  - Monto: 10.00 €
  - Método: CASH
  - Fecha: (hoy)
  - Referencia: "Pago cuota 1"
- [ ] Guardar
- [ ] Verificar que:
  - Cuota 1 cambie a estado "PAID"
  - Se registre en historial de pagos
  - Balance se actualice

#### 6.2 - Pago Parcial de Segunda Cuota
- [ ] Registrar nuevo pago
- [ ] Monto: 500.00 € (parcial)
- [ ] Método: TRANSFER
- [ ] Guardar
- [ ] Verificar que:
  - Cuota 2 muestre monto pagado parcialmente
  - Estado: PARTIAL
  - Saldo pendiente: 510.00 €

#### 6.3 - Completar Segunda Cuota
- [ ] Registrar pago de 510.00 €
- [ ] Verificar que:
  - Cuota 2 estado: PAID
  - Préstamo estado: PAID_OFF
  - Total pagado: 1,020.00 €

---

### ✅ FASE 7: COBRANZA
#### 7.1 - Dashboard de Cobranza
- [ ] Ir a "Cobranza"
- [ ] Verificar KPIs:
  - Préstamos Vencidos
  - Monto en Mora
  - Tasa de Morosidad
- [ ] Ver lista de préstamos morosos

#### 7.2 - Registrar Acción de Cobranza
- [ ] Seleccionar un préstamo vencido (si hay)
- [ ] Registrar acción:
  - Tipo: CALL
  - Resultado: PROMISE_MADE
  - Notas: "Cliente promete pagar mañana"
- [ ] Guardar

#### 7.3 - Crear Promesa de Pago
- [ ] Crear promesa:
  - Monto: 500.00 €
  - Fecha compromiso: (mañana)
  - Notas: "Confirmado por teléfono"
- [ ] Guardar
- [ ] Verificar que aparezca en dashboard

---

### ✅ FASE 8: REPORTES
#### 8.1 - Reporte de Portfolio
- [ ] Ir a "Reportes"
- [ ] Seleccionar "Portfolio"
- [ ] Generar reporte
- [ ] Verificar que muestre:
  - Total cartera
  - Por cliente
  - Por estado
- [ ] Exportar a Excel
- [ ] Verificar que descargue el archivo

#### 8.2 - Reporte de Aging
- [ ] Generar reporte "Aging"
- [ ] Verificar buckets:
  - Corriente (0-30 días)
  - 31-60 días
  - 61-90 días
  - +90 días
- [ ] Exportar

#### 8.3 - Reporte de Cobranza
- [ ] Generar reporte de cobranza
- [ ] Verificar acciones registradas
- [ ] Exportar

---

### ✅ FASE 9: AUDITORÍA Y SEGURIDAD
#### 9.1 - Logs de Auditoría
- [ ] Ir a "Auditoría"
- [ ] Ver logs de todas las acciones
- [ ] Verificar que registre:
  - Creación de clientes
  - Creación de préstamos
  - Pagos registrados
  - Usuario que ejecutó cada acción
- [ ] Probar filtros por acción
- [ ] Exportar logs

#### 9.2 - Configuración y Parámetros
- [ ] Ir a "Configuración"
- [ ] Verificar parámetros del sistema:
  - Tasa de morosidad permitida
  - Días de gracia
  - Tasa de penalidad
- [ ] Modificar un parámetro
- [ ] Guardar
- [ ] Verificar que se registre en log de cambios

---

### ✅ FASE 10: ROLES Y PERMISOS
#### 10.1 - Cerrar Sesión Admin
- [ ] Logout

#### 10.2 - Login como Analista
- [ ] Login: analyst@lendcore.com / Analyst123!
- [ ] Verificar que PUEDE:
  - Ver clientes
  - Crear clientes
  - Ver préstamos
  - Crear préstamos
  - Ver reportes
- [ ] Verificar que NO PUEDE:
  - Gestionar usuarios
  - Cambiar parámetros del sistema

#### 10.3 - Login como Cobranza
- [ ] Login: collector@lendcore.com / Collector123!
- [ ] Verificar que PUEDE:
  - Ver dashboard de cobranza
  - Registrar pagos
  - Registrar acciones de cobranza
  - Ver clientes (solo lectura)
- [ ] Verificar que NO PUEDE:
  - Crear préstamos
  - Modificar clientes

---

### ✅ FASE 11: RESPONSIVE Y ACCESIBILIDAD
#### 11.1 - Vista Móvil
- [ ] Abrir DevTools (F12)
- [ ] Cambiar a vista móvil (iPhone/Android)
- [ ] Verificar que:
  - Sidebar se convierta en menú hamburguesa
  - Tablas sean scrollables
  - Formularios se ajusten
  - Botones sean clickeables
- [ ] Navegar por las principales páginas

#### 11.2 - Navegación con Teclado
- [ ] Cerrar mouse
- [ ] Navegar solo con Tab
- [ ] Verificar que:
  - Todos los elementos sean accesibles
  - Focus visible
  - Forms navegables

---

### ✅ FASE 12: CASOS EXTREMOS
#### 12.1 - Validaciones
- [ ] Intentar crear préstamo sin seleccionar cliente (debe fallar)
- [ ] Intentar monto negativo (debe fallar)
- [ ] Intentar tasa negativa (debe fallar)
- [ ] Intentar plazo 0 meses (debe fallar)

#### 12.2 - Cupo de Crédito
- [ ] Intentar crear préstamo que exceda cupo disponible
- [ ] Verificar que muestre error claro

#### 12.3 - Duplicados
- [ ] Intentar crear cliente con mismo DNI
- [ ] Verificar que no permita duplicados

---

### ✅ FASE 13: PERFORMANCE
#### 13.1 - Velocidad de Carga
- [ ] Medir tiempo de carga del dashboard
- [ ] Medir tiempo de lista de préstamos
- [ ] Verificar que sea < 2 segundos

#### 13.2 - Preview en Tiempo Real
- [ ] En formulario de préstamo, cambiar valores rápidamente
- [ ] Verificar que el preview se actualice sin lag
- [ ] Confirmar que no haya parpadeos

---

## 📝 REGISTRO DE ERRORES

### Error #1
**Ubicación:**
**Descripción:**
**Cómo reproducir:**
**Estado:** ⏳ Pendiente / ✅ Resuelto

### Error #2
**Ubicación:**
**Descripción:**
**Cómo reproducir:**
**Estado:**

### Error #3
**Ubicación:**
**Descripción:**
**Cómo reproducir:**
**Estado:**

---

## ✅ RESUMEN FINAL
- Total de pruebas: XXX
- Pruebas exitosas: XXX
- Errores encontrados: XXX
- Errores críticos: XXX
- Estado general: ⏳ En Progreso / ✅ Aprobado / ❌ Requiere Trabajo

---

**INSTRUCCIONES PARA EL USUARIO:**
1. Abre este archivo en un editor
2. Ve marcando ✅ cada item mientras lo pruebas
3. Cuando encuentres un error, páramelo y dime:
   - En qué fase estás
   - Qué paso exacto estabas haciendo
   - Qué error ves (pantalla, mensaje, etc.)
4. Yo lo resolveré inmediatamente
5. Continuamos con las pruebas

**¡EMPECEMOS!** 🚀
