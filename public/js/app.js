const state = {
  site: null,
  developments: [],
  prototypes: [],
  videos: [],
  lots: [],
  counts: { disponible: 0, no_disponible: 0, vendido: 0 },
  isAdmin: false,
  adminEmail: null,
  cmsHeroSlug: 'sorento',
  cmsHeroDrafts: {},
  sessionExpiresAt: null,
  currentView: 'public',
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function normalizeStatus(status) {
  if (status === 'apartado') return 'reservado';
  if (status === 'no_disponible') return 'no-disponible';
  return ['disponible', 'reservado', 'vendido'].includes(status) ? status : 'no-disponible';
}

function handleAsync(handler) {
  return (...args) => {
    let result;
    try { result = handler(...args); } catch (err) { showToast(err.message); return; }
    return Promise.resolve(result).catch(err => {
      console.error(err);
      showToast(err.message || 'No se pudo completar la operación.');
    });
  };
}

// Reduce future image uploads before sending them; preserve GIF animation and video files.
async function uploadMedia(file) {
  let optimized = file;
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.85));
      if (blob && blob.type === 'image/webp' && blob.size < file.size) optimized = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    } finally { bitmap.close(); }
  }
  const body = new FormData();
  body.append('file', optimized);
  return api('/api/admin/upload', { method: 'POST', body });
}

const SVG_PATHS = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  trees: '<path d="M12 3l-5 7h3l-4 6h12l-4-6h3l-5-7z"/><path d="M12 16v5"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 0 0 0 18M3 12h18"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>',
  paw: '<circle cx="11" cy="4" r="1.5"/><circle cx="18" cy="8" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="15" cy="4" r="1.5"/><path d="M9 14c-1.5 0-3 1.5-3 3.5S7.5 20 9 20h6c1.5 0 3-1 3-2.5S16.5 14 15 14c-1.5 0-2-2-3-2s-1.5 2-3 2z"/>',
  party: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V6a5 5 0 0 1 10 0v2"/>',
  pool: '<path d="M2 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/><path d="M2 20c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/><path d="M8 12V6a2 2 0 1 1 4 0v6"/>',
  racket: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21"/>',
  gamepad: '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 11h.01M17 13h.01"/>',
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  elevator: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 12l3-3 3 3M9 15l3 3 3-3"/>',
  area: '<path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  bath: '<path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3"/>',
  car: '<path d="M5 17H3v-6l2-5h14l2 5v6h-2M7 17a2 2 0 1 0 4 0M13 17a2 2 0 1 0 4 0"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  gallery: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'
};

function svgIcon(kind) {
  const path = SVG_PATHS[kind] || SVG_PATHS.spark;
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

function specBox(icon, label, value, marker = '') {
  return `
    <div class="lot-spec-box" ${marker ? `data-spec="${escapeHtml(marker)}"` : ''}>
      <div class="spec-icon-wrap">${svgIcon(icon)}</div>
      <div class="spec-text-wrap">
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
      </div>
    </div>
  `;
}

function featureIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('alberca')) return svgIcon('pool');
  if (n.includes('pádel') || n.includes('padel')) return svgIcon('racket');
  if (n.includes('game')) return svgIcon('gamepad');
  if (n.includes('jumping')) return svgIcon('spark');
  if (n.includes('oculto')) return svgIcon('bolt');
  if (n.includes('lineal')) return svgIcon('leaf');
  if (n.includes('elevador')) return svgIcon('elevator');
  if (n.includes('acceso') || n.includes('seguridad') || n.includes('vigilancia')) return svgIcon('shield');
  if (n.includes('verdes')) return svgIcon('trees');
  if (n.includes('cancha')) return svgIcon('ball');
  if (n.includes('ciclo')) return svgIcon('bike');
  if (n.includes('familiar')) return svgIcon('users');
  if (n.includes('juego')) return svgIcon('spark');
  if (n.includes('canino') || n.includes('dog') || n.includes('mascota')) return svgIcon('paw');
  if (n.includes('salón') || n.includes('salon') || n.includes('multiusos') || n.includes('múltiples')) return svgIcon('party');
  return svgIcon('spark');
}

const QAVALTA_OFFICE_ORIGIN = 'Unidad Estrategica Comercial Qavalta, Pachuca, Hidalgo';

const DEV_DETAILS = {
  sorento: {
    description: 'Sorento es la privada premium de Qavalta Residencial: diseño arquitectónico sofisticado, acabados superiores y amenidades exclusivas para quienes valoran vivir bien al sur de Pachuca.',
    address: 'Privada Sorento, Blvd. Privadas de Viñedos, Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: 'Privada Sorento, Los Vinedos, Pachuca, Hidalgo',
    amenidades: ['Acceso controlado', 'Áreas verdes', 'Juegos infantiles', 'Alberca climatizada', 'Cancha de pádel', 'Salón multiusos con terraza']
  },
  oporto: {
    description: 'Oporto forma parte de Qavalta Residencial al sur de Pachuca, con entorno seguro, familiar, servicios ocultos y amenidades pensadas para tranquilidad y plusvalía creciente.',
    address: 'Privada Oporto, Blvd. Privadas de Viñedos, Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: 'Privada Oporto, Los Vinedos, Pachuca, Hidalgo',
    amenidades: ['Acceso controlado', 'Áreas verdes', 'Juegos infantiles', 'Ciclovía', 'Servicios ocultos']
  },
  ardenza: {
    description: 'Ardenza combina diseño contemporáneo, amenidades familiares y ubicación estratégica al sur de Pachuca para elegir el prototipo ideal según tu familia y presupuesto.',
    address: 'Privada Ardenza, Blvd. Privadas de Viñedos, Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: 'Privada Ardenza, Los Vinedos, Pachuca, Hidalgo',
    amenidades: ['Acceso controlado', 'Áreas verdes', 'Juegos infantiles', 'Ciclovía', 'Servicios ocultos']
  },
  montalese: {
    description: 'Montalese es la privada moderna y funcional de Qavalta Residencial, equipada con amenidades únicas como Game Center, Jumping Park, Dog Park y parques lineales.',
    address: 'Privada Montalese, Blvd. Privadas de Viñedos, Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: 'Privada Montalese, Los Vinedos, Pachuca, Hidalgo',
    amenidades: ['Game Center', 'Jumping park', 'Ciclovía', 'Servicios ocultos', 'Dog park', 'Parques lineales']
  },
  'torres-qavalta': {
    description: 'La primera etapa de Torres Qavalta reúne diseño vertical contemporáneo, departamentos Flat 1 y Flat 2, amenidades exclusivas y un estilo de vida urbano en Pachuca.',
    address: 'Torres Qavalta (Torre A), Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: 'Qavalta Residencial, Los Vinedos, Pachuca, Hidalgo',
    amenidades: ['Acceso controlado', 'Elevadores', 'Áreas verdes', 'Salón multiusos', 'Vigilancia 24/7']
  },
  vittoria: {
    description: 'Descubre Vittoria, la privada de Qavalta con parque lineal, ciclovía, área para mascotas, canchas deportivas y espacios diseñados para comenzar una nueva etapa en familia.',
    address: 'Privada Vittoria, Blvd. Privadas de Viñedos, Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: 'Privada Vittoria, Los Vinedos, Pachuca, Hidalgo',
    amenidades: ['Parque Lineal', 'Ciclovía', 'Área para mascotas', 'Juegos infantiles', 'Canchas deportivas', 'Salón de usos múltiples']
  }
};

function getProtoGallery(p) {
  const list = [p.image, ...(Array.isArray(p.gallery) ? p.gallery : [])].filter(Boolean);
  return [...new Set(list)];
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

function showToast(msg, { syncSuccess = false } = {}) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('toast-sync-success', syncSuccess);
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), syncSuccess ? 5000 : 2800);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    signal: options.signal || AbortSignal.timeout(15000)
  });
  let data;
  try { data = await res.json(); } catch { throw new Error('El servidor devolvió una respuesta no válida. Intenta de nuevo.'); }
  if (res.status === 401 && url.startsWith('/api/admin/')) expireAdminSession();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// --- SCHEDULED LIGHT/DARK THEME (08:00 AM Claro / 06:00 PM Oscuro) ---
function getScheduledTheme() {
  const hour = new Date().getHours();
  return hour >= 8 && hour < 18 ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const iconSvg = theme === 'dark'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  const titleText = theme === 'dark'
    ? 'Modo oscuro activo (6:00 PM – 8:00 AM). Clic para probar modo claro'
    : 'Modo claro activo (8:00 AM – 6:00 PM). Clic para probar modo oscuro';
  [$('themeToggleBtn'), $('cmsThemeToggleBtn')].forEach(btn => {
    if (!btn) return;
    btn.innerHTML = iconSvg;
    btn.title = titleText;
  });
}

function initThemeScheduler() {
  const override = sessionStorage.getItem('alvarado_theme_override');
  applyTheme(override || getScheduledTheme());
  setInterval(() => {
    if (!sessionStorage.getItem('alvarado_theme_override')) {
      applyTheme(getScheduledTheme());
    }
  }, 60 * 1000);
  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    sessionStorage.setItem('alvarado_theme_override', next);
    applyTheme(next);
  };
  $('themeToggleBtn')?.addEventListener('click', toggleTheme);
  $('cmsThemeToggleBtn')?.addEventListener('click', toggleTheme);
}

// Keep the overlapping menu aligned when badges, names, or row counts change.
function initDevelopmentDockLayout() {
  const dock = $('heroDevDock');
  const header = $('siteHeader');
  const root = document.documentElement;
  const update = () => {
    const height = dock.getBoundingClientRect().height;
    if (height > 0) root.style.setProperty('--dev-dock-height', `${height}px`);
    if (header.getBoundingClientRect().height > 0) {
      root.style.setProperty('--dev-dock-top', `${header.getBoundingClientRect().bottom + 14}px`);
    }
  };
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(update);
    observer.observe(dock);
    observer.observe(header);
  } else window.addEventListener('resize', update);
  update();
}

// --- INITIALIZATION ---
async function init() {
  initThemeScheduler();
  bindEvents();
  initDevelopmentDockLayout();
  if (/^\/admin\/?$/.test(location.pathname)) {
    $('loginView').classList.add('checking-session');
    $('loginDescription').textContent = 'Verificando tu sesión…';
    showOnlyView('login');
  }
  const results = await Promise.allSettled([loadPublicData(), checkAuth()]);
  results.forEach(result => { if (result.status === 'rejected') showToast(result.reason.message); });
  try { await restoreAdminRoute(); } finally {
    $('loginView').classList.remove('checking-session');
    $('loginDescription').textContent = 'Ingresa para administrar el inventario, los precios y la portada.';
  }
  window.addEventListener('popstate', handleAsync(restoreAdminRoute));
  setInterval(updateSessionNotice, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateSessionNotice(); });
}

async function loadPublicData() {
  const [data, videos] = await Promise.all([
    api('/api/public/site'),
    api('/assets/qavalta-videos.json?v=1.0.0-6').catch(() => [])
  ]);
  state.videos = Array.isArray(videos) ? videos : [];
  state.site = data.site;
  state.developments = data.developments;
  state.prototypes = data.prototypes;
  renderPublicSite();
}

async function checkAuth() {
  const res = await api('/api/auth/me');
  state.isAdmin = res.authenticated;
  state.adminEmail = res.email;
  state.sessionExpiresAt = res.expiresAt;
  updateSessionNotice();
  $('adminActiveDot').classList.toggle('hidden', !state.isAdmin);
  $('adminEmailLabel').textContent = state.adminEmail || '';
  $('cmsAdminEmail').textContent = state.adminEmail || '';
}

const HERO_SLIDES = [
  { slug: 'sorento', name: 'Sorento', image: '/assets/images/hero-sorento.webp' },
  { slug: 'oporto', name: 'Oporto', image: '/assets/images/hero-oporto.webp' },
  { slug: 'ardenza', name: 'Ardenza', image: '/assets/images/hero-ardenza.webp' },
  { slug: 'montalese', name: 'Montalese', image: '/assets/images/hero-montalese.webp' },
  { slug: 'torres-qavalta', name: 'Torres Qavalta', image: '/assets/images/hero-torres-qavalta.webp' },
  { slug: 'vittoria', name: 'Vittoria', image: '/assets/images/hero-vittoria.webp' }
];

function getHeroSlides() {
  return HERO_SLIDES.map((slide, i) => {
    const development = state.developments.find(d => d.id === slide.slug);
    const configured = i === 0 ? state.site?.heroImage : development?.heroImage;
    // Legacy card photos are separate from the panoramic hero carousel.
    const image = configured && configured !== '/assets/images/hero.jpg' ? configured : slide.image;
    return { ...slide, image };
  });
}

