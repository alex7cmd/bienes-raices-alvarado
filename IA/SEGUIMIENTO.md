# Seguimiento: Bienes Raíces Alvarado / Qavalta

Actualización vigente: 2026-11-16 · Versión 1.0 (`1.0.0`).

Estado actual: Versión 1.0 preparada y verificada para publicación autorizada. Base de esta revisión: d99085a. El historial inferior conserva resultados de revisiones anteriores; el apartado Versión 1.0 describe el comportamiento vigente.

## Historial de la revisión inicial1.10.0
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
- Sesiones: archivos privados persistentes en APP_DATA_DIR/sessions, cookie HttpOnly y SameSite=Lax, Secure en producción y vencimiento absoluto de ocho horas. Reiniciar o recargar no amplía el plazo; cerrar sesión revoca el archivo compartido.
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


## Acceso, editor único y recorridos —1.10.6
- /admin presenta una página de fondo azul sólido con correo y contraseña, sin modal ni panel de gestión detrás. Conserva la restauración de sesión/sección y el aviso de caducidad absoluta.
- Las seis fotos del hero se editan desde seis miniaturas y un solo formulario con vista previa. Orden: Sorento, Oporto, Ardenza, Montalese, Torres Qavalta y Vittoria. Sorento guarda site.heroImage; las otras guardan heroImage de su desarrollo.
- Se retiraron del CMS las imágenes antiguas de tarjetas que no se usan en la página pública. Sus valores almacenados se conservan. Textos/contacto tienen su propio guardado; datos de desarrollo editan solo nombre/precio e indican dónde aparecen.
- Cinco circuitos de autos trazados sobre calles blancas interiores, tres autos por privada y curvas redondeadas. IDs únicos por SVG para evitar que el plano integrado y pantalla completa compartan referencias. Torres no usa tráfico sobre sus pisos. No se alteraron fondos, lotes ni inventario.
- Revisión geométrica externa:2696 posiciones con huella118×60 (auto108×46), sin cruces de lotes, césped ni zonas transparentes. Se separaron los píxeles de dos autos amarillos impresos en los mapas originales del clasificador de vegetación. Es un muestreo geométrico, complementado con inspección visual en Chrome.
- Chrome1440×1000 y390×844: acceso sólido, cierre de sesión, restauración de Prototipos al recargar, selección de seis imágenes, borradores, guardado local de Oporto y ausencia de desborde horizontal. Mapas de seis desarrollos inspeccionados; recorridos compartidos en vista integrada y pantalla completa.
- Pruebas automatizadas:31 aprobadas; incluyen referencias independientes de animación y acceso al caducar. No se usaron credenciales de producción. Base operativa y uploads se excluyen de los archivos de publicación.


## Versión 1.0 — selección oficial y ajustes de interfaz
- Fuente privada correcta: /api/lotes?slug= del sitio oficial, campos protoName y protoPrecio. Torres conserva departamentos por piso. Los filtros se construyen desde asignaciones reales; las modificaciones administrativas conservan prioridad.
- Cotejo completo: 1,877 unidades, seis planos, cero diferencias de identificador, estado o prototipo. Los 32 filtros renderizados resaltan exactamente los identificadores oficiales. Sorento: Ruche25 y Malvasia28.
- Menú medido por ResizeObserver: su borde inferior coincide con el hero y sus laterales con el panel a1440/1024/390px, sin desborde horizontal. Sombras cortas y sin franja rectangular.
- Autos móviles15% mayores. Máscaras SVG precisas retiran63 autos fijos de los cinco fondos; no se alteran imágenes originales. Huella real y sombra verificadas en2694 posiciones sin invadir lotes, césped ni exterior.
- Rojo Qavalta sutil en bordes, iconos, foco, pestañas, selección y formularios del sitio y administrador; colores de disponibilidad conservados.
- Sesiones persistentes entre procesos; firma vinculada al token y credenciales configuradas. No se guardan token bruto ni contraseña. Nueva validación al abrir el administrador, sin destello de formulario durante restauración. Acceso válido por ocho horas, con vencimiento fijo. Una sesión creada antes de esta publicación puede requerir un nuevo inicio.
-37 pruebas aprobadas. Acceso local, navegación público/admin y reinicio de Node comprobados conservando el mismo vencimiento.
- TikTok se añadió en una segunda publicación de Versión1.0, descrita abajo.


