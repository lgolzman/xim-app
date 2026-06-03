# Reporte de bugs y mejoras — XIM App post Fase 6

## BUGS CRÍTICOS (bloquean el uso)

### BUG-01: Spinner infinito al cargar datos de Supabase
**Dónde:** Biblioteca de ejercicios, músculos, y pantalla de inicio del alumno en algunas sesiones.
**Qué pasa:** La pantalla se queda con el spinner girando indefinidamente sin mostrar datos ni error. En algunos casos redirige al login. El problema existía antes de las fases nuevas y las correcciones anteriores no lo resolvieron.
**Comportamiento observado:** A veces se soluciona recargando la página (F5), lo que sugiere un problema de estado o de manejo de la promesa que no resuelve correctamente.
**Investigar:** Revisar todos los custom hooks que hacen fetch a Supabase. Verificar que el estado `loading` siempre pase a `false` tanto en el caso exitoso como en el caso de error. Verificar que no haya race conditions cuando el componente se desmonta antes de que resuelva el fetch (falta de cleanup en `useEffect`).

### BUG-02: Campos de reps y peso no aceptan input en la vista de ejecución
**Dónde:** `WorkoutExecution.tsx` — campos de registro por serie durante el entrenamiento.
**Qué pasa:** El alumno hace clic en el campo de repeticiones o kilos e intenta escribir un número, pero el campo no acepta el input.
**Investigar:** Probablemente los inputs tienen `readOnly`, `disabled`, o el `onChange` no está actualizado correctamente en el estado. Verificar que los campos de registro (los que el alumno completa) sean editables y estén correctamente vinculados al estado local del componente.

### BUG-03: "Guardar entrenamiento" se queda en estado "guardando" indefinidamente
**Dónde:** Botón "Marcar como completado" en `WorkoutExecution.tsx`.
**Qué pasa:** El botón muestra "Guardando..." y nunca termina. El dato sí se guarda en Supabase (se confirmó recargando), pero la promesa no resuelve en el frontend.
**Investigar:** El `createWorkoutLog` en `useWorkoutLogs` probablemente hace un `fetchLogs()` al final que es el que cuelga. Revisar ese re-fetch post-guardado. Asegurarse de que el estado `loading` vuelva a `false` en el bloque `finally` y que la navegación posterior al guardado se ejecute aunque el re-fetch falle.

### BUG-04: Botón "Cancelar" no funciona en la vista de ejecución
**Dónde:** `WorkoutExecution.tsx`.
**Qué pasa:** El botón "Cancelar" no hace nada al hacer clic.
**Investigar:** Verificar que el handler del botón llame a `navigate(-1)` o a la ruta correspondiente. Puede ser que el botón esté dentro de un form y esté haciendo submit en lugar de cancelar, o que el handler no esté asignado.

### BUG-05: Link "Ejercicios" no funciona en el perfil del alumno
**Dónde:** Navegación del alumno.
**Qué pasa:** El alumno hace clic en "Ejercicios" y no pasa nada o no navega a la biblioteca.
**Investigar:** Verificar la ruta `/exercises` en `App.tsx` y que el link en la navegación del alumno apunte correctamente a esa ruta.

---

## BUGS VISUALES

### BUG-06: Botón "Empezar entrenamiento" invisible (texto blanco sobre fondo blanco)
**Dónde:** `StudentHome.tsx`.
**Qué pasa:** El botón no se ve hasta que el usuario pasa el mouse por encima.
**Fix:** Revisar las clases de Tailwind del botón. Probablemente tiene `variant="primary"` pero el color del texto está en blanco y el fondo también. Aplicar estilos explícitos o corregir la variante.

---

## MEJORAS FUNCIONALES

### MEJORA-01: Mostrar link/video del ejercicio durante el entrenamiento
**Dónde:** `WorkoutExecution.tsx` — junto a cada ejercicio dentro del bloque.
**Qué hacer:** Si el ejercicio tiene videos asociados en `exercise_videos`, mostrar un ícono o link clickeable al lado del nombre del ejercicio. Al hacer clic debe abrir el video en una nueva pestaña (`target="_blank"`). Si hay más de un video, mostrar el primero o un pequeño listado.
**Nota:** Los videos ya están en la base de datos (`exercise_videos` tabla existente). El hook `useActiveRoutine` debe traerlos junto con los datos del ejercicio.

### MEJORA-02: Vista global de la rutina (para admin y para alumno)
**Dónde:** 
- Admin: en `RoutineEdit.tsx` y `StudentDetail.tsx`, agregar botón "Ver rutina completa".
- Alumno: nueva opción en la navegación "Mi rutina".

**Qué mostrar:** Una vista de lectura que reproduce el formato de la planilla Excel de referencia:
- Columnas: Ejercicio | Sem 1 (series/reps + peso) | Sem 2 | Sem 3 | Sem 4 | Nota
- Filas agrupadas por día y por bloque
- Sin campos editables, solo lectura
- Debe funcionar en mobile con scroll horizontal por semana

**Esta vista es importante para Ximena** porque necesita ver la rutina completa antes de activarla y para revisarla después de que el alumno le da feedback.

### MEJORA-03: Navegación del alumno — agregar "Mi rutina"
**Dónde:** Barra de navegación del alumno.
**Qué hacer:** Agregar un link "Mi rutina" (o "Entrenar") que lleve a la pantalla de inicio `StudentHome` (`/`). Esto permite que el alumno, estando en la biblioteca de ejercicios o en el historial, pueda volver fácilmente a su rutina activa.
**Navegación sugerida para el alumno:**
- Entrenar (/) 
- Ejercicios (/exercises)
- Historial (/history)

---

## ORDEN DE PRIORIDAD SUGERIDO

1. BUG-01 (spinner infinito) — afecta toda la app
2. BUG-02 y BUG-03 (input bloqueado + guardar cuelga) — bloquean el flujo principal del alumno
3. BUG-04 y BUG-05 (cancelar + link ejercicios rotos)
4. BUG-06 (botón invisible)
5. MEJORA-03 (navegación del alumno) — simple, alto impacto
6. MEJORA-01 (links de video en ejecución)
7. MEJORA-02 (vista global de rutina) — más compleja, dejarla para el final
