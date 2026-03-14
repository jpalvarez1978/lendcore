# Guía de Accesibilidad - LendCore

## Estándar Objetivo: WCAG 2.1 AA

Este documento registra las mejoras de accesibilidad implementadas y las pautas a seguir para nuevos componentes.

---

## ✅ Mejoras Implementadas

### 1. Navegación por Teclado

#### Skip to Content
- **Componente**: `SkipToContent.tsx`
- **Ubicación**: Se incluye en el layout principal
- **Función**: Permite a usuarios de teclado saltar directamente al contenido principal sin navegar por todo el menú
- **Implementación**:
  ```tsx
  <SkipToContent /> // Al inicio del layout
  <main id="main-content"> // Destino del skip link
  ```

#### Navegación con Foco Visible
- Todos los elementos interactivos tienen indicadores de foco claros
- Atributo `aria-current="page"` en enlaces de navegación activos
- Orden de tabulación lógico en formularios

### 2. Landmarks y Semántica HTML

#### Header (Header.tsx)
- Elemento `<header role="banner">`
- Búsqueda global con `role="search"`
- Botones con `aria-label` descriptivos:
  - "Notificaciones: 5 sin leer"
  - "Cerrar sesión"
- Iconos decorativos con `aria-hidden="true"`

#### Sidebar (Sidebar.tsx)
- Elemento `<aside aria-label="Navegación principal">`
- Navegación con `<nav aria-label="Menú de navegación">`
- Elementos expandibles con:
  - `aria-expanded` para estado abierto/cerrado
  - `aria-controls` apuntando al submenu
  - `role="group"` para submenus
- Badges con texto oculto para lectores de pantalla:
  ```tsx
  <span aria-hidden="true">5</span>
  <span className="sr-only">5 pendientes</span>
  ```

#### Main Content
- Elemento `<main id="main-content">` en layout
- Breadcrumbs con navegación contextual

### 3. Formularios Accesibles

#### Patrón de Campo de Formulario
Todos los campos de formulario siguen este patrón:

```tsx
<div>
  <label htmlFor="fieldId" className="text-sm font-medium">
    Nombre del Campo *
  </label>
  <Input
    id="fieldId"
    {...register('fieldName')}
    aria-invalid={!!errors.fieldName}
    aria-describedby={errors.fieldName ? 'fieldId-error' : undefined}
  />
  {errors.fieldName && (
    <p id="fieldId-error" className="text-sm text-red-500 mt-1" role="alert">
      {errors.fieldName.message}
    </p>
  )}
</div>
```

**Elementos clave:**
- `htmlFor` conecta label con input
- `id` único en cada campo
- `aria-invalid` cuando hay error
- `aria-describedby` apunta al mensaje de error
- `role="alert"` en mensajes de error para anunciarlos

#### Botones de Selección (Toggle Buttons)
```tsx
<button
  type="button"
  aria-pressed={isSelected}
  aria-label="Descripción clara"
>
  <Icon aria-hidden="true" />
  Texto
</button>
```

#### Select / Dropdown
```tsx
<select
  id="selectId"
  aria-label="Descripción de qué se selecciona"
>
  <option value="...">...</option>
</select>
```

### 4. Mensajes y Notificaciones

#### Errores Globales de Formulario
```tsx
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

#### Errores de Campo
```tsx
<p id="field-error" role="alert">
  {errorMessage}
</p>
```

### 5. Componentes Interactivos

#### ConfirmDialog
- Modal con trap de foco
- Escape para cerrar
- Título con `AlertDialogTitle`
- Descripción con `AlertDialogDescription`
- Botones claramente etiquetados

#### EmptyState
- Iconos con `aria-hidden="true"`
- Texto descriptivo para usuarios de lectores de pantalla
- Botones de acción con labels claros

---

## 📋 Checklist para Nuevos Componentes

### Todo componente debe:
- [ ] Usar elementos HTML semánticos (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] Tener labels asociados a inputs (`htmlFor` + `id`)
- [ ] Incluir `aria-label` en iconos que son botones
- [ ] Marcar iconos decorativos con `aria-hidden="true"`
- [ ] Usar `aria-invalid` y `aria-describedby` en campos con error
- [ ] Incluir `role="alert"` en mensajes de error
- [ ] Mantener orden de tabulación lógico
- [ ] Tener contraste de color mínimo 4.5:1 (texto normal)
- [ ] Funcionar completamente con teclado
- [ ] Incluir indicadores de foco visibles

### Formularios:
- [ ] Cada input tiene un `<label>` con `htmlFor`
- [ ] Campos requeridos marcados visualmente y con `*`
- [ ] Errores vinculados con `aria-describedby`
- [ ] Grupos de campos relacionados en `<fieldset>` con `<legend>`
- [ ] Select/dropdown con `aria-label` descriptivo

### Navegación:
- [ ] Links activos con `aria-current="page"`
- [ ] Menus expandibles con `aria-expanded` y `aria-controls`
- [ ] Skip links al inicio de la página

### Contenido Dinámico:
- [ ] Notificaciones con `role="alert"` o `aria-live`
- [ ] Loading states anunciados a lectores de pantalla
- [ ] Cambios de estado comunicados (ej: "Item añadido")

---

## 🎨 Clases de Utilidad Accesibles

### Screen Reader Only
Para texto solo visible para lectores de pantalla:
```tsx
<span className="sr-only">Texto para lectores de pantalla</span>
```

Implementación en Tailwind (ya incluido):
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 🔍 Testing de Accesibilidad

### Herramientas Recomendadas
1. **axe DevTools** (Chrome/Firefox extension)
2. **WAVE** (Web Accessibility Evaluation Tool)
3. **Lighthouse** (integrado en Chrome DevTools)
4. **NVDA** (lector de pantalla gratuito para Windows)
5. **VoiceOver** (macOS/iOS)

### Tests Manuales
1. **Navegación por teclado**: Tab, Shift+Tab, Enter, Escape, flechas
2. **Zoom**: Probar al 200% de zoom
3. **Lector de pantalla**: Navegar con NVDA o VoiceOver
4. **Contraste de color**: Verificar con herramientas de contraste

---

## 🚀 Próximas Mejoras

- [ ] Añadir live regions para notificaciones dinámicas
- [ ] Implementar focus trap en modales
- [ ] Añadir instrucciones de teclado en componentes complejos
- [ ] Documentar atajos de teclado personalizados
- [ ] Añadir modo de alto contraste
- [ ] Implementar preferencias de movimiento reducido (prefers-reduced-motion)

---

## 📚 Referencias

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
