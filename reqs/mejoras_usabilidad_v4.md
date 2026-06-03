# Mejoras de usabilidad — XIM App v4

## MEJORA-09: Colapsar/expandir días en el formulario de rutina

**Dónde:** `RoutineForm.tsx`

**Qué hacer:** Agregar la posibilidad de colapsar y expandir cada día individualmente.

- Cada día tiene un header (la barra con "Día 1", nombre opcional, botones). Ese header debe ser clickeable para colapsar/expandir el contenido del día (bloques y ejercicios).
- Estado por defecto: el último día agregado aparece expandido, los anteriores colapsados. Al crear la rutina desde cero, el Día 1 aparece expandido.
- Cuando un día está colapsado, el header debe mostrar un resumen compacto: cantidad de bloques y cantidad de ejercicios. Ejemplo: "Día 1 — 3 bloques · 5 ejercicios".
- Agregar un ícono de chevron (▼/▶) en el header que indique el estado.
- Los botones "+ Bloque" y "Eliminar día" siguen visibles en el header aunque el día esté colapsado.

---

## MEJORA-10: Navegación por semanas a nivel de ejercicio

**Dónde:** `RoutineForm.tsx` — dentro de cada ejercicio en el formulario.

**Contexto:** Actualmente las semanas se manejan con tabs globales en la parte superior del formulario. Para ver la progresión de un ejercicio específico hay que ir a los tabs de arriba, cambiar de semana, y scrollear de vuelta hasta el ejercicio. Esto es muy incómodo cuando se planifica semana por semana por ejercicio.

**Qué hacer:** Reemplazar el sistema de tabs globales de semanas por tabs de semana a nivel de cada ejercicio.

- Dentro de cada tarjeta de ejercicio (ej: A1 Bench Press), mostrar tabs de semana: `Sem 1 | Sem 2 | Sem 3 | Sem 4`.
- Al hacer clic en un tab de semana dentro de un ejercicio, cambia solo la vista de series de ese ejercicio, sin afectar los demás.
- Cada ejercicio recuerda su semana seleccionada de forma independiente.
- Los tabs globales de semana en la parte superior del formulario se eliminan, ya que dejan de ser necesarios.
- El botón "Replicar Semana 1 en el resto" se mantiene dentro de la tarjeta del ejercicio, visible cuando se está en el tab de Semana 1.
- El botón "Copiar semana anterior" (que existía antes) también se mantiene en los tabs de Semana 2 en adelante.

**Resultado esperado:** Ximena puede abrir un ejercicio, cargar las series de Semana 1, hacer clic en "Sem 2" dentro de ese mismo ejercicio, ajustar las series, pasar a "Sem 3", etc. — todo sin moverse del lugar. Luego pasa al siguiente ejercicio y repite.
