# Bugs y Mejoras — v20

## MEJORA-38 — Reordenar ejercicios dentro de un bloque con flechas ↑↓

### Contexto

Actualmente no existe forma de cambiar el orden de los ejercicios dentro de un bloque una vez agregados. Si se quiere que un ejercicio quede primero, hay que eliminarlo y volver a agregarlo.

### Cambios requeridos

- Agregar botones ↑ y ↓ en cada ejercicio dentro de un bloque, junto al botón × existente.
- ↑ mueve el ejercicio una posición hacia arriba dentro del mismo bloque.
- ↓ mueve el ejercicio una posición hacia abajo dentro del mismo bloque.
- El botón ↑ se deshabilita (o se oculta) cuando el ejercicio ya es el primero del bloque.
- El botón ↓ se deshabilita (o se oculta) cuando el ejercicio ya es el último del bloque.
- Al mover un ejercicio, se arrastran con él todas sus series (prescribed_sets de todas las semanas), notas y configuración.
- El movimiento actualiza el campo `order` (o el equivalente en el estado local) y dispara el autoguardado existente.

### Criterios de aceptación

1. Desde la vista detallada, los botones ↑ y ↓ son visibles y funcionales en cada ejercicio.
2. El primer ejercicio del bloque no puede moverse hacia arriba; el último no puede moverse hacia abajo.
3. Al cambiar de orden, los índices del bloque se recalculan correctamente (A1, A2, A3…).
4. El autoguardado se dispara tras el movimiento.
5. En vista compacta (MEJORA-35), los botones ↑↓ también están presentes.

---

## MEJORA-39 — Copiar ejercicio con series/pesos a otro bloque o día

### Contexto

Es frecuente que un mismo ejercicio se repita en dos días distintos de la rutina con la misma secuencia de series y pesos. Hoy hay que cargarlo manualmente dos veces. Se necesita poder copiar un ejercicio ya configurado y pegarlo en otro bloque o día.

### Flujo de usuario

1. En cualquier ejercicio del editor (vista detallada o compacta) aparece un botón de copiar (ícono de copia o "Copiar a…").
2. Al tocarlo, se abre un modal o dropdown que muestra la estructura de la rutina: lista de días con sus bloques.
3. El usuario selecciona el bloque destino.
4. El ejercicio se inserta al final del bloque destino con todas sus series (de todas las semanas), pesos y notas copiados.
5. Se confirma con un mensaje breve tipo toast: "Ejercicio copiado al Bloque B — Día 2".

### Detalles

- El ejercicio copiado es independiente del original: modificar uno no afecta al otro.
- Se puede copiar a un bloque del mismo día o de otro día.
- No se puede copiar al mismo bloque donde ya está (o si se permite, se inserta como duplicado al final — definir durante implementación).
- El modal/dropdown debe ser usable en mobile.

### Criterios de aceptación

1. El botón de copiar es visible en cada ejercicio en vista detallada.
2. El selector de destino muestra todos los días y bloques de la rutina actual.
3. El ejercicio copiado aparece en el bloque destino con series, pesos y notas idénticos al original.
4. Se muestra confirmación visible al usuario tras la copia.
5. El autoguardado se dispara tras la operación.

---

## MEJORA-40 — Botón "Ver rutina completa" siempre visible durante la edición

### Contexto

El botón "Ver rutina completa" existe en el editor pero no siempre es fácil de encontrar mientras se está scrolleando y editando. Ximena necesita poder consultar la vista global en cualquier momento sin tener que volver al inicio de la página.

### Cambios requeridos

- El botón "Ver rutina completa" debe quedar fijo (sticky) en la pantalla mientras se edita, visible sin importar el scroll.
- Posición sugerida: esquina inferior derecha de la pantalla, como un botón flotante (FAB — Floating Action Button), tanto en mobile como en desktop.
- El botón abre la vista completa de la rutina con el mismo comportamiento actual (nueva página o modal).
- No debe tapar contenido editable importante; si en algún momento interfiere con un input o botón, se puede considerar ocultarlo temporalmente al hacer foco en un campo (mejora futura si es necesario).

### Criterios de aceptación

1. El botón es visible en cualquier punto del scroll del editor.
2. En mobile no tapa el contenido de forma que impida editar.
3. El comportamiento al hacer clic es idéntico al botón actual.

---

## Backlog futuro — Reorganización visual con drag & drop

### Descripción

Vista de reorganización tipo tablero que permite mover bloques y ejercicios libremente. A implementar en un ciclo posterior cuando las mejoras del Nivel 1 estén estables.

### Funcionalidades previstas

- Drag & drop de ejercicios dentro de un bloque (reordena).
- Drag & drop de ejercicios entre bloques del mismo día o de días distintos.
- Drag & drop de bloques enteros dentro de un día.
- Vista ultracompacta de toda la rutina (días → bloques → ejercicios en una sola pantalla) desde la cual se realiza la reorganización.
- Librería sugerida: `dnd-kit` (compatible con React 19, accesible, soporta listas anidadas).

### Motivación

Ximena revisa la rutina completa una vez armada y detecta desequilibrios musculares o ejercicios mal ubicados. La vista de reorganización le permitiría corregir la estructura sin tener que eliminar y recargar ejercicios manualmente.
