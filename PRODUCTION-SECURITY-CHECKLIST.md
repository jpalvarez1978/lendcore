# ✅ Checklist de Seguridad para Producción

**Completa TODOS los ítems antes de ir a producción.**

---

## 🔐 **1. Variables de Entorno**

- [ ] ENCRYPTION_KEY generada con `openssl rand -base64 32`
- [ ] ENCRYPTION_KEY diferente a desarrollo (¡NO usar la misma!)
- [ ] ENCRYPTION_KEY guardada en 1Password/LastPass/Vault
- [ ] NEXTAUTH_SECRET cambiado del valor de ejemplo
- [ ] DATABASE_URL apunta a BD de producción
- [ ] Todas las variables de .env.example configuradas
- [ ] .env **NO** subido a Git (verificar .gitignore)

**Validar:**
```bash
npx tsx scripts/security-check.ts
```

---

## 🗄️ **2. Base de Datos**

- [ ] Migraciones de Prisma ejecutadas
- [ ] Modelo `SecurityLog` creado en BD
- [ ] Script de encriptación ejecutado en datos existentes
- [ ] Backup de BD creado ANTES de encriptar
- [ ] Backup guardado en lugar seguro (AWS S3, etc.)
- [ ] Usuario de BD con permisos limitados (no usar root)
- [ ] Conexiones SSL/TLS habilitadas
- [ ] IP whitelist configurada (solo servidor puede conectar)

**Validar:**
```bash
npx prisma migrate status
curl https://tu-dominio.com/api/health/security
```

---

## 🛡️ **3. WAF (Web Application Firewall)**

- [ ] Cloudflare/AWS WAF configurado
- [ ] Reglas de firewall importadas (`cloudflare/firewall-rules.json`)
- [ ] SSL/TLS en modo **Full (strict)**
- [ ] Always Use HTTPS habilitado
- [ ] HSTS habilitado (max-age 31536000)
- [ ] Bot Fight Mode activado
- [ ] DDoS protection habilitado
- [ ] Geo-blocking configurado (solo países permitidos)
- [ ] Rate limiting configurado en Cloudflare

**Validar:**
```bash
curl -I https://tu-dominio.com | grep "cf-ray"
curl -I https://tu-dominio.com | grep "strict-transport-security"
```

---

## 🔒 **4. Headers de Seguridad**

Verificar que el middleware esté aplicando:

- [ ] Content-Security-Policy
- [ ] Strict-Transport-Security (HSTS)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy
- [ ] Permissions-Policy
- [ ] Cross-Origin-Opener-Policy
- [ ] Cross-Origin-Resource-Policy

**Validar:**
```bash
curl -I https://tu-dominio.com
```

Verificar en https://securityheaders.com

---

## 🚫 **5. Rate Limiting**

- [ ] Rate limiting implementado en código
- [ ] Login: 5 intentos / 15 min
- [ ] API general: 100 requests / min
- [ ] Exportación: 10 / hora
- [ ] Rate limiting configurado en Cloudflare (adicional)

**Validar:**
```bash
# Hacer 6 intentos de login fallidos
for i in {1..6}; do
  curl -X POST https://tu-dominio.com/api/auth/callback/credentials \
    -d "email=test@test.com&password=wrong"
done
# Esperado: 429 en el 6to intento
```

---

## 📊 **6. Auditoría y Logging**

- [ ] SecurityLog registrando eventos
- [ ] Logs de login (éxito/fallo) funcionando
- [ ] Logs de actividad sospechosa funcionando
- [ ] Dashboard de seguridad accesible solo para ADMIN
- [ ] Alertas configuradas para eventos CRITICAL
- [ ] Logs rotando correctamente (no llenar disco)

**Validar:**
```bash
# Hacer login y verificar que se registre
curl https://tu-dominio.com/api/security/logs | jq
```

---

## 🔐 **7. Encriptación**

- [ ] DNI/NIE/CIF encriptados
- [ ] Teléfonos encriptados
- [ ] IBANs encriptados
- [ ] Direcciones encriptadas
- [ ] Función `encryptIfNeeded()` usada en creación
- [ ] Función `decryptSafe()` usada en lectura
- [ ] Máscaras implementadas en UI (`maskDNI`, `maskPhone`, etc.)

**Validar:**
```sql
-- En la BD, verificar que los datos estén encriptados (base64)
SELECT dni FROM clients LIMIT 1;
-- Esperado: "kX9mN2pQ4w..." (no "12345678A")
```

---

## 🔑 **8. Autenticación**

- [ ] Contraseñas hasheadas con bcrypt
- [ ] Sesiones con expiración (JWT)
- [ ] lastLoginAt actualizándose
- [ ] Logout funcionando correctamente
- [ ] Reset de contraseña funcionando
- [ ] Email de verificación (si implementado)

---

## 👥 **9. Permisos y Roles**

- [ ] RBAC implementado (ADMIN, ANALYST, COLLECTION, VIEWER)
- [ ] Cada ruta protegida con `hasPermission()`
- [ ] Dashboard de seguridad solo para ADMIN
- [ ] Configuración solo para ADMIN
- [ ] Logs de cambios de permisos funcionando

**Validar:**
```bash
# Como VIEWER, intentar acceder a /dashboard/configuracion
# Esperado: 403 Forbidden
```

---

## 🌐 **10. HTTPS y Certificados**

- [ ] Certificado SSL/TLS instalado
- [ ] Certificado válido (no auto-firmado)
- [ ] HTTPS forzado (redirect HTTP → HTTPS)
- [ ] Certificado renovándose automáticamente
- [ ] No hay warnings de certificado en navegador

