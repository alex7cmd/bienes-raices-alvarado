# Seguimiento: Bienes Raíces Alvarado / Qavalta

Actualización: 2026-11-16 · revisión local `v1.10.0`.
Proyecto: `/Users/alejandrofernandez/Documents/bienes-raices-alvarado`.
Demo de referencia: https://alvarado.commandigital.biz/
Estado: correcciones verificadas localmente; esta revisión no se ha publicado.

## Objetivo
Mantener la página pública, el plano interactivo y Alvarado Studio; corregir errores y mejorar el rendimiento del código y las imágenes respetando el diseño existente.

El seguimiento anterior se conserva dentro del respaldo original verificado. Sus propuestas y listas históricas no constituyen evidencia de que un desarrollo esté listo para producción.

## Arquitectura comprobada
- Frontend: HTML, CSS y JavaScript, sin Next.js, React ni Vite.
- Servidor: Node.js con Express 5 y Multer.
- Datos persistentes: `data/db.json`; no hay SQLite, MySQL ni PostgreSQL implementados. Este archivo está excluido de Git.
- Sesiones: tokens en memoria, cookie HttpOnly y SameSite=Lax, expiración de ocho horas. En producción la cookie también usa Secure; las sesiones terminan al reiniciar el proceso.
- Imágenes y videos subidos: `public/uploads/`, también excluidos de Git.
- Planos: geometría local en `public/assets/maps/data/`; cinco desarrollos consultan la API de Qavalta. Torres usa pisos locales. La API combina los datos disponibles con las modificaciones del administrador.
- La caché remota dura un minuto y reutiliza peticiones simultáneas. Ante un fallo se identifica la copia local o la última sincronización; no se declara una actualización exitosa.

## Correcciones verificadas
- Se eliminó la regeneración de la base por cantidad de lotes o ausencia de mapVersion: conserva precios, textos, solicitudes y modificaciones al reiniciar.
- La sincronización lee la base después de esperar la API externa para conservar solicitudes recibidas durante esa espera.
- Se validan números, estados, prototipos y URLs antes de guardar; errores de API y archivos devuelven respuestas controladas.
- El CMS muestra la lista completa, incluidos los 422 lotes de Oporto; ya no corta silenciosamente en 150.
- Se corrigió la apertura del mapa desde botones que antes podían pasar el evento del navegador como nombre de desarrollo.
- Se homogeneizó el filtro No disponible y se reflejan modificaciones de departamentos en cada piso.
- Un lote sin prototipo confirmado muestra Sin asignar; se eliminó la asignación derivada de su número o superficie.
- Los precios de referencia del mapa provienen del catálogo editable; un precio de lote se muestra únicamente si existe.
- La galería utiliza la imagen guardada y sus fotos asociadas, sin rellenarla con casas ajenas.
- El carrusel respeta las imágenes del CMS y carga las siguientes imágenes conforme se necesitan; no duplica sus escuchas al volver a renderizar.
- Se escapan los textos al construir HTML, incluidos resultados de búsqueda.
- El formulario confirma una solicitud de visita registrada; la cita requiere confirmación del asesor. El servidor guarda solicitudes, pero no envía correos.
- Las cantidades visibles se calculan con los elementos del plano cargado y no representan una certificación del inventario comercial.

## Imágenes
- Revisadas: 82; optimizadas: 53.
- Peso total de las imágenes revisadas: 30,445,093 → 22,730,760 bytes; ahorro 25.3 % (7,714,333 bytes).
- Cuatro planos pasan de 9000 × 6600 a 4500 × 3300; la geometría SVG conserva sus coordenadas originales y se escala sobre la imagen.
- Se comprobó decodificación, dimensiones y conservación exacta del canal alfa de las imágenes optimizadas respecto a la imagen preparada para codificar. Las fotografías usan compresión con pérdida; los originales permanecen en el respaldo.
- Los seis planos de pisos conservan su archivo original porque la variante ensayada resultó más pesada.
- Las nuevas imágenes JPG/PNG/WebP subidas desde el CMS se preparan en el navegador a un máximo de 1920 píxeles y WebP si reduce el peso. GIF y videos se conservan. No hay un compresor de imágenes en el servidor.
- El script `scripts/optimize-images.py` permite repetir la preparación desde una copia original; requiere Pillow y no debe aplicarse repetidamente sobre variantes ya comprimidas.

## Inventario técnico observado en archivos de planos
| Desarrollo | Elementos en el plano |
| --- | ---: |
| Sorento | 262 |
| Oporto | 422 |
| Ardenza | 285 |
| Montalese | 392 |
| Torres Qavalta | 43 unidades en 6 pisos |
| Vittoria | 472 |

Las cifras anteriores se verificaron en los archivos y en la interfaz local; el cliente debe confirmar su correspondencia comercial.

## Verificación
- `npm test`: 24 pruebas aprobadas, con datos aislados. Incluye conservación de datos, sincronización concurrente, validaciones, autenticación, rutas, cargas y representación del CMS.
- `npm audit --omit=dev`: cero vulnerabilidades reportadas por el registro consultado el 2026-11-16; no equivale a una auditoría integral de seguridad.
- Chrome: navegación de los seis desarrollos, mapas, filtro No disponibles, galería, inicio de sesión y listado de 422 lotes.
- Se revisó ancho de página a 390, 768 y 1440 píxeles; sin desbordamiento horizontal observado.
- Se revisaron recortes comparativos de planos y no se observaron imágenes rotas entre las cargadas en la comprobación final.

