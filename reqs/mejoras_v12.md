# Mejoras — XIM App v12

## MEJORA-25: Alta de alumnos sin invitación obligatoria

### Contexto
Actualmente el único flujo para crear un alumno es enviarle una invitación por email y esperar que él complete el registro. Ximena necesita poder crear alumnos directamente desde el panel de administración, sin depender de que el alumno entre a la app, para poder asignarles rutinas y registrar entrenamientos de inmediato.

### Nuevo flujo

**Flujo A — Alta directa (nuevo):**
1. Ximena va a Alumnos → "Nuevo alumno"
2. Completa nombre, email, y opcionalmente los datos de la ficha (fecha de nacimiento, altura, peso, objetivo)
3. El alumno queda creado en el sistema con estado `pending` — sin cuenta de acceso todavía
4. Ximena puede inmediatamente asignarle rutinas y registrar entrenamientos en su nombre
5. Cuando quiera darle acceso a la app, va al perfil del alumno y presiona "Enviar invitación" — se le manda el email con el link de registro
6. Cuando el alumno completa el registro, su cuenta queda vinculada al perfil existente — mismo alumno, ahora con acceso

**Flujo B — Invitación directa (flujo actual, se mantiene):**
El flujo actual de crear invitación y que el alumno se registre sigue funcionando igual para los casos donde Ximena quiere darle acceso desde el primer momento.

### Modelo de datos

El perfil del alumno creado por Ximena sin invitación no tiene un `auth.user` asociado todavía. Hay que manejar esto con cuidado:

**Migración `013_student_direct_creation.sql`:**

```sql
-- Agregar columnas a profiles para soportar alumnos sin cuenta
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('pending', 'active', 'disabled')),
  ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES profiles(id);

-- Los perfiles creados directamente por el admin no tienen auth.user todavía
-- La columna id puede ser un UUID generado por el admin hasta que el alumno se registre
-- Al registrarse, se vincula el auth.user.id con el perfil existente

-- Tabla para invitaciones pendientes vinculadas a perfiles existentes
-- (extiende el flujo actual de invitations)
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);
```

**Lógica de vinculación al registrarse:**
Cuando un alumno acepta una invitación que tiene `profile_id`, el trigger `handle_new_user` debe:
1. En lugar de crear un perfil nuevo, actualizar el perfil existente con el `auth.user.id` real
2. Marcar `account_status = 'active'`
3. Marcar la invitación como usada

**Importante:** Los `workout_logs`, `routines` y demás datos creados por Ximena mientras el alumno estaba en `pending` deben quedar intactos y asociados al mismo perfil.

### UI — Panel de alumnos

- Renombrar el botón actual "Nueva invitación" por dos opciones:
  - **"Nuevo alumno"** — crea el perfil directamente (flujo A)
  - **"Invitar alumno"** — flujo actual de invitación (flujo B)
- En el listado de alumnos, mostrar el estado con badges:
  - `Activo` (verde) — tiene cuenta y puede entrar
  - `Pendiente` (amarillo) — creado por Ximena, sin cuenta todavía
  - `Inhabilitado` (rojo) — inhabilitado
- En el perfil de un alumno con estado `pending`, mostrar un botón **"Enviar invitación"** que genera y envía el email de registro vinculado a ese perfil.

### RLS
Los perfiles con `account_status = 'pending'` no tienen `auth.user` asociado, por lo que las políticas RLS existentes que usan `auth.uid() = id` no aplican. Verificar que las políticas del admin cubran correctamente estos perfiles — el admin debe poder leer y escribir sobre perfiles `pending` sin restricción.

---

## MEJORA-26: Ximena puede entrenarse a sí misma

### Contexto
Ximena quiere usar la app para su propio entrenamiento personal. Como administradora, no ve la vista de alumno. La solución es que ella aparezca como alumna en su propia lista de alumnos y pueda gestionarse como tal.

### Qué hacer

1. En el panel de administración, en la sección Alumnos, agregar un botón **"Agregarme como alumna"** (visible solo si Ximena no está ya en la lista de alumnos).

2. Al presionarlo, crear un perfil de alumno vinculado a su propia cuenta con rol especial — o simplemente agregar su `profile_id` como alumna en la lista.

3. En la lista de alumnos, el perfil de Ximena aparece igual que cualquier otro alumno, con un indicador discreto "Vos" o "(Entrenadora)" para distinguirlo.

4. Desde ese perfil, Ximena puede:
   - Asignarse rutinas (como hace con cualquier alumno)
   - Registrar entrenamientos en su nombre usando el botón "Registrar entrenamiento" ya existente (MEJORA-21)

5. **No cambiar el rol de Ximena** — sigue siendo `admin`. No necesita ver la vista de alumno. Gestiona su propio entrenamiento exactamente igual que gestiona el de cualquier otro alumno: desde el panel de admin.

### Implementación
La forma más simple es que el perfil de Ximena (que ya existe en `profiles` con rol `admin`) pueda ser tratado como alumno en el contexto del panel. No requiere cambios de rol ni tablas nuevas — simplemente permitir que el admin se seleccione a sí mismo como destinatario de una rutina y como alumno en el listado.

Verificar que `useNextWorkout` y `useActiveRoutine` funcionen correctamente cuando el `studentId` es el mismo que el `adminId`.
