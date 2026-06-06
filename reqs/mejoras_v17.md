# Mejoras — XIM App v17

## MEJORA-33: Persistencia del registro de entrenamiento ante recargas de página

### Contexto
Cuando el alumno (o Ximena registrando en nombre del alumno) está completando un entrenamiento con varios bloques y el navegador se recarga por cualquier motivo, se pierden todos los valores ingresados en los campos de reps y peso. Hay que preservar esos datos durante la sesión.

### Solución: localStorage por sesión de entrenamiento

Al ingresar cualquier valor en los campos de registro (reps, kg, notas por ejercicio, nota general del entrenamiento), guardar el estado en `localStorage` con una clave específica para esa sesión:

```
key: "workout_draft_{studentId}_{routineDayId}_{weekNumber}"
value: JSON con todos los valores ingresados hasta el momento
```

**Al cargar `WorkoutExecution`:**
- Verificar si existe un draft en `localStorage` para esa combinación de alumno + día + semana.
- Si existe, pre-cargar los campos con esos valores.
- Mostrar un aviso discreto: "Recuperamos tu progreso de una sesión anterior."

**Al completar o cancelar el entrenamiento:**
- Limpiar el draft de `localStorage` para esa clave.

**Scope:** Solo dentro de la sesión actual del navegador — si el usuario cierra el tab y lo vuelve a abrir, el draft se recupera igual porque `localStorage` persiste entre sesiones del mismo origen. Si quiere descartar el draft, el botón "Cancelar" lo limpia.

**Datos a guardar en el draft:**
```typescript
{
  loggedSets: { [blockExerciseId]: { [setNumber]: { reps?, weight?, seconds? } } },
  exerciseNotes: { [blockExerciseId]: string },
  generalNote: string,
  savedAt: ISO string  // para mostrar "Recuperado de hace X minutos"
}
```

---

## MEJORA-34: Autoguardado en borrador al armar una rutina

### Contexto
Al crear o editar una rutina, si el navegador se recarga o Ximena cierra la app sin guardar manualmente, se pierden todos los cambios. Se implementa un autoguardado automático en background que guarda el borrador en Supabase sin interrumpir el trabajo.

### Solución: debounced background save

**Mecánica:**
- Cada vez que Ximena hace un cambio en el formulario, se inicia un timer de **3 segundos**.
- Si hace otro cambio antes de que pasen los 3 segundos, el timer se reinicia (debounce).
- Al cumplirse los 3 segundos sin cambios, se dispara el guardado en background.
- El guardado es completamente asíncrono — no bloquea la UI ni muestra spinners.

**Indicador de estado** (texto pequeño y discreto, arriba del formulario o en el header):
- `● Guardando borrador...` (mientras guarda)
- `✓ Borrador guardado hace X segundos` (después de guardar)
- `⚠ Error al guardar borrador` (si falla, sin interrumpir el trabajo)

**Al crear una rutina nueva:**
- El primer autoguardado crea la rutina en estado `draft` en Supabase.
- Los autoguardados siguientes hacen UPDATE sobre esa rutina.
- Si Ximena presiona "Guardar como borrador" manualmente, hace lo mismo pero de forma inmediata (sin esperar el debounce).
- Si Ximena presiona "Guardar y activar", guarda y cambia el estado a `active`.

**Al editar una rutina existente:**
- El autoguardado hace UPDATE directo sobre la rutina existente.
- El comportamiento es el mismo que el guardado manual actual, pero en background y sin bloquear.

**Al entrar al formulario de nueva rutina:**
- Siempre empieza desde cero — no recupera borradores de sesiones anteriores.
- Si hay una rutina en estado `draft` para ese alumno, mostrar un aviso: "Tenés un borrador sin terminar para este alumno. ¿Querés continuarlo o empezar desde cero?" Solo si el alumno ya está seleccionado.

**Implementación:**
- Usar `useRef` para el timer del debounce en `RoutineForm.tsx`.
- La función de guardado debe ser la misma que usa el botón "Guardar como borrador" — no duplicar lógica.
- El autoguardado no debe dispararse si el formulario no tiene datos mínimos válidos (alumno seleccionado + nombre de rutina + al menos un ejercicio).
- Agregar un flag `isAutoSaving` en el estado del componente para mostrar el indicador sin bloquear los inputs.