## Operación y pendientes
- Ejecutar `npm ci`, `npm test` y `npm start` en una copia local. Express 5 requiere Node.js 18 o superior; usar una versión mantenida del servidor.
- Para producción configurar `NODE_ENV=production`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el alojamiento. Sin ADMIN_PASSWORD el acceso de administrador permanece deshabilitado en producción. La clave de demostración no se muestra en la página.
- Confirmar permisos y almacenamiento persistente para `data/db.json` y `public/uploads/`; un despliegue no debe reemplazarlos con datos de prueba.
- Esta revisión no cambió el alojamiento, el dominio, DNS, GitHub ni la demo en línea. Falta revisar la configuración real del alojamiento antes de publicar.
- Validar precios por desarrollo, asignación de prototipos a lotes, disponibilidad, fotos y amenidades con el cliente. El catálogo actual tiene un precio por prototipo compartido entre desarrollos.
- Confirmar logotipo oficial de Qavalta, datos de contacto, redes sociales y dominio final.
- Si se desea enviar correos o confirmar agendas automáticamente, esas integraciones siguen pendientes.

## Referencias técnicas
- Express 5: https://expressjs.com/en/5x/api/
- Codificación WebP con Pillow: https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp

## Preparación de publicación solicitada posteriormente
El usuario autorizó configurar la contraseña del administrador y publicar en alvarado.commandigital.biz. Se comprobó el despliegue automático de main en SiteGround y se añadió almacenamiento compartido entre builds con migración verificada de la base y las cargas. El respaldo previo de producción se descargó y verificó localmente. La publicación continúa pendiente de configurar ADMIN_PASSWORD y realizar el push. Ver IA/DESPLIEGUE.md.

## Ajuste de interfaz 1.10.1
- Confirmación de sincronización correcta: píldora fija superior, fondo verde claro, texto verde oscuro y cinco segundos de visibilidad; errores mantienen su aviso independiente.
- Editor de portada: ubicación Inicio → Banner principal, vista previa que sigue los cambios del formulario, ayuda sobre la primera imagen del carrusel y teléfono del pie de página. Las tarjetas de desarrollos indican dónde aparecen sus imágenes.
- La vista previa no guarda contenido; Guardar portada conserva la acción explícita de publicación.

## Contexto y vista previa de prototipos — 1.10.2
El CMS muestra una vista previa de imagen, precio, descripción, superficie, recámaras, baños y video por prototipo. Indica los desarrollos en los que aparece y aclara que Guardar actualiza la ficha compartida. Los borradores no modifican el catálogo publicado. Portada muestra seis miniaturas numeradas: la primera corresponde a su formulario y las otras llevan al campo de imagen del desarrollo.

También se eliminó la pausa de logos de financiamiento al pasar el mouse y se aumentaron los indicadores de cantidad de prototipos a círculos de 36 píxeles con números de 17 píxeles.


## Correcciones de mapas, carrusel y sesión — 1.10.3
- /admin restaura el panel y la sección seleccionada al recargar si la sesión sigue válida. Aviso de tiempo restante basado en expiresAt del servidor, plazo absoluto de ocho horas, alerta antes de cinco minutos y solicitud de acceso al expirar. Recargar no renueva la sesión. Las sesiones en memoria terminan también si el servidor se reinicia.
- Carrusel y sus miniaturas usan el mismo origen. Cada desarrollo tiene heroImage independiente de image de la ficha; las fotografías panorámicas originales son los valores de respaldo. La primera se edita en Portada principal; las otras en el campo específico de cada desarrollo.
- Oporto recupera el fondo original oficial con recorte SVG que conserva los lotes; logo completo centrado con contraste en ambos temas. Fondo y logo comparten un único WebP de 953948 bytes.
- Torres consulta /api/torres?desarrolloId=6 para sincronizar departamentos. Se agregó la geometría oficial del lote _Mza17Lote16 de Vittoria. CMS y mapa de inicio muestran los cuatro estados.
- Cotejo completo de identificadores y estados: Sorento262, Oporto422, Ardenza285, Montalese392, Torres43 y Vittoria473; sin faltantes, sobrantes ni diferencias al verificar. Los cambios explícitos de estado del administrador siguen teniendo prioridad.
- Validación: pruebas de ruta/cache, caducidad, fotografías separadas, sincronización, persistencia y revisión visual de escritorio/móvil. La publicación se comprueba por HTTPS tras el push.

El cierre de sesión se movió a un menú del icono de usuario en la esquina superior derecha. Admite cierre con Escape, clic fuera y navegación por teclado.


## Compatibilidad de hosting y proporciones — 1.10.5
Se reprodujo el404 de /admin usando una carpeta de prueba oculta como .nodeapp del servidor. sendFile con ruta absoluta rechazaba ese directorio; ahora sirve index.html relativo a la raíz pública, manteniendo denegado el acceso a archivos ocultos. La prueba pasa en esa misma estructura.
Indicadores de prototipos48×48px y número22px, centrados verticalmente en la tarjeta. El mapa de ubicación ocupa la altura restante de la columna para alinear su borde con las características del prototipo.