**Validar:**
```bash
curl https://tu-dominio.com
# Esperado: NO error de certificado

# Verificar que HTTP redirija a HTTPS
curl -I http://tu-dominio.com
# Esperado: 301/302 a https://
```

---

## 🧪 **11. Testing de Seguridad**

- [ ] Test SQL Injection (debe bloquear)
- [ ] Test XSS (debe bloquear)
- [ ] Test Path Traversal (debe bloquear)
- [ ] Test Rate Limiting (debe bloquear tras límite)
- [ ] Test headers de seguridad (todos presentes)
- [ ] Test encriptación (datos NO legibles en BD)

**Ejecutar tests:**
```bash
# SQL Injection
curl "https://tu-dominio.com/api/clients?id=1%20union%20select"
# Esperado: 403 Forbidden

# XSS
curl "https://tu-dominio.com/search?q=<script>alert(1)</script>"
# Esperado: 403 Forbidden

# Path Traversal
curl "https://tu-dominio.com/../../../../etc/passwd"
# Esperado: 403 Forbidden
```

---

## 📝 **12. Documentación**

- [ ] SECURITY.md actualizado
- [ ] README con instrucciones de seguridad
- [ ] Runbook de incidentes de seguridad creado
- [ ] Equipo entrenado en respuesta a incidentes
- [ ] Contacto de seguridad publicado (security@tu-dominio.com)

---

## 🚨 **13. Monitoreo y Alertas**

- [ ] Cloudflare Analytics configurado
- [ ] Alertas de email para eventos críticos
- [ ] Dashboard de seguridad monitoreado semanalmente
- [ ] Logs de seguridad revisados regularmente
- [ ] Plan de respuesta a incidentes documentado

**Configurar alertas:**
1. Cloudflare → Notifications → Add
2. Tipo: Security Events
3. Email: seguridad@lendcore.es

---

## 🔄 **14. Backups y Recuperación**

- [ ] Backups automáticos de BD (diarios)
- [ ] Backups encriptados
- [ ] Backups guardados en ubicación separada (S3, etc.)
- [ ] Procedimiento de restauración probado
- [ ] RPO/RTO definidos y documentados
- [ ] ENCRYPTION_KEY backupeada en vault separado

---

## 👨‍💻 **15. Equipo y Procesos**

- [ ] Solo personal autorizado tiene acceso a producción
- [ ] Accesos a producción registrados (quién, cuándo)
- [ ] 2FA habilitado en cuentas de admin
- [ ] Claves SSH rotadas regularmente
- [ ] Revisión de permisos trimestral
- [ ] Política de contraseñas fuertes aplicada

---

## 🔍 **16. Compliance y Legal**

- [ ] GDPR compliance (si aplica)
- [ ] Política de privacidad publicada
- [ ] Términos de servicio publicados
- [ ] Consentimiento de cookies implementado
- [ ] Derecho al olvido implementado
- [ ] Registro de procesamiento de datos (RGPD)

---

## 🎯 **17. Validación Final**

Ejecutar antes de lanzar:

```bash
# 1. Security check
npx tsx scripts/security-check.ts

# 2. Health check
curl https://tu-dominio.com/api/health/security

# 3. Headers check
curl -I https://tu-dominio.com

# 4. SSL Labs (obtener A+)
# https://www.ssllabs.com/ssltest/analyze.html?d=tu-dominio.com

# 5. Security Headers (obtener A+)
# https://securityheaders.com/?q=tu-dominio.com

# 6. OWASP ZAP scan (opcional pero recomendado)
# docker run -t owasp/zap2docker-stable zap-baseline.py -t https://tu-dominio.com
```

---

## 📊 **Scorecard de Seguridad**

| Categoría | Score | Notas |
|-----------|-------|-------|
| Variables de Entorno | __ / 7 | |
| Base de Datos | __ / 8 | |
| WAF | __ / 9 | |
| Headers | __ / 8 | |
| Rate Limiting | __ / 5 | |
| Auditoría | __ / 6 | |
| Encriptación | __ / 7 | |
| Autenticación | __ / 6 | |
| Permisos | __ / 5 | |
| HTTPS | __ / 5 | |
| Testing | __ / 6 | |
| Documentación | __ / 4 | |
| Monitoreo | __ / 5 | |
| Backups | __ / 6 | |
| Equipo | __ / 6 | |
| Compliance | __ / 6 | |
| Validación Final | __ / 6 | |
| **TOTAL** | **__ / 100** | |

**Mínimo para producción: 85/100**

---

## ✍️ **Firma de Aprobación**

- [ ] Desarrollador: _________________ Fecha: _______
- [ ] DevOps/SysAdmin: ______________ Fecha: _______
- [ ] Security Officer: _____________ Fecha: _______
- [ ] Product Owner: ________________ Fecha: _______

---

## 🚀 **Post-Lanzamiento**

Tareas recurrentes:

**Diarias:**
- [ ] Revisar dashboard de seguridad (5 min)
- [ ] Verificar alertas de Cloudflare

**Semanales:**
- [ ] Revisar logs de eventos CRITICAL/ALERT
- [ ] Verificar backups funcionando
- [ ] Revisar tráfico sospechoso

**Mensuales:**
- [ ] Actualizar dependencias npm
- [ ] Revisar y actualizar reglas de WAF
- [ ] Auditoría de permisos de usuarios
- [ ] Revisar certificados SSL (expiración)

**Trimestrales:**
- [ ] Penetration testing externo
- [ ] Rotación de ENCRYPTION_KEY
- [ ] Actualización de documentación
- [ ] Entrenamiento de equipo en seguridad

---

**Fecha de última revisión:** _______________
**Próxima revisión:** _______________
