# Reporte de bugs y mejoras — XIM App v3

## BUGS CRÍTICOS

### BUG-09: Problema raíz de sesión — spinner infinito y pérdida de sesión al cambiar de pestaña

Este bug agrupa síntomas que vienen de la misma causa raíz y que no se resolvieron correctamente en iteraciones anteriores.

**Síntomas observados:**
- Al abrir un link de ejercicio en nueva pestaña, la nueva pestaña pide login. Al volver a la pestaña original, la sesión también se perdió.
- Si la app estuvo inactiva un rato y el usuario hace clic en cualquier opción, el spinner gira indefinidamente sin cargar nada. Refrescar el navegador lo soluciona.
- Al volver a una pestaña de la app después de haber estado en otra, cualquier acción queda en spinner infinito.

**Causa probable:**
En una iteración anterior se implementó un timeout de 5 segundos que, si Supabase no respondía, forzaba un nuevo inicio de sesión. Ese código probablemente sigue activo y es el que está causando todos estos síntomas. Además puede haber un listener de `visibilitychange` o `focus` que fuerza un re-check de sesión al volver a la pestaña.

**Qué hacer:**
1. Buscar y eliminar cualquier timeout o lógica del tipo "si en N segundos no hay sesión, redirigir al login". Esa lógica no debe existir.
2. Buscar y eliminar cualquier listener de `visibilitychange`, `focus`, o `pageshow` que esté forzando re-verificación de sesión.
3. La sesión debe manejarse **únicamente** a través del listener `supabase.auth.onAuthStateChange`. Ese es el único mecanismo correcto. Si el evento no dispara, no redirigir.
4. El `ProtectedRoute` no debe redirigir al login mientras `loading === true`. Solo redirigir cuando `loading === false` AND `user === null`.
5. Para el caso de nueva pestaña: Supabase comparte el token en `localStorage` entre pestañas del mismo origen. Una nueva pestaña debería restaurar la sesión automáticamente sin pedir login. Si está pidiendo login, es porque algo está limpiando el storage o redirigiendo antes de que Supabase restaure el token.
6. Hacer una auditoría completa de `AuthContext.tsx` y eliminar toda lógica de timeout o re-check manual. Dejar solo `onAuthStateChange` y el `getSession()` inicial.

### BUG-10: Inhabilitar alumno no se aplica
**Dónde:** Panel de administración de alumnos — botón "Inhabilitar".
**Qué pasa:** Se muestra el modal de confirmación, el usuario confirma, pero el alumno sigue apareciendo como activo. El cambio no se persiste.
**Investigar:**
- Verificar que la función `disableStudent()` en `useStudents.ts` esté haciendo el UPDATE correcto en Supabase (`active = false`, `disabled_by`, `disabled_at`).
- Verificar que la política RLS de la tabla `profiles` permita al admin hacer UPDATE sobre otros perfiles. Si la política solo permite `auth.uid() = id`, un admin no puede modificar el perfil de otro usuario. Ajustar la política para permitir UPDATE cuando `get_user_role() = 'admin'`.
- Verificar que después del UPDATE se llame a `refetch()` para que la UI refleje el cambio.
- Revisar la consola del navegador al confirmar la inhabilitación para ver si hay un error de Supabase.

---

## MEJORAS FUNCIONALES

### MEJORA-07: Copiar rutina existente como base para una nueva
**Dónde:** Flujo de creación de nueva rutina (admin) — `/admin/routines/new`.
**Qué hacer:** En la pantalla de creación de rutina, agregar una opción "Copiar rutina existente" que permita:
1. Seleccionar una rutina anterior del mismo alumno (o de cualquier alumno) como punto de partida.
2. Al seleccionarla, pre-cargar el formulario `RoutineForm` con todos los datos de esa rutina (días, bloques, ejercicios, series de todas las semanas, notas).
3. El alumno destinatario y el nombre de la rutina quedan en blanco para que el admin los complete.
4. Todos los datos copiados son editables normalmente — es simplemente un punto de partida, no una copia vinculada.
5. La copia es independiente: modificar la nueva rutina no afecta la original.

**UX sugerida:** Un botón o link "Empezar desde una rutina existente" al inicio del formulario (antes de empezar a cargar datos). Al hacer clic, abrir un selector con las rutinas disponibles (nombre + alumno + estado). Al confirmar la selección, cargar el formulario con esos datos.

### MEJORA-08: Reactivar una rutina archivada
**Dónde:** Panel de rutinas del alumno en `StudentDetail.tsx` (vista del admin).
**Contexto:** Actualmente, al activar una nueva rutina, la anterior se archiva automáticamente. Si el admin activa una rutina por error, no hay forma de volver atrás.
**Qué hacer:**
1. En la lista de rutinas archivadas de un alumno, agregar un botón "Reactivar" junto a cada rutina archivada.
2. Al hacer clic en "Reactivar", mostrar un modal de confirmación: *"¿Querés reactivar '[nombre de la rutina]'? La rutina activa actual pasará a estado borrador."*
3. Al confirmar:
   - La rutina activa actual cambia a estado `draft` (no a `archived`, para no perderla definitivamente).
   - La rutina seleccionada cambia a estado `active`.
4. Esta operación solo es posible cuando hay una rutina archivada disponible. Si no hay ninguna activa en ese momento, no hace falta confirmación — simplemente activar directamente.

**Importante:** El historial de entrenamientos del alumno no se modifica. Los registros quedan intactos independientemente del estado de la rutina.
