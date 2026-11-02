# Semana laboral (administradores)

El planificador representa un único armado de lunes a viernes por día y horario. No usa fechas, períodos, repeticiones ni semanas de calendario.

## Uso

- Entrar como administrador y abrir **Agenda** (`/admin/planner`).
- Al tocar un espacio vacío de la grilla, elegir **Clase**, **Actividad** o **Traslado** abre el formulario con día y horario precargados, ajustados a 15 minutos.
- El buscador filtra al escribir por nombre, alumno, sede, origen, destino, notas, día y tipo, sin distinguir mayúsculas ni tildes. Se combina con los filtros existentes y muestra la cantidad de coincidencias. Los totales y avisos mantienen el contexto del armado completo.
- El resumen muestra el tiempo semanal en traslados en horas y minutos, tanto en el armado actual como en el borrador.
- **Agregar clase**: seleccionar alumno (opcional), nombre, sede, uno o varios días, horario y duración. Lunes, miércoles y viernes crea tres bloques independientes en una sola operación.
- **Agregar traslado** crea un bloque identificado con →, origen y destino opcionales, días, horario y duración individual desde un minuto. Los filtros por sede incluyen origen y destino, y ambos quedan protegidos contra eliminación mientras estén en uso. Los traslados ocupan horario y participan en borradores, movimientos y superposiciones.
- **Agregar actividad** permite cargar paseos u otros compromisos con nombre, días, horario, duración y notas. No requiere alumno y la sede es opcional. Se identifica con ◇ y borde discontinuo; puede moverse, editarse y eliminarse como las clases.
- Vistas **1 día**, **2 días** y **Semana**. En móvil (menos de 768 px) se abre un día; las otras pantallas abren la semana. Las flechas junto al nombre del día permanecen en el encabezado fijo y permiten avanzar o retroceder entre lunes y viernes sin volver arriba. También se puede deslizar horizontalmente en las vistas de uno o dos días; el desplazamiento vertical conserva el día y no mueve bloques.
- La grilla incluye las 24 horas y abre en las 7:00. Mantiene encabezados fijos y escala de 40 px por hora en todos los dispositivos. En PC los bloques de 45 minutos o más muestran la sede.
- Con mouse se puede arrastrar un bloque. Con el dedo o lápiz se desplaza la vista sin arrastrar bloques; para moverlos, tocarlos y elegir **Mover en la grilla**, luego tocar el destino. Los movimientos se ajustan a 15 minutos.
- **Probar cambios** crea un borrador persistente del armado. **Armado actual** permite comparar y **Retomar borrador** seguir trabajando. **Aplicar cambios** actualiza el armado; **Descartar** conserva el original.
- La eliminación de una clase la quita del armado o del borrador, según el modo activo.
- **Administrar sedes** permite crear sedes y eliminar las que no estén referenciadas por el armado o el borrador.
- Los filtros por alumno y sede no afectan el cálculo de superposiciones, traslados ni búsqueda de huecos. Las actividades también ocupan horario. Los traslados se cargan explícitamente y no se suma un margen automático adicional.
- El buscador usa días disponibles, franja horaria, duración y sede. La búsqueda respeta los bloques de traslado cargados; el antiguo margen global ya no se usa en la vista laboral.

## Persistencia y compatibilidad

Se mantiene la tabla privada `admin_planners` de la migración `018_admin_planner.sql`, ya existente. No hace falta otra migración: el nuevo modelo se guarda en `data.weeklyPlan`, con clases que contienen `day` (0 = lunes, 4 = viernes), horario, duración, alumno, sede y notas. El borrador contiene copia original y propuesta. Cada bloque distingue `kind` (`class`, `activity` o `transfer`); los anteriores sin este campo se interpretan como clases. No se guardan fechas ni recurrencias en este modelo.

Si todavía hay datos del planificador anterior, se adapta una semana al esquema laboral: se busca primero una semana con clases en el período actual o siguiente, y luego entre las semanas originales disponibles. Se respetan las excepciones de esa semana y se excluyen sábados y domingos. Se muestra un aviso para revisar la adaptación. Los datos originales y borradores anteriores se conservan en el JSON como respaldo y no se modifican; el nuevo armado empieza a persistirse al guardar. Una vez guardado, el esquema es independiente del calendario y no vuelve a importar clases antiguas aunque se eliminen todas las nuevas.

RLS permite únicamente al administrador propietario leer y escribir su planificador. La ruta y el menú son exclusivos del administrador. El guardado conserva el control de revisión optimista contra cambios de otras pestañas. Al aplicar un borrador se comprueba que las clases afectadas no hayan cambiado en el armado actual y se conservan las clases nuevas que no pertenecen al borrador.

## Pruebas y vista previa

`npm test`, `npm run build` y ESLint de los archivos modificados. Hay pruebas de carga múltiple, movimientos, borradores, compatibilidad, eliminación de sedes, huecos y conflictos. El lint global conserva errores preexistentes en otros módulos y el build advierte sobre el tamaño del bundle.

`npm run preview:planner` abre `/planner-preview/` con datos ficticios y almacenamiento local bajo `xim-planner-demo`. `npm run build:planner-preview` genera `dist-preview/planificador.html`. Esta vista es independiente de la autenticación y no se incluye en producción.

Para desplegar, verificar que esté aplicada la migración `018_admin_planner.sql` antes de publicar el frontend. En el entorno de prueba el usuario confirmó su ejecución. Las pruebas locales no escriben en Supabase.
