# Mejoras — XIM App v15

## MEJORA-30: Vista de progresión completa de un ejercicio

### Contexto
Al programar una rutina, Ximena carga las series semana por semana usando tabs (Sem 1, Sem 2, etc.). No hay forma de ver de un vistazo cómo quedó programado el ejercicio en todas las semanas sin ir tab por tab.

### Qué hacer

Agregar un botón **"Ver progresión"** (o ícono de tabla/resumen) en la tarjeta de cada ejercicio, al lado de los tabs de semana.

Al presionarlo, mostrar un panel expandible (o tooltip/popover) debajo del ejercicio con una tabla compacta de solo lectura:

```
         Sem 1      Sem 2      Sem 3      Sem 4
Serie 1  8 reps/50kg  9 reps/50kg  10 reps/50kg  10 reps/55kg
Serie 2  8 reps/50kg  9 reps/50kg  10 reps/50kg  10 reps/55kg
Serie 3  8 reps/50kg  9 reps/50kg  10 reps/50kg  10 reps/55kg
```

- Si todas las series de una semana son iguales, mostrar una sola fila con el formato compacto `3×8 / 50kg`.
- Si las series varían, mostrar una fila por serie.
- La vista es solo lectura — para editar se sigue usando los tabs.
- Al volver a presionar el botón (o presionar "Cerrar"), el panel se colapsa.
- Solo se muestra para semanas que tienen datos cargados.

---

## MEJORA-31: Copiar primera serie al resto en el formulario de rutina

### Contexto
Cuando todas las series de un ejercicio tienen las mismas reps y peso, Ximena tiene que ingresar los mismos valores en cada serie manualmente. Esta mejora permite cargar la primera serie y replicarla al resto con un clic.

### Qué hacer

En cada ejercicio, al lado de cada serie (a partir de la serie 2), agregar un pequeño botón o ícono **"Copiar de serie anterior"** (↑ o similar) que copia los valores de reps, tipo y peso de la serie inmediatamente anterior a esa serie.

Adicionalmente, agregar un botón **"Igualar todas las series"** a nivel del ejercicio (no por serie individual) que copia los valores de la Serie 1 a todas las demás series del ejercicio en esa semana.

**Comportamiento:**
- "Copiar de serie anterior" copia solo a esa serie.
- "Igualar todas las series" copia la Serie 1 a todas las demás (Serie 2, 3, etc.) de esa semana.
- Ambas acciones son inmediatas, sin confirmación — son fácilmente reversibles editando el campo.
- El copiado es de valores (deep copy), no de referencias.
- Solo aplica a la semana actualmente seleccionada en los tabs.

**UX:** Los botones deben ser pequeños y discretos para no cargar visualmente la interfaz. Un ícono de flecha hacia arriba o "=" al costado de cada serie es suficiente. El botón "Igualar todas" puede estar al lado de "+ Serie".
