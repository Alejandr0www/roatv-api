# API fuera del PC

Preparación para Render Free, comprobada contra su documentación el 16 de octubre de 2026. No se ha creado cuenta, desplegado ni contratado ningún servicio.

## Qué se aloja

Solo la API de catálogo, metadatos y consultas de fuentes. No se descargan torrents ni se retransmiten películas desde Render: el motor de reproducción se ejecuta en Android. Favoritos e historial siguen siendo locales al dispositivo. SQL Server está deshabilitado.

## Despliegue

1. Usa un repositorio privado con `render.yaml`, `roa_tv_api` y, opcionalmente, `roa_tv` en su raíz. No subas `.env`, `test-tools`, logs, compilaciones ni datos personales. Este proyecto no se ha publicado automáticamente.
2. Crea una cuenta Render y conecta el repositorio. Usa New → Blueprint y el plan **Free** definido en `render.yaml`.
3. Introduce las variables secretas en Render: `TMDB_TOKEN` y los manifiestos que quieras usar. Los proveedores que no uses pueden quedar vacíos. No los pegues en el código ni en el chat.
4. Espera a que el despliegue termine y abre `https://TU-SERVICIO.onrender.com/api/health`. Debe indicar `ok: true` y `catalogConfigured: true`.
5. En RoaTV → Ajustes, guarda esa dirección HTTPS sin `/api/health`, comprueba conexión y prueba con el PC apagado.
6. Si alojas también la web, añade su origen HTTPS a `CORS_ORIGINS`. Android no necesita CORS.

La imagen Docker escucha en `0.0.0.0` y utiliza el `PORT` del alojamiento. Excluye `.env` y ejecuta Node sin privilegios. El contenedor no se ha construido en esta máquina porque Docker no está instalado; sí se han probado los módulos Node localmente.

## Límite de la opción gratuita

Render Free suspende el servicio tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en arrancar de nuevo. Tiene cuotas de uso; no es una garantía de servicio permanente ni de inicio rápido. No se ha configurado ningún mecanismo para evitar la suspensión. La app espera hasta 100 segundos por petición, pero una respuesta intermedia del alojamiento puede requerir Reintentar.

Fuente: https://render.com/docs/free

Para continuar el despliegue falta que crees/inicies sesión en tu cuenta y conectes el repositorio. No necesito tu contraseña. Eliminar la dependencia del PC queda pendiente hasta completar ese paso y probar la URL pública.
