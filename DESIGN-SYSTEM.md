# Sistema de Diseño - JEAN PAUL Servicios Financieros

## Identidad Visual

JEAN PAUL Servicios Financieros es un sistema profesional de gestión de préstamos con foco en confianza, estabilidad financiera y claridad operativa.

---

## Paleta de Colores

### Colores Principales

#### Primary - Azul Marino Oscuro
- **Hex**: `#303854`
- **HSL**: `221° 26% 22%`
- **Uso**: Botones principales, navegación activa, títulos importantes, logos
- **Contraste**: Excelente legibilidad sobre fondos claros

#### Background - Beige Claro Cálido
- **Hex**: `#F6F3EA`
- **HSL**: `44° 35% 95%`
- **Uso**: Fondo principal de la aplicación
- **Característica**: Tonalidad cálida que reduce fatiga visual

#### Secondary - Azul Grisáceo Suave
- **Hex**: `#C2CDD5`
- **HSL**: `206° 23% 80%`
- **Uso**: Elementos secundarios, bordes sutiles, estados hover

### Colores Semánticos

#### Success - Verde
- **HSL**: `142° 71% 45%`
- **Uso**: Pagos completados, operaciones exitosas, KPIs positivos

#### Warning - Amarillo/Naranja
- **HSL**: `38° 92% 50%`
- **Uso**: Advertencias, solicitudes pendientes, alertas moderadas

#### Danger - Rojo
- **HSL**: `0° 84% 60%`
- **Uso**: Préstamos vencidos, errores críticos, acciones destructivas

---

## Tipografía

### Familia de Fuentes
- **Principal**: System UI fonts (San Francisco, Segoe UI, etc.)
- **Características**: `font-feature-settings: "rlig" 1, "calt" 1;`

### Jerarquía de Tamaños

```css
/* Títulos */
h1: text-3xl (30px) font-bold tracking-tight
h2: text-2xl (24px) font-semibold
h3: text-xl (20px) font-semibold
h4: text-lg (18px) font-medium

/* Texto */
Body: text-sm (14px) - Uso general
Small: text-xs (12px) - Metadatos, descripciones
```

### Pesos
- **Bold (700)**: Títulos principales, valores importantes
- **Semibold (600)**: Subtítulos, labels destacados
- **Medium (500)**: Navegación, botones
- **Regular (400)**: Texto general

---

## Componentes

### Botones

#### Primary Button
```tsx
<Button>
  Acción Principal
</Button>
```
- Fondo: `#303854` (primary)
- Texto: `#F6F3EA` (primary-foreground)
- Hover: Ligeramente más oscuro con shadow
- Estados: disabled, loading

#### Secondary Button
```tsx
<Button variant="outline">
  Acción Secundaria
</Button>
```
- Border: `#C2CDD5`
- Hover: `bg-primary/5`

#### Destructive Button
```tsx
<Button variant="destructive">
  Eliminar
</Button>
```
- Uso: Acciones irreversibles

### Cards

#### Card Estándar
```tsx
<Card className="shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="border-b bg-muted/20">
    <CardTitle className="text-primary">Título</CardTitle>
  </CardHeader>
  <CardContent className="pt-6">
    Contenido
  </CardContent>
</Card>
```

Características:
- Fondo blanco (`bg-card`)
- Border sutil
- Shadow en hover para feedback
- Header con fondo `muted/20`

#### Stat Card (KPIs)
```tsx
<StatCard
  title="Métrica"
  value={valor}
  description="Descripción"
  icon={Icon}
  variant="primary"
/>
```

Variantes:
- `primary`: Azul marino con énfasis
- `success`: Verde para métricas positivas
- `warning`: Amarillo para alertas
- `danger`: Rojo para problemas críticos

### Inputs

```tsx
<Input
  className="bg-muted/30 border-muted focus-visible:bg-background"
/>
```

Características:
- Fondo suave `muted/30` en estado normal
- Transición a blanco en focus
- Height: `h-11` (44px) para mejor accesibilidad móvil

---

## Navegación

### Sidebar

#### Item Activo
- Background: `bg-primary`
- Text: `text-primary-foreground`
- Shadow: `shadow-sm`

#### Item Normal
- Text: `text-muted-foreground`
- Hover: `bg-primary/5`, `text-primary`

#### Transiciones
```css
transition-all duration-200
```

### Breadcrumbs
- Border bottom sutil
- Último elemento en `text-primary` y `font-semibold`
- Separadores: `ChevronRight` en `text-muted-foreground/50`

---

## Espaciado

### Escala de Spacing
```
2: 8px   - Espaciado interno mínimo
3: 12px  - Gaps pequeños
4: 16px  - Spacing estándar (gaps, padding)
6: 24px  - Secciones, grupos
8: 32px  - Separación de bloques
12: 48px - Márgenes grandes
```