function setHeroSlide(idx) {
  const heroSlides = getHeroSlides();
  const total = heroSlides.length;
  state.heroSlideIdx = ((idx % total) + total) % total;
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-slide-dot');
  slides.forEach((el, i) => {
    el.classList.toggle('active', i === state.heroSlideIdx);
    if (i === state.heroSlideIdx || i === (state.heroSlideIdx + 1) % total) el.style.backgroundImage = `url(${JSON.stringify(heroSlides[i].image)})`;
  });
  dots.forEach((el, i) => el.classList.toggle('active', i === state.heroSlideIdx));
  const label = $('heroSlideLabel');
  if (label) {
    const cur = heroSlides[state.heroSlideIdx];
    label.textContent = `${cur.name} · Qavalta Residencial`;
  }
}

function initHeroSlideshow() {
  const container = $('heroSlideshow');
  const dotsEl = $('heroSlideDots');
  if (!container) return;
  container.innerHTML = getHeroSlides().map((s, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}"></div>
  `).join('');
  if (dotsEl) {
    dotsEl.innerHTML = HERO_SLIDES.map((s, i) => `
      <button type="button" class="hero-slide-dot ${i === 0 ? 'active' : ''}" data-hero-slide="${i}" aria-label="Ver ${s.name}" title="${s.name}"></button>
    `).join('');
    dotsEl.onclick = (e) => {
      const btn = e.target.closest('.hero-slide-dot');
      if (!btn) return;
      setHeroSlide(Number(btn.dataset.heroSlide));
      if (state.heroSlideTimer) clearInterval(state.heroSlideTimer);
      state.heroSlideTimer = setInterval(() => setHeroSlide(state.heroSlideIdx + 1), 5200);
    };
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
      <div class="footer-mini-prop" data-proto="${escapeHtml(p.id)}">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
        <div>
          <strong>${escapeHtml(p.name)}</strong>
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
  const isDepto = p.type === 'departamento' || (Array.isArray(p.developments) && p.developments.length === 1 && p.developments[0] === 'torres-qavalta');
  return `
    <div class="proto-tab-panel" data-active-proto="${escapeHtml(p.id)}" data-slide-idx="${activeIdx}">
      <div class="proto-panel-media">
        <div class="proto-panel-stage">
          <img class="proto-panel-main-img" src="${escapeHtml(gallery[activeIdx])}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <button type="button" class="proto-gallery-btn" data-proto-gallery="${escapeHtml(p.id)}" aria-label="Ver galería de ${escapeHtml(p.name)}">${svgIcon('gallery')} Ver galería</button>
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
                <img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} vista ${idx + 1}" loading="lazy" />
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${p.video ? `<video preload="none" src="${escapeHtml(p.video)}" controls style="width:100%;border-radius:12px;max-height:220px;"></video>` : ''}
        <div class="proto-panel-map">
          <div class="proto-panel-map-head">
            <span>${svgIcon('pin')} Ubicación · Qavalta Residencial, Pachuca</span>
            <a href="https://maps.google.com/?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo" target="_blank" rel="noopener">Abrir en Google Maps →</a>
          </div>
          <iframe
            title="Mapa ${escapeHtml(p.name)}"
            src="https://maps.google.com/maps?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo&t=&z=15&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
          ></iframe>
        </div>
      </div>

      <div class="proto-panel-info">
        <div class="proto-panel-head">
          <div>
            ${p.propertyId ? `<span class="proto-panel-id">ID ${escapeHtml(p.propertyId)}</span>` : ''}
            <h3>${escapeHtml(p.name)}</h3>
          </div>
          <strong class="proto-panel-price">${mxn.format(p.price)}</strong>
        </div>
        <p class="proto-panel-desc">${escapeHtml(p.description)}</p>

        <div class="lot-specs-grid proto-panel-specs">
          ${specBox('area', isDepto ? 'Superficie' : 'Terreno', `${p.area} m²`)}
          ${specBox('bed', 'Recámaras', p.bedrooms)}
          ${specBox('bath', 'Baños', p.bathrooms)}
          ${specBox('car', 'Estac.', p.parking)}
        </div>

        <div class="proto-panel-features">
          <span class="proto-panel-subtitle">Características y amenidades</span>
          <div class="proto-features-chips">
            ${(p.features || []).map(f => `<span class="proto-chip">${featureIcon(f)} ${escapeHtml(f)}</span>`).join('')}
          </div>
        </div>
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

// Curated Qavalta posts only; never embed the personal profile feed.
function renderDevelopmentVideos(development) {
  const videos = (state.videos || []).filter(video =>
    Array.isArray(video.developments) && video.developments.includes(development.id)
    && /^https:\/\/www\.tiktok\.com\/@itzealva\/video\/[0-9]{19}$/.test(video.url)
  ).slice(0, 3);
  if (!videos.length) return '';
  return `<section class="qavalta-videos" aria-label="Videos de Qavalta: ${escapeHtml(development.name)}">
    <div class="qavalta-videos-head">
      <div><span class="dev-overview-kicker">RECORRIDOS CON ITZEL</span>
        <h4>Conoce ${escapeHtml(development.name)} en video</h4>
        <p>Recorridos de Qavalta y de sus modelos de casa.</p>
      </div>
      <a href="https://www.tiktok.com/@itzealva" target="_blank" rel="noopener noreferrer">@itzealva ↗</a>
    </div>
    <div class="qavalta-video-grid">${videos.map(video => {
      const id = video.url.split('/').pop();
      const embedEnabled = video.embedEnabled !== false;
      return `<article class="qavalta-video-card" data-video-id="${id}">
        <div class="qavalta-video-player ${embedEnabled ? '' : 'video-unavailable'}">${embedEnabled ? `<iframe title="${escapeHtml(video.title)} · Itzel Alva"
          src="https://www.tiktok.com/player/v1/${id}?embed_from=webapp_share&amp;music_info=1&amp;description=1&amp;autoplay=1&amp;muted=1"
          loading="lazy" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>` : ''}
          <div class="qavalta-video-fallback ${embedEnabled ? 'hidden' : ''}" role="status">
            <p>Este recorrido está disponible en TikTok.</p>
            <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">Abrir video ↗</a>
          </div>
        </div>
        <div class="qavalta-video-info"><h5>${escapeHtml(video.title)}</h5>
          ${video.sharedModel ? '<p>Modelo disponible en esta privada y en otros desarrollos Qavalta.</p>' : ''}
          <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">Ver en TikTok ↗</a>
        </div>
      </article>`;
    }).join('')}</div>
  </section>`;
}

function showVideoFallback(frame) {
  if (!frame.isConnected) return;
  frame.classList.add('hidden');
  frame.closest('.qavalta-video-player')?.classList?.add('video-unavailable');
  frame.closest('.qavalta-video-player')?.querySelector('.qavalta-video-fallback')?.classList.remove('hidden');
}

function initDevelopmentVideoPlayers() {
  document.querySelectorAll('.qavalta-videos iframe').forEach(frame => {
    frame.addEventListener('load', () => {
      setTimeout(() => { if (frame.dataset.playerReady !== '1') showVideoFallback(frame); }, 12000);
    });
  });
}

function handleDevelopmentVideoMessage(event) {
  if (event.origin !== 'https://www.tiktok.com') return;
  const frame = Array.from(document.querySelectorAll('.qavalta-videos iframe')).find(frame => frame.contentWindow === event.source);
  if (!frame) return;
  let message = event.data;
  if (typeof message === 'string') { try { message = JSON.parse(message); } catch { return; } }
  if (!message || message['x-tiktok-player'] !== true) return;
  if (message.type === 'onPlayerReady') frame.dataset.playerReady = '1';
  if (message.type === 'onPlayerError' && message.value?.errorCode !== 3002) showVideoFallback(frame);
  // End on the selected Qavalta post instead of showing unrelated recommendations.
  if (message.type === 'onStateChange' && message.value === 0) showVideoFallback(frame);
}

function renderDevelopmentAccordion(openDevId = 'sorento') {
  const container = $('developmentAccordion');
  if (!container || !state.developments.length) return;
  const activeDev = state.developments.find(d => d.id === openDevId) || state.developments[0];
  const devProtos = state.prototypes.filter(p => Array.isArray(p.developments) && p.developments.includes(activeDev.id));
  const firstProto = devProtos[0];
  const info = DEV_DETAILS[activeDev.id] || {
    description: activeDev.tagline || '',
    address: 'Qavalta Residencial, Pachuca, Hgo.',
    mapQuery: `Privada ${activeDev.name}, Los Vinedos, Pachuca, Hidalgo`,
    amenidades: ['Acceso controlado', 'Áreas verdes']
  };
  const originEnc = encodeURIComponent(QAVALTA_OFFICE_ORIGIN);
  const destEnc = encodeURIComponent(info.mapQuery);
  const embedRouteUrl = `https://maps.google.com/maps?saddr=${originEnc}&daddr=${destEnc}&dirflg=d&z=15&output=embed`;
  const dirRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destEnc}`;

  const dockEl = $('heroDevDock');
  const tabsHtml = `
    <div class="unified-dev-tabs" role="tablist" aria-label="Desarrollos residenciales">
      ${state.developments.map(dev => {
        const count = state.prototypes.filter(p => Array.isArray(p.developments) && p.developments.includes(dev.id)).length;
        const isActive = dev.id === activeDev.id;
        return `
          <button type="button" role="tab" class="unified-dev-tab ${isActive ? 'active' : ''}" aria-selected="${isActive}" data-dev-tab="${escapeHtml(dev.id)}">
            <span class="unified-dev-tab-top">
              <strong>${escapeHtml(dev.name)}</strong>
              <span class="unified-dev-tab-count">${count}</span>
            </span>
            <small>Desde ${mxn.format(dev.startingPrice)}</small>
          </button>
        `;
      }).join('')}
    </div>
  `;
  if (dockEl) dockEl.innerHTML = tabsHtml;

  container.innerHTML = `
    <div class="unified-dev-shell">
      ${dockEl ? '' : tabsHtml}

      <div class="dev-pill-item open unified-dev-body" data-dev-pill="${escapeHtml(activeDev.id)}">
        <div class="dev-pill-body">
          <div class="dev-overview-card">
            <div class="dev-overview-info">
              <span class="dev-overview-kicker">DESARROLLO SELECCIONADO · ${escapeHtml(activeDev.name.toUpperCase())}</span>
              <p class="dev-overview-desc">${info.description}</p>
              <div class="dev-overview-details">
                ${specBox('home', activeDev.id === 'torres-qavalta' ? 'Tipo' : 'Privada', activeDev.id === 'torres-qavalta' ? 'Departamentos' : activeDev.name)}
                ${specBox('area', activeDev.id === 'torres-qavalta' ? 'Unidades' : 'Capacidad', 'Cargando plano…', 'capacity')}
                ${specBox('tag', 'Desde', mxn.format(activeDev.startingPrice))}
                ${specBox('gallery', 'Modelos', `${devProtos.length} prototipo${devProtos.length === 1 ? '' : 's'}`)}
              </div>
            </div>
            <div class="dev-overview-map">
              <div class="dev-overview-addr">
                <strong>${svgIcon('pin')} Dirección</strong>
                <span>${info.address}</span>
                <small class="dev-route-badge">${svgIcon('route')} Recorrido automático: Oficinas Qavalta → ${escapeHtml(activeDev.name)}</small>
              </div>
              <iframe
                title="Ruta Oficinas Qavalta a ${escapeHtml(activeDev.name)}"
                src="${embedRouteUrl}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
              <a href="${dirRouteUrl}" target="_blank" rel="noopener" class="dev-route-link">Ver recorrido completo en Google Maps →</a>
            </div>
          </div>

          <div class="dev-proto-tabs" role="tablist" aria-label="Prototipos de ${escapeHtml(activeDev.name)}">
            ${devProtos.map((p, idx) => `
              <button type="button" role="tab" class="dev-proto-tab ${idx === 0 ? 'active' : ''}" aria-selected="${idx === 0}" data-proto-tab="${escapeHtml(p.id)}">
                <span class="dev-proto-tab-name">${escapeHtml(p.name)}</span>
                <span class="dev-proto-tab-price">${mxn.format(p.price)}</span>
              </button>
            `).join('')}
          </div>

          <div class="dev-proto-panel-wrap">
            ${firstProto ? renderPrototypeDetailPanel(firstProto, 0) : '<p class="muted">Sin prototipos disponibles.</p>'}
          </div>

          ${renderDevelopmentVideos(activeDev)}

          <div class="dev-inline-map-section" data-inline-map="${escapeHtml(activeDev.id)}">
            <div class="dev-inline-map-head">
              <div>
                <span class="dev-inline-map-kicker">PLANO MAESTRO INTERACTIVO</span>
                <h4>Mapa de lotes · ${escapeHtml(activeDev.name)}</h4>
              </div>
              <div class="dev-inline-map-actions">
                <div class="dev-inline-legend">
                  <span><i class="dot disponible"></i> Disp. <strong data-c="disponible">-</strong></span>
                  <span><i class="dot reservado"></i> Apart. <strong data-c="reservado">-</strong></span>
                  <span><i class="dot no_disponible"></i> No disp. <strong data-c="no_disponible">-</strong></span>
                  <span><i class="dot vendido"></i> Vend. <strong data-c="vendido">-</strong></span>
                </div>
                <button type="button" class="dev-inline-fs-btn" data-open-fs-map="${escapeHtml(activeDev.id)}">⤢ Pantalla completa</button>
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
            <div class="dev-inline-lot-bar hidden" data-inline-lot-bar="${escapeHtml(activeDev.id)}"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  initDevelopmentVideoPlayers();
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
        <img id="protoModalMainImg" src="${escapeHtml(gallery[activeIdx])}" alt="${escapeHtml(p.name)}" />
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
              <img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} ${idx + 1}" />
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${p.video ? `<video preload="none" src="${escapeHtml(p.video)}" controls style="width:100%;border-radius:12px;margin-bottom:16px;max-height:220px;"></video>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;">
      <h2 style="font-size:24px;">${escapeHtml(p.name)}</h2>
      <strong style="font-size:22px;color:var(--accent);">${mxn.format(p.price)}</strong>
    </div>
    <p style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:16px;">${escapeHtml(p.description)}</p>
    <div class="lot-specs-grid" style="grid-template-columns:repeat(4,1fr);">
      ${specBox('area', 'Terreno', `${p.area} m²`)}
      ${specBox('bed', 'Recámaras', p.bedrooms)}
      ${specBox('bath', 'Baños', p.bathrooms)}
      ${specBox('car', 'Estac.', p.parking)}
    </div>
    <div class="proto-features-chips" style="margin-bottom:16px;">
      ${(p.features || []).map(f => `<span class="proto-chip">${featureIcon(f)} ${escapeHtml(f)}</span>`).join('')}
    </div>
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:13px;">${svgIcon('pin')} Ubicación · Qavalta Residencial, Pachuca</strong>
        <a href="https://maps.google.com/?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;">Abrir en Google Maps →</a>
      </div>
      <iframe
        title="Mapa ${escapeHtml(p.name)}"
        src="https://maps.google.com/maps?q=Unidad+Estrategica+Comercial+Qavalta,+Pachuca,+Hidalgo&t=&z=15&ie=UTF8&iwloc=&output=embed"
        style="width:100%;height:190px;border:none;border-radius:12px;"
        loading="lazy"
      ></iframe>
    </div>
    <a href="https://wa.me/${escapeHtml(state.site.whatsapp)}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa" style="margin-top:4px;">Solicitar información por WhatsApp →</a>
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
      <img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} ${i + 1}" />
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
  state.currentView = viewName;
  const route = ['admin', 'login'].includes(viewName) ? '/admin' : '/';
  if (location.pathname !== route) history.pushState({}, '', route);
  updateSessionNotice();
  $('publicView').classList.toggle('hidden', viewName !== 'public');
  $('siteHeader').classList.toggle('hidden', viewName !== 'public');
  $('mapView').classList.toggle('hidden', viewName !== 'map');
  $('adminView').classList.toggle('hidden', viewName !== 'admin');
  $('loginView').classList.toggle('hidden', viewName !== 'login');
  $('adminDropdown').classList.add('hidden');
  closeCmsUserMenu();
  if ($('floatingStack')) {
    $('floatingStack').classList.toggle('hidden', viewName !== 'public');
  }
}

function getDevMapPrototypes(slug) {
  return state.prototypes.filter(p => Array.isArray(p.developments) && p.developments.includes(slug));
}

function resolveLotPrototype(lot, slug) {
  if (!lot.pr) return null;
  const pool = getDevMapPrototypes(slug);
  const exact = [...pool, ...state.prototypes].find(p => p.name.toLowerCase() === String(lot.pr).toLowerCase());
  return exact || { id: String(lot.pr).toLowerCase().replace(/\s+/g, '-'), name: lot.pr, price: Number(lot.pp ?? lot.p) || 0, image: '' };
}

function getMappedDevPrototypes(mapData) {
  const prototypes = new Map();
  for (const lot of mapData.lots) {
    const prototype = resolveLotPrototype(lot, mapData.slug);
    if (prototype) prototypes.set(prototype.id, prototype);
  }
  return [...prototypes.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

const devMapFetchedAt = new Map();
const devMapPending = new Map();
async function fetchDevMapData(slug, forceRefresh = false) {
  if (!forceRefresh && state.devMapsCache[slug] && Date.now() - (devMapFetchedAt.get(slug) || 0) < 60000) return state.devMapsCache[slug];
  if (devMapPending.has(slug)) return devMapPending.get(slug);
  const pending = api(`/api/public/qavalta-map/${encodeURIComponent(slug)}${forceRefresh ? '?refresh=1' : ''}`).then(data => {
    state.devMapsCache[slug] = data;
    devMapFetchedAt.set(slug, Date.now());
    return data;
  }).finally(() => devMapPending.delete(slug));
  devMapPending.set(slug, pending);
  return pending;
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

// Closed circuits follow the existing white streets; do not add scenery over lots.
const MAP_LIFE_CONFIG = {
  "sorento": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "42s",
        "begin": "0s",
        "path": "M 2002.9 1924.6 Q 2010 1855 2080.0 1855.0 L 4460.0 1855.0 Q 4530 1855 4530.0 1925.0 L 4530.0 2965.0 Q 4530 3035 4460.0 3035.0 L 1960.0 3035.0 Q 1890 3035 1897.1 2965.4 L 2002.9 1924.6 Z"
      },
      {
        "color": "#1e3a5f",
        "dur": "42s",
        "begin": "-10.5s",
        "path": "M 2002.9 1924.6 Q 2010 1855 2080.0 1855.0 L 4460.0 1855.0 Q 4530 1855 4530.0 1925.0 L 4530.0 2965.0 Q 4530 3035 4460.0 3035.0 L 1960.0 3035.0 Q 1890 3035 1897.1 2965.4 L 2002.9 1924.6 Z"
      },
      {
        "color": "#d6b68a",
        "dur": "42s",
        "begin": "-21s",
        "path": "M 2002.9 1924.6 Q 2010 1855 2080.0 1855.0 L 4460.0 1855.0 Q 4530 1855 4530.0 1925.0 L 4530.0 2965.0 Q 4530 3035 4460.0 3035.0 L 1960.0 3035.0 Q 1890 3035 1897.1 2965.4 L 2002.9 1924.6 Z"
      },
      {
        "color": "#a42d48",
        "dur": "42s",
        "begin": "-31.5s",
        "path": "M 2002.9 1924.6 Q 2010 1855 2080.0 1855.0 L 4460.0 1855.0 Q 4530 1855 4530.0 1925.0 L 4530.0 2965.0 Q 4530 3035 4460.0 3035.0 L 1960.0 3035.0 Q 1890 3035 1897.1 2965.4 L 2002.9 1924.6 Z"
      }
    ]
  },
  "oporto": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "42s",
        "begin": "0s",
        "path": "M 3940.0 745.0 Q 3940 675 4010.0 675.0 L 6100.0 675.0 Q 6170 675 6170.0 745.0 L 6170.0 1495.0 Q 6170 1565 6100.0 1565.0 L 4010.0 1565.0 Q 3940 1565 3940.0 1495.0 L 3940.0 745.0 Z"
      },
      {
        "color": "#1e3a5f",
        "dur": "42s",
        "begin": "-10.5s",
        "path": "M 3940.0 745.0 Q 3940 675 4010.0 675.0 L 6100.0 675.0 Q 6170 675 6170.0 745.0 L 6170.0 1495.0 Q 6170 1565 6100.0 1565.0 L 4010.0 1565.0 Q 3940 1565 3940.0 1495.0 L 3940.0 745.0 Z"
      },
      {
        "color": "#d6b68a",
        "dur": "42s",
        "begin": "-21s",
        "path": "M 3940.0 745.0 Q 3940 675 4010.0 675.0 L 6100.0 675.0 Q 6170 675 6170.0 745.0 L 6170.0 1495.0 Q 6170 1565 6100.0 1565.0 L 4010.0 1565.0 Q 3940 1565 3940.0 1495.0 L 3940.0 745.0 Z"
      },
      {
        "color": "#a42d48",
        "dur": "42s",
        "begin": "-31.5s",
        "path": "M 3940.0 745.0 Q 3940 675 4010.0 675.0 L 6100.0 675.0 Q 6170 675 6170.0 745.0 L 6170.0 1495.0 Q 6170 1565 6100.0 1565.0 L 4010.0 1565.0 Q 3940 1565 3940.0 1495.0 L 3940.0 745.0 Z"
      }
    ]
  },
  "ardenza": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "42s",
        "begin": "0s",
        "path": "M 1161.1 2520.0 Q 1160 2450 1229.9 2454.0 L 1440.1 2466.0 Q 1510 2470 1576.8 2490.9 L 1763.2 2549.1 Q 1830 2570 1892.1 2602.3 L 2017.9 2667.7 Q 2080 2700 2080.0 2770.0 L 2080.0 4800.0 Q 2080 4870 2013.5 4891.9 L 1866.5 4940.1 Q 1800 4962 1731.3 4975.3 L 1568.7 5006.7 Q 1500 5020 1430.0 5022.3 L 1270.0 5027.7 Q 1200 5030 1198.9 4960.0 L 1161.1 2520.0 Z"
      },
      {
        "color": "#1e3a5f",
        "dur": "42s",
        "begin": "-10.5s",
        "path": "M 1161.1 2520.0 Q 1160 2450 1229.9 2454.0 L 1440.1 2466.0 Q 1510 2470 1576.8 2490.9 L 1763.2 2549.1 Q 1830 2570 1892.1 2602.3 L 2017.9 2667.7 Q 2080 2700 2080.0 2770.0 L 2080.0 4800.0 Q 2080 4870 2013.5 4891.9 L 1866.5 4940.1 Q 1800 4962 1731.3 4975.3 L 1568.7 5006.7 Q 1500 5020 1430.0 5022.3 L 1270.0 5027.7 Q 1200 5030 1198.9 4960.0 L 1161.1 2520.0 Z"
      },
      {
        "color": "#d6b68a",
        "dur": "42s",
        "begin": "-21s",
        "path": "M 1161.1 2520.0 Q 1160 2450 1229.9 2454.0 L 1440.1 2466.0 Q 1510 2470 1576.8 2490.9 L 1763.2 2549.1 Q 1830 2570 1892.1 2602.3 L 2017.9 2667.7 Q 2080 2700 2080.0 2770.0 L 2080.0 4800.0 Q 2080 4870 2013.5 4891.9 L 1866.5 4940.1 Q 1800 4962 1731.3 4975.3 L 1568.7 5006.7 Q 1500 5020 1430.0 5022.3 L 1270.0 5027.7 Q 1200 5030 1198.9 4960.0 L 1161.1 2520.0 Z"
      },
      {
        "color": "#a42d48",
        "dur": "42s",
        "begin": "-31.5s",
        "path": "M 1161.1 2520.0 Q 1160 2450 1229.9 2454.0 L 1440.1 2466.0 Q 1510 2470 1576.8 2490.9 L 1763.2 2549.1 Q 1830 2570 1892.1 2602.3 L 2017.9 2667.7 Q 2080 2700 2080.0 2770.0 L 2080.0 4800.0 Q 2080 4870 2013.5 4891.9 L 1866.5 4940.1 Q 1800 4962 1731.3 4975.3 L 1568.7 5006.7 Q 1500 5020 1430.0 5022.3 L 1270.0 5027.7 Q 1200 5030 1198.9 4960.0 L 1161.1 2520.0 Z"
      }
    ]
  },
  "montalese": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "42s",
        "begin": "0s",
        "path": "M 3840.0 1520.0 Q 3840 1450 3910.0 1450.0 L 5800.0 1450.0 Q 5870 1450 5870.0 1520.0 L 5870.0 2460.0 Q 5870 2530 5800.0 2530.0 L 3910.0 2530.0 Q 3840 2530 3840.0 2460.0 L 3840.0 1520.0 Z"
      },
      {
        "color": "#1e3a5f",
        "dur": "42s",
        "begin": "-10.5s",
        "path": "M 3840.0 1520.0 Q 3840 1450 3910.0 1450.0 L 5800.0 1450.0 Q 5870 1450 5870.0 1520.0 L 5870.0 2460.0 Q 5870 2530 5800.0 2530.0 L 3910.0 2530.0 Q 3840 2530 3840.0 2460.0 L 3840.0 1520.0 Z"
      },
      {
        "color": "#d6b68a",
        "dur": "42s",
        "begin": "-21s",
        "path": "M 3840.0 1520.0 Q 3840 1450 3910.0 1450.0 L 5800.0 1450.0 Q 5870 1450 5870.0 1520.0 L 5870.0 2460.0 Q 5870 2530 5800.0 2530.0 L 3910.0 2530.0 Q 3840 2530 3840.0 2460.0 L 3840.0 1520.0 Z"
      },
      {
        "color": "#a42d48",
        "dur": "42s",
        "begin": "-31.5s",
        "path": "M 3840.0 1520.0 Q 3840 1450 3910.0 1450.0 L 5800.0 1450.0 Q 5870 1450 5870.0 1520.0 L 5870.0 2460.0 Q 5870 2530 5800.0 2530.0 L 3910.0 2530.0 Q 3840 2530 3840.0 2460.0 L 3840.0 1520.0 Z"
      }
    ]
  },
  "vittoria": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "42s",
        "begin": "0s",
        "path": "M 4620.0 1515.0 Q 4620 1445 4690.0 1445.0 L 6410.0 1445.0 Q 6480 1445 6475.7 1514.9 L 6414.3 2510.1 Q 6410 2580 6340.0 2580.0 L 4690.0 2580.0 Q 4620 2580 4620.0 2510.0 L 4620.0 1515.0 Z"
      },
      {
        "color": "#1e3a5f",
        "dur": "42s",
        "begin": "-10.5s",
        "path": "M 4620.0 1515.0 Q 4620 1445 4690.0 1445.0 L 6410.0 1445.0 Q 6480 1445 6475.7 1514.9 L 6414.3 2510.1 Q 6410 2580 6340.0 2580.0 L 4690.0 2580.0 Q 4620 2580 4620.0 2510.0 L 4620.0 1515.0 Z"
      },
      {
        "color": "#d6b68a",
        "dur": "42s",
        "begin": "-21s",
        "path": "M 4620.0 1515.0 Q 4620 1445 4690.0 1445.0 L 6410.0 1445.0 Q 6480 1445 6475.7 1514.9 L 6414.3 2510.1 Q 6410 2580 6340.0 2580.0 L 4690.0 2580.0 Q 4620 2580 4620.0 2510.0 L 4620.0 1515.0 Z"
      },
      {
        "color": "#a42d48",
        "dur": "42s",
        "begin": "-31.5s",
        "path": "M 4620.0 1515.0 Q 4620 1445 4690.0 1445.0 L 6410.0 1445.0 Q 6480 1445 6475.7 1514.9 L 6414.3 2510.1 Q 6410 2580 6340.0 2580.0 L 4690.0 2580.0 Q 4620 2580 4620.0 2510.0 L 4620.0 1515.0 Z"
      }
    ]
  }
};

function buildMapLifeOverlay(mapData) {
  if (mapData.isTowerFloors || !mapData.bg) return '';
  const cfg = MAP_LIFE_CONFIG[mapData.slug];
  if (!cfg) return '';
  // Inline and full-screen maps coexist: each SVG must resolve its own motion paths.
  const routePrefix = `car-route-${++mapRenderSequence}`;
  return `
    <g class="qmap-life-layer" pointer-events="none">
      <defs>
        ${cfg.cars.map((car, index) => `<path class="qmap-car-route" id="${routePrefix}-${index}" d="${car.path}" />`).join('')}
        <g id="${routePrefix}-car" transform="scale(1.15)">
          <ellipse cx="3" cy="6" rx="56" ry="27" fill="rgba(15,23,42,0.24)" />
          <rect x="-54" y="-23" width="108" height="46" rx="15" fill="currentColor" stroke="#0f172a" stroke-width="3" />
          <rect x="-24" y="-17" width="52" height="34" rx="9" fill="#e2e8f0" opacity="0.92" />
          <rect x="-12" y="-13" width="26" height="26" rx="6" fill="currentColor" />
          <circle cx="46" cy="-13" r="4" fill="#fef08a" /><circle cx="46" cy="13" r="4" fill="#fef08a" />
          <rect x="-52" y="-15" width="4" height="8" rx="1.5" fill="#ef4444" /><rect x="-52" y="7" width="4" height="8" rx="1.5" fill="#ef4444" />
        </g>
      </defs>
      ${cfg.cars.map((car, index) => `
        <g color="${car.color}">
          <use href="#${routePrefix}-car" />
          <animateMotion dur="${car.dur}" begin="${car.begin}" calcMode="paced" repeatCount="indefinite" rotate="auto"><mpath href="#${routePrefix}-${index}" /></animateMotion>
        </g>
      `).join('')}
    </g>
  `;
}

let mapRenderSequence = 0;
function buildDevMapSvgMarkup(mapData, { selectedLotId = null, statusFilter = 'all', protoFilter = 'all', floorId = null } = {}) {
  const colors = {
    disponible: { fill: 'rgba(16, 185, 129, 0.52)', stroke: '#047857' },
    reservado: { fill: 'rgba(245, 158, 11, 0.58)', stroke: '#b45309' },
    vendido: { fill: 'rgba(59, 130, 246, 0.52)', stroke: '#1d4ed8' },
    'no-disponible': { fill: 'rgba(255, 152, 0, 0.50)', stroke: '#ea580c' }
  };

  let activeBg = mapData.bg;
  let activeLots = mapData.lots;
  if (mapData.isTowerFloors && Array.isArray(mapData.floors)) {
    const fl = mapData.floors.find(f => f.id === Number(floorId)) || mapData.floors[mapData.floors.length - 1];
    if (fl) {
      activeBg = fl.bg;
      const byId = new Map(mapData.lots.map(l => [l.id, l]));
      activeLots = fl.lots.map(l => byId.get(l.id) || l);
    }
  }

  let bgMarkup = '';
  if (mapData.isTowerFloors && activeBg) {
    bgMarkup = `<image href="${escapeHtml(activeBg)}" x="0" y="0" width="${mapData.w}" height="${mapData.h}" preserveAspectRatio="xMidYMid meet" />`;
  } else if (mapData.slug === 'oporto' && mapData.bg) {
    const clipId = `oporto-plan-${++mapRenderSequence}`;
    bgMarkup = `<defs><clipPath id="${clipId}"><polygon points="100,80 6900,80 6900,3000 4900,6600 100,6600"/></clipPath></defs><image href="${escapeHtml(mapData.bg)}" x="0" y="0" width="9000" height="6600" clip-path="url(#${clipId})"/>`;
  } else if (mapData.bg) {
    bgMarkup = `<image href="${escapeHtml(mapData.bg)}${mapData.bg.includes('?') ? '&' : '?'}v=1.10.3" x="0" y="0" width="${mapData.w}" height="${mapData.h}" preserveAspectRatio="xMidYMid meet" />`;
  }

  // Remove printed vehicle sprites with local SVG masks; keep the source raster,
  // architectural geometry and vegetation intact in both map views.
  if (mapData.staticVehicleMasks?.length) {
    const maskId = `stationary-vehicles-${++mapRenderSequence}`;
    const masks = mapData.staticVehicleMasks;
    bgMarkup = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${mapData.w}" height="${mapData.h}"><rect width="${mapData.w}" height="${mapData.h}" fill="white"/>${masks.map(mask => `<path d="${escapeHtml(mask.d)}" fill="black"/>`).join('')}</mask></defs><g mask="url(#${maskId})">${bgMarkup}</g><g class="qmap-vehicle-cleanup" pointer-events="none">${masks.filter(mask => mask.road).map(mask => `<path d="${escapeHtml(mask.d)}" fill="white"/>`).join('')}</g>`;
  }

  const sw = mapData.isTowerFloors ? 12 : 9;
  const swSel = mapData.isTowerFloors ? 30 : 24;

  const lotsMarkup = activeLots.map(l => {
    const stKey = normalizeStatus(l.s);
    const st = colors[stKey] || colors['no-disponible'];
    const isSel = selectedLotId === l.id;
    const lotProto = resolveLotPrototype(l, mapData.slug);
    const dimmedStatus = statusFilter !== 'all' && stKey !== normalizeStatus(statusFilter);
    const dimmedProto = protoFilter !== 'all' && (!lotProto || lotProto.id !== protoFilter);
    const dimmed = dimmedStatus || dimmedProto;
    const op = dimmed ? '0.14' : '1';
    const attrs = `class="qmap-lot ${isSel ? 'selected' : ''}" data-lot="${escapeHtml(l.id)}" fill="${st.fill}" stroke="${isSel ? '#ffffff' : st.stroke}" stroke-width="${isSel ? swSel : sw}" opacity="${op}"`;
    return l.t === 'g'
      ? `<polygon points="${escapeHtml(l.d)}" ${attrs} />`
      : `<path d="${escapeHtml(l.d)}" ${attrs} />`;
  }).join('');

  return `${bgMarkup}<g class="qmap-lots-layer">${lotsMarkup}</g>${buildMapLifeOverlay(mapData)}`;
}

