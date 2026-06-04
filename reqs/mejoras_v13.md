# Mejoras — XIM App v13

## MEJORA-27: Colores de fondo por bloque en toda la aplicación

### Contexto
Ximena necesita identificar visualmente los bloques de ejercicios de un golpe de vista, igual que lo hace hoy con colores en su planilla Excel. Los colores son fijos por letra de bloque y se aplican en toda la app de forma consistente.

### Colores por bloque

Definir los colores en un único archivo de configuración `src/lib/blockColors.ts` para que sean fáciles de cambiar:

```typescript
// src/lib/blockColors.ts
// Colores de fondo por bloque — modificar aquí para cambiar en toda la app

export const BLOCK_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  A: { bg: 'bg-pink-100',   border: 'border-pink-300',   label: 'Rosa' },
  B: { bg: 'bg-sky-100',    border: 'border-sky-300',    label: 'Celeste' },
  C: { bg: 'bg-orange-100', border: 'border-orange-300', label: 'Naranja' },
  D: { bg: 'bg-green-100',  border: 'border-green-300',  label: 'Verde' },
  E: { bg: 'bg-yellow-100', border: 'border-yellow-300', label: 'Amarillo' },
  F: { bg: 'bg-purple-100', border: 'border-purple-300', label: 'Violeta' },
  G: { bg: 'bg-teal-100',   border: 'border-teal-300',   label: 'Teal' },
  H: { bg: 'bg-rose-100',   border: 'border-rose-300',   label: 'Rosa oscuro' },
}

// Color por defecto si la letra no está en el mapa
export const DEFAULT_BLOCK_COLOR = { bg: 'bg-gray-100', border: 'border-gray-300', label: 'Gris' }

export function getBlockColor(blockLetter: string) {
  return BLOCK_COLORS[blockLetter.toUpperCase()] ?? DEFAULT_BLOCK_COLOR
}
```

### Dónde aplicar los colores

El color de fondo se aplica al **contenedor del bloque completo** — incluyendo el header del bloque y todos los ejercicios que contiene. Usar un tono suave (100) para el fondo y el borde del color correspondiente para el contorno.

Aplicar en **todos** los siguientes componentes:

1. **`RoutineForm.tsx`** — formulario de creación/edición de rutina (admin)
   - Cada tarjeta de bloque (Bloque A, Bloque B, etc.) con su color de fondo

2. **`WorkoutExecution.tsx`** — vista de registro del entrenamiento (alumno)
   - Cada sección de bloque con su color de fondo

3. **Vista de rutina completa** (solo lectura) — tabla de rutina completa
   - Las filas de header de bloque (donde dice "Bloque A", "Bloque B") con el color correspondiente
   - Las filas de ejercicios del bloque con una versión más clara del mismo color o el mismo tono

4. **`WorkoutDetail.tsx`** — detalle de entrenamiento pasado (historial)
   - Mismo criterio que la vista de ejecución

5. **Vista de progreso del admin** — cuando Ximena ve el entrenamiento de un alumno
   - Mismo criterio

### Implementación

- Crear `src/lib/blockColors.ts` con el mapa de colores.
- Crear un componente helper `BlockContainer` o simplemente una función `getBlockColor(blockLetter)` que devuelva las clases de Tailwind correspondientes.
- En cada componente donde se renderiza un bloque, importar `getBlockColor` y aplicar las clases al contenedor del bloque.
- **No hardcodear colores en cada componente** — siempre usar `getBlockColor` para que un cambio en `blockColors.ts` se propague a toda la app.

### Nota sobre Tailwind

Tailwind purga clases no usadas en el build. Para que los colores dinámicos funcionen correctamente, agregar las clases de color usadas en el array `safelist` de `tailwind.config.ts`:

```typescript
safelist: [
  'bg-pink-100', 'border-pink-300',
  'bg-sky-100', 'border-sky-300',
  'bg-orange-100', 'border-orange-300',
  'bg-green-100', 'border-green-300',
  'bg-yellow-100', 'border-yellow-300',
  'bg-purple-100', 'border-purple-300',
  'bg-teal-100', 'border-teal-300',
  'bg-rose-100', 'border-rose-300',
  'bg-gray-100', 'border-gray-300',
]
```
