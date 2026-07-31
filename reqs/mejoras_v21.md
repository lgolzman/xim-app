# Bugs y Mejoras — v21

## MEJORA-41 — Reordenar bloques dentro de un día con flechas ↑↓

### Contexto

Actualmente no existe forma de cambiar el orden de los bloques dentro de un día una vez creados. Si se necesita que un bloque nuevo quede primero (por ejemplo, insertar un bloque antes del Bloque A), hay que eliminarlo y recrear toda la estructura. La MEJORA-38 resolvió el reordenamiento de ejercicios dentro de un bloque; esta mejora aplica la misma lógica un nivel arriba: mover bloques dentro de un día.

### Cambios requeridos

- Agregar botones ↑ y ↓ en el header de cada bloque, junto al botón × existente.
- ↑ mueve el bloque una posición hacia arriba dentro del mismo día.
- ↓ mueve el bloque una posición hacia abajo dentro del mismo día.
- El botón ↑ se deshabilita (o se oculta) cuando el bloque ya es el primero del día.
- El botón ↓ se deshabilita (o se oculta) cuando el bloque ya es el último del día.
- Al mover un bloque, se arrastran con él todos sus ejercicios, series, pesos y notas.
- Las letras de los bloques se recalculan tras el movimiento (el que queda primero pasa a ser A, el segundo B, etc.).
- El movimiento dispara el autoguardado existente con debounce.

### Nota sobre el FAB

El botón flotante (FAB) implementado en MEJORA-40 funciona como toggle entre vista compacta y vista detallada (no como acceso a "Ver rutina completa" como estaba en el spec original). Los botones ↑↓ de bloques deben ser visibles y funcionales en ambos modos.

### Criterios de aceptación

1. Los botones ↑ y ↓ son visibles en el header de cada bloque, tanto en vista detallada como en vista compacta.
2. El primer bloque del día no puede moverse hacia arriba; el último no puede moverse hacia abajo.
3. Al mover un bloque, las letras se recalculan correctamente (A, B, C…) y los índices de ejercicios también (A1, A2… → B1, B2… si corresponde).
4. Todos los ejercicios, series y configuración del bloque se mantienen intactos tras el movimiento.
5. El autoguardado se dispara tras el movimiento.
