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

// Four independent streets keep traffic geographically separated across each development.
const MAP_LIFE_CONFIG = {
  "sorento": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "22s",
        "begin": "-3s",
        "path": "M 2500 675 L 4150 675"
      },
      {
        "color": "#1e3a5f",
        "dur": "24s",
        "begin": "-9s",
        "path": "M 6500 1855 L 7500 1855"
      },
      {
        "color": "#d6b68a",
        "dur": "26s",
        "begin": "-15s",
        "path": "M 2150 4900 L 4300 4900"
      },
      {
        "color": "#a42d48",
        "dur": "28s",
        "begin": "-21s",
        "path": "M 6100 4890 L 8050 4890"
      }
    ]
  },
  "oporto": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "22s",
        "begin": "-3s",
        "path": "M 1200 1565 L 3200 1565"
      },
      {
        "color": "#1e3a5f",
        "dur": "24s",
        "begin": "-9s",
        "path": "M 4050 2445 L 5900 2445"
      },
      {
        "color": "#d6b68a",
        "dur": "26s",
        "begin": "-15s",
        "path": "M 1200 4490 L 2800 4490"
      },
      {
        "color": "#a42d48",
        "dur": "28s",
        "begin": "-21s",
        "path": "M 3620 5350 L 4930 5350"
      }
    ]
  },
  "ardenza": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "22s",
        "begin": "-3s",
        "path": "M 1510 2470 L 1830 2570 L 2080 2700"
      },
      {
        "color": "#1e3a5f",
        "dur": "24s",
        "begin": "-9s",
        "path": "M 3420 3900 L 3420 4700"
      },
      {
        "color": "#d6b68a",
        "dur": "26s",
        "begin": "-15s",
        "path": "M 900 5740 L 3100 5695"
      },
      {
        "color": "#a42d48",
        "dur": "28s",
        "begin": "-21s",
        "path": "M 5900 5720 L 7600 5755"
      }
    ]
  },
  "montalese": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "22s",
        "begin": "-3s",
        "path": "M 1200 1510 L 2700 1480"
      },
      {
        "color": "#1e3a5f",
        "dur": "24s",
        "begin": "-9s",
        "path": "M 4100 2530 L 5650 2530"
      },
      {
        "color": "#d6b68a",
        "dur": "26s",
        "begin": "-15s",
        "path": "M 1200 4380 L 2600 4380"
      },
      {
        "color": "#a42d48",
        "dur": "28s",
        "begin": "-21s",
        "path": "M 4100 5380 L 5750 5345"
      }
    ]
  },
  "vittoria": {
    "cars": [
      {
        "color": "#ffffff",
        "dur": "22s",
        "begin": "-3s",
        "path": "M 1750 1445 L 3250 1445"
      },
      {
        "color": "#1e3a5f",
        "dur": "24s",
        "begin": "-9s",
        "path": "M 4900 2520 L 6170 2520"
      },
      {
        "color": "#d6b68a",
        "dur": "26s",
        "begin": "-15s",
        "path": "M 1600 4270 L 3250 4270"
      },
      {
        "color": "#a42d48",
        "dur": "28s",
        "begin": "-21s",
        "path": "M 4820 5370 L 6020 5370"
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
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.02;0.98;1" dur="${car.dur}" begin="${car.begin}" repeatCount="indefinite" />
          <animateMotion dur="${car.dur}" begin="${car.begin}" calcMode="paced" repeatCount="indefinite" rotate="auto"><mpath href="#${routePrefix}-${index}" /></animateMotion>
        </g>
      `).join('')}
    </g>
  `;
}

const HD_MAP_BACKGROUNDS = {"sorento": "/assets/maps/hd/sorento.webp", "oporto": "/assets/maps/hd/oporto.webp", "ardenza": "/assets/maps/hd/ardenza.webp", "montalese": "/assets/maps/hd/montalese.webp", "vittoria": "/assets/maps/hd/vittoria.webp"};
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

  const bgAttrs = `data-map-background="${escapeHtml(mapData.slug)}"`;
  let bgMarkup = '';
  if (mapData.isTowerFloors && activeBg) {
    bgMarkup = `<image href="${escapeHtml(activeBg)}" x="0" y="0" width="${mapData.w}" height="${mapData.h}" preserveAspectRatio="xMidYMid meet" />`;
  } else if (mapData.slug === 'oporto' && mapData.bg) {
    const clipId = `oporto-plan-${++mapRenderSequence}`;
    bgMarkup = `<defs><clipPath id="${clipId}"><polygon points="100,80 6900,80 6900,3000 4900,6600 100,6600"/></clipPath></defs><image ${bgAttrs} href="${escapeHtml(mapData.bg)}" x="0" y="0" width="9000" height="6600" clip-path="url(#${clipId})"/>`;
  } else if (mapData.bg) {
    bgMarkup = `<image ${bgAttrs} href="${escapeHtml(mapData.bg)}${mapData.bg.includes('?') ? '&' : '?'}v=1.10.3" x="0" y="0" width="${mapData.w}" height="${mapData.h}" preserveAspectRatio="xMidYMid meet" />`;
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
  updateMapResolution(svg, state.zoom);
  observeMapMotion(svg);
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
function limitMapZoom(value, minimum = 0.6) {
  return Math.min(8, Math.max(minimum, value));
}

function updateMapResolution(svg, zoom) {
  const image = svg?.querySelector?.('[data-map-background]');
  if (!image) return;
  const hd = HD_MAP_BACKGROUNDS[image.dataset.mapBackground];
  if (!hd) return;
  image.dataset.previewSrc ||= image.getAttribute('href');
  const target = zoom >= 2 ? hd : image.dataset.previewSrc;
  if (image.getAttribute('href') === target) return;
  image.onerror = () => { image.onerror = null; image.setAttribute('href', image.dataset.previewSrc); };
  image.setAttribute('href', target);
}

function applyTransform() {
  $('mapSvg').style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  $('zoomPercentLabel').textContent = `${Math.round(state.zoom * 100)}%`;
  updateMapResolution($('mapSvg'), state.zoom);
}

function resetZoom() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
}

// --- ADMIN CMS RENDERING ---

const APP_KIND = document.documentElement.dataset.app || 'public';
function showOnlyView(viewName) {
  if (viewName === 'public' && APP_KIND === 'admin') { window.open('/sitio/', '_blank', 'noopener'); return; }
  state.currentView = viewName;
  for (const [id, view] of [['publicView','public'], ['siteHeader','public'], ['mapView','map'], ['adminView','admin'], ['loginView','login'], ['floatingStack','public']]) {
    $(id)?.classList.toggle('hidden', viewName !== view);
  }
  if (typeof closeCmsUserMenu === 'function') closeCmsUserMenu();
  if (typeof updateSessionNotice === 'function') updateSessionNotice();
  syncMapMotionVisibility();
}
function bindMapEvents() {
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

  $('zoomInBtn').addEventListener('click', () => { state.zoom = limitMapZoom(+(state.zoom + 0.25).toFixed(2)); applyTransform(); });
  $('zoomOutBtn').addEventListener('click', () => { state.zoom = Math.max(0.6, +(state.zoom - 0.25).toFixed(2)); applyTransform(); });
  $('zoomResetBtn').addEventListener('click', resetZoom);

  const vp = $('svgViewport');
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    state.zoom = limitMapZoom(+(state.zoom + delta).toFixed(2));
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


  $('exitMapBtn').addEventListener('click', () => showOnlyView(APP_KIND === 'admin' ? 'admin' : 'public'));
}

// SMIL stops consuming animation work when its map is outside the visible viewport.
let mapMotionObserver;
const observedMotionMaps = new WeakSet();
function applyMapMotionPolicy(svg) {
  if (!svg?.isConnected) return;
  const rect = svg.getBoundingClientRect();
  const visible = !document.hidden && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  svg.dataset.motion = visible && !reduced ? 'running' : 'paused';
  if (visible && !reduced) svg.unpauseAnimations?.(); else svg.pauseAnimations?.();
}
function syncMapMotionVisibility() {
  document.querySelectorAll('#mapSvg, .dev-inline-svg').forEach(applyMapMotionPolicy);
}
function observeMapMotion(svg) {
  if (!mapMotionObserver && window.IntersectionObserver) {
    mapMotionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.target.isConnected) applyMapMotionPolicy(entry.target); else mapMotionObserver.unobserve(entry.target);
    }));
    document.addEventListener('visibilitychange', syncMapMotionVisibility);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncMapMotionVisibility);
  }
  if (!observedMotionMaps.has(svg)) { mapMotionObserver?.observe(svg); observedMotionMaps.add(svg); }
  applyMapMotionPolicy(svg);
}