async function loadInlineDevMap(slug, floorId = null) {
  const section = document.querySelector(`.dev-inline-map-section[data-inline-map="${slug}"]`);
  if (!section) return;
  const svg = section.querySelector('.dev-inline-svg');
  if (!svg || (svg.dataset.loaded === slug && floorId === null)) return;
  try {
    const mapData = await fetchDevMapData(slug);
    const capacity = section.closest('.dev-pill-body')?.querySelector('[data-spec="capacity"] strong');
    if (capacity) capacity.textContent = `${mapData.lots.length} ${mapData.isTowerFloors ? 'unidades en plano' : 'lotes en plano'}`;
    const counts = getMapCounts(mapData.lots);
    ['disponible', 'reservado', 'no_disponible', 'vendido'].forEach(k => {
      const el = section.querySelector(`[data-c="${k}"]`);
      if (el) el.textContent = counts[k];
    });
    const vp = section.querySelector('.dev-inline-map-viewport');
    if (vp) vp.classList.toggle('is-tower-bg', Boolean(mapData.isTowerFloors));

    let activeFloorId = floorId;
    if (mapData.isTowerFloors && Array.isArray(mapData.floors)) {
      activeFloorId = activeFloorId || mapData.floors[mapData.floors.length - 1].id;
      let floorBar = section.querySelector('.dev-inline-floors');
      if (!floorBar) {
        floorBar = document.createElement('div');
        floorBar.className = 'dev-inline-floors';
        vp?.parentNode?.insertBefore(floorBar, vp);
      }
      floorBar.innerHTML = `<span class="floor-bar-tag">TORRE A · PISOS:</span>` + mapData.floors.map(f => `
        <button type="button" class="floor-pill ${f.id === Number(activeFloorId) ? 'active' : ''}" data-inline-floor="${f.id}">${f.name}</button>
      `).join('');
      floorBar.onclick = (ev) => {
        const btn = ev.target.closest('[data-inline-floor]');
        if (btn) loadInlineDevMap(slug, Number(btn.dataset.inlineFloor));
      };
    }

    svg.setAttribute('viewBox', `0 0 ${mapData.w} ${mapData.h}`);
    svg.innerHTML = buildDevMapSvgMarkup(mapData, { floorId: activeFloorId });
    svg.dataset.loaded = slug;
  } catch (err) {
    console.error(err);
  }
}

