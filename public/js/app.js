const state = {
  site: null,
  developments: [],
  prototypes: [],
  lots: [],
  counts: { disponible: 0, no_disponible: 0, vendido: 0 },
  isAdmin: false,
  adminEmail: null,
  selectedLotId: null,
  mapProtoFilter: 'all',
  mapDevSlug: 'sorento',
  mapStatusFilter: 'all',
  devMapsCache: {},
  heroSlideTimer: null,
  heroSlideIdx: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0
};

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);

function featureIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('acceso')) return '🛡️';
  if (n.includes('verdes')) return '🌳';
  if (n.includes('cancha')) return '⚽';
  if (n.includes('ciclo')) return '🚲';
  if (n.includes('familiar')) return '👨‍👩‍👧‍👦';
  if (n.includes('juego')) return '🛝';
  if (n.includes('canino')) return '🐾';
  if (n.includes('salón') || n.includes('salon')) return '🎉';
  if (n.includes('vigilancia')) return '👮';
  return '✨';
}

const FALLBACK_GALLERY_POOL = [
  '/assets/images/casa-1.jpg',
  '/assets/images/casa-2.jpg',
  '/assets/images/casa-3.jpg',
  '/assets/images/casa-4.jpg',
  '/assets/images/casa-5.png',
  '/assets/images/smart-1.jpg',
  '/assets/images/smart-2.jpg'
];

function getProtoGallery(p) {
  if (Array.isArray(p.gallery) && p.gallery.length > 0) return p.gallery;
  const list = [p.image].filter(Boolean);
  for (const img of FALLBACK_GALLERY_POOL) {
    if (!list.includes(img)) list.push(img);
    if (list.length >= 4) break;
  }
  return list;
}

function setCardSlide(card, nextIdx) {
  const wrap = card.querySelector('.proto-img-wrap');
  const track = card.querySelector('.proto-photo-track');
  const dots = card.querySelectorAll('.proto-photo-dot');
  const counter = card.querySelector('.proto-photo-counter');
  if (!wrap || !track || dots.length === 0) return;
  const total = dots.length;
  const idx = ((nextIdx % total) + total) % total;
  wrap.dataset.slideIdx = String(idx);
  track.style.transform = `translateX(-${idx * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  if (counter) counter.textContent = `${idx + 1} / ${total}`;
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2800);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// --- INITIALIZATION ---
async function init() {
  await Promise.all([loadPublicData(), checkAuth()]);
  bindEvents();
}

async function loadPublicData() {
  const data = await api('/api/public/site');
  state.site = data.site;
  state.developments = data.developments;
  state.prototypes = data.prototypes;
  renderPublicSite();
}

async function checkAuth() {
  const res = await api('/api/auth/me');
  state.isAdmin = res.authenticated;
  state.adminEmail = res.email;
  $('adminActiveDot').classList.toggle('hidden', !state.isAdmin);
  $('adminEmailLabel').textContent = state.adminEmail || '';
}

const HERO_SLIDES = [
  { slug: 'sorento', name: 'Sorento', image: '/assets/images/hero-sorento.webp' },
  { slug: 'oporto', name: 'Oporto', image: '/assets/images/hero-oporto.webp' },
  { slug: 'ardenza', name: 'Ardenza', image: '/assets/images/hero-ardenza.webp' },
  { slug: 'montalese', name: 'Montalese', image: '/assets/images/hero-montalese.webp' },
  { slug: 'torres-qavalta', name: 'Torres Qavalta', image: '/assets/images/hero-torres-qavalta.webp' },
  { slug: 'vittoria', name: 'Vittoria', image: '/assets/images/hero-vittoria.webp' }
];

function setHeroSlide(idx) {
  const total = HERO_SLIDES.length;
  state.heroSlideIdx = ((idx % total) + total) % total;
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-slide-dot');
  slides.forEach((el, i) => el.classList.toggle('active', i === state.heroSlideIdx));
  dots.forEach((el, i) => el.classList.toggle('active', i === state.heroSlideIdx));
  const label = $('heroSlideLabel');
  if (label) {
    const cur = HERO_SLIDES[state.heroSlideIdx];
    label.textContent = `${cur.name} · Qavalta Residencial`;
  }
}

function initHeroSlideshow() {
  const container = $('heroSlideshow');
  const dotsEl = $('heroSlideDots');
  if (!container) return;
  container.innerHTML = HERO_SLIDES.map((s, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" style="background-image:url('${s.image}')"></div>
  `).join('');
  if (dotsEl) {
    dotsEl.innerHTML = HERO_SLIDES.map((s, i) => `
      <button type="button" class="hero-slide-dot ${i === 0 ? 'active' : ''}" data-hero-slide="${i}" aria-label="Ver ${s.name}" title="${s.name}"></button>
    `).join('');
    dotsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.hero-slide-dot');
      if (!btn) return;
      setHeroSlide(Number(btn.dataset.heroSlide));
      if (state.heroSlideTimer) clearInterval(state.heroSlideTimer);
      state.heroSlideTimer = setInterval(() => setHeroSlide(state.heroSlideIdx + 1), 5200);
    });
  }
  setHeroSlide(0);
  if (state.heroSlideTimer) clearInterval(state.heroSlideTimer);
  state.heroSlideTimer = setInterval(() => setHeroSlide(state.heroSlideIdx + 1), 5200);
}

// --- RENDER PUBLIC SITE ---
function renderPublicSite() {
  const { site, prototypes } = state;
  $('heroEyebrow').textContent = site.eyebrow;
  $('heroTitle').textContent = site.heroTitle;
  $('heroSubtitle').textContent = site.heroSubtitle;
  initHeroSlideshow();
  $('footerPhone').textContent = site.phoneDisplay;
  $('footerPhone').href = `tel:${site.phoneDisplay.replace(/\s+/g, '')}`;
  $('footerWa').href = `https://wa.me/${site.whatsapp}`;

  renderDevelopmentAccordion('sorento');
  loadInlineDevMap('sorento');

  const latest = [prototypes.find(p => p.id === 'moscatel'), prototypes.find(p => p.id === 'belat')].filter(Boolean);
  const latestEl = $('footerLatestProps');
  if (latestEl) {
    latestEl.innerHTML = latest.map(p => `
      <div class="footer-mini-prop" data-proto="${p.id}">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        <div>
          <strong>${p.name}</strong>
          <span>${mxn.format(p.price)}</span>
        </div>
      </div>
    `).join('');
  }
}

