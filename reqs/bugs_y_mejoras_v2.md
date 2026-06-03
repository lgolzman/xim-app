# Reporte de bugs y mejoras — XIM App v2

## BUGS CRÍTICOS

### BUG-07: La sesión se cierra al cambiar de pestaña
**Dónde:** Toda la aplicación.
**Qué pasa:** Si el usuario (admin o alumno) cambia a otra pestaña del navegador y vuelve, la app lo redirige al login y le pide usuario y contraseña nuevamente. Esto es especialmente problemático durante el registro de un entrenamiento, donde el alumno puede querer consultar algo en otra pestaña y volver.
**Investigar:** Supabase maneja la sesión con tokens en `localStorage`. El problema probablemente es que `AuthContext` está re-verificando la sesión en cada foco de ventana (`visibilitychange` o `focus` event) y, si la verificación falla o tarda, redirige al login antes de que Supabase restaure el token. Revisar:
- Que el listener de `onAuthStateChange` de Supabase esté correctamente configurado y sea la única fuente de verdad del estado de sesión.
- Que no haya un listener de `visibilitychange` o `window.focus` que fuerce un re-check de sesión y redirija prematuramente.
- Que el `ProtectedRoute` no redirija mientras el estado de auth todavía está cargando (`loading = true`).

### BUG-08: El mail de invitación no llega al destinatario
**Dónde:** Flujo de invitación de alumnos (admin).
**Qué pasa:** Cuando el admin crea una invitación ingresando un email, el destinatario no recibe ningún correo.
**Investigar:** Verificar cómo se está enviando el email de invitación. Si se está usando Supabase Auth (`supabase.auth.admin.inviteUserByEmail`) verificar la configuración de SMTP en el proyecto de Supabase. Si el envío se hace desde el frontend con otra librería o servicio, verificar que la llamada esté implementada y no solo guardando el token en la base de datos sin enviar el mail. Revisar también si hay errores en la consola del navegador al crear la invitación.

---

## MEJORAS FUNCIONALES

### MEJORA-04: Agregar nombre del alumno al crear invitación
**Dónde:** Formulario de creación de invitaciones (admin) y tabla `profiles`.
**Qué hacer:**
1. Agregar el campo `full_name TEXT` a la tabla `profiles` si no existe. Migration nueva: `003_add_profile_name.sql`.
2. En el formulario de creación de invitación, agregar un campo obligatorio "Nombre" además del email. Guardar ese nombre en la tabla `invitations` (agregar columna `invited_name TEXT`).
3. Cuando el alumno acepta la invitación y se crea su perfil (trigger `handle_new_user`), copiar el `invited_name` de la invitación al `full_name` del perfil automáticamente.
4. En el panel de alumnos (admin), mostrar el `full_name` en lugar del email como identificador principal. Mostrar el email como dato secundario.
5. Eliminar o ocultar la opción "Mi perfil" donde el alumno podía ingresar su nombre manualmente, ya que ahora lo define la entrenadora.

### MEJORA-05: Nombre del ejercicio como link a su ficha en la biblioteca
**Dónde:** En todas las vistas donde aparece el nombre de un ejercicio:
- Vista de ejecución del entrenamiento (`WorkoutExecution.tsx`)
- Vista "Mi rutina" (vista global de solo lectura)
- Historial de entrenamientos (`WorkoutDetail.tsx`)

**Qué hacer:** Convertir el nombre del ejercicio en un link que abra la ficha del ejercicio en la biblioteca. Debe abrirse en una nueva pestaña (`target="_blank"`) para no interrumpir el flujo de entrenamiento o de revisión. La ruta de la ficha del ejercicio ya existe en la biblioteca — usar esa misma ruta.

### MEJORA-06: Copiar semana 1 al resto de las semanas en el formulario de rutina
**Dónde:** `RoutineForm.tsx` — al cargar las series de un ejercicio por semana.
**Qué hacer:** Agregar un botón **"Replicar Semana 1 en el resto"** en la vista de la Semana 1, a nivel de ejercicio. Al presionarlo:
- Copiar las series de la Semana 1 de ese ejercicio a todas las semanas restantes (2, 3, 4...).
- **Solo sobreescribir semanas que estén vacías o que el usuario confirme.** Si las semanas 2, 3 o 4 ya tienen series con datos ingresados, mostrar un mensaje de confirmación: *"Las semanas 2, 3 y 4 ya tienen series. ¿Querés reemplazarlas con las de la Semana 1?"* y esperar confirmación antes de pisar.
- El botón solo aparece en la Semana 1, no en las demás.
- El copiado debe hacer deep copy de los objetos (no referencias), igual que está implementado en `copySetsFromPreviousWeek`.

**Importante:** No implementar copia automática al editar la Semana 1. Siempre debe ser una acción explícita del usuario mediante el botón, para no pisar cambios ya ingresados en otras semanas.