async function openInteractiveMap(devSlug = null) {
  if (typeof devSlug === 'string' && state.developments.some(d => d.id === devSlug)) state.mapDevSlug = devSlug;
  else if (!state.mapDevSlug) state.mapDevSlug = 'sorento';
  state.selectedLotId = null;
  state.mapStatusFilter = 'all';
  state.mapProtoFilter = 'all';
  resetZoom();
  showOnlyView('map');
  await renderInteractiveMap();
}

function updateSessionNotice() {
  const label = $('cmsSessionNotice');
  if (!label) return;
  if (!state.isAdmin || !state.sessionExpiresAt) { label.textContent = ''; return; }
  const remaining = state.sessionExpiresAt - Date.now();
  if (remaining <= 0) { expireAdminSession(); return; }
  const minutes = Math.ceil(remaining / 60000);
  const duration = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
  label.textContent = `Acceso válido por ${duration} más`;
  label.title = `Vuelve a iniciar sesión a las ${new Date(state.sessionExpiresAt).toLocaleTimeString('es-MX')}. Recargar no amplía el plazo.`;
  label.classList.toggle('session-warning', remaining <= 5 * 60000);
  if (remaining <= 5 * 60000 && !state.sessionWarningShown) {
    state.sessionWarningShown = true;
    showToast('Tu sesión se cerrará en menos de 5 minutos. Guarda tus cambios.');
  }
}

function expireAdminSession() {
  const wasAdmin = state.isAdmin;
  state.isAdmin = false;
  state.sessionExpiresAt = null;
  closeCmsUserMenu();
  $('adminActiveDot').classList.add('hidden');
  if ($('cmsSessionNotice')) $('cmsSessionNotice').textContent = 'La sesión terminó. Inicia sesión para continuar.';
  if (state.currentView === 'admin' || location.pathname.startsWith('/admin')) {
    showOnlyView('login');
    $('loginError').textContent = 'La sesión terminó. Inicia sesión para continuar.';
    $('loginError').classList.remove('hidden');
  }
  if (wasAdmin) showToast('La sesión terminó. Inicia sesión para continuar.');
}