function renderPrototypeDetailPanel(p, slideIdx = 0) {
  if (!p) return '';
  const gallery = getProtoGallery(p);
  const activeIdx = Math.max(0, Math.min(slideIdx, gallery.length - 1));
  const waMsg = encodeURIComponent(`Hola, me interesa información del prototipo ${p.name} (${mxn.format(p.price)}).`);
  return `
    <div class="proto-tab-panel" data-active-proto="${p.id}" data-slide-idx="${activeIdx}">
      <div class="proto-panel-media">
        <div class="proto-panel-stage">
          <img class="proto-panel-main-img" src="${gallery[activeIdx]}" alt="${p.name}" loading="lazy" />
          <button type="button" class="proto-gallery-btn" data-proto-gallery="${p.id}" aria-label="Ver galería de ${p.name}">🖼️ Ver galería</button>
          ${gallery.length > 1 ? `
            <span class="proto-photo-counter proto-panel-counter">${activeIdx + 1} / ${gallery.length}</span>
            <button type="button" class="proto-photo-arrow proto-photo-prev proto-panel-prev" aria-label="Foto anterior">‹</button>
            <button type="button" class="proto-photo-arrow proto-photo-next proto-panel-next" aria-label="Foto siguiente">›</button>
          ` : ''}
        </div>
        ${gallery.length > 1 ? `
          <div class="proto-modal-thumbs proto-panel-thumbs">
            ${gallery.map((src, idx) => `
              <button type="button" class="proto-modal-thumb proto-panel-thumb ${idx === activeIdx ? 'active' : ''}" data-thumb-idx="${idx}" aria-label="Ver foto ${idx + 1}">
                <img src="${src}" alt="${p.name} vista ${idx + 1}" loading="lazy" />
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${p.video ? `<video src="${p.video}" controls style="width:100%;border-radius:12px;margin-top:12px;max-height:220px;"></video>` : ''}
      </div>

      <div class="proto-panel-info">
        <div class="proto-panel-head">
          <div>
            ${p.propertyId ? `<span class="proto-panel-id">ID ${p.propertyId}</span>` : ''}
            <h3>${p.name}</h3>
          </div>
          <strong class="proto-panel-price">${mxn.format(p.price)}</strong>
        </div>
        <p class="proto-panel-desc">${p.description}</p>

        <div class="lot-specs-grid proto-panel-specs">
          <div class="lot-spec-box"><small>📐 Terreno</small><strong>${p.area} m²</strong></div>
          <div class="lot-spec-box"><small>🛏️ Recámaras</small><strong>${p.bedrooms}</strong></div>
          <div class="lot-spec-box"><small>🚿 Baños</small><strong>${p.bathrooms}</strong></div>
          <div class="lot-spec-box"><small>🚗 Estac.</small><strong>${p.parking}</strong></div>
        </div>

        <div class="proto-panel-features">
          <span class="proto-panel-subtitle">Características y amenidades</span>
          <div class="proto-features-chips">
            ${(p.features || []).map(f => `<span class="proto-chip">${featureIcon(f)} ${f}</span>`).join('')}
          </div>
        </div>

        <div class="proto-panel-map">
          <div class="proto-panel-map-head">
            <span>📍 Ubicación · Qavalta Residencial, Pachuca</span>
            <a href="https://maps.google.com/?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo" target="_blank" rel="noopener">Abrir en Google Maps →</a>
          </div>
          <iframe
            title="Mapa ${p.name}"
            src="https://maps.google.com/maps?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo&t=&z=15&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
          ></iframe>
        </div>

        <a href="https://wa.me/${state.site.whatsapp}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa">Solicitar información por WhatsApp →</a>
      </div>
    </div>
  `;
}

function setPanelSlide(panel, protoId, nextIdx) {
  const p = state.prototypes.find(x => x.id === protoId);
  if (!p || !panel) return;
  const gallery = getProtoGallery(p);
  if (!gallery.length) return;
  const idx = ((nextIdx % gallery.length) + gallery.length) % gallery.length;
  panel.dataset.slideIdx = String(idx);
  const mainImg = panel.querySelector('.proto-panel-main-img');
  if (mainImg) mainImg.src = gallery[idx];
  const counter = panel.querySelector('.proto-panel-counter');
  if (counter) counter.textContent = `${idx + 1} / ${gallery.length}`;
  panel.querySelectorAll('.proto-panel-thumb').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });
}

