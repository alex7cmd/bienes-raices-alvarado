# Publicación en SiteGround

Revisión: 2026-11-16. Destino autorizado: https://alvarado.commandigital.biz/.

## Flujo comprobado

El proyecto de SiteGround está conectado a `alex7cmd/bienes-raices-alvarado`, rama `main`, con despliegue automático activo. Configuración observada: Express, Node.js 22 y npm.

El código preparado se prueba antes de hacer push. No se debe subir una contraseña al repositorio ni incorporar la base de producción al código fuente.

## Variables

Se configuran en Site Tools > Node.js > Deployment Options:

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | `production` |
| `ADMIN_EMAIL` | Correo actual del administrador |
| `ADMIN_PASSWORD` | Contraseña elegida y guardada directamente por el propietario |
| `APP_DATA_DIR` | Carpeta compartida fuera del directorio de cada build; se resuelve respecto a la raíz de la aplicación |
| `APP_MIGRATION_SOURCE` | Raíz física de la versión anterior, únicamente para la primera migración |

En el árbol observado de SiteGround cada build contiene `app_source`; la carpeta compartida se configura como `../../shared-alvarado` desde esa raíz. El origen debe señalar el directorio físico confirmado del build anterior, con el formato `../../ID_BUILD_ANTERIOR/app_source`, evitando el enlace cambiante `latest`.

## Conservación de datos

`data/storage.js` prepara `db.json` y `uploads/` fuera de los builds. La primera ejecución copia la base de la versión anterior, valida JSON y SHA-256, guarda un respaldo de la base y comprueba las copias de las cargas. Al terminar escribe `migration-complete.json`.

Los reinicios posteriores utilizan los datos compartidos; no vuelven a copiar el catálogo anterior. Si la base persistente desaparece, el inicio se detiene para evitar reemplazarla con datos de demostración. Si falla la primera migración, debe revisarse la causa antes de eliminar archivos o reintentar; no se debe sustituir una base distinta automáticamente.

Los archivos compartidos no se sirven como parte de los recursos públicos. Solo `uploads/` se monta explícitamente en `/uploads`. La base, su respaldo y el registro de migración permanecen fuera de esa ruta.

## Comprobación después de publicar

1. Confirmar en Node.js > Logs que el commit esperado figura como activo.
2. Comprobar por HTTPS que HTML y JavaScript corresponden a la revisión nueva.
3. Comparar el catálogo público con el respaldo previo y revisar los seis planos.
4. Confirmar `migration-complete.json`, el hash de la copia y la presencia de cargas.
5. Verificar el acceso del administrador sin compartir su contraseña en el chat.
6. Conservar el build anterior hasta verificar la migración. No eliminar `shared-alvarado` al limpiar builds antiguos.

## Reversión

Si la compilación falla, revisar los registros y conservar los archivos anteriores. La reversión de una versión publicada debe mantener el código de almacenamiento compartido o volver a señalar explícitamente la base correcta; publicar el servidor antiguo sin esta adaptación haría que volviera a utilizar datos propios de cada build.

No se modifica DNS ni el dominio como parte de esta publicación.

Referencia de SiteGround: https://es.siteground.com/kb/gestionar-proyecto-node-js.