async function restoreAdminRoute() {
  if (/^\/admin\/?$/.test(location.pathname)) {
    if (state.isAdmin) await openAdminCms();
    else showOnlyView('login');
  } else showOnlyView('public');
}

async function openAdminCms() {
  // Another tab may have signed in; consult the cookie-backed server session.
  await checkAuth();
  if (!state.isAdmin) {
    showOnlyView('login');
    return;
  }
  const data = await api('/api/admin/lots');
  state.lots = data.lots;
  state.prototypes = data.prototypes;
  state.developments = data.developments;
  state.counts = data.counts;
  await renderAdminCms();
  showOnlyView('admin');
  const section = new URLSearchParams(location.search).get('seccion');
  if (['lots', 'prototypes', 'site'].includes(section)) document.querySelector(`.cms-tab[data-cmstab="${section}"]`)?.click();
}

// --- INTERACTIVE SVG MAP (REDRAWN PER DEVELOPMENT + FULLSCREEN) ---
const AMENITIES_GALLERY = {
  sorento: [
    '/assets/images/amenidades/sorento-1.webp',
    '/assets/images/amenidades/sorento-2.webp',
    '/assets/images/amenidades/sorento-3.webp',
    '/assets/images/amenidades/sorento-4.webp',
    '/assets/images/amenidades/sorento-5.webp',
    '/assets/images/amenidades/sorento-6.webp',
    '/assets/images/amenidades/sorento-7.webp',
    '/assets/images/amenidades/sorento-8.webp',
    '/assets/images/amenidades/sorento-9.webp'
  ],
  oporto: [
    '/assets/images/amenidades/oporto-1.webp',
    '/assets/images/amenidades/oporto-2.webp',
    '/assets/images/amenidades/oporto-3.webp',
    '/assets/images/amenidades/oporto-4.webp',
    '/assets/images/amenidades/oporto-5.webp',
    '/assets/images/amenidades/oporto-6.webp',
    '/assets/images/amenidades/oporto-7.webp'
  ],
  ardenza: [
    '/assets/images/amenidades/ardenza-1.webp',
    '/assets/images/amenidades/ardenza-2.webp',
    '/assets/images/amenidades/ardenza-3.webp',
    '/assets/images/amenidades/ardenza-4.webp',
    '/assets/images/amenidades/ardenza-5.webp'
  ],
  montalese: [
    '/assets/images/amenidades/montalese-1.webp',
    '/assets/images/amenidades/montalese-2.webp',
    '/assets/images/amenidades/montalese-3.webp',
    '/assets/images/amenidades/montalese-4.webp',
    '/assets/images/amenidades/montalese-5.webp'
  ],
  'torres-qavalta': [
    '/assets/images/hero-torres-qavalta.webp',
    '/assets/images/amenidades/sorento-1.webp',
    '/assets/images/amenidades/vittoria-1.webp',
    '/assets/images/amenidades/oporto-1.webp'
  ],
  vittoria: [
    '/assets/images/amenidades/vittoria-1.webp',
    '/assets/images/amenidades/vittoria-2.webp',
    '/assets/images/amenidades/vittoria-3.webp',
    '/assets/images/amenidades/vittoria-4.webp',
    '/assets/images/amenidades/vittoria-5.webp',
    '/assets/images/amenidades/vittoria-6.webp'
  ]
};

