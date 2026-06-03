# Mejoras — XIM App v11

## MEJORA-23: Ficha completa del alumno

### Contexto
Actualmente el perfil del alumno en la app solo muestra nombre, email y estado (activo/inhabilitado). Ximena necesita una ficha completa con datos físicos, objetivos y un historial de notas propias.

### Datos a agregar

**Migración `011_student_profile.sql`:**

```sql
-- Extender tabla profiles con datos del alumno
ALTER TABLE profiles
  ADD COLUMN birth_date DATE,
  ADD COLUMN height_cm DECIMAL(5,1),       -- altura en cm, ej: 165.5
  ADD COLUMN weight_kg DECIMAL(5,2),       -- peso en kg, ej: 68.50
  ADD COLUMN goal TEXT,                    -- objetivo del alumno (texto libre)
  ADD COLUMN updated_profile_at TIMESTAMPTZ;

-- Notas de la entrenadora sobre el alumno
CREATE TABLE student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to student_notes"
  ON student_notes FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO service_role;
```

### Dónde se edita

En `/admin/students/:studentId` — agregar una sección "Ficha del alumno" con dos subsecciones:

**Datos físicos y objetivo** (editables por Ximena):
- Fecha de nacimiento (date picker)
- Altura (cm)
- Peso (kg)
- Objetivo (textarea libre, ej: "Ganar masa muscular", "Bajar de peso", "Mejorar resistencia")
- Botón "Guardar cambios"

**Notas** (historial con fecha):
- Listado de notas en orden cronológico inverso, cada una con fecha y texto.
- Campo de texto + botón "Agregar nota" para agregar una nueva. La fecha se asigna automáticamente al momento de guardar — Ximena no la elige.
- Las notas no se editan ni eliminan una vez guardadas — son un registro histórico.

### Cuándo se puede completar la ficha

Los datos físicos y el objetivo se pueden completar tanto al crear la invitación como después, editando el perfil del alumno. Al crear la invitación ya existe el campo de nombre (MEJORA-04) — agregar opcionalmente fecha de nacimiento, altura, peso y objetivo como campos opcionales en el formulario de invitación.

### Visibilidad

Los datos de la ficha (datos físicos, objetivo, notas) son **solo visibles para Ximena**. El alumno no ve esta información en su perfil.

---

## MEJORA-24: Plan comercial del alumno

### Contexto
Cada alumno tiene un plan de entrenamiento con un precio mensual. Ximena necesita registrar el plan, el precio actual, el historial de precios y recibir recordatorios cuando corresponde hacer un aumento.

### Modelo de datos

**Migración `012_student_plan.sql`:**

```sql
-- Plan actual del alumno
CREATE TABLE student_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_description TEXT NOT NULL,    -- descripción del plan, ej: "Presencial 2x semana"
  current_price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  increase_frequency_months INTEGER, -- cada cuántos meses se actualiza, ej: 3
  next_increase_date DATE,           -- fecha estimada del próximo aumento
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id)                -- un plan activo por alumno
);

-- Historial de precios
CREATE TABLE student_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  valid_from DATE NOT NULL,          -- desde cuándo rigió este precio
  valid_to DATE,                     -- hasta cuándo (NULL = vigente)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_plan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to student_plans"
  ON student_plans FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins full access to student_plan_history"
  ON student_plan_history FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plan_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plan_history TO service_role;
```

### Dónde se edita

En `/admin/students/:studentId` — agregar sección "Plan comercial":

**Plan actual:**
- Descripción del plan (texto libre, ej: "Presencial 2x semana", "Rutina online con seguimiento")
- Precio mensual + moneda (ARS por defecto)
- Cada cuántos meses se actualiza (selector: 1, 2, 3, 4, 6 meses)
- Próxima fecha de aumento (se puede calcular automáticamente o ingresar manualmente)
- Botón "Guardar plan"

**Al guardar un precio nuevo:**
- Cerrar el registro anterior en `student_plan_history` (setear `valid_to = hoy`)
- Insertar nuevo registro en `student_plan_history` con `valid_from = hoy`
- Actualizar `student_plans` con el nuevo precio

**Historial de precios:**
- Tabla con columnas: Período (valid_from → valid_to), Descripción del plan, Precio.
- Ordenado cronológico inverso.

### Recordatorio de aumento por mail

Usar la misma infraestructura de Resend + Supabase Edge Functions que se implementó en MEJORA-18.

**Lógica:** Una Edge Function que se ejecuta periódicamente (cron job diario) que:
1. Busca todos los alumnos donde `next_increase_date` esté entre 30 y 31 días en el futuro.
2. Si encuentra alguno, envía un mail a `TRAINER_EMAIL` con el listado.

**Configurar el cron en `supabase/functions/remind-price-increases/index.ts`** con schedule diario. Supabase Edge Functions soporta cron jobs nativamente con la extensión `pg_cron` o con el scheduler de Edge Functions.

**Contenido del mail:**

```
Asunto: 📅 Recordatorio: aumentos de cuota el próximo mes

Los siguientes alumnos tienen aumento de cuota programado para el mes que viene:

• [Nombre alumno] — Plan: [descripción] — Precio actual: $[monto] — Fecha de aumento: [fecha]
• [Nombre alumno] — Plan: [descripción] — Precio actual: $[monto] — Fecha de aumento: [fecha]

→ Gestionar planes: [APP_URL]/admin/students
```

**Frecuencia de envío:** El mail se envía una sola vez cuando `next_increase_date` entra en la ventana de 30-31 días. No se repite diariamente para no saturar. Para evitar mails duplicados, agregar columna `reminder_sent BOOLEAN DEFAULT FALSE` en `student_plans` y marcarla al enviar.
