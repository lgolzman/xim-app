# Mejoras — XIM App v7

## MEJORA-16: Reorganización del menú de administración

**Contexto:** Actualmente la navegación del admin tiene un único ítem "Administración" que contiene tabs de Alumnos, Patrones de Movimiento, Músculos e Invitaciones. Se quiere separar en dos secciones distintas.

**Nueva estructura de navegación del admin:**

- **Alumnos** — sección operativa del día a día
  - Tab: Alumnos (listado actual con habilitar/inhabilitar, acceso al detalle)
  - Tab: Reportes (nuevo — ver MEJORA-17)

- **Administración** — configuración y datos maestros
  - Tab: Patrones de Movimiento
  - Tab: Músculos
  - Tab: Invitaciones

**Qué hacer:**
1. Agregar "Alumnos" como ítem de navegación principal en el header del admin, junto a "Administración".
2. Mover el tab de Alumnos fuera de Administración y llevarlo a la nueva sección Alumnos.
3. Agregar el tab Reportes en la sección Alumnos (contenido en MEJORA-17).
4. En Administración dejan de estar Alumnos — solo quedan Patrones de Movimiento, Músculos e Invitaciones.

---

## MEJORA-17: Reporte de actividad de alumnos

**Dónde:** Nueva sección Alumnos → tab Reportes.

**Qué muestra:** Un único reporte que combina actividad reciente y filtro por comentarios.

### Filtros (en la parte superior del reporte)

- **Período:** selector de rango — últimos 7 días / últimos 14 días / últimos 30 días / últimos 60 días. Default: últimos 30 días.
- **Filtro:** checkbox o toggle "Solo entrenamientos con comentarios". Cuando está activo, muestra únicamente entrenamientos donde el alumno escribió alguna nota (nota general del día o nota por ejercicio).

### Contenido del reporte

Una tabla con todos los alumnos activos y su actividad en el período seleccionado:

| Alumno | Sesiones | Último entrenamiento | Con comentarios |
|--------|----------|----------------------|-----------------|
| Lucía  | 8        | hace 1 día           | 3               |
| Martín | 2        | hace 9 días          | 0               |
| Ana    | 0        | —                    | —               |

- Ordenado por último entrenamiento (más reciente primero). Alumnos sin actividad al final.
- Alumnos con 0 sesiones en el período se muestran igual, destacados visualmente (fila en gris o badge "Sin actividad").
- La columna "Con comentarios" muestra cuántos entrenamientos del período tienen notas.

### Detalle por alumno

Al hacer clic en una fila de la tabla, expandir o mostrar un panel con el listado de entrenamientos del alumno en el período:

- Fecha real
- Día de rutina y semana
- Ícono o indicador si tiene comentarios
- Al hacer clic en un entrenamiento, navegar al detalle completo (pantalla ya existente en `/admin/students/:id`)

### Cuando el filtro "Solo con comentarios" está activo

- La tabla muestra solo alumnos que tienen al menos un entrenamiento con comentarios en el período.
- Las filas de detalle muestran solo los entrenamientos con comentarios.

### Implementación

Todos los datos necesarios existen en las tablas actuales:
- `workout_logs` — sesiones, fechas, notas generales
- `workout_exercise_notes` — notas por ejercicio
- `profiles` — nombre y estado del alumno

No se requieren tablas ni migraciones nuevas. Son queries con filtros de fecha y JOIN entre estas tablas.