function renderDevelopmentAccordion(openDevId = 'oporto') {
  const container = $('developmentAccordion');
  if (!container) return;

  container.innerHTML = state.developments.map(dev => {
    const devProtos = state.prototypes.filter(p => Array.isArray(p.developments) && p.developments.includes(dev.id));
    const isOpen = dev.id === openDevId;
    const firstProto = devProtos[0];
    return `
      <div class="dev-pill-item ${isOpen ? 'open' : ''}" data-dev-pill="${dev.id}">
        <button type="button" class="dev-pill-trigger" aria-expanded="${isOpen}">
          <div class="dev-pill-left">
            <span class="dev-pill-title">${dev.name}</span>
            <span class="dev-pill-meta">${devProtos.length} prototipo${devProtos.length === 1 ? '' : 's'}</span>
          </div>
          <div class="dev-pill-right">
            <span class="dev-pill-price">Desde ${mxn.format(dev.startingPrice)}</span>
            <span class="dev-pill-arrow">▾</span>
          </div>
        </button>
        <div class="dev-pill-body ${isOpen ? '' : 'hidden'}">
          <div class="dev-pill-subbar">
            <p class="dev-pill-tagline">${dev.tagline} · Qavalta Residencial</p>
          </div>
          <div class="dev-proto-tabs" role="tablist" aria-label="Prototipos de ${dev.name}">
            ${devProtos.map((p, idx) => `
              <button type="button" role="tab" class="dev-proto-tab ${idx === 0 ? 'active' : ''}" aria-selected="${idx === 0}" data-proto-tab="${p.id}">
                <span class="dev-proto-tab-name">${p.name}</span>
                <span class="dev-proto-tab-price">${mxn.format(p.price)}</span>
              </button>
            `).join('')}
          </div>
          <div class="dev-proto-panel-wrap">
            ${firstProto ? renderPrototypeDetailPanel(firstProto, 0) : '<p class="muted">Sin prototipos disponibles.</p>'}
          </div>
          <div class="dev-inline-map-section" data-inline-map="${dev.id}">
            <div class="dev-inline-map-head">
              <div>
                <span class="dev-inline-map-kicker">PLANO MAESTRO INTERACTIVO</span>
                <h4>Mapa de lotes · ${dev.name}</h4>
              </div>
              <div class="dev-inline-map-actions">
                <div class="dev-inline-legend">
                  <span><i class="dot disponible"></i> Disp. <strong data-c="disponible">-</strong></span>
                  <span><i class="dot reservado"></i> Apart. <strong data-c="reservado">-</strong></span>
                  <span><i class="dot vendido"></i> Vend. <strong data-c="vendido">-</strong></span>
                </div>
                <button type="button" class="dev-inline-fs-btn" data-open-fs-map="${dev.id}">⤢ Pantalla completa</button>
              </div>
            </div>
            <div class="dev-inline-map-viewport">
              <div class="dev-inline-zoom-bar">
                <button type="button" class="dev-iz-btn" data-iz="in" title="Acercar">+</button>
                <button type="button" class="dev-iz-btn" data-iz="out" title="Alejar">−</button>
                <button type="button" class="dev-iz-btn" data-iz="reset" title="Restablecer">⟲</button>
              </div>
              <div class="dev-inline-svg-wrap" data-scale="1">
                <svg class="dev-inline-svg" viewBox="0 0 9000 6600" xmlns="http://www.w3.org/2000/svg"></svg>
              </div>
            </div>
            <div class="dev-inline-lot-bar hidden" data-inline-lot-bar="${dev.id}"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openPrototypeModal(protoId, initialIdx = 0) {
  const p = state.prototypes.find(x => x.id === protoId);
  if (!p) return;
  const gallery = getProtoGallery(p);
  let activeIdx = Math.max(0, Math.min(initialIdx, gallery.length - 1));
  const waMsg = encodeURIComponent(`Hola, me interesa información del prototipo ${p.name} (${mxn.format(p.price)}).`);
  $('protoModalContent').innerHTML = `
    <div class="proto-modal-gallery">
      <div class="proto-modal-stage">
        <img id="protoModalMainImg" src="${gallery[activeIdx]}" alt="${p.name}" />
        <button type="button" class="proto-gallery-btn" id="protoModalFullscreenBtn" aria-label="Ver galería a pantalla completa">⤢ Pantalla completa</button>
        ${gallery.length > 1 ? `
          <span class="proto-photo-counter" id="protoModalCounter">${activeIdx + 1} / ${gallery.length}</span>
          <button type="button" class="proto-photo-arrow proto-photo-prev" id="protoModalPrev" aria-label="Foto anterior">‹</button>
          <button type="button" class="proto-photo-arrow proto-photo-next" id="protoModalNext" aria-label="Foto siguiente">›</button>
        ` : ''}
      </div>
      ${gallery.length > 1 ? `
        <div class="proto-modal-thumbs" id="protoModalThumbs">
          ${gallery.map((src, idx) => `
            <button type="button" class="proto-modal-thumb ${idx === activeIdx ? 'active' : ''}" data-thumb-idx="${idx}" aria-label="Miniatura ${idx + 1}">
              <img src="${src}" alt="${p.name} ${idx + 1}" />
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${p.video ? `<video src="${p.video}" controls style="width:100%;border-radius:12px;margin-bottom:16px;max-height:220px;"></video>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;">
      <h2 style="font-size:24px;">${p.name}</h2>
      <strong style="font-size:22px;color:var(--accent);">${mxn.format(p.price)}</strong>
    </div>
    <p style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:16px;">${p.description}</p>
    <div class="lot-specs-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="lot-spec-box"><small>📐 Terreno</small><strong>${p.area} m²</strong></div>
      <div class="lot-spec-box"><small>🛏️ Recámaras</small><strong>${p.bedrooms}</strong></div>
      <div class="lot-spec-box"><small>🚿 Baños</small><strong>${p.bathrooms}</strong></div>
      <div class="lot-spec-box"><small>🚗 Estac.</small><strong>${p.parking}</strong></div>
    </div>
    <div class="proto-features-chips" style="margin-bottom:16px;">
      ${(p.features || []).map(f => `<span class="proto-chip">${featureIcon(f)} ${f}</span>`).join('')}
    </div>
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:13px;">📍 Ubicación · Qavalta Residencial, Pachuca</strong>
        <a href="https://maps.google.com/?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;">Abrir en Google Maps →</a>
      </div>
      <iframe
        title="Mapa ${p.name}"
        src="https://maps.google.com/maps?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo&t=&z=15&ie=UTF8&iwloc=&output=embed"
        style="width:100%;height:190px;border:none;border-radius:12px;"
        loading="lazy"
      ></iframe>
    </div>
    <a href="https://wa.me/${state.site.whatsapp}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa" style="margin-top:4px;">Solicitar información por WhatsApp →</a>
  `;
  if (gallery.length > 1) {
    const updateModalSlide = (nextIdx) => {
      activeIdx = ((nextIdx % gallery.length) + gallery.length) % gallery.length;
      const mainImg = $('protoModalMainImg');
      const counter = $('protoModalCounter');
      if (mainImg) mainImg.src = gallery[activeIdx];
      if (counter) counter.textContent = `${activeIdx + 1} / ${gallery.length}`;
      $('protoModalThumbs')?.querySelectorAll('.proto-modal-thumb').forEach((btn, i) => {
        btn.classList.toggle('active', i === activeIdx);
      });
    };
    $('protoModalPrev')?.addEventListener('click', () => updateModalSlide(activeIdx - 1));
    $('protoModalNext')?.addEventListener('click', () => updateModalSlide(activeIdx + 1));
    $('protoModalThumbs')?.addEventListener('click', (e) => {
      const thumb = e.target.closest('.proto-modal-thumb');
      if (thumb) updateModalSlide(Number(thumb.dataset.thumbIdx));
    });
  }
  $('protoModalFullscreenBtn')?.addEventListener('click', () => {
    $('protoModal').classList.add('hidden');
    openFullscreenGallery(p.id, activeIdx);
  });
  $('protoModal').classList.remove('hidden');
}

let fsGalleryState = { protoId: null, gallery: [], idx: 0 };

function renderFullscreenSlide(nextIdx) {
  const { gallery, protoId } = fsGalleryState;
  if (!gallery.length) return;
  const total = gallery.length;
  const idx = ((nextIdx % total) + total) % total;
  fsGalleryState.idx = idx;
  const img = $('fsGalleryMainImg');
  if (img) {
    img.src = gallery[idx];
    img.alt = `${protoId} vista ${idx + 1}`;
  }
  const counter = $('fsGalleryCounter');
  if (counter) counter.textContent = `${idx + 1} / ${total}`;
  $('fsGalleryThumbs')?.querySelectorAll('.fs-gallery-thumb').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });
}

function openFullscreenGallery(protoId, initialIdx = 0) {
  const p = state.prototypes.find(x => x.id === protoId);
  if (!p) return;
  const gallery = getProtoGallery(p);
  fsGalleryState = { protoId: p.id, gallery, idx: initialIdx };
  $('fsGalleryTitle').textContent = p.name;
  $('fsGalleryPrice').textContent = mxn.format(p.price);
  $('fsGalleryThumbs').innerHTML = gallery.map((src, i) => `
    <button type="button" class="fs-gallery-thumb ${i === initialIdx ? 'active' : ''}" data-fs-idx="${i}" aria-label="Foto ${i + 1}">
      <img src="${src}" alt="${p.name} ${i + 1}" />
    </button>
  `).join('');
  renderFullscreenSlide(initialIdx);
  $('fullscreenGallery').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeFullscreenGallery() {
  $('fullscreenGallery')?.classList.add('hidden');
  document.body.style.overflow = '';
}

// --- VIEW SWITCHING ---
function showOnlyView(viewName) {
  $('publicView').classList.toggle('hidden', viewName !== 'public');
  $('siteHeader').classList.toggle('hidden', viewName !== 'public');
  $('mapView').classList.toggle('hidden', viewName !== 'map');
  $('adminView').classList.toggle('hidden', viewName !== 'admin');
  $('adminDropdown').classList.add('hidden');
  if ($('floatingStack')) {
    $('floatingStack').classList.toggle('on-map', viewName === 'map');
  }
}

async function fetchDevMapData(slug) {
  if (state.devMapsCache[slug]) return state.devMapsCache[slug];
  const res = await fetch(`/assets/maps/data/${slug}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar el plano de ${slug}`);
  const data = await res.json();
  state.devMapsCache[slug] = data;
  return data;
}

function getMapCounts(lots) {
  const c = { disponible: 0, reservado: 0, no_disponible: 0, vendido: 0 };
  for (const l of lots) {
    const s = (l.s || '').toLowerCase();
    if (s === 'disponible') c.disponible++;
    else if (s === 'reservado' || s === 'apartado') c.reservado++;
    else if (s === 'vendido') c.vendido++;
    else c.no_disponible++;
  }
  return c;
}

function buildDevMapSvgMarkup(mapData, { selectedLotId = null, statusFilter = 'all' } = {}) {
  const colors = {
    disponible: { fill: 'rgba(16, 185, 129, 0.52)', stroke: '#047857' },
    reservado: { fill: 'rgba(245, 158, 11, 0.58)', stroke: '#b45309' },
    vendido: { fill: 'rgba(239, 68, 68, 0.50)', stroke: '#b91c1c' },
    'no-disponible': { fill: 'rgba(100, 116, 139, 0.42)', stroke: '#475569' }
  };

  let bgMarkup = '';
  if (mapData.isTower) {
    // Architectural elevation backdrop for Torres Qavalta (960x620)
    bgMarkup = `
      <rect x="0" y="0" width="960" height="620" fill="#f1f5f9" />
      <rect x="65" y="45" width="830" height="535" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
      <rect x="65" y="45" width="830" height="52" rx="14" fill="#0f172a" />
      <text x="480" y="77" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#ffffff">TORRES QAVALTA · TORRE A (6 NIVELES)</text>
      <rect x="467" y="108" width="26" height="448" rx="6" fill="#e2e8f0" stroke="#cbd5e1" />
      <text x="480" y="335" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#475569" transform="rotate(-90 480 335)">ELEVADORES Y ESCALERAS</text>
      <text x="202" y="106" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#64748b">FLAT 1 (68 m²)</text>
      <text x="377" y="106" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#64748b">FLAT 2 (84 m²)</text>
      <text x="582" y="106" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#64748b">FLAT 2 (84 m²)</text>
      <text x="757" y="106" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#64748b">FLAT 1 (68 m²)</text>
    `;
  } else if (mapData.bg) {
    bgMarkup = `<image href="${mapData.bg}" x="0" y="0" width="${mapData.w}" height="${mapData.h}" preserveAspectRatio="xMidYMid meet" />`;
  }

  const sw = mapData.isTower ? 2 : 9;
  const swSel = mapData.isTower ? 4 : 24;

  const lotsMarkup = mapData.lots.map(l => {
    const stKey = l.s === 'apartado' ? 'reservado' : l.s;
    const st = colors[stKey] || colors['no-disponible'];
    const isSel = selectedLotId === l.id;
    const dimmed = statusFilter !== 'all' && stKey !== statusFilter;
    const op = dimmed ? '0.16' : '1';
    const attrs = `class="qmap-lot ${isSel ? 'selected' : ''}" data-lot="${l.id}" fill="${st.fill}" stroke="${isSel ? '#0f172a' : st.stroke}" stroke-width="${isSel ? swSel : sw}" opacity="${op}"`;
    const shape = l.t === 'g'
      ? `<polygon points="${l.d}" ${attrs} />`
      : `<path d="${l.d}" ${attrs} />`;
    if (mapData.isTower) {
      const m = l.d.match(/^M(\d+),(\d+)/);
      const tx = m ? Number(m[1]) + 82 : 0;
      const ty = m ? Number(m[2]) + 34 : 0;
      return `${shape}<text x="${tx}" y="${ty}" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#0f172a" pointer-events="none">${l.id}</text>`;
    }
    return shape;
  }).join('');

  return `${bgMarkup}<g class="qmap-lots-layer">${lotsMarkup}</g>`;
}

async function loadInlineDevMap(slug) {
  const section = document.querySelector(`.dev-inline-map-section[data-inline-map="${slug}"]`);
  if (!section) return;
  const svg = section.querySelector('.dev-inline-svg');
  if (!svg || svg.dataset.loaded === slug) return;
  try {
    const mapData = await fetchDevMapData(slug);
    const counts = getMapCounts(mapData.lots);
    ['disponible', 'reservado', 'vendido'].forEach(k => {
      const el = section.querySelector(`[data-c="${k}"]`);
      if (el) el.textContent = counts[k];
    });
    svg.setAttribute('viewBox', `0 0 ${mapData.w} ${mapData.h}`);
    svg.innerHTML = buildDevMapSvgMarkup(mapData);
    svg.dataset.loaded = slug;
  } catch (err) {
    console.error(err);
  }
}

async function openInteractiveMap(devSlug = null) {
  if (devSlug) state.mapDevSlug = devSlug;
  else if (!state.mapDevSlug) state.mapDevSlug = 'sorento';
  state.selectedLotId = null;
  state.mapStatusFilter = 'all';
  resetZoom();
  showOnlyView('map');
  await renderInteractiveMap();
}

async function openAdminCms() {
  if (!state.isAdmin) {
    $('loginModal').classList.remove('hidden');
    return;
  }
  const data = await api('/api/admin/lots');
  state.lots = data.lots;
  state.prototypes = data.prototypes;
  state.developments = data.developments;
  state.counts = data.counts;
  renderAdminCms();
  showOnlyView('admin');
}

// --- INTERACTIVE SVG MAP (REDRAWN PER DEVELOPMENT + FULLSCREEN) ---
async function renderInteractiveMap() {
  const slug = state.mapDevSlug || 'sorento';
  const dev = state.developments.find(d => d.id === slug) || { id: slug, name: slug, startingPrice: 1382000 };
  const mapData = await fetchDevMapData(slug);
  const counts = getMapCounts(mapData.lots);

  if ($('mapLocBadge')) $('mapLocBadge').textContent = `📍 Qavalta · ${dev.name}`;
  if ($('mapPanelTitle')) $('mapPanelTitle').textContent = dev.name;
  $('mapAvailCount').textContent = `• ${counts.disponible} disponibles`;
  $('countDisp').textContent = counts.disponible;
  if ($('countRes')) $('countRes').textContent = counts.reservado;
  $('countNoDisp').textContent = counts.no_disponible;
  $('countVend').textContent = counts.vendido;
  $('mapStartingPrice').textContent = mxn.format(dev.startingPrice || 1382000);

  if ($('mapDevPills')) {
    $('mapDevPills').innerHTML = state.developments.map(d => `
      <button type="button" class="map-dev-pill ${d.id === slug ? 'active' : ''}" data-mdev="${d.id}">${d.name}</button>
    `).join('');
  }

  $('mapProtoFilters').innerHTML = [
    { id: 'all', label: `Todos (${mapData.lots.length})` },
    { id: 'disponible', label: `Disponibles (${counts.disponible})` },
    { id: 'reservado', label: `Apartados (${counts.reservado})` },
    { id: 'vendido', label: `Vendidos (${counts.vendido})` }
  ].map(f => `<button class="${state.mapStatusFilter === f.id ? 'active' : ''}" data-mstatus="${f.id}">${f.label}</button>`).join('');

  const svg = $('mapSvg');
  svg.setAttribute('viewBox', `0 0 ${mapData.w} ${mapData.h}`);
  svg.innerHTML = buildDevMapSvgMarkup(mapData, {
    selectedLotId: state.selectedLotId,
    statusFilter: state.mapStatusFilter
  });
  renderSelectedLotDetail();
}

function renderSelectedLotDetail() {
  const container = $('panelLotDetail');
  const mapData = state.devMapsCache[state.mapDevSlug];
  if (!state.selectedLotId || !mapData) {
    container.innerHTML = `
      <div class="empty-lot-state">
        <div class="empty-icon">🏠</div>
        <h3>Toca un lote o unidad</h3>
        <p>Selecciona cualquier lote en el plano para ver su manzana, superficie m², estatus y cotizar por WhatsApp.</p>
      </div>
    `;
    return;
  }

  const lot = mapData.lots.find(l => l.id === state.selectedLotId);
  if (!lot) return;
  const dev = state.developments.find(d => d.id === state.mapDevSlug);
  const protoMatch = state.prototypes.find(p => lot.pr && p.name.toLowerCase() === String(lot.pr).toLowerCase())
    || state.prototypes.find(p => Array.isArray(p.developments) && p.developments.includes(state.mapDevSlug))
    || state.prototypes[0];
  const stKey = lot.s === 'apartado' ? 'reservado' : lot.s;
  const statusLabel = {
    disponible: 'Disponible',
    reservado: 'Apartado',
    'no-disponible': 'No disponible',
    vendido: 'Vendido'
  }[stKey] || lot.s;
  const priceDisplay = lot.p > 0 ? mxn.format(lot.p) : (protoMatch ? `Desde ${mxn.format(protoMatch.price)}` : `Desde ${mxn.format(dev?.startingPrice || 1500000)}`);
  const waMsg = encodeURIComponent(`Hola, me interesa información sobre ${lot.n} en ${dev?.name || state.mapDevSlug} (${lot.a} m²).`);

  container.innerHTML = `
    <div class="lot-detail-card">
      ${protoMatch ? `<img src="${protoMatch.image}" alt="${lot.n}" />` : ''}
      <span class="lot-status-pill ${stKey}">${statusLabel}</span>
      <h3>${lot.n}</h3>
      <p style="font-size:12px;color:var(--muted);">${dev?.name || ''} · Manzana / Nivel: ${lot.m || 'N/A'}</p>
      <div class="lot-detail-price">${priceDisplay}</div>
      <div class="lot-specs-grid">
        <div class="lot-spec-box"><small>📐 Superficie</small><strong>${lot.a ? `${lot.a} m²` : 'N/A'}</strong></div>
        <div class="lot-spec-box"><small>🏷️ Estatus</small><strong>${statusLabel}</strong></div>
        <div class="lot-spec-box"><small>🏘️ Privada</small><strong>${dev?.name || state.mapDevSlug}</strong></div>
        <div class="lot-spec-box"><small>🏡 Prototipo</small><strong>${lot.pr || (protoMatch?.name || 'A elegir')}</strong></div>
      </div>
      <a href="https://wa.me/${state.site?.whatsapp || '525537560931'}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa" style="margin-top:8px;">Cotizar lote por WhatsApp →</a>
    </div>
  `;
}

// --- ZOOM & PAN ---
function applyTransform() {
  $('mapSvg').style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  $('zoomPercentLabel').textContent = `${Math.round(state.zoom * 100)}%`;
}

function resetZoom() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
}

// --- ADMIN CMS RENDERING ---
function renderAdminCms() {
  const { lots, counts, prototypes, developments, site } = state;
  $('cmsLotStats').innerHTML = `
    <div class="stat-box"><small>Total de lotes</small><strong>${lots.length}</strong></div>
    <div class="stat-box"><small>Disponibles</small><strong style="color:var(--green)">${counts.disponible}</strong></div>
    <div class="stat-box"><small>No disponibles</small><strong style="color:var(--amber)">${counts.no_disponible}</strong></div>
    <div class="stat-box"><small>Vendidas / Ocupadas</small><strong style="color:var(--blue)">${counts.vendido}</strong></div>
  `;

  renderCmsLotsTable();

  $('cmsPrototypesGrid').innerHTML = prototypes.map(p => `
    <div class="cms-form-card" data-cms-proto="${p.id}">
      <img src="${p.image}" class="cms-preview-img" alt="${p.name}" />
      <h3>Prototipo: ${p.name}</h3>
      <div class="form-grid">
        <label>Precio (MXN)<input type="number" class="p-price" value="${p.price}" /></label>
        <label>Terreno (m²)<input type="number" class="p-area" value="${p.area}" /></label>
        <label>Recámaras<input type="number" class="p-beds" value="${p.bedrooms}" /></label>
        <label>Baños<input type="number" step="0.5" class="p-baths" value="${p.bathrooms}" /></label>
      </div>
      <label style="margin-bottom:10px;">Descripción<textarea rows="2" class="p-desc">${p.description}</textarea></label>
      <label style="margin-bottom:10px;">URL Imagen<input type="text" class="p-img" value="${p.image}" /></label>
      <label style="margin-bottom:10px;">Subir nueva imagen<input type="file" class="p-upload-img" accept="image/*" /></label>
      <label style="margin-bottom:12px;">URL Video (opcional)<input type="text" class="p-video" value="${p.video || ''}" placeholder="https://... o sube archivo" /></label>
      <button class="btn-primary save-proto-btn">Guardar cambios</button>
    </div>
  `).join('');

  $('editHeroEyebrow').value = site.eyebrow;
  $('editHeroTitle').value = site.heroTitle;
  $('editHeroSubtitle').value = site.heroSubtitle;
  $('editPhoneDisplay').value = site.phoneDisplay;
  $('editHeroImage').value = site.heroImage;

  $('cmsDevsGrid').innerHTML = developments.map(d => `
    <div class="cms-form-card" data-cms-dev="${d.id}">
      <img src="${d.image}" class="cms-preview-img" alt="${d.name}" />
      <h3>Desarrollo: ${d.name}</h3>
      <div class="form-grid">
        <label>Nombre<input type="text" class="d-name" value="${d.name}" /></label>
        <label>Precio desde (MXN)<input type="number" class="d-price" value="${d.startingPrice}" /></label>
      </div>
      <label style="margin-bottom:10px;">Descripción corta<input type="text" class="d-tagline" value="${d.tagline}" /></label>
      <label style="margin-bottom:10px;">URL Imagen<input type="text" class="d-img" value="${d.image}" /></label>
      <label style="margin-bottom:12px;">Subir nueva imagen<input type="file" class="d-upload-img" accept="image/*" /></label>
      <button class="btn-primary save-dev-btn">Guardar desarrollo</button>
    </div>
  `).join('');
}

function renderCmsLotsTable() {
  const q = $('lotSearchInput').value.trim().toLowerCase();
  const statusF = $('lotStatusFilter').value;
  const filtered = state.lots.filter(l => {
    const matchQ = !q || l.number.toLowerCase().includes(q) || l.id.toLowerCase().includes(q);
    const matchS = statusF === 'all' || l.status === statusF;
    return matchQ && matchS;
  });

  $('cmsLotsBody').innerHTML = filtered.map(l => `
    <tr data-lot-row="${l.id}">
      <td><strong>#${l.number}</strong> <small style="color:var(--muted)">(${l.id})</small></td>
      <td>Manzana ${l.manzana}</td>
      <td>${l.street}</td>
      <td>
        <select class="lot-proto-select">
          ${state.prototypes.map(p => `<option value="${p.id}" ${p.id === l.prototypeId ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="lot-status-select">
          <option value="disponible" ${l.status === 'disponible' ? 'selected' : ''}>🟢 Disponible</option>
          <option value="no_disponible" ${l.status === 'no_disponible' ? 'selected' : ''}>🟠 No disponible</option>
          <option value="vendido" ${l.status === 'vendido' ? 'selected' : ''}>🔵 Vendido</option>
        </select>
      </td>
    </tr>
  `).join('');
}

// --- EVENTS ---
function bindEvents() {
  // Top-right User Icon
  $('userIconBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.isAdmin) {
      $('adminDropdown').classList.toggle('hidden');
    } else {
      $('loginModal').classList.remove('hidden');
    }
  });

  document.addEventListener('click', () => $('adminDropdown').classList.add('hidden'));
  $('adminDropdown').addEventListener('click', (e) => e.stopPropagation());

  // Login modal
  $('closeLoginModal').addEventListener('click', () => $('loginModal').classList.add('hidden'));
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').classList.add('hidden');
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('loginEmail').value.trim(),
          password: $('loginPassword').value
        })
      });
      await checkAuth();
      $('loginModal').classList.add('hidden');
      showToast('Sesión de Administrador iniciada');
      $('adminDropdown').classList.remove('hidden');
    } catch (err) {
      $('loginError').textContent = err.message;
      $('loginError').classList.remove('hidden');
    }
  });

  // Admin navigation
  $('openMapBtn').addEventListener('click', openInteractiveMap);
  $('openCmsBtn').addEventListener('click', openAdminCms);
  $('cmsToMapBtn').addEventListener('click', openInteractiveMap);
  $('exitMapBtn').addEventListener('click', () => showOnlyView('public'));
  $('cmsToPublicBtn').addEventListener('click', async () => {
    await loadPublicData();
    showOnlyView('public');
  });

  const handleLogout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    await checkAuth();
    showOnlyView('public');
    showToast('Sesión cerrada');
  };
  $('logoutBtn').addEventListener('click', handleLogout);
  $('cmsLogoutBtn').addEventListener('click', handleLogout);

  // Fullscreen gallery listeners
  $('fsGalleryClose')?.addEventListener('click', closeFullscreenGallery);
  $('fsGalleryPrev')?.addEventListener('click', () => renderFullscreenSlide(fsGalleryState.idx - 1));
  $('fsGalleryNext')?.addEventListener('click', () => renderFullscreenSlide(fsGalleryState.idx + 1));
  $('fsGalleryThumbs')?.addEventListener('click', (e) => {
    const thumb = e.target.closest('.fs-gallery-thumb');
    if (thumb) renderFullscreenSlide(Number(thumb.dataset.fsIdx));
  });
  $('fsGalleryDetailBtn')?.addEventListener('click', () => {
    const { protoId, idx } = fsGalleryState;
    closeFullscreenGallery();
    if (protoId) openPrototypeModal(protoId, idx);
  });
  $('fullscreenGallery')?.addEventListener('click', (e) => {
    if (e.target === $('fullscreenGallery') || e.target.classList.contains('fs-gallery-stage')) {
      closeFullscreenGallery();
    }
  });
  document.addEventListener('keydown', (e) => {
    const fs = $('fullscreenGallery');
    if (!fs || fs.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeFullscreenGallery();
    else if (e.key === 'ArrowLeft') renderFullscreenSlide(fsGalleryState.idx - 1);
    else if (e.key === 'ArrowRight') renderFullscreenSlide(fsGalleryState.idx + 1);
  });

  // Transport direct collapsible pill
  $('transportPillTrigger')?.addEventListener('click', () => {
    const pill = $('transportPill');
    const body = $('transportPillBody');
    const trigger = $('transportPillTrigger');
    if (!pill || !body || !trigger) return;
    const isOpen = pill.classList.toggle('open');
    body.classList.toggle('hidden', !isOpen);
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  // Expandable development pills + prototype tabs + downward detail panel
  $('developmentAccordion').addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.dev-proto-tab');
    if (tabBtn) {
      const pill = tabBtn.closest('.dev-pill-item');
      const protoId = tabBtn.dataset.protoTab;
      const proto = state.prototypes.find(x => x.id === protoId);
      if (!pill || !proto) return;
      pill.querySelectorAll('.dev-proto-tab').forEach(btn => {
        const active = btn === tabBtn;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      const wrap = pill.querySelector('.dev-proto-panel-wrap');
      if (wrap) wrap.innerHTML = renderPrototypeDetailPanel(proto, 0);
      return;
    }

    const galleryBtn = e.target.closest('.proto-gallery-btn');
    if (galleryBtn) {
      e.stopPropagation();
      const panel = galleryBtn.closest('.proto-tab-panel');
      const cur = Number(panel?.dataset.slideIdx || 0);
      openFullscreenGallery(galleryBtn.dataset.protoGallery, cur);
      return;
    }

    const panel = e.target.closest('.proto-tab-panel');
    if (panel) {
      const protoId = panel.dataset.activeProto;
      const cur = Number(panel.dataset.slideIdx || 0);
      if (e.target.closest('.proto-panel-prev')) {
        setPanelSlide(panel, protoId, cur - 1);
        return;
      }
      if (e.target.closest('.proto-panel-next')) {
        setPanelSlide(panel, protoId, cur + 1);
        return;
      }
      const thumb = e.target.closest('.proto-panel-thumb');
      if (thumb) {
        setPanelSlide(panel, protoId, Number(thumb.dataset.thumbIdx || 0));
        return;
      }
      if (e.target.closest('.proto-panel-main-img')) {
        openFullscreenGallery(protoId, cur);
        return;
      }
    }
    const fsMapBtn = e.target.closest('[data-open-fs-map]');
    if (fsMapBtn) {
      e.stopPropagation();
      openInteractiveMap(fsMapBtn.dataset.openFsMap);
      return;
    }

    const zoomBtn = e.target.closest('.dev-iz-btn');
    if (zoomBtn) {
      e.stopPropagation();
      const mapSec = zoomBtn.closest('.dev-inline-map-section');
      const wrap = mapSec?.querySelector('.dev-inline-svg-wrap');
      if (!wrap) return;
      let sc = Number(wrap.dataset.scale || 1);
      const act = zoomBtn.dataset.iz;
      if (act === 'in') sc = Math.min(2.6, +(sc + 0.35).toFixed(2));
      else if (act === 'out') sc = Math.max(1, +(sc - 0.35).toFixed(2));
      else sc = 1;
      wrap.dataset.scale = String(sc);
      wrap.style.transform = `scale(${sc})`;
      return;
    }

    const inlineLot = e.target.closest('.dev-inline-svg .qmap-lot');
    if (inlineLot) {
      e.stopPropagation();
      const mapSec = inlineLot.closest('.dev-inline-map-section');
      const slug = mapSec?.dataset.inlineMap;
      const mapData = state.devMapsCache[slug];
      const lot = mapData?.lots.find(l => l.id === inlineLot.dataset.lot);
      if (mapSec && lot) {
        mapSec.querySelectorAll('.qmap-lot').forEach(el => el.classList.remove('selected'));
        inlineLot.classList.add('selected');
        const bar = mapSec.querySelector('.dev-inline-lot-bar');
        const stKey = lot.s === 'apartado' ? 'reservado' : lot.s;
        const stLabel = { disponible: 'Disponible', reservado: 'Apartado', 'no-disponible': 'No disponible', vendido: 'Vendido' }[stKey] || lot.s;
        const devName = state.developments.find(d => d.id === slug)?.name || slug;
        const waMsg = encodeURIComponent(`Hola, me interesa información sobre ${lot.n} en ${devName} (${lot.a} m²).`);
        bar.innerHTML = `
          <div class="dev-inline-lot-info">
            <span class="lot-status-pill ${stKey}">${stLabel}</span>
            <strong>${lot.n}</strong>
            <span>📐 ${lot.a ? `${lot.a} m²` : 'N/A'}</span>
            ${lot.pr ? `<span>🏡 ${lot.pr}</span>` : ''}
          </div>
          <a href="https://wa.me/${state.site?.whatsapp || '525537560931'}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa-mini">Cotizar por WhatsApp →</a>
        `;
        bar.classList.remove('hidden');
      }
      return;
    }

    const trigger = e.target.closest('.dev-pill-trigger');
    if (!trigger) return;
    const item = trigger.closest('.dev-pill-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.dev-pill-item').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.dev-pill-body').classList.add('hidden');
      el.querySelector('.dev-pill-trigger').setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      item.querySelector('.dev-pill-body').classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      loadInlineDevMap(item.dataset.devPill);
    }
  });

  if ($('footerLatestProps')) {
    $('footerLatestProps').addEventListener('click', (e) => {
      const item = e.target.closest('.footer-mini-prop');
      if (item) openPrototypeModal(item.dataset.proto);
    });
  }

  if ($('developmentsGrid')) {
    $('developmentsGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.dev-card');
      if (!card) return;
      openInteractiveMap(card.dataset.dev);
    });
  }

  $('closeProtoModal').addEventListener('click', () => $('protoModal').classList.add('hidden'));

  // Floating Request Info / Schedule a Tour Modal
  let inquiryMode = 'info';
  let tourModality = 'Presencial';
  $('openInquiryBtn').addEventListener('click', () => {
    $('inqStatus').classList.add('hidden');
    $('inquiryModal').classList.remove('hidden');
  });
  $('closeInquiryModal').addEventListener('click', () => $('inquiryModal').classList.add('hidden'));
  document.querySelectorAll('.modality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tourModality = btn.dataset.modality;
    });
  });
  document.querySelectorAll('.inquiry-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.inquiry-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      inquiryMode = tab.dataset.itab;
      $('tourDateFields').classList.toggle('hidden', inquiryMode !== 'tour');
      $('inqSubmitBtn').textContent = inquiryMode === 'tour' ? 'Agendar visita →' : 'Enviar solicitud →';
    });
  });
  $('inquiryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('inqStatus');
    status.classList.add('hidden');
    const prefix = inquiryMode === 'tour'
      ? `[AGENDAR VISITA (${tourModality}): ${$('inqDate').value || 'Por definir'} ${$('inqTime').value}] `
      : '[SOLICITAR INFO] ';
    try {
      await api('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          nombre: $('inqName').value,
          email: $('inqEmail').value,
          telefono: $('inqPhone').value,
          mensaje: prefix + $('inqMessage').value
        })
      });
      $('inquiryForm').reset();
      status.textContent = inquiryMode === 'tour'
        ? '¡Visita agendada! Nuestras asesoras confirmarán tu horario.'
        : '¡Solicitud enviada! En breve te contactamos.';
      status.classList.remove('hidden');
      showToast('Solicitud registrada');
    } catch (err) {
      status.style.color = '#dc2626';
      status.textContent = err.message;
      status.classList.remove('hidden');
    }
  });

  // Public Contact Form
  const contactForm = $('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('contactStatus');
      status.classList.add('hidden');
      try {
        await api('/api/public/contact', {
          method: 'POST',
          body: JSON.stringify({
            nombre: $('leadNombre').value,
            apellidos: $('leadApellidos').value,
            email: $('leadEmail').value,
            telefono: $('leadTelefono').value,
            mensaje: $('leadMensaje').value
          })
        });
        contactForm.reset();
        status.textContent = '¡Gracias! Tu mensaje ha sido registrado. Un asesor se pondrá en contacto contigo.';
        status.classList.remove('hidden');
        showToast('Mensaje enviado correctamente');
      } catch (err) {
        status.style.color = '#dc2626';
        status.textContent = err.message;
        status.classList.remove('hidden');
      }
    });
  }

  // Map interactions (Lot click, dev pills, status filter pills, tabs, zoom, pan)
  $('mapSvg').addEventListener('click', (e) => {
    const lotEl = e.target.closest('.qmap-lot');
    if (!lotEl) return;
    state.selectedLotId = lotEl.dataset.lot;
    renderInteractiveMap();
  });

  if ($('mapDevPills')) {
    $('mapDevPills').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mdev]');
      if (!btn) return;
      state.mapDevSlug = btn.dataset.mdev;
      state.selectedLotId = null;
      state.mapStatusFilter = 'all';
      resetZoom();
      renderInteractiveMap();
    });
  }

  $('mapProtoFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mstatus]');
    if (!btn) return;
    state.mapStatusFilter = btn.dataset.mstatus;
    renderInteractiveMap();
  });

  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('amenitiesOverlay').classList.toggle('hidden', btn.dataset.maptab !== 'amenidades');
    });
  });

  $('zoomInBtn').addEventListener('click', () => { state.zoom = Math.min(3, +(state.zoom + 0.25).toFixed(2)); applyTransform(); });
  $('zoomOutBtn').addEventListener('click', () => { state.zoom = Math.max(0.6, +(state.zoom - 0.25).toFixed(2)); applyTransform(); });
  $('zoomResetBtn').addEventListener('click', resetZoom);

  const vp = $('svgViewport');
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    state.zoom = Math.min(3, Math.max(0.6, +(state.zoom + delta).toFixed(2)));
    applyTransform();
  }, { passive: false });

  vp.addEventListener('mousedown', (e) => {
    if (e.target.closest('.lot-group')) return;
    state.dragging = true;
    state.dragStartX = e.clientX - state.panX;
    state.dragStartY = e.clientY - state.panY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.dragging) return;
    state.panX = e.clientX - state.dragStartX;
    state.panY = e.clientY - state.dragStartY;
    applyTransform();
  });
  window.addEventListener('mouseup', () => { state.dragging = false; });

  // CMS Tabs
  document.querySelectorAll('.cms-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.cmstab;
      $('cmsTabLots').classList.toggle('hidden', target !== 'lots');
      $('cmsTabPrototypes').classList.toggle('hidden', target !== 'prototypes');
      $('cmsTabSite').classList.toggle('hidden', target !== 'site');
    });
  });

  $('lotSearchInput').addEventListener('input', renderCmsLotsTable);
  $('lotStatusFilter').addEventListener('change', renderCmsLotsTable);

  // CMS Lot updates
  $('cmsLotsBody').addEventListener('change', async (e) => {
    const row = e.target.closest('tr[data-lot-row]');
    if (!row) return;
    const lotId = row.dataset.lotRow;
    const status = row.querySelector('.lot-status-select').value;
    const prototypeId = row.querySelector('.lot-proto-select').value;
    await api(`/api/admin/lots/${lotId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, prototypeId })
    });
    const data = await api('/api/admin/lots');
    state.lots = data.lots;
    state.counts = data.counts;
    renderAdminCms();
    showToast(`Lote ${lotId} actualizado`);
  });

  // CMS Prototype updates & file uploads
  $('cmsPrototypesGrid').addEventListener('change', async (e) => {
    if (!e.target.classList.contains('p-upload-img')) return;
    const card = e.target.closest('[data-cms-proto]');
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/api/admin/upload', { method: 'POST', body: fd });
    card.querySelector('.p-img').value = res.url;
    card.querySelector('.cms-preview-img').src = res.url;
    showToast('Imagen subida. Haz clic en Guardar cambios.');
  });

  $('cmsPrototypesGrid').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('save-proto-btn')) return;
    const card = e.target.closest('[data-cms-proto]');
    const id = card.dataset.cmsProto;
    await api(`/api/admin/prototypes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        price: card.querySelector('.p-price').value,
        area: card.querySelector('.p-area').value,
        bedrooms: card.querySelector('.p-beds').value,
        bathrooms: card.querySelector('.p-baths').value,
        description: card.querySelector('.p-desc').value,
        image: card.querySelector('.p-img').value,
        video: card.querySelector('.p-video').value
      })
    });
    showToast(`Prototipo ${id} guardado`);
  });

  // CMS Site & Developments updates
  $('uploadHeroFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/api/admin/upload', { method: 'POST', body: fd });
    $('editHeroImage').value = res.url;
    showToast('Imagen de portada subida. Haz clic en Guardar Portada.');
  });

  $('saveSiteBtn').addEventListener('click', async () => {
    await api('/api/admin/site', {
      method: 'PATCH',
      body: JSON.stringify({
        eyebrow: $('editHeroEyebrow').value,
        heroTitle: $('editHeroTitle').value,
        heroSubtitle: $('editHeroSubtitle').value,
        phoneDisplay: $('editPhoneDisplay').value,
        heroImage: $('editHeroImage').value
      })
    });
    await loadPublicData();
    showToast('Portada actualizada');
  });

  $('cmsDevsGrid').addEventListener('change', async (e) => {
    if (!e.target.classList.contains('d-upload-img')) return;
    const card = e.target.closest('[data-cms-dev]');
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await api('/api/admin/upload', { method: 'POST', body: fd });
    card.querySelector('.d-img').value = res.url;
    card.querySelector('.cms-preview-img').src = res.url;
    showToast('Imagen subida. Haz clic en Guardar desarrollo.');
  });

  $('cmsDevsGrid').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('save-dev-btn')) return;
    const card = e.target.closest('[data-cms-dev]');
    const id = card.dataset.cmsDev;
    await api(`/api/admin/developments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: card.querySelector('.d-name').value,
        startingPrice: card.querySelector('.d-price').value,
        tagline: card.querySelector('.d-tagline').value,
        image: card.querySelector('.d-img').value
      })
    });
    await loadPublicData();
    showToast(`Desarrollo ${id} guardado`);
  });
}

init();
