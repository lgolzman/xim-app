# Contexto del proyecto — XIM App

Estoy trabajando en **XIM App**, una aplicación web para que una entrenadora personal gestione rutinas de ejercicio y sus alumnos puedan registrar su progreso.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Supabase (PostgreSQL + Auth)
- React Router DOM 7

## Estructura del proyecto
- `src/hooks/` — custom hooks con patrón `{ data, loading, error, refetch, create*, update*, delete* }`
- `src/components/ui/` — componentes base (Button, Input, Select, Modal, etc.)
- `src/context/AuthContext.tsx` — autenticación con `useAuth()`
- `src/pages/` — páginas organizadas por rol (`admin/`, páginas del alumno en raíz)
- `supabase/migrations/` — migraciones SQL

## Roles
- `admin` — entrenadora, acceso total
- `consulta` — alumnos, acceso a su propia rutina y biblioteca de ejercicios

## Estado actual
Se acaba de implementar un módulo completo de rutinas y seguimiento. Las migraciones ya están aplicadas en Supabase. El código está en el repositorio. Hay bugs encontrados en las primeras pruebas que necesito que resuelvas.

---

# Tarea: corregir bugs y agregar mejoras

Leé el archivo `reqs/bugs_y_mejoras_v1.md`. Tiene la lista completa clasificada y priorizada. Si necesitás más contexto funcional, leé también `reqs/xim_app_spec_rutinas.md`.

**Trabajá de a un punto por vez.** Después de cada cambio, mostrámelo y esperá mi confirmación explícita antes de continuar con el siguiente. No avances solo.

Trabajá en el siguiente orden:

## 1. BUG-01 — Spinner infinito (el más urgente)
Revisá todos los custom hooks en `src/hooks/`. El problema es que en algunos casos el estado `loading` nunca pasa a `false`. Buscá:
- Que todos los `useEffect` con fetch tengan el estado `loading` manejado en un bloque `finally`
- Que haya cleanup para evitar actualizaciones de estado en componentes desmontados (patrón `isMounted`)
- Que los errores de Supabase queden capturados y setteen `loading = false` aunque fallen

## 2. BUG-02 — Campos de input bloqueados en WorkoutExecution
Los campos donde el alumno registra reps y peso no aceptan escritura. Revisá `WorkoutExecution.tsx` y verificá que los inputs tengan `onChange` correctamente vinculado al estado local y no tengan `readOnly` o `disabled` involuntario.

## 3. BUG-03 — Botón "Guardar" se queda en estado "guardando"
En `useWorkoutLogs.ts`, la función `createWorkoutLog` hace un `fetchLogs()` al final que probablemente es el que cuelga. Asegurate de que:
- El estado `loading` vuelva a `false` en el `finally`
- La navegación posterior al guardado se ejecute aunque el re-fetch falle
- El botón en `WorkoutExecution.tsx` no dependa del re-fetch para deshabilitarse

## 4. BUG-04 — Botón "Cancelar" no funciona en WorkoutExecution
Verificá que el handler del botón llame a `navigate(-1)` y que no esté dentro de un `<form>` que intercepte el click.

## 5. BUG-05 — Link "Ejercicios" no navega en el perfil del alumno
Verificá la ruta `/exercises` en `App.tsx` y que el link en la navegación del alumno apunte correctamente.

## 6. BUG-06 — Botón "Empezar entrenamiento" invisible
En `StudentHome.tsx`, el botón principal tiene texto blanco sobre fondo blanco. Corregí los estilos de Tailwind para que sea visible.

## 7. MEJORA-03 — Navegación del alumno
Agregá "Mi rutina" (o "Entrenar") como link en la barra de navegación del alumno apuntando a `/`. La navegación del alumno debe quedar: **Entrenar** (`/`) · **Ejercicios** (`/exercises`) · **Historial** (`/history`).

## 8. MEJORA-01 — Links de video durante el entrenamiento
En `WorkoutExecution.tsx`, al lado del nombre de cada ejercicio, si tiene videos en `exercise_videos`, mostrar un ícono o link que abra el video en nueva pestaña. El hook `useActiveRoutine` debe traer los videos junto con los datos del ejercicio si no lo hace ya.

## 9. MEJORA-02 — Vista global de la rutina (la más compleja, dejala para el final)
Crear una vista de solo lectura que muestre la rutina completa en formato tabla, similar a la planilla Excel de referencia:
- Filas agrupadas por día y bloque (A1, A2, B1, etc.)
- Columnas: Ejercicio | Sem 1 (series + reps/tiempo + peso) | Sem 2 | Sem 3 | Sem 4 | Nota
- Funcionar en mobile con scroll horizontal
- Accesible para el admin desde `RoutineEdit` y `StudentDetail` (botón "Ver rutina completa")
- Accesible para el alumno como "Mi rutina" en su navegación (puede ser la misma vista en modo lectura)
