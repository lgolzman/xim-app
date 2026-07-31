# Bugs y Mejoras — v18

## MEJORA-35 — Vista compacta del editor de rutinas

### Contexto

La vista actual del editor expande cada ejercicio con series, pesos, notas y semanas, lo que hace imposible tener una visión global de la rutina mientras se arma la estructura. Ximena necesita ver todos los días y ejercicios de un vistazo para verificar el equilibrio entre tipos de movimiento, tal como lo hace hoy en su planilla Excel donde cada ejercicio ocupa una sola línea y todos los días son visibles simultáneamente.

### Descripción

Agregar un toggle en el header del editor de rutinas que permita alternar entre dos modos de visualización:

- **Vista detallada**: la vista actual, sin cambios.
- **Vista compacta**: misma estructura de datos, presentación densificada.

El estado del toggle debe persistir en `localStorage` bajo la clave `xim_routine_editor_view` (`"compact"` / `"detailed"`) para que recuerde la preferencia entre sesiones.

### Vista compacta — diseño

La estructura de días y bloques se mantiene apilada verticalmente igual que en la vista detallada, pero comprimida:

- El header del día (nombre opcional, botón `+ Bloque`) se mantiene sin cambios.
- Cada bloque muestra su encabezado con el color de fondo correspondiente según `src/lib/blockColors.ts` y el botón `+ Ejercicio`.
- Cada ejercicio ocupa **una sola línea** con el formato:
  ```
  [índice]  [Nombre del ejercicio]  [×]
  ```
  Ejemplo: `A1  Back Squat  ×`
- El botón `×` elimina el ejercicio con el mismo comportamiento y confirmación que en vista detallada.
- **No se muestran**: series, semanas, pesos, notas, ni el link "Ver progresión".
- El botón `+ Ejercicio` abre el mismo selector de ejercicios existente.
- El botón `+ Bloque` tiene el mismo comportamiento existente.

### Lo que no cambia

- Toda la lógica de datos es idéntica; la vista compacta es puramente presentacional.
- Al volver a vista detallada, los ejercicios agregados en modo compacto aparecen con sus series vacías listas para completar.
- El autoguardado con debounce (MEJORA-34) sigue funcionando en ambos modos.
- Los colores de bloque provienen de `blockColors.ts` sin modificación.

### Criterios de aceptación

1. Toggle visible en el header del editor con label claro (por ejemplo: ícono de lista compacta / lista detallada, o texto "Compacta / Detallada").
2. En vista compacta, una rutina de 3 días con 6–8 ejercicios por día debe ser visible sin scroll o con scroll mínimo en una pantalla estándar de laptop.
3. Agregar un ejercicio en modo compacto lo muestra inmediatamente en la lista como una línea nueva.
4. Eliminar un ejercicio en modo compacto funciona correctamente y actualiza la vista.
5. Cambiar de modo (detallada ↔ compacta) no pierde ningún dato ni dispara un guardado innecesario.
6. La preferencia de modo se recuerda al recargar la página o navegar y volver al editor.

### Notas de implementación

- No es necesario implementar drag & drop para reordenar en la vista compacta (queda para mejora futura).
- El componente de vista compacta puede ser un renderizado alternativo dentro del mismo componente de editor, condicionado por el estado del toggle, sin necesidad de crear una ruta nueva.
