# Semana laboral (administradores)

El planificador representa un único armado de lunes a viernes por día y horario. No usa fechas, períodos, repeticiones ni semanas de calendario.

## Uso

- Entrar como administrador y abrir **Agenda** (`/admin/planner`).
- **Agregar clase**: seleccionar alumno (opcional), nombre, sede, uno o varios días, horario y duración. Lunes, miércoles y viernes crea tres bloques independientes en una sola operación.
- **Agregar actividad** permite cargar traslados, paseos u otros compromisos con nombre, días, horario, duración y notas. No requiere alumno y la sede es opcional. Se identifica con ◇ y borde discontinuo; puede moverse, editarse y eliminarse como las clases.
- La grilla incluye las 24 horas y abre en las 7:00. Mantiene encabezados fijos y escala compacta de 30 px por hora.
- Arrastrar un bloque o abrirlo y elegir **Mover en la grilla** para ubicarlo con otro clic. Los movimientos se ajustan a 15 minutos.
- **Probar cambios** crea un borrador persistente del armado. **Armado actual** permite comparar y **Retomar borrador** seguir trabajando. **Aplicar cambios** actualiza el armado; **Descartar** conserva el original.
- La eliminación de una clase la quita del armado o del borrador, según el modo activo.
- **Administrar sedes** permite crear sedes y eliminar las que no estén referenciadas por el armado o el borrador.
- Los filtros por alumno y sede no afectan el cálculo de superposiciones, traslados ni búsqueda de huecos. Las actividades también ocupan horario; cuando no tienen sede, no se les calcula margen de traslado.
- El buscador usa días disponibles, franja horaria, duración y sede. El traslado es un margen global configurable entre sedes.

## Persistencia y compatibilidad

Se mantiene la tabla privada `admin_planners` de la migración `018_admin_planner.sql`, ya existente. No hace falta otra migración: el nuevo modelo se guarda en `data.weeklyPlan`, con clases que contienen `day` (0 = lunes, 4 = viernes), horario, duración, alumno, sede y notas. El borrador contiene copia original y propuesta. Cada bloque distingue `kind` (`class` o `activity`); los anteriores sin este campo se interpretan como clases. No se guardan fechas ni recurrencias en este modelo.

Si todavía hay datos del planificador anterior, se adapta una semana al esquema laboral: se busca primero una semana con clases en el período actual o siguiente, y luego entre las semanas originales disponibles. Se respetan las excepciones de esa semana y se excluyen sábados y domingos. Se muestra un aviso para revisar la adaptación. Los datos originales y borradores anteriores se conservan en el JSON como respaldo y no se modifican; el nuevo armado empieza a persistirse al guardar. Una vez guardado, el esquema es independiente del calendario y no vuelve a importar clases antiguas aunque se eliminen todas las nuevas.

RLS permite únicamente al administrador propietario leer y escribir su planificador. La ruta y el menú son exclusivos del administrador. El guardado conserva el control de revisión optimista contra cambios de otras pestañas. Al aplicar un borrador se comprueba que las clases afectadas no hayan cambiado en el armado actual y se conservan las clases nuevas que no pertenecen al borrador.

## Pruebas y vista previa

`npm test`, `npm run build` y ESLint de los archivos modificados. Hay pruebas de carga múltiple, movimientos, borradores, compatibilidad, eliminación de sedes, huecos y conflictos. El lint global conserva errores preexistentes en otros módulos y el build advierte sobre el tamaño del bundle.

`npm run preview:planner` abre `/planner-preview/` con datos ficticios y almacenamiento local bajo `xim-planner-demo`. `npm run build:planner-preview` genera `dist-preview/planificador.html`. Esta vista es independiente de la autenticación y no se incluye en producción.

Para desplegar, verificar que esté aplicada la migración `018_admin_planner.sql` antes de publicar el frontend. En el entorno de prueba el usuario confirmó su ejecución. Las pruebas locales no escriben en Supabase.
