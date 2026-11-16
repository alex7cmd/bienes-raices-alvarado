# Seguimiento del Proyecto: Qvalta / Bienes Raíces Alvarado

**Ubicación del proyecto:** `/Users/alejandrofernandez/Documents/bienes-raices-alvarado`  
**Fecha de inicio:** 2026-11-15  
**Última actualización:** 2026-11-16 (`v1.9.8`)  
**URL Demo en vivo:** `https://alvarado.commandigital.biz`  
**Estado:** Demo funcional completa y sincronizada con `planos.qavalta.com` (lista para revisión final del cliente)

---

## 1. Objetivo del Proyecto
Rediseñar y reconstruir la plataforma web de **Bienes Raíces Alvarado (Qvalta Residencial)** con un enfoque **minimalista, claro y de pocos clics**, manteniendo el logotipo actual de Bienes Raíces Alvarado, incorporando:
1. **Página web pública (Usuario / Visitante):** Hero limpio + acceso directo a desarrollos y prototipos.
2. **Plano interactivo a pantalla completa (Modo Presentación):** Ocupa todo el canvas (`100vw × 100vh`) para que el **Administrador**, estando frente al cliente tras iniciar sesión desde el icono superior derecho, muestre el fraccionamiento sin controles de edición visibles. Incluye zoom/pan, filtros por prototipo, contadores y selección por número de casa/lote con estados (`Disponible`, `No disponible`, `Vendido`), área de terreno, recámaras, baños y precio. *(Se inicia con un trazado SVG de referencia basado en la fotografía compartida y datos aleatorios de demostración).*
3. **Apartado de Edición del Administrador (CMS propio cerrado):** Vista separada (no visible durante la presentación del plano) donde el **Administrador** edita disponibilidad por número de casa/lote, precios, textos, imágenes y videos, **sin alterar el diseño ni la estructura de la página**.

---

## 2. Análisis de la Página Actual (`https://bienesraicesalvarado.com.mx/`)
- **Tecnología actual:** WordPress con tema inmobiliario **WPResidence** + Slider Revolution + WPForms.
- **Estructura de navegación actual:** `Inicio`, `Privadas` (`Ardenza`, `Oporto`, `Sorento`), `Transporte`.
- **Prototipos detectados en el Home:**
  - `MALVASIA` — $4,500,000 | 4 rec | 5 baños | 242 m² (No disponible)
  - `BELORA` (URL `areni-ampliacion`) — $2,320,000 | 3 rec | 2 baños | 113 m² | 2 est.
  - `GRACCIANO` — $3,345,000 | 3 rec | 3.5 baños | 140 m² | 2 est.
  - `LOUREIRA` — $2,920,000 | 3 rec | 3.5 baños | 123 m² | 2 est.
  - `RUCHE` — $2,600,000 | 3 rec | 2.5 baños | 105 m² | 2 est.
  - `CARLINA` — $1,970,000 | 3 rec | 2.5 baños | 105 m² | 2 est.
  - `MOSCATEL` — $1,905,000 | 3 rec | 1.5 baños | 105 m² | 2 est.
  - `BELAT` (URL `belta`) — $1,865,000 | 2 rec | 1.5 baños | 80 m² | 2 est.
  - `BRACHETTO` — $1,847,000 | 3 rec | 1.5 baños | 78 m² | 2 est.
  - `ARVETO` — $1,660,000 | 2 rec | 1.5 baños | 90 m² | 2 est.
  - `Areni` — $1,382,000 | 2 rec | 1 baño | 90 m² | 2 est.
  - *(Nota: En la web actual también aparecen `MOSCATO` — $2,050,000 y tarjetas duplicadas de `Areni`, `GRACCIANO` y `LOUREIRA`).*
- **Áreas de mejora detectadas (UX/UI):**
  - Exceso de clics para llegar de un desarrollo a un prototipo y su disponibilidad.
  - Tarjetas duplicadas e inconsistencias entre nombres visibles y URLs (`BELORA` / `areni-ampliacion`, `BELAT` / `belta`).
  - Sobrecarga visual (botones sociales por tarjeta, modal de registro público innecesario, peso alto de scripts WP).

---

## 3. Modelo de Ejecución y Arquitectura Propuesta

### Arquitectura Técnica (Compatible con SiteGround Node.js)
- **Frontend:** Next.js / React (o Vite + React) con diseño minimalista, responsive y soporte táctil (zoom/pan en el plano interactivo).
- **Backend / API:** **Node.js (Express o Fastify)** corriendo en **SiteGround Node.js Projects** (disponible en planes GrowBig/GoGeek/Cloud).
- **Base de datos y almacenamiento:**
  - Datos estructurados (desarrollos, prototipos, lotes, precios, amenidades) en **SQLite** (archivo local versionable, cero configuración externa) o **MySQL/PostgreSQL** de SiteGround.
  - Imágenes almacenadas en carpeta `uploads/` controlada por el backend (optimizadas al subir).
