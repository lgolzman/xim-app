# XIM: piloto móvil y evolución

## Piloto: web instalable

La web y la instalación móvil usan el mismo frontend y Supabase. El manifest
define una identidad estable, íconos y apertura standalone en iPhone y Android.
El despliegue debe usar HTTPS y servir el manifest y los PNG como archivos,
sin redirigirlos al HTML de la aplicación.

En iPhone: abrir el enlace en Safari, compartir y elegir Agregar a pantalla de
inicio (activar Abrir como app web cuando aparezca). En Android: abrir en Chrome
y elegir Instalar aplicación o Agregar a pantalla de inicio desde el menú.
El acceso sigue controlado por invitaciones y autenticación, no por el enlace.
La sesión de la instalación puede ser independiente de la del navegador.

Esta etapa requiere conexión para cargar y guardar datos. Los borradores locales
de entrenamientos existentes no equivalen a sincronización offline. No se agrega
un service worker ni caché de datos privados en esta etapa; las actualizaciones
siguen el despliegue web y se reciben al volver a cargar la aplicación.

Verificar en dispositivos reales antes de habilitar el piloto: instalación,
ícono, login, reapertura, recuperación de contraseña, teclado, modales, navegación,
consulta de rutina y guardado de entrenamiento. Comprobar también la web desktop.

## Rumbo acordado

1. Robustecer el guardado: una transacción en Supabase para entrenamiento, series
   y notas, con identificador de operación para evitar duplicados al reintentar.
2. Offline: repositorio de datos separado de los componentes, almacenamiento local
   de rutinas y cola persistente de escrituras. Definir conflictos, reintentos,
   aislamiento por usuario y limpieza al cerrar sesión. Sincronizar también al
   abrir la app; no depender de ejecución en segundo plano.
3. Notificaciones: eventos generados en backend y suscripciones por dispositivo,
   con permiso explícito, preferencias y baja al cerrar sesión. Web Push para PWA;
   APNs/FCM para clientes nativos. Nunca incluir datos sensibles en el mensaje.
4. iOS y Android: evaluar Capacitor si alcanza la interfaz web empaquetada.
   Si se necesitan componentes de interfaz realmente nativos, evaluar React
   Native/Expo o clientes nativos. Compartir tipos, validaciones y lógica de
   negocio extraída; las pantallas React DOM/Tailwind requieren adaptación.

Mantener las integraciones de plataforma (enlaces, almacenamiento, ciclo de vida,
notificaciones) separadas de la lógica del entrenamiento al incorporarlas.
Configurar dominio público para invitaciones y recuperación, Universal/App Links
y manejo de sesión al volver del segundo plano en la etapa nativa.

## Referencias

- Instalación PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Web Push iOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Capacitor: https://capacitorjs.com/docs
