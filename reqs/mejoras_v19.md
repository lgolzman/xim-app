# Bugs y Mejoras — v19

## MEJORA-36 — Vista de alumnos: ajustes mobile

### Contexto

En pantallas móviles la lista de alumnos presenta varios problemas de usabilidad: los nombres aparecen cortados, el badge de estado ocupa demasiado espacio, cada tarjeta es muy alta y no hay forma de filtrar cuando la lista crece.

### Cambios requeridos

#### 1. Nombres completos
- Los nombres de alumnos deben mostrarse completos, sin truncar.
- Si el nombre es muy largo, puede hacer wrap a una segunda línea en lugar de cortarse con `...`.

#### 2. Badge de estado más compacto
- Reducir el tamaño del badge (Pendiente / Activo / Inactivo): fuente más chica, padding menor.
- Debe seguir siendo legible y con color, pero ocupar notoriamente menos espacio.

#### 3. Tarjetas más compactas
- Reducir el padding interno de cada tarjeta de alumno para que entren más en pantalla sin scroll.
- Los botones Ver e Inhabilitar/Habilitar deben mantenerse visibles y accionables (touch target mínimo 44px).

#### 4. Campo de búsqueda
- Agregar un input de búsqueda encima de la lista de alumnos (debajo de los botones Invitar alumno / Nuevo alumno).
- Filtra en tiempo real por nombre o email del alumno (case-insensitive, sin llamadas al servidor).
- Placeholder: "Buscar alumno…"
- Si no hay resultados, mostrar un mensaje: "No se encontraron alumnos".
- El campo de búsqueda no persiste entre sesiones (estado local del componente).

### Criterios de aceptación

1. El nombre completo de un alumno es visible sin truncar en cualquier dispositivo móvil estándar (≥ 375px).
2. El badge de estado es visualmente más pequeño que el actual.
3. En una pantalla de 375px de alto se ven al menos 3 alumnos completos sin scroll.
4. El campo de búsqueda filtra correctamente por nombre y por email.
5. El comportamiento en desktop no cambia.

---

## MEJORA-37 — Editor de rutinas: campo de nombre de día en mobile

### Contexto

En el header de cada día del editor de rutinas, el campo de texto "Nombre opcional" se superpone visualmente con el botón "+ Bloque" y el texto "Eliminar día" en pantallas móviles, resultando ilegible.

### Cambios requeridos

- **En desktop**: sin cambios, el layout actual funciona bien.
- **En mobile** (breakpoint `md` de Tailwind como límite): ocultar el input de nombre del día del header.
  - En su lugar, mostrar un ícono de lápiz (✏️ o el ícono que ya use la app) junto al nombre/número del día.
  - Al tocar el ícono, el input aparece debajo del header del día (segunda línea), con foco automático.
  - Al perder el foco (`onBlur`), el input se oculta nuevamente. Si el nombre está vacío, no muestra nada; si tiene valor, puede mostrarse el nombre como texto estático junto al ícono de lápiz.
  - El valor se guarda con el mismo mecanismo existente (onChange sobre formData).

### Criterios de aceptación

1. En mobile, el header del día no tiene superposición de texto ni elementos.
2. Tocar el ícono de lápiz muestra el input con foco automático.
3. Al perder el foco, el input se oculta.
4. Si el día tiene nombre asignado, se ve el nombre (posiblemente truncado) junto al ícono de lápiz.
5. En desktop el comportamiento es idéntico al actual.