- **Autenticación del propietario:** Login seguro (JWT / sesión HTTP-only) activado desde el **icono de usuario en el header**, que habilita el **Panel / Modo Edición** restringido únicamente a textos, precios e imágenes.

### Roles del Equipo / Flujo de Trabajo
1. **Diseñador Gráfico:** Identidad visual respetando el logotipo de *Bienes Raíces Alvarado*, paleta cromática limpia, tratamiento de fotografías y preparación del plano base (SVG o imagen de alta resolución).
2. **Diseñador UI/UX:** Arquitectura de información sin fricción (máx. 2–3 clics desde Home hasta ver lote/prototipo), jerarquía tipográfica minimalista y experiencia del panel lateral del plano.
3. **Desarrollador Fullstack:** Implementación del frontend, visor SVG/Canvas del plano interactivo, API en Node.js, autenticación del propietario y CMS bloqueado a contenido (sin edición de layout).

---

## 4. Plan de Fases (Checklist)
- [x] **Fase 0:** Creación de estructura en `Documents/bienes-raices-alvarado/IA/` y análisis de la web actual.
- [x] **Fase 1:** Trazado SVG de referencia del plano (248 lotes con datos aleatorios de demostración).
- [x] **Fase 2:** Diseño UI/UX minimalista (Home inspirado en `planos.qavalta.com` + Prototipos sin duplicados).
- [x] **Fase 3:** Plano Interactivo a pantalla completa (`100vw × 100vh`) exclusivo para Administrador en modo presentación (sin botones de edición visibles).
- [x] **Fase 4:** Backend Node.js + CMS cerrado del Administrador (icono en esquina superior derecha, edición de disponibilidad por número de casa, precios, textos, imágenes y videos).
- [x] **Fase 5 (Demo):** Desplegado en **SiteGround (Node.js Projects)** con auto-deploy desde GitHub (`alex7cmd/bienes-raices-alvarado`). Subdominio activo: `https://alvarado.commandigital.biz`.
- [x] **Fase 6 (Sincronización real con `planos.qavalta.com` + Pulido UI/UX):**
  - [x] Integración de los **6 desarrollos reales** (`Sorento`, `Oporto`, `Ardenza`, `Montalese`, `Torres Qavalta` con 6 niveles de departamentos `Flat 1` y `Flat 2`, y `Vittoria`) con sus prototipos, precios y disponibilidad reales (`catalogVersion = 3`).
  - [x] Identidad azul ejecutivo (`#1e5b8f`), favicon hexagonal oficial, logos transparentes de financiamiento en marquesina continua sin salto, y modo claro/oscuro automático + manual (sitio público y CMS).
  - [x] Hero con segundo menú sticky de desarrollos, ficha técnica lineal (`Icono | Etiqueta Valor`), amenidades adaptativas, galería horizontal y mapa de recorrido en Google Maps.
  - [x] Planos `.webp` calados sin fondo blanco exterior (con respaldo en `public/assets/maps/backup/`), logo de **Oporto** en cabecera de columna derecha, animaciones ligeras en mapa (autos en 2 carriles, peatones, pasto y arbolitos con brisa), ondas expansivas en estatus, paneo táctil móvil (embebido y pantalla completa) y `<select>` homologados.
  - [x] Pulido del CMS (**Alvarado Studio**): sin desbordes horizontales en grids/tarjetas, descripción con crecimiento solo vertical y alto estándar (`92 px`), botón **Guardar cambios** al `100%` centrado, miniaturas cuadradas `1:1`, y buscador + filtro por desarrollo en tiempo real en **Prototipos y Precios**.
- [ ] **Fase 7 (Producción / Dominio Final):** Conexión al dominio definitivo y validación final de contenidos con el cliente.

---

## 5. Pendientes del Cliente / Siguientes Pasos
- [ ] Compartir el enlace de Figma (`https://www.figma.com/design/...`) para extraer el **SVG oficial de QAVALTA** y colocarlo en el Hero de la página pública.
- [ ] Revisar en `https://alvarado.commandigital.biz` los 6 desarrollos, el modo claro/oscuro, la vista móvil y el panel **Alvarado Studio** (icono superior derecho).
- [ ] Confirmar si se agregan logotipos individuales en la columna derecha del mapa para el resto de las privadas (como se hizo con **Oporto**).
- [ ] Confirmar datos de contacto finales (WhatsApp, teléfono, correo y redes sociales) y dominio definitivo para apuntar SiteGround en producción.