function renderMapAmenities(slug, activeIdx = 0) {
  const container = $('amenitiesShowcase');
  if (!container) return;
  const dev = state.developments.find(d => d.id === slug) || { name: slug };
  const info = DEV_DETAILS[slug] || { amenidades: ['Acceso controlado', 'Áreas verdes', 'Juegos infantiles'] };
  const amenidades = info.amenidades || [];
  const photos = AMENITIES_GALLERY[slug] || AMENITIES_GALLERY.vittoria;
  const idx = ((activeIdx % photos.length) + photos.length) % photos.length;
  const activeAmenity = amenidades[idx % Math.max(1, amenidades.length)] || dev.name;

  container.innerHTML = `
    <div class="amen-split">
      <div class="amen-stage">
        <img src="${escapeHtml(photos[idx])}" alt="${escapeHtml(dev.name)} - ${escapeHtml(activeAmenity)}" id="amenStageImg" />
        <div class="amen-stage-overlay">
          <span class="amen-kicker">AMENIDADES REALES · ${escapeHtml(dev.name.toUpperCase())}</span>
          <h3 id="amenStageTitle">${escapeHtml(activeAmenity)}</h3>
        </div>
        <span class="proto-photo-counter" id="amenCounter">${idx + 1} / ${photos.length}</span>
        <button type="button" class="proto-photo-arrow proto-photo-prev" id="amenPrevBtn" aria-label="Foto anterior">‹</button>
        <button type="button" class="proto-photo-arrow proto-photo-next" id="amenNextBtn" aria-label="Foto siguiente">›</button>
      </div>

      <div class="amen-sidebar">
        <div class="amen-sidebar-head">
          <span class="section-kicker">ENTORNO Y ESTILO DE VIDA</span>
          <h4>Amenidades de ${escapeHtml(dev.name)}</h4>
          <p>Explora las áreas reales del desarrollo seleccionando cada amenidad o fotografía.</p>
        </div>
        <div class="amen-list">
          ${amenidades.map((a, i) => `
            <button type="button" class="amen-list-item ${i === (idx % amenidades.length) ? 'active' : ''}" data-amen-idx="${i}">
              <span class="amen-list-icon">${featureIcon(a)}</span>
              <span class="amen-list-text">${escapeHtml(a)}</span>
              <img class="amen-list-thumb" src="${escapeHtml(photos[i % photos.length])}" alt="${escapeHtml(a)}" loading="lazy" />
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="amen-filmstrip">
      ${photos.map((src, i) => `
        <button type="button" class="amen-thumb ${i === idx ? 'active' : ''}" data-amen-idx="${i}" aria-label="Foto amenidad ${i + 1}">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(dev.name)} amenidad ${i + 1}" loading="lazy" />
        </button>
      `).join('')}
    </div>
  `;

  const setAmenIdx = (next) => renderMapAmenities(slug, next);
  $('amenPrevBtn')?.addEventListener('click', () => setAmenIdx(idx - 1));
  $('amenNextBtn')?.addEventListener('click', () => setAmenIdx(idx + 1));
  container.querySelectorAll('[data-amen-idx]').forEach(btn => {
    btn.addEventListener('click', () => setAmenIdx(Number(btn.dataset.amenIdx)));
  });
}

async function renderInteractiveMap() {
  const slug = state.mapDevSlug || 'sorento';
  const dev = state.developments.find(d => d.id === slug) || { id: slug, name: slug, startingPrice: 1382000 };
  const mapData = await fetchDevMapData(slug);
  if (slug !== state.mapDevSlug) return;
  const counts = getMapCounts(mapData.lots);

  if ($('mapLocBadge')) $('mapLocBadge').textContent = `📍 Qavalta · ${dev.name}`;
  const titleEl = $('mapPanelTitle');
  if (titleEl) {
    if (slug === 'oporto') {
      titleEl.innerHTML = `<svg class="panel-dev-logo" role="img" aria-label="Oporto" xmlns="http://www.w3.org/2000/svg" viewBox="5850 3900 3000 2200"><defs><clipPath id="oporto-logo-clip"><polygon points="5850,4950 6800,4950 6800,3900 7950,3900 7950,4950 8850,4950 8850,6100 5850,6100"/></clipPath><filter id="oporto-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1 -1 -1 0 2.7"/></filter></defs><g clip-path="url(#oporto-logo-clip)"><image filter="url(#oporto-ink)" width="9000" height="6600" href="/assets/maps/oporto-original.webp?v=1.10.3"/></g></svg>`;
    } else {
      titleEl.innerHTML = `
        <span class="panel-dev-crest">
          <svg viewBox="0 0 36 36" width="24" height="24" aria-hidden="true">
            <circle cx="18" cy="18" r="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="64 16" stroke-linecap="round"/>
          </svg>
          <span>${escapeHtml(dev.name)}</span>
        </span>
      `;
    }
  }
  $('mapAvailCount').textContent = `• ${counts.disponible} disponibles`;
  $('countDisp').textContent = counts.disponible;
  if ($('countRes')) $('countRes').textContent = counts.reservado;
  $('countNoDisp').textContent = counts.no_disponible;
  $('countVend').textContent = counts.vendido;
  $('mapStartingPrice').textContent = mxn.format(dev.startingPrice || 1382000);

  if ($('mapDevPills')) {
    $('mapDevPills').innerHTML = state.developments.map(d => `
      <button type="button" class="map-dev-pill ${d.id === slug ? 'active' : ''}" data-mdev="${escapeHtml(d.id)}">${escapeHtml(d.name)}</button>
    `).join('');
  }

  const devProtos = getMappedDevPrototypes(mapData);
  $('mapProtoFilters').innerHTML = [
    `<button class="${state.mapProtoFilter === 'all' ? 'active' : ''}" data-mproto="all"><span>Todos los prototipos</span><small>${devProtos.length}</small></button>`,
    ...devProtos.map(p => `<button class="${state.mapProtoFilter === p.id ? 'active' : ''}" data-mproto="${escapeHtml(p.id)}"><span>${escapeHtml(p.name)}</span><small>${mxn.format(p.price)}</small></button>`)
  ].join('');

  if ($('mapStatusFilters')) {
    $('mapStatusFilters').innerHTML = [
      { id: 'all', label: 'Todos los lotes', count: mapData.lots.length, dot: '' },
      { id: 'disponible', label: 'Disponibles', count: counts.disponible, dot: 'disponible' },
      { id: 'reservado', label: 'Apartados', count: counts.reservado, dot: 'reservado' },
      { id: 'no-disponible', label: 'No disponibles', count: counts.no_disponible, dot: 'no_disponible' },
      { id: 'vendido', label: 'Vendidos', count: counts.vendido, dot: 'vendido' }
    ].map(f => `<button class="${state.mapStatusFilter === f.id ? 'active' : ''}" data-mstatus="${f.id}"><span class="status-filter-label">${f.dot ? `<span class="dot ${f.dot}"></span>` : ''}${f.label}</span><small>${f.count}</small></button>`).join('');
  }

  if ($('mapView')) $('mapView').classList.toggle('is-tower-bg', Boolean(mapData.isTowerFloors));
  const floorBar = $('mapFloorBar');
  if (floorBar) {
    if (mapData.isTowerFloors && Array.isArray(mapData.floors)) {
      if (!state.mapFloorId || !mapData.floors.some(f => f.id === Number(state.mapFloorId))) {
        state.mapFloorId = mapData.floors[mapData.floors.length - 1].id;
      }
      floorBar.classList.remove('hidden');
      floorBar.innerHTML = `
        <span class="floor-bar-tag">TORRE A</span>
        ${mapData.floors.map(f => {
          const disp = f.lots.filter(l => l.s === 'disponible').length;
          return `<button type="button" class="floor-pill ${f.id === Number(state.mapFloorId) ? 'active' : ''}" data-mfloor="${f.id}">${f.name} <small>${disp}</small></button>`;
        }).join('')}
      `;
      floorBar.onclick = (e) => {
        const btn = e.target.closest('[data-mfloor]');
        if (!btn) return;
        state.mapFloorId = Number(btn.dataset.mfloor);
        state.selectedLotId = null;
        handleAsync(renderInteractiveMap)();
      };
    } else {
      floorBar.classList.add('hidden');
    }
  }

  const svg = $('mapSvg');
  svg.setAttribute('viewBox', `0 0 ${mapData.w} ${mapData.h}`);
  svg.innerHTML = buildDevMapSvgMarkup(mapData, {
    selectedLotId: state.selectedLotId,
    statusFilter: state.mapStatusFilter,
    protoFilter: state.mapProtoFilter,
    floorId: state.mapFloorId
  });
  renderMapAmenities(slug, 0);
  renderSelectedLotDetail();
}

function renderSelectedLotDetail() {
  const container = $('panelLotDetail');
  const mapData = state.devMapsCache[state.mapDevSlug];
  if (!state.selectedLotId || !mapData) {
    const dev = state.developments.find(d => d.id === state.mapDevSlug);
    const waEmptyMsg = encodeURIComponent(`Hola, me interesa información sobre lotes disponibles en ${dev?.name || state.mapDevSlug}.`);
    container.innerHTML = `
      <div class="empty-lot-state">
        <div class="empty-icon">${svgIcon('home')}</div>
        <h3>Toca un lote o unidad</h3>
        <p>Selecciona cualquier lote en el plano para ver su manzana, superficie m², estatus y cotizar por WhatsApp.</p>
        <button type="button" class="btn-map-info-tour" id="mapEmptyInfoTourBtn">Info / Agendar Tour</button>
        <a href="https://wa.me/${escapeHtml(state.site?.whatsapp || '525537560931')}?text=${waEmptyMsg}" target="_blank" rel="noopener" class="btn-wa btn-wa-block" style="margin-top:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.49 0 .16 5.33.16 11.9c0 2.1.55 4.15 1.59 5.96L0 24l6.31-1.65a11.88 11.88 0 0 0 5.75 1.47h.01c6.57 0 11.9-5.33 11.9-11.9 0-3.18-1.24-6.17-3.45-8.44Zm-8.46 18.33h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.28c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.46-4.44 9.91-9.9 9.91Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.08 4.5.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"/></svg>
          WhatsApp · Solicita información
        </a>
      </div>
    `;
    $('mapEmptyInfoTourBtn')?.addEventListener('click', () => {
      if ($('inqMessage')) $('inqMessage').value = `Me gustaría agendar un tour o recibir información sobre ${dev?.name || state.mapDevSlug}.`;
      $('inqStatus')?.classList.add('hidden');
      $('inquiryModal')?.classList.remove('hidden');
    });
    return;
  }

  const lot = mapData.lots.find(l => l.id === state.selectedLotId);
  if (!lot) return;
  const dev = state.developments.find(d => d.id === state.mapDevSlug);
  const protoMatch = resolveLotPrototype(lot, state.mapDevSlug);
  const stKey = normalizeStatus(lot.s);
  const statusLabel = {
    disponible: 'Disponible',
    reservado: 'Apartado',
    'no-disponible': 'No disponible',
    vendido: 'Vendido'
  }[stKey] || lot.s;
  const priceDisplay = lot.p > 0 ? mxn.format(lot.p) : protoMatch?.price > 0 ? `Referencia del prototipo: ${mxn.format(protoMatch.price)}` : 'Precio por confirmar';
  const waMsg = encodeURIComponent(`Hola, me interesa información sobre ${lot.n} en ${dev?.name || state.mapDevSlug} (${lot.a} m²).`);

  container.innerHTML = `
    <div class="lot-detail-card">
      ${protoMatch?.image ? `<img src="${escapeHtml(protoMatch.image)}" alt="${escapeHtml(lot.n)}" />` : ''}
      <span class="lot-status-pill ${escapeHtml(stKey)}">${escapeHtml(statusLabel)}</span>
      <h3>${escapeHtml(lot.n)}</h3>
      <p style="font-size:12px;color:var(--muted);">${escapeHtml(dev?.name || '')} · Manzana / Nivel: ${escapeHtml(lot.m || 'N/A')}</p>
      <div class="lot-detail-price">${priceDisplay}</div>
      <div class="lot-specs-grid">
        ${specBox('area', 'Superficie', lot.a ? `${lot.a} m²` : 'N/A')}
        ${specBox('tag', 'Estatus', statusLabel)}
        ${specBox('home', 'Privada', dev?.name || state.mapDevSlug)}
        ${specBox('gallery', 'Prototipo', lot.pr || protoMatch?.name || 'Sin asignar')}
      </div>
      <a href="https://wa.me/${escapeHtml(state.site?.whatsapp || '525537560931')}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa btn-wa-block" style="margin-top:8px;">Cotizar lote por WhatsApp →</a>
      <button type="button" class="btn-map-info-tour" id="mapLotInfoTourBtn">Info / Agendar Tour</button>
      ${state.isAdmin ? `
        <div class="map-admin-edit-box">
          <strong class="map-admin-edit-title">Edición rápida (Alvarado Studio)</strong>
          <label>Estatus
            <select id="mapEditStatus">
              <option value="disponible" ${stKey === 'disponible' ? 'selected' : ''}>Disponible</option>
              <option value="reservado" ${stKey === 'reservado' ? 'selected' : ''}>Apartado</option>
              <option value="no-disponible" ${stKey === 'no-disponible' ? 'selected' : ''}>No disponible</option>
              <option value="vendido" ${stKey === 'vendido' ? 'selected' : ''}>Vendido</option>
            </select>
          </label>
          <label>Prototipo
            <select id="mapEditProto">
              <option value="">Sin asignar</option>
              ${getDevMapPrototypes(state.mapDevSlug).map(p => `<option value="${escapeHtml(p.name)}" ${String(lot.pr).toLowerCase() === p.name.toLowerCase() ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </label>
          <button type="button" class="btn-primary full-width" id="mapSaveLotBtn">Guardar cambios en lote</button>
        </div>
      ` : ''}
    </div>
  `;
  $('mapLotInfoTourBtn')?.addEventListener('click', () => {
    if ($('inqMessage')) $('inqMessage').value = `Me interesa ${lot.n} en ${dev?.name || state.mapDevSlug} (${lot.a} m²). Me gustaría agendar un tour o recibir más información.`;
    $('inqStatus')?.classList.add('hidden');
    $('inquiryModal')?.classList.remove('hidden');
  });
  if (state.isAdmin && $('mapSaveLotBtn')) {
    $('mapSaveLotBtn').addEventListener('click', handleAsync(async () => {
      const status = $('mapEditStatus').value;
      const prototipo = $('mapEditProto').value;
      await api(`/api/admin/qavalta-lots/${state.mapDevSlug}/${encodeURIComponent(lot.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ status, prototipo })
      });
      delete state.devMapsCache[state.mapDevSlug];
      await fetchDevMapData(state.mapDevSlug);
      await renderInteractiveMap();
      showToast(`${lot.n} actualizado`);
    }));
  }
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
function renderCmsPrototypePreview(p) {
  const isApartment = p.type === 'departamento' || p.developments?.includes('torres-qavalta');
  return `
    <section class="cms-prototype-preview" aria-label="Vista previa de la ficha de ${escapeHtml(p.name)}">
      <span class="cms-proto-preview-label">Vista previa de la ficha pública</span>
      <img src="${escapeHtml(p.image)}" class="cms-preview-img" alt="${escapeHtml(p.name)}" loading="lazy" />
      <p class="cms-field-help hidden" data-proto-preview="image-error">Añade una imagen válida para previsualizarla.</p>
      <div class="cms-proto-preview-heading">
        <strong>${escapeHtml(p.name)}</strong>
        <strong data-proto-preview="price">${mxn.format(p.price)}</strong>
      </div>
      <p class="cms-proto-preview-description" data-proto-preview="description">${escapeHtml(p.description)}</p>
      <div class="cms-proto-preview-specs">
        <span>${isApartment ? 'Superficie' : 'Terreno'}<strong data-proto-preview="area">${escapeHtml(p.area)} m²</strong></span>
        <span>Recámaras<strong data-proto-preview="bedrooms">${escapeHtml(p.bedrooms)}</strong></span>
        <span>Baños<strong data-proto-preview="bathrooms">${escapeHtml(p.bathrooms)}</strong></span>
      </div>
      <video class="cms-proto-preview-video ${p.video ? '' : 'hidden'}" data-proto-preview="video" ${p.video ? `src="${escapeHtml(p.video)}"` : ''} controls preload="none" aria-label="Video del prototipo ${escapeHtml(p.name)}"></video>
    </section>
  `;
}

function updateCmsPrototypePreview(card) {
  const read = selector => card.querySelector(selector).value;
  const setText = (key, value) => { card.querySelector(`[data-proto-preview="${key}"]`).textContent = value; };
  const numericLabel = (value, suffix = '') => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? `${value}${suffix}` : 'Por definir';
  const price = read('.p-price');
  setText('price', price.trim() !== '' && Number.isFinite(Number(price)) && Number(price) >= 0 ? mxn.format(Number(price)) : 'Precio por definir');
  setText('description', read('.p-desc'));
  setText('area', numericLabel(read('.p-area'), ' m²'));
  setText('bedrooms', numericLabel(read('.p-beds')));
  setText('bathrooms', numericLabel(read('.p-baths')));
  const safeUrl = value => (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value);
  const image = card.querySelector('.cms-preview-img');
  const warning = card.querySelector('[data-proto-preview="image-error"]');
  image.onload = () => { image.classList.remove('hidden'); warning.classList.add('hidden'); };
  image.onerror = () => { image.classList.add('hidden'); warning.classList.remove('hidden'); };
  const imageUrl = read('.p-img').trim();
  if (safeUrl(imageUrl)) {
    if (image.getAttribute('src') !== imageUrl) {
      image.src = imageUrl;
      image.classList.remove('hidden');
      warning.classList.add('hidden');
    }
  } else {
    image.removeAttribute('src');
    image.classList.add('hidden');
    warning.classList.remove('hidden');
  }
  const video = card.querySelector('[data-proto-preview="video"]');
  const videoUrl = read('.p-video').trim();
  if (safeUrl(videoUrl)) {
    if (video.getAttribute('src') !== videoUrl) video.src = videoUrl;
    video.classList.remove('hidden');
  } else {
    video.pause();
    video.removeAttribute('src');
    video.classList.add('hidden');
  }
}

function renderCmsCarouselOverview() {
  const grid = $('cmsCarouselOverview');
  if (!grid) return;
  grid.innerHTML = getHeroSlides().map((slide, index) => `
    <button type="button" class="cms-carousel-slide ${slide.slug === state.cmsHeroSlug ? 'is-current' : ''}" aria-pressed="${slide.slug === state.cmsHeroSlug}" data-edit-carousel-slide="${escapeHtml(slide.slug)}" aria-label="Editar imagen ${index + 1} de ${escapeHtml(slide.name)}">
      <img src="${escapeHtml(state.cmsHeroDrafts[slide.slug] || slide.image)}" alt="Imagen ${index + 1}: ${escapeHtml(slide.name)}" loading="lazy" />
      <strong>${index + 1}. ${escapeHtml(slide.name)}</strong>
      <small>${slide.slug === state.cmsHeroSlug ? 'Editando esta foto' : 'Seleccionar foto'}</small>
    </button>
  `).join('');
}

function selectCmsHeroSlide(slug) {
  const slides = getHeroSlides();
  const index = slides.findIndex(slide => slide.slug === slug);
  if (index < 0) return;
  state.cmsHeroSlug = slug;
  const slide = slides[index];
  $('editHeroImage').value = state.cmsHeroDrafts[slug] ?? slide.image;
  $('uploadHeroFile').value = '';
  $('cmsHeroEditorTitle').textContent = `Imagen ${index + 1} de ${slides.length} · ${slide.name}`;
  $('cmsHeroImageLabel').textContent = `Imagen de ${slide.name} (URL)`;
  $('saveHeroSlideBtn').textContent = `Guardar foto de ${slide.name}`;
  $('cmsHeroPreviewImage').alt = `Foto del carrusel de ${slide.name}`;
  renderCmsCarouselOverview();
  updateCmsHomePreview();
}

function renderCmsDevelopmentsGrid() {
  $('cmsDevsGrid').innerHTML = state.developments.map(d => `
    <div class="cms-form-card" data-cms-dev="${escapeHtml(d.id)}">
      <h3>${escapeHtml(d.name)}</h3>
      <p class="cms-field-help cms-card-location">Inicio → selector de desarrollos y bloque «Desarrollo seleccionado». Aquí cambias el nombre y el precio «Desde».</p>
      <div class="form-grid">
        <label>Nombre del desarrollo<input type="text" class="d-name" value="${escapeHtml(d.name)}" /></label>
        <label>Precio desde (MXN)<input type="number" class="d-price" value="${escapeHtml(d.startingPrice)}" /></label>
      </div>
      <button class="btn-primary save-dev-btn">Guardar datos</button>
      <button type="button" class="btn-secondary" data-preview-development="${escapeHtml(d.id)}">Ver dónde aparece ↗</button>
    </div>
  `).join('');
}

async function renderCmsPrototypesGrid() {
  const grid = $('cmsPrototypesGrid');
  if (!grid) return;
  const q = ($('cmsProtoSearchInput')?.value || '').trim().toLowerCase();
  const devFilter = $('cmsProtoDevFilter')?.value || 'all';
  const list = (state.prototypes || []).filter(p => {
    if (devFilter !== 'all' && (!Array.isArray(p.developments) || !p.developments.includes(devFilter))) return false;
    if (!q) return true;
    const haystack = [
      p.name,
      p.description,
      String(p.price),
      `${p.bedrooms} recamaras`,
      ...(p.developments || [])
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  const badge = $('cmsProtoCountBadge');
  if (badge) badge.textContent = `${list.length} prototipo${list.length === 1 ? '' : 's'}`;
  if (!list.length) {
    grid.innerHTML = `<div class="cms-form-card" style="grid-column:1/-1;text-align:center;color:var(--muted);">No se encontraron prototipos que coincidan con "${escapeHtml(q)}".</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="cms-form-card" data-cms-proto="${escapeHtml(p.id)}">
      <h3>Prototipo: ${escapeHtml(p.name)}</h3>
      <span class="cms-location-pill">Estás editando: ficha de ${escapeHtml(p.name)}</span>
      <p class="cms-field-help cms-proto-location-title">Se muestra en la página de inicio, dentro de:</p>
      <div class="cms-proto-location-chips">
        ${(p.developments || []).map(id => {
          const development = state.developments.find(d => d.id === id);
          return `<span>${escapeHtml(development?.name || id)} → ${escapeHtml(p.name)}</span>`;
        }).join('') || '<span>Sin desarrollo asignado</span>'}
      </div>
      ${renderCmsPrototypePreview(p)}
      <p class="cms-field-help cms-card-location">Esta vista cambia mientras editas. Guardar cambios actualiza la ficha en todos los desarrollos indicados.</p>
      <div class="form-grid">
        <label>Precio (MXN)<input type="number" class="p-price" value="${escapeHtml(p.price)}" /></label>
        <label>Terreno (m²)<input type="number" class="p-area" value="${escapeHtml(p.area)}" /></label>
        <label>Recámaras<input type="number" class="p-beds" value="${escapeHtml(p.bedrooms)}" /></label>
        <label>Baños<input type="number" step="0.5" class="p-baths" value="${escapeHtml(p.bathrooms)}" /></label>
      </div>
      <label style="margin-bottom:10px;">Descripción<textarea rows="2" class="p-desc">${escapeHtml(p.description)}</textarea></label>
      <label style="margin-bottom:10px;">URL Imagen<input type="text" class="p-img" value="${escapeHtml(p.image)}" /></label>
      <label style="margin-bottom:10px;">Subir nueva imagen<input type="file" class="p-upload-img" accept="image/*" /></label>
      <label style="margin-bottom:12px;">URL Video (opcional)<input type="text" class="p-video" value="${escapeHtml(p.video || '')}" placeholder="https://... o sube archivo" /></label>
      <button class="btn-primary save-proto-btn">Guardar cambios</button>
    </div>
  `).join('');
}

function updateCmsHomePreview() {
  const pairs = [
    ['editHeroEyebrow', 'cmsHeroPreviewEyebrow'],
    ['editHeroTitle', 'cmsHeroPreviewTitle'],
    ['editHeroSubtitle', 'cmsHeroPreviewSubtitle']
  ];
  pairs.forEach(([field, preview]) => { $(preview).textContent = $(field).value; });
  const image = $('cmsHeroPreviewImage');
  const imageState = $('cmsHeroPreviewImageState');
  const url = $('editHeroImage').value.trim();
  const validUrl = (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url);
  image.onload = () => { image.hidden = false; imageState.classList.add('hidden'); };
  image.onerror = () => { image.hidden = true; imageState.classList.remove('hidden'); };
  if (validUrl) {
    if (image.getAttribute('src') !== url) {
      image.hidden = false;
      imageState.classList.add('hidden');
      image.src = url;
    }
  } else {
    image.removeAttribute('src');
    image.hidden = true;
    imageState.classList.remove('hidden');
  }
}

async function renderAdminCms() {
  const { prototypes, developments, site } = state;
  const slug = state.cmsDevSlug || 'sorento';
  state.cmsDevSlug = slug;
  if ($('cmsDevSelect')) $('cmsDevSelect').value = slug;

  const mapData = await fetchDevMapData(slug);
  if (slug !== state.cmsDevSlug) return;
  const counts = getMapCounts(mapData.lots);
  if ($('cmsSyncStatus')) {
    const sources = { 'planos.qavalta.com': 'Catálogo remoto', 'local-cache': 'Copia local', 'stale-cache': 'Última sincronización disponible' };
    const label = sources[mapData.source] || 'Copia local';
    $('cmsSyncStatus').textContent = `${label} · ${mapData.lots.length} lotes/unidades`;
    $('cmsSyncBadge').textContent = label;
  }

  $('cmsLotStats').innerHTML = `
    <div class="stat-box"><small>Total (${slug})</small><strong>${mapData.lots.length}</strong></div>
    <div class="stat-box"><small>Disponibles</small><strong style="color:var(--green)">${counts.disponible}</strong></div>
    <div class="stat-box"><small>Apartados</small><strong style="color:var(--amber)">${counts.reservado}</strong></div>
    <div class="stat-box"><small>No disponibles</small><strong>${counts.no_disponible}</strong></div>
    <div class="stat-box"><small>Vendidos</small><strong style="color:#ef4444">${counts.vendido}</strong></div>
  `;

  renderCmsLotsTable();
  renderCmsPrototypesGrid();
  $('editHeroEyebrow').value = site.eyebrow;
  $('editHeroTitle').value = site.heroTitle;
  $('editHeroSubtitle').value = site.heroSubtitle;
  $('editPhoneDisplay').value = site.phoneDisplay;
  selectCmsHeroSlide(state.cmsHeroSlug);

  renderCmsDevelopmentsGrid();
}

function renderCmsLotsTable() {
  const slug = state.cmsDevSlug || 'sorento';
  const mapData = state.devMapsCache[slug];
  if (!mapData) return;
  const q = $('lotSearchInput').value.trim().toLowerCase();
  const statusF = $('lotStatusFilter').value;
  const filtered = mapData.lots.filter(l => {
    const stKey = normalizeStatus(l.s);
    const matchQ = !q || l.n.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) || String(l.m).toLowerCase().includes(q) || String(l.pr).toLowerCase().includes(q);
    const matchS = statusF === 'all' || stKey === statusF;
    return matchQ && matchS;
  });

  $('cmsLotsBody').innerHTML = filtered.map(l => {
    const stKey = normalizeStatus(l.s);
    return `
    <tr data-lot-row="${escapeHtml(l.id)}">
      <td><strong>${escapeHtml(l.n)}</strong> <small style="color:var(--muted)">(${escapeHtml(l.id)})</small></td>
      <td>${escapeHtml(l.m || '-')}</td>
      <td>${l.a ? `${escapeHtml(l.a)} m²` : '-'}</td>
      <td>
        <select class="lot-proto-select">
          <option value="">Sin asignar</option>
          ${getDevMapPrototypes(slug).map(p => `<option value="${escapeHtml(p.name)}" ${String(l.pr).toLowerCase() === p.name.toLowerCase() ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="lot-status-select">
          <option value="disponible" ${stKey === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="reservado" ${stKey === 'reservado' ? 'selected' : ''}>Apartado</option>
          <option value="no-disponible" ${stKey === 'no-disponible' ? 'selected' : ''}>No disponible</option>
          <option value="vendido" ${stKey === 'vendido' ? 'selected' : ''}>Vendido</option>
        </select>
      </td>
    </tr>
  `;
  }).join('');
}

// --- EVENTS ---
function closeCmsUserMenu() {
  $('cmsUserMenu')?.classList.add('hidden');
  $('cmsUserMenuBtn')?.setAttribute('aria-expanded', 'false');
}

function bindEvents() {
  window.addEventListener('message', handleDevelopmentVideoMessage);
  const accountButton = $('cmsUserMenuBtn');
  const accountMenu = $('cmsUserMenu');
  const openAccountMenu = () => {
    accountMenu.classList.remove('hidden');
    accountButton.setAttribute('aria-expanded', 'true');
  };
  accountButton.addEventListener('click', () => {
    if (accountButton.getAttribute('aria-expanded') === 'true') closeCmsUserMenu();
    else openAccountMenu();
  });
  accountButton.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); openAccountMenu(); $('cmsLogoutBtn').focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.cms-account')) closeCmsUserMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && accountButton.getAttribute('aria-expanded') === 'true') {
      closeCmsUserMenu(); accountButton.focus();
    }
  });
  // Top-right User Icon -> go straight to Alvarado Studio when authenticated
  $('userIconBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    handleAsync(openAdminCms)();
  });

  document.addEventListener('click', () => $('adminDropdown').classList.add('hidden'));
  $('adminDropdown').addEventListener('click', (e) => e.stopPropagation());

  // Login page -> open Alvarado Studio after authentication
  $('loginBackBtn').addEventListener('click', event => { event.preventDefault(); showOnlyView('public'); });
  $('loginForm').addEventListener('submit', handleAsync(async (e) => {
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
      state.sessionWarningShown = false;
      $('loginPassword').value = '';
      showToast('Bienvenido a Alvarado Studio');
      await openAdminCms();
    } catch (err) {
      $('loginError').textContent = err.message;
      $('loginError').classList.remove('hidden');
    }
  }));

  // Admin navigation
  $('openMapBtn').addEventListener('click', handleAsync(openInteractiveMap));
  $('openCmsBtn').addEventListener('click', handleAsync(openAdminCms));
  $('cmsToMapBtn').addEventListener('click', handleAsync(openInteractiveMap));
  $('exitMapBtn').addEventListener('click', () => showOnlyView('public'));
  $('cmsToPublicBtn').addEventListener('click', handleAsync(async () => {
    await loadPublicData();
    showOnlyView('public');
  }));

  const handleLogout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    await checkAuth();
    showOnlyView('public');
    showToast('Sesión cerrada');
  };
  $('logoutBtn').addEventListener('click', handleAsync(handleLogout));
  $('cmsLogoutBtn').addEventListener('click', handleAsync(handleLogout));

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

  // Transport direct collapsible pill (smooth CSS accordion)
  $('transportPillTrigger')?.addEventListener('click', () => {
    const pill = $('transportPill');
    const trigger = $('transportPillTrigger');
    if (!pill || !trigger) return;
    const isOpen = pill.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  // Inline map pan (mouse + touch when zoomed)
  let inlineDrag = null;
  const startInlinePan = (clientX, clientY, target) => {
    const vpInline = target.closest('.dev-inline-map-viewport');
    if (!vpInline || target.closest('.dev-inline-zoom-bar')) return null;
    const wrap = vpInline.querySelector('.dev-inline-svg-wrap');
    if (!wrap) return null;
    const sc = Number(wrap.dataset.scale || 1);
    if (sc <= 1) return null;
    return {
      wrap,
      sc,
      startX: clientX - Number(wrap.dataset.panX || 0),
      startY: clientY - Number(wrap.dataset.panY || 0),
      moved: false
    };
  };
  $('developmentAccordion').addEventListener('mousedown', (e) => {
    inlineDrag = startInlinePan(e.clientX, e.clientY, e.target);
  });
  window.addEventListener('mousemove', (e) => {
    if (!inlineDrag) return;
    const px = e.clientX - inlineDrag.startX;
    const py = e.clientY - inlineDrag.startY;
    inlineDrag.moved = true;
    inlineDrag.wrap.dataset.panX = String(px);
    inlineDrag.wrap.dataset.panY = String(py);
    inlineDrag.wrap.style.transform = `translate(${px}px, ${py}px) scale(${inlineDrag.sc})`;
  });
  window.addEventListener('mouseup', () => { inlineDrag = null; });
  $('developmentAccordion').addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    inlineDrag = startInlinePan(e.touches[0].clientX, e.touches[0].clientY, e.target);
  }, { passive: true });
  $('developmentAccordion').addEventListener('touchmove', (e) => {
    if (!inlineDrag || e.touches.length !== 1) return;
    e.preventDefault();
    const px = e.touches[0].clientX - inlineDrag.startX;
    const py = e.touches[0].clientY - inlineDrag.startY;
    inlineDrag.wrap.dataset.panX = String(px);
    inlineDrag.wrap.dataset.panY = String(py);
    inlineDrag.wrap.style.transform = `translate(${px}px, ${py}px) scale(${inlineDrag.sc})`;
  }, { passive: false });
  $('developmentAccordion').addEventListener('touchend', () => { inlineDrag = null; });
  $('developmentAccordion').addEventListener('touchcancel', () => { inlineDrag = null; });

  // Unified development tabs (sticky hero dock + panel) + prototype tabs
  const handleDevTabClick = (e) => {
    const devTabBtn = e.target.closest('.unified-dev-tab');
    if (!devTabBtn) return false;
    const devId = devTabBtn.dataset.devTab;
    renderDevelopmentAccordion(devId);
    loadInlineDevMap(devId);
    const protoSection = $('prototipos');
    if (protoSection) {
      const rect = protoSection.getBoundingClientRect();
      const dock = $('heroDevDock');
      const targetTop = Number.parseFloat(getComputedStyle(dock).top) + dock.getBoundingClientRect().height + 16;
      if (rect.top > window.innerHeight * 0.65 || rect.top < targetTop) {
        const y = rect.top + window.scrollY - targetTop;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
    return true;
  };
  $('heroDevDock')?.addEventListener('click', handleDevTabClick);

  $('developmentAccordion').addEventListener('click', (e) => {
    if (handleDevTabClick(e)) return;

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
      const vpInline = mapSec?.querySelector('.dev-inline-map-viewport');
      const wrap = mapSec?.querySelector('.dev-inline-svg-wrap');
      if (!wrap) return;
      let sc = Number(wrap.dataset.scale || 1);
      let px = Number(wrap.dataset.panX || 0);
      let py = Number(wrap.dataset.panY || 0);
      const act = zoomBtn.dataset.iz;
      if (act === 'in') sc = Math.min(2.6, +(sc + 0.35).toFixed(2));
      else if (act === 'out') sc = Math.max(1, +(sc - 0.35).toFixed(2));
      else { sc = 1; px = 0; py = 0; }
      if (sc === 1) { px = 0; py = 0; }
      wrap.dataset.scale = String(sc);
      wrap.dataset.panX = String(px);
      wrap.dataset.panY = String(py);
      wrap.style.transform = `translate(${px}px, ${py}px) scale(${sc})`;
      if (vpInline) vpInline.classList.toggle('is-zoomed', sc > 1);
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
        const stKey = normalizeStatus(lot.s);
        const stLabel = { disponible: 'Disponible', reservado: 'Apartado', 'no-disponible': 'No disponible', vendido: 'Vendido' }[stKey] || lot.s;
        const devName = state.developments.find(d => d.id === slug)?.name || slug;
        const lotProto = resolveLotPrototype(lot, slug);
        const waMsg = encodeURIComponent(`Hola, me interesa información sobre ${lot.n} (${lotProto?.name || ''}) en ${devName} (${lot.a} m²).`);
        bar.innerHTML = `
          <div class="dev-inline-lot-info">
            <span class="lot-status-pill ${escapeHtml(stKey)}">${escapeHtml(stLabel)}</span>
            <strong>${escapeHtml(lot.n)}</strong>
            <span>${svgIcon('area')} ${lot.a ? `${escapeHtml(lot.a)} m²` : 'N/A'}</span>
            ${lotProto ? `<span>${svgIcon('home')} ${escapeHtml(lotProto.name)}</span>` : ''}
            ${lot.p > 0 ? `<span>${svgIcon('tag')} ${mxn.format(lot.p)}</span>` : ''}
          </div>
          <a href="https://wa.me/${escapeHtml(state.site?.whatsapp || '525537560931')}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa-mini">Cotizar por WhatsApp →</a>
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
  $('inquiryForm').addEventListener('submit', handleAsync(async (e) => {
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
        ? '¡Solicitud de visita registrada! Nuestras asesoras confirmarán tu horario.'
        : '¡Solicitud enviada! En breve te contactamos.';
      status.style.color = '';
      status.classList.remove('hidden');
      showToast('Solicitud registrada');
    } catch (err) {
      status.style.color = '#dc2626';
      status.textContent = err.message;
      status.classList.remove('hidden');
    }
  }));

  // Public Contact Form
  const contactForm = $('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleAsync(async (e) => {
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
    }));
  }

  // Map interactions (Lot click, dev pills, status filter pills, tabs, zoom, pan)
  $('mapSvg').addEventListener('click', (e) => {
    const lotEl = e.target.closest('.qmap-lot');
    if (!lotEl) return;
    state.selectedLotId = lotEl.dataset.lot;
    handleAsync(renderInteractiveMap)();
  });

  if ($('mapDevPills')) {
    $('mapDevPills').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mdev]');
      if (!btn) return;
      state.mapDevSlug = btn.dataset.mdev;
      state.selectedLotId = null;
      state.mapStatusFilter = 'all';
      state.mapProtoFilter = 'all';
      resetZoom();
      handleAsync(renderInteractiveMap)();
    });
  }

  $('mapProtoFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mproto]');
    if (!btn) return;
    state.mapProtoFilter = btn.dataset.mproto;
    handleAsync(renderInteractiveMap)();
  });

  if ($('mapStatusFilters')) {
    $('mapStatusFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mstatus]');
      if (!btn) return;
      state.mapStatusFilter = btn.dataset.mstatus;
      handleAsync(renderInteractiveMap)();
    });
  }

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

  // Touch pan for mobile & tablet
  let touchMoved = false;
  vp.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    state.dragging = true;
    touchMoved = false;
    state.dragStartX = t.clientX - state.panX;
    state.dragStartY = t.clientY - state.panY;
  }, { passive: true });
  vp.addEventListener('touchmove', (e) => {
    if (!state.dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    const nextX = t.clientX - state.dragStartX;
    const nextY = t.clientY - state.dragStartY;
    if (Math.hypot(nextX - state.panX, nextY - state.panY) > 4) touchMoved = true;
    if (touchMoved) {
      e.preventDefault();
      state.panX = nextX;
      state.panY = nextY;
      applyTransform();
    }
  }, { passive: false });
  vp.addEventListener('touchend', () => { state.dragging = false; });
  vp.addEventListener('touchcancel', () => { state.dragging = false; });

  // CMS Tabs
  document.querySelectorAll('.cms-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.cmstab;
      history.replaceState({}, '', `/admin?seccion=${target}`);
      $('cmsTabLots').classList.toggle('hidden', target !== 'lots');
      $('cmsTabPrototypes').classList.toggle('hidden', target !== 'prototypes');
      $('cmsTabSite').classList.toggle('hidden', target !== 'site');
    });
  });

  $('lotSearchInput').addEventListener('input', renderCmsLotsTable);
  $('lotStatusFilter').addEventListener('change', renderCmsLotsTable);
  $('cmsProtoSearchInput')?.addEventListener('input', renderCmsPrototypesGrid);
  $('cmsProtoDevFilter')?.addEventListener('change', renderCmsPrototypesGrid);

  if ($('cmsDevSelect')) {
    $('cmsDevSelect').addEventListener('change', handleAsync(async (e) => {
      state.cmsDevSlug = e.target.value;
      await renderAdminCms();
    }));
  }

  if ($('cmsSyncQavaltaBtn')) {
    $('cmsSyncQavaltaBtn').addEventListener('click', handleAsync(async () => {
      try {
        $('cmsSyncQavaltaBtn').disabled = true;
        $('cmsSyncQavaltaBtn').textContent = 'Sincronizando...';
        const res = await api('/api/admin/qavalta-sync', { method: 'POST', body: JSON.stringify({}) });
        if (Array.isArray(res.developments)) state.developments = res.developments;
        state.devMapsCache = {};
        await fetchDevMapData(state.cmsDevSlug || 'sorento', true);
        await renderAdminCms();
        renderPublicSite();
        showToast('Sincronización completada correctamente', { syncSuccess: true });
      } catch (err) {
        showToast(err.message);
      } finally {
        $('cmsSyncQavaltaBtn').disabled = false;
        $('cmsSyncQavaltaBtn').textContent = 'Sincronizar ahora';
      }
    }));
  }

  // CMS Lot updates (saved as override & reflected on live maps)
  $('cmsLotsBody').addEventListener('change', handleAsync(async (e) => {
    const row = e.target.closest('tr[data-lot-row]');
    if (!row) return;
    const slug = state.cmsDevSlug || 'sorento';
    const lotId = row.dataset.lotRow;
    const status = row.querySelector('.lot-status-select').value;
    const prototipo = row.querySelector('.lot-proto-select').value;
    await api(`/api/admin/qavalta-lots/${slug}/${encodeURIComponent(lotId)}`, {
      method: 'PUT',
      body: JSON.stringify({ status, prototipo })
    });
    delete state.devMapsCache[slug];
    await fetchDevMapData(slug);
    await renderAdminCms();
    showToast(`Lote ${lotId} actualizado en ${slug}`);
  }));

  // Card previews update drafts without modifying the published catalog.
  $('cmsPrototypesGrid').addEventListener('input', (event) => {
    const card = event.target.closest('[data-cms-proto]');
    if (!card) return;
    clearTimeout(card._previewTimer);
    if (event.target.matches('.p-img, .p-video')) {
      card._previewTimer = setTimeout(() => { if (card.isConnected) updateCmsPrototypePreview(card); }, 250);
    } else {
      updateCmsPrototypePreview(card);
    }
  });
  $('cmsCarouselOverview').addEventListener('click', event => {
    const button = event.target.closest('[data-edit-carousel-slide]');
    if (!button) return;
    state.cmsHeroDrafts[state.cmsHeroSlug] = $('editHeroImage').value;
    selectCmsHeroSlide(button.dataset.editCarouselSlide);
  });

  // CMS Prototype updates & file uploads
  $('cmsPrototypesGrid').addEventListener('change', handleAsync(async (e) => {
    if (!e.target.classList.contains('p-upload-img')) return;
    const card = e.target.closest('[data-cms-proto]');
    const file = e.target.files[0];
    if (!file) return;
    const res = await uploadMedia(file);
    card.querySelector('.p-img').value = res.url;
    updateCmsPrototypePreview(card);
    showToast('Imagen subida. Haz clic en Guardar cambios.');
  }));

  $('cmsPrototypesGrid').addEventListener('click', handleAsync(async (e) => {
    if (!e.target.classList.contains('save-proto-btn')) return;
    const card = e.target.closest('[data-cms-proto]');
    const id = card.dataset.cmsProto;
    const saved = await api(`/api/admin/prototypes/${id}`, {
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
    state.prototypes = state.prototypes.map(p => p.id === id ? saved.prototype : p);
    showToast(`Prototipo ${id} guardado`);
  }));

  // Preview only: the draft stays in the form until Save is pressed.
  ['editHeroEyebrow', 'editHeroTitle', 'editHeroSubtitle'].forEach(id => {
    $(id).addEventListener('input', updateCmsHomePreview);
  });
  let heroPreviewTimer;
  $('editHeroImage').addEventListener('input', () => {
    state.cmsHeroDrafts[state.cmsHeroSlug] = $('editHeroImage').value;
    clearTimeout(heroPreviewTimer);
    heroPreviewTimer = setTimeout(updateCmsHomePreview, 250);
  });
  $('editHeroImage').addEventListener('change', updateCmsHomePreview);
  $('previewHomeSectionBtn').addEventListener('click', () => {
    showOnlyView('public');
    setHeroSlide(HERO_SLIDES.findIndex(slide => slide.slug === state.cmsHeroSlug));
    $('top').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // CMS Site & Developments updates
  $('uploadHeroFile').addEventListener('change', handleAsync(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const slug = state.cmsHeroSlug;
    const res = await uploadMedia(file);
    state.cmsHeroDrafts[slug] = res.url;
    if (state.cmsHeroSlug === slug) { $('editHeroImage').value = res.url; updateCmsHomePreview(); }
    renderCmsCarouselOverview();
    showToast('Foto subida. Pulsa Guardar foto para publicarla.');
  }));

  $('saveSiteBtn').addEventListener('click', handleAsync(async () => {
    await api('/api/admin/site', {
      method: 'PATCH',
      body: JSON.stringify({
        eyebrow: $('editHeroEyebrow').value,
        heroTitle: $('editHeroTitle').value,
        heroSubtitle: $('editHeroSubtitle').value,
        phoneDisplay: $('editPhoneDisplay').value
      })
    });
    await loadPublicData();
    showToast('Textos de portada y contacto guardados');
  }));

  $('saveHeroSlideBtn').addEventListener('click', handleAsync(async () => {
    const slug = state.cmsHeroSlug;
    const image = $('editHeroImage').value.trim();
    const button = $('saveHeroSlideBtn');
    button.disabled = true;
    try {
      await api(slug === 'sorento' ? '/api/admin/site' : `/api/admin/developments/${slug}`, {
        method: 'PATCH', body: JSON.stringify({ heroImage: image })
      });
      delete state.cmsHeroDrafts[slug];
      await loadPublicData();
      selectCmsHeroSlide(state.cmsHeroSlug);
      showToast(`Foto de ${HERO_SLIDES.find(slide => slide.slug === slug).name} guardada`);
    } finally { button.disabled = false; }
  }));

  $('cmsDevsGrid').addEventListener('click', handleAsync(async (e) => {
    const previewButton = e.target.closest('[data-preview-development]');
    if (previewButton) {
      const slug = previewButton.dataset.previewDevelopment;
      showOnlyView('public');
      renderDevelopmentAccordion(slug);
      await loadInlineDevMap(slug);
      $('prototipos').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!e.target.classList.contains('save-dev-btn')) return;
    const card = e.target.closest('[data-cms-dev]');
    const id = card.dataset.cmsDev;
    await api(`/api/admin/developments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: card.querySelector('.d-name').value,
        startingPrice: card.querySelector('.d-price').value
      })
    });
    await loadPublicData();
    renderCmsCarouselOverview();
    showToast(`Desarrollo ${id} guardado`);
  }));
}

init().catch(err => { console.error(err); showToast('No se pudo iniciar la página. Intenta recargar.'); });
