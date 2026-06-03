# Mejoras de usabilidad — XIM App v5

## MEJORA-11: Notas por ejercicio durante el entrenamiento

**Dónde:** `WorkoutExecution.tsx` — tarjeta de cada ejercicio.

**Qué hacer:** Agregar la posibilidad de que el alumno escriba una nota por ejercicio, sin cargar la interfaz cuando no se usa.

- Al lado del nombre de cada ejercicio, agregar un ícono de comentario (💬 o similar) pequeño y discreto.
- Al tocarlo, aparece un campo de texto justo debajo del nombre del ejercicio.
- Si el alumno ya escribió algo en ese campo, el ícono cambia de apariencia (color distinto o con un punto indicador) para señalar que hay una nota cargada.
- Si el alumno no toca el ícono, la interfaz queda exactamente igual que ahora — sin campos de texto extra visibles.
- Las notas por ejercicio se guardan junto con el registro del entrenamiento en `logged_sets` o en un campo nuevo asociado al ejercicio dentro del `workout_log`.

**Modelo de datos:** Evaluar si alcanza con agregar un campo `exercise_note TEXT` a `logged_sets` (una nota por serie no tiene sentido, así que puede ir en una tabla separada `workout_exercise_notes` con `workout_log_id` + `block_exercise_id` + `note`), o simplemente agregar el campo a nivel de `block_exercise_id` dentro del log. Crear la migración correspondiente (`004_exercise_notes.sql`).

---

## MEJORA-12: Info del ejercicio en modal, sin abrir nueva pestaña

**Dónde:** `WorkoutExecution.tsx` — cuando el alumno toca el nombre de un ejercicio.

**Situación actual:** Al tocar el nombre del ejercicio se abre una nueva pestaña del navegador con la biblioteca de ejercicios y el modal del ejercicio. Esto saca al alumno del contexto de su entrenamiento.

**Qué hacer:** En lugar de navegar a una nueva pestaña, mostrar la información del ejercicio en un modal directamente sobre la pantalla de ejecución del entrenamiento.

- El modal debe mostrar la misma información que ya muestra la biblioteca: nombre, patrón de movimiento, dirección, tipo de cadena, músculos principales, músculos sinergistas, tips de ejecución y videos de referencia.
- El modal se cierra con un botón "Cerrar" o tocando fuera, y el alumno vuelve exactamente al punto donde estaba en el entrenamiento.
- Reutilizar el componente de detalle de ejercicio que ya existe en la biblioteca, adaptado para usarse dentro de un Modal.
- Eliminar el comportamiento actual de abrir nueva pestaña (`target="_blank"`) para los nombres de ejercicios en `WorkoutExecution.tsx`.

---

## MEJORA-13: Formato de series en la vista de rutina completa

**Dónde:** Componente de vista de rutina completa (solo lectura) — columnas de semanas.

**Situación actual:** Cuando un ejercicio tiene series con distintas reps o pesos, se muestran todas en una sola línea separadas por puntos: `6 / 85kg · 4 / 90kg · 6 / 85kg`. Esto es difícil de leer.

**Qué hacer:** Aplicar formato adaptativo según si las series son uniformes o varían:

- **Series uniformes** (mismas reps y mismo peso en todas): formato compacto `3×8 / 85kg`. Ejemplo: si las 3 series son 8 reps a 85kg → `3×8 / 85kg`.
- **Series que varían** (distintas reps y/o distintos pesos): mostrar una por línea. Ejemplo:
  ```
  6 / 85kg
  4 / 90kg
  6 / 85kg
  ```
- Si el ejercicio no tiene peso, el formato compacto es `3×8` y el variado es solo `6`, `4`, `6` por línea.
- Este criterio aplica a todas las columnas de semanas en la tabla.

---

## MEJORA-14: Mostrar registro anterior como referencia durante el entrenamiento

**Dónde:** `WorkoutExecution.tsx` — vista de ejecución del día.

**Contexto:** Cuando el alumno va a entrenar el Día 1 de la Semana 2, le conviene ver qué registró la última vez que hizo el Día 1 (Semana 1), para comparar con lo que tiene planificado hoy. Por ejemplo: si la semana pasada tenía 3×50kg pero solo llegó a 45kg, y esta semana tiene 3×55kg, sabe de entrada que probablemente tampoco llegue al objetivo.

**Qué hacer:** Para cada serie, mostrar encima de los campos de registro lo que el alumno registró la última vez que entrenó ese mismo día de rutina. El dato anterior debe ser visualmente secundario — texto pequeño, color gris — para no competir con los campos de registro de hoy.

Formato sugerido por serie:
```
anterior: 8 reps / 45kg   ← pequeño, gris, solo lectura
[ reps ]  [ kg ]          ← campos de registro de hoy
```

**Reglas:**
- Si es la primera vez que el alumno entrena ese día (no hay registro anterior), no mostrar nada — la interfaz queda exactamente igual que hoy. Sin placeholder, sin mensaje, sin espacio vacío reservado.
- Si hay registro anterior pero el alumno no registró nada en esa serie (dejó los campos vacíos), no mostrar referencia para esa serie.
- Si el ejercicio anterior tenía distinta cantidad de series que el de hoy, mostrar referencia solo para las series que coincidan en número (serie 1 con serie 1, serie 2 con serie 2, etc.).

**Datos disponibles:** `useNextWorkout` ya trae `lastLogForSuggestedDay` con el registro anterior del mismo día. Usar ese dato para cruzar por `block_exercise_id` y `set_number` y obtener `actual_reps`, `actual_weight_kg` y `actual_seconds` del registro anterior.