## TikTok de Itzel — segunda publicación Versión1.0
- Ocho videos públicos de @itzealva, seleccionados a partir de captions y del inventario oficial. No se utiliza el feed personal completo ni fotos. Catálogo revisable: public/assets/qavalta-videos.json.
- Sorento3, Oporto2, Ardenza1; Montalese2 y Vittoria2 comparten los recorridos de Arveto y Belat, identificados como modelos disponibles en ambas privadas. No se afirma la ubicación del rodaje. Torres permanece sin videos porque no se identificó uno verificable.
- Bloque antes del plano, ancho completo del mapa conservado. Reproductores oficialesTikTok con el código ofrecido por Compartir→Insertar: carga diferida y reproducción automática silenciada. Al terminar se cierra el reproductor seleccionado para evitar recomendaciones ajenas. Enlace directo alternativo.
- Implementación basada en https://developers.tiktok.com/docs/en/embed-player y https://developers.tiktok.com/docs/en/embed-videos; se conserva embed_from=webapp_share del código de inserción ofrecido por TikTok.
- Validación39pruebas completas: selección por pestaña, ordenantesmapa, rechazo de URLs externas/otrosusuarios/fotos yescape de títulos. Chrome: reproducción real de Sorento avanzóa00:36,8reproductores mostraron contenido, cinco pestañas clasificadas yTorressinbloque. Móvil390px: una columna ysin desborde.
- La selección es editorial; nuevos videos no se incorporan automáticamente al sitio.

- La primera verificación en producción detectó authentication_failed en TikTok, aunque los mismos videos reproducían en localhost. Se adaptó al formato exacto de Compartir→Insertar y se añadió recuperación: si TikTok no confirma estar listo en12s después de cargar, se muestra el enlace directo al video. Los mensajes se validan por origen y ventana; se ignoran errores exclusivos de autoplay. No se alteran cookies ni protecciones del navegador para eludir la respuesta del proveedor. La reproducción definitiva de producción debe verificarse tras esta corrección.

- Comprobación final de c5cd5e4 en producción: TikTok mantiene authentication_failed; los ocho videos siguen disponibles por enlace público. La alternativa de enlaces se muestra correctamente tras el fallo, sin exponer el error interno ni cambiar la selección. Se compacta a170px de alto para evitar espacios vacíos. La reproducción incrustada en producción queda PENDIENTE por la respuesta de TikTok; no declarar esa parte terminada ni atribuirle requisitos de cuenta no comprobados. Los demás ajustes de Versión1.0 y los enlaces clasificados están publicados y verificados.

- Para que los visitantes no vean el error durante la espera, la selección publicada tiene embedEnabled:false: muestra de inmediato las tarjetas con enlaces correctos y no solicita los iframes que TikTok rechaza. El reproductor y su recuperación permanecen implementados y probados localmente; reactivar únicamente después de verificar que TikTok acepte el dominio. No presentar los enlaces como reproducción incrustada ya resuelta.


## Cuatro autos separados en cada plano con calles
- Petición del usuario: cuatro autos por mapa en puntos diferentes, sin circular juntos.
- Sorento, Oporto, Ardenza, Montalese y Vittoria: cuatro autos con desfases de0,10.5,21 y31.5segundos sobre el circuito de42segundos. Distribución a un cuarto del recorrido y velocidad uniforme explícita para conservar la distancia.
- Se conservan las rutas ya comprobadas y el tamaño aumentado15%. Torres muestra planos interiores de departamentos, sin calles ni vehículos.

- Petición adicional: sustituir el gris de No disponible por naranja, como en el plano original. Se aplica al relleno y trazo SVG en todos los planos, y a su leyenda e insignia de estado. No cambia estados ni asignaciones.


## Ampliación de zoom
- Máximo800% para plano integrado, botones de pantalla completa y rueda del ratón. Restablecer conserva100%.
- El plano es híbrido: polígonos y trazos de lotes y vehículos enSVG; imagenraster para fondo, números, calles y vegetación. El zoom adicional no convierte esa imagen en vectores ni aumenta su resolución.