### Contenedores
- Padding lateral: `px-6` (24px)
- Padding vertical: `py-6` (24px)
- Max width para contenido: `max-w-7xl`

---

## Efectos y Animaciones

### Shadows
```css
/* Default card */
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)

/* Hover */
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)

/* Elevated components */
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
```

### Transiciones
```css
/* Estándar */
transition-colors

/* Completa */
transition-all duration-200

/* Shadows */
transition-shadow
```

### Hover States
- Cards: `hover:shadow-md`
- Buttons: `hover:shadow-lg`
- Links: `hover:text-primary`
- Backgrounds: `hover:bg-primary/5`

---

## Scrollbar Personalizado

```css
::-webkit-scrollbar {
  width: 10px;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--primary) / 0.2);
  border: 2px solid hsl(var(--background));
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.4);
}
```

---

## Layout

### Dashboard Layout
```
┌─────────────┬─────────────────────────┐
│             │   Header (h-16)         │
│   Sidebar   ├─────────────────────────┤
│   (w-64)    │   Main Content          │
│             │   (bg-muted/20)         │
│             │                         │
└─────────────┴─────────────────────────┘
```

### Grid de KPIs
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* 1 col mobile, 2 tablet, 4 desktop */}
</div>
```

---

## Accesibilidad

### Contraste
- Texto normal sobre fondo: Mínimo 4.5:1 ✓
- Texto grande sobre fondo: Mínimo 3:1 ✓
- Primary (#303854) sobre Background (#F6F3EA): 11.2:1 ✓✓

### Focus States
- Ring color: `ring-primary`
- Visible focus indicators en todos los elementos interactivos
- Skip to content link para navegación por teclado

### ARIA
- Labels descriptivos en iconos
- `aria-hidden="true"` en iconos decorativos
- `aria-current="page"` en navegación activa
- `role="alert"` en mensajes de error

---

## Responsive

### Breakpoints
```css
sm: 640px   /* Tablet pequeño */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Desktop grande */
2xl: 1536px /* Ultra wide */
```

### Patrones Comunes
```tsx
/* Stack en mobile, grid en desktop */
className="flex flex-col md:flex-row"

/* 1 columna mobile, 2 tablet, 3 desktop */
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

/* Hide en mobile, show en desktop */
className="hidden lg:block"
```

---

## Iconografía

### Librería
**Lucide React** - Iconos minimalistas y profesionales

### Tamaños
```tsx
h-4 w-4  /* 16px - Pequeños (badges, breadcrumbs) */
h-5 w-5  /* 20px - Estándar (navegación, botones) */
h-8 w-8  /* 32px - Medianos (headers) */
h-10 w-10 /* 40px - Grandes (login, avatares) */
```

### Uso
- Siempre con `aria-hidden="true"` si son decorativos
- Color heredado del texto (`currentColor`)

---

## Estados de Carga

### Skeleton Loaders
```tsx
<TableSkeleton rows={5} />
<KPICardSkeleton />
<FormSkeleton fields={4} />
```

### Empty States
```tsx
<EmptyState
  icon={Icon}
  title="No hay datos"
  description="Descripción clara"
  actionLabel="Acción"
  actionHref="/ruta"
/>
```

---

## Badges

### Status Badge
Colores semánticos automáticos:
- `ACTIVE`: Verde
- `PENDING`: Amarillo
- `OVERDUE`: Rojo
- `PAID`: Gris

### Badge Contador
```tsx
<span className="bg-destructive text-white rounded-full px-1.5 text-xs font-semibold">
  5
</span>
```

---

## Mejores Prácticas

### ✅ Hacer
- Usar `StatCard` para KPIs
- Aplicar `hover:shadow-md` en cards interactivas
- Mantener padding consistente (`p-6`)
- Usar transiciones suaves (`transition-all duration-200`)
- Header de cards con `border-b bg-muted/20`

### ❌ Evitar
- Usar colores arbitrarios fuera de la paleta
- Botones sin estados hover/focus
- Cards sin feedback visual
- Textos sin suficiente contraste
- Animaciones bruscas

---

## Ejemplo Completo: Card de Actividad

```tsx
<Card className="shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="border-b bg-muted/20">
    <CardTitle className="text-primary">Actividades Recientes</CardTitle>
    <CardDescription>Últimas 5 actividades</CardDescription>
  </CardHeader>
  <CardContent className="pt-6">
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-lg transition-colors"
        >
          <div className="rounded-full bg-primary p-2 shadow-sm">
            <Icon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.date}</p>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## Recursos

- **Figma**: [Pendiente]
- **Iconos**: https://lucide.dev
- **Paleta**: https://uicolors.app (para variantes)
- **Accesibilidad**: https://www.a11yproject.com

---

**Última actualización**: 8 de Marzo, 2026
**Versión**: 1.0.0
**Mantenido por**: Equipo JEAN PAUL Servicios Financieros
