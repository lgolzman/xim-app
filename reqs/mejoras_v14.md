# Mejoras — XIM App v14

## MEJORA-28: Selector de día al registrar entrenamiento como admin

### Contexto
Cuando Ximena registra un entrenamiento en nombre de un alumno desde `/admin/students/:studentId/register-workout`, el sistema lleva directamente al día sugerido sin posibilidad de elegir otro. El alumno sí tiene esa opción en su vista. Esta mejora iguala el comportamiento.

### Qué hacer

En la pantalla de registro de entrenamiento del admin, antes de entrar a la vista de ejecución del día, mostrar el mismo selector de día que ya existe en la vista del alumno (`StudentHome`):

- Mostrar el día sugerido como opción por defecto (igual que ahora).
- Agregar un selector o lista de botones con todos los días de la rutina (Día 1, Día 2, Día 3...) para que Ximena pueda elegir uno distinto si lo necesita.
- El selector no incluye elección de semana — siempre se registra en la semana actual calculada por `useNextWorkout`.

### Regla de negocio crítica

Cuando se registra un día distinto al sugerido, ese entrenamiento queda guardado en el historial **pero no altera la secuencia de días sugeridos**. El próximo entrenamiento sugerido sigue siendo el que correspondía antes de este registro "fuera de orden".

**Ejemplo:**
- Semana 2, el alumno entrenó Día 1 y Día 2. Le toca el Día 3.
- Ximena registra el Día 1 nuevamente (repetición).
- La próxima vez que se entre a registrar, el sistema sigue sugiriendo el Día 3.

**Implementación de la regla:**
`useNextWorkout` calcula el día sugerido basándose en el último log con `is_suggested_day = true` (o equivalente). Los registros "fuera de orden" se guardan con un flag `is_extra = true` (o similar) en `workout_logs` y no se tienen en cuenta para calcular la progresión.

Alternativa más simple: `useNextWorkout` ignora logs donde `routine_day_id` no coincide con el día esperado en la secuencia. Evaluar cuál es más limpio de implementar y proponer antes de codear.

**Nota para Codex:** Esta regla también aplica para el alumno, que ya tiene selector de día en su vista. Verificar que el comportamiento sea consistente en ambos casos — si el alumno elige un día fuera de orden, tampoco debe alterar la secuencia sugerida.

---

## MEJORA-29: Botón "Nuevo bloque" al final de cada día en el formulario de rutina

### Contexto
En `RoutineForm.tsx`, el botón "+ Bloque" está en el header del día (arriba). Cuando un día tiene varios bloques (D, E...), hay que scrollear hasta arriba para agregar uno nuevo, lo que es incómodo.

### Qué hacer

Agregar un segundo botón "+ Agregar bloque" al **final** de la lista de bloques de cada día, después del último bloque existente y antes del botón "+ Agregar día".

- El botón del header del día se puede mantener o quitar — si se mantiene, ambos hacen lo mismo.
- El botón al final debe ser visualmente consistente con el estilo actual del formulario.
- Es un cambio simple de UI, sin lógica nueva.
