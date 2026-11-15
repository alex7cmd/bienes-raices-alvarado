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

// --- RENDER PUBLIC SITE ---
function renderPublicSite() {
  const { site, developments, prototypes } = state;
  $('heroEyebrow').textContent = site.eyebrow;
  $('heroTitle').textContent = site.heroTitle;
  $('heroSubtitle').textContent = site.heroSubtitle;
  $('heroBg').style.backgroundImage = `url('${site.heroImage}')`;
  $('footerPhone').textContent = site.phoneDisplay;
  $('footerPhone').href = `tel:${site.phoneDisplay.replace(/\s+/g, '')}`;
  $('footerWa').href = `https://wa.me/${site.whatsapp}`;

  $('developmentsGrid').innerHTML = developments.map(d => `
    <div class="dev-card" data-dev="${d.id}">
      <img src="${d.image}" alt="${d.name}" loading="lazy" />
      <div class="dev-card-overlay">
        <div>
          <div class="dev-card-name">${d.name}</div>
          <small style="color:rgba(255,255,255,.78);font-size:11px;">Desde ${mxn.format(d.startingPrice)}</small>
        </div>
        <button class="dev-ver-btn">Ver →</button>
      </div>
    </div>
  `).join('');

  renderDevelopmentAccordion('oporto');

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

function renderDevelopmentAccordion(openDevId = 'oporto') {
  const container = $('developmentAccordion');
  if (!container) return;

  container.innerHTML = state.developments.map(dev => {
    const devProtos = state.prototypes.filter(p => Array.isArray(p.developments) && p.developments.includes(dev.id));
    const isOpen = dev.id === openDevId;
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
          <p class="dev-pill-tagline">${dev.tagline} · Qavalta Residencial</p>
          <div class="prototypes-grid">
            ${devProtos.map(p => `
              <article class="proto-card" data-proto="${p.id}">
                <div class="proto-img-wrap">
                  <img src="${p.image}" alt="${p.name}" loading="lazy" />
                </div>
                <div class="proto-body">
                  <div class="proto-top">
                    <h3>${p.name}</h3>
                    <span class="proto-price">${mxn.format(p.price)}</span>
                  </div>
                  <p class="proto-desc">${p.description}</p>
                  <div class="proto-specs">
                    <span>🛏️ ${p.bedrooms} Rec</span>
                    <span>🚿 ${p.bathrooms} Baños</span>
                    <span>📐 ${p.area} m²</span>
                    <span>🚗 ${p.parking}</span>
                  </div>
                  <div class="proto-features-chips">
                    ${(p.features || []).slice(0, 4).map(f => `<span class="proto-chip">${featureIcon(f)} ${f}</span>`).join('')}
                  </div>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openPrototypeModal(protoId) {
  const p = state.prototypes.find(x => x.id === protoId);
  if (!p) return;
  const waMsg = encodeURIComponent(`Hola, me interesa información del prototipo ${p.name} (${mxn.format(p.price)}).`);
  $('protoModalContent').innerHTML = `
    <img src="${p.image}" alt="${p.name}" style="width:100%;height:240px;object-fit:cover;border-radius:12px;margin-bottom:16px;" />
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
  $('protoModal').classList.remove('hidden');
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

async function openInteractiveMap() {
  if (!state.isAdmin) {
    $('loginModal').classList.remove('hidden');
    return;
  }
  const data = await api('/api/admin/lots');
  state.lots = data.lots;
  state.prototypes = data.prototypes;
  state.counts = data.counts;
  state.selectedLotId = null;
  state.mapProtoFilter = 'all';
  resetZoom();
  renderInteractiveMap();
  showOnlyView('map');
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

// --- INTERACTIVE SVG MAP (TRACED REFERENCE + FULLSCREEN) ---
function renderInteractiveMap() {
  const { lots, prototypes, counts } = state;
  $('mapAvailCount').textContent = `• ${counts.disponible} lotes disponibles`;
  $('countDisp').textContent = counts.disponible;
  $('countNoDisp').textContent = counts.no_disponible;
  $('countVend').textContent = counts.vendido;

  const minPrice = Math.min(...prototypes.map(p => p.price));
  $('mapStartingPrice').textContent = mxn.format(minPrice);

  // Side panel prototype filter pills
  $('mapProtoFilters').innerHTML = [
    `<button class="${state.mapProtoFilter === 'all' ? 'active' : ''}" data-mproto="all">Todos</button>`,
    ...prototypes.map(p => `<button class="${state.mapProtoFilter === p.id ? 'active' : ''}" data-mproto="${p.id}">${p.name}</button>`)
  ].join('');

  const svg = $('mapSvg');
  const statusStyle = {
    disponible: { fill: '#bbf7d0', stroke: '#16a34a', roof: '#86efac' },
    no_disponible: { fill: '#fde68a', stroke: '#d97706', roof: '#fcd34d' },
    vendido: { fill: '#bfdbfe', stroke: '#2563eb', roof: '#93c5fd' }
  };

  // Trazado arquitectónico fiel a la fotografía (calles amplias sin encimar textos)
  svg.setAttribute('viewBox', '30 8 880 930');
  const tree = (x, y, r = 6) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="#15803d" opacity="0.9" />
    <circle cx="${x - 1.2}" cy="${y - 1.2}" r="${r * 0.62}" fill="#22c55e" opacity="0.85" />
  `;

  let markup = `
    <!-- Perímetro trapezoidal del fraccionamiento -->
    <polygon points="136,16 882,16 842,924 46,924" fill="#cfd8e3" stroke="#64748b" stroke-width="2" />
    <!-- Calles pavimentadas -->
    <polygon points="184,22 830,22 800,914 96,914" fill="#e2e8f0" />

    <!-- Líneas discontinuas de calles horizontales (centradas en cada calle) -->
    <g stroke="#94a3b8" stroke-width="1" stroke-dasharray="6 6" opacity="0.65">
      <line x1="186" y1="78" x2="826" y2="78" />
      <line x1="174" y1="196" x2="822" y2="196" />
      <line x1="160" y1="334" x2="818" y2="334" />
      <line x1="148" y1="468" x2="814" y2="468" />
      <line x1="136" y1="602" x2="810" y2="602" />
      <line x1="122" y1="740" x2="806" y2="740" />
    </g>

    <!-- Bulevar curvo C. Paseo Vittoria (corredor amplio, centrado entre bloques) -->
    <path d="M 484 74 Q 490 196 476 320 Q 458 400 458 468 Q 458 536 474 616 Q 486 720 472 890"
          fill="none" stroke="#f8fafc" stroke-width="44" stroke-linecap="round" />
    <path d="M 484 74 Q 490 196 476 320 Q 458 400 458 468 Q 458 536 474 616 Q 486 720 472 890"
          fill="none" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="7 7" />

    <!-- Parque Central Curvo (Manzana 5) -->
    <path d="M 504 210 Q 484 340 490 468 Q 498 595 512 724 L 562 724 L 562 210 Z"
          fill="#22c55e" stroke="#ffffff" stroke-width="2.5" />
    <path d="M 488 388 Q 492 452 498 518 L 562 518 L 562 388 Z" fill="#14532d" />
    <path d="M 526 226 Q 512 340 520 468 Q 528 595 538 708" fill="none" stroke="#dcfce7" stroke-width="2.5" opacity="0.65" />

    <!-- Glorieta central entre Manzanas 17 y 16 -->
    <circle cx="458" cy="468" r="32" fill="#f8fafc" stroke="#94a3b8" stroke-width="2" />
    <circle cx="458" cy="468" r="19" fill="#16a34a" />
    <circle cx="458" cy="468" r="9.5" fill="#991b1b" />

    <!-- Caseta de acceso principal (alineada al bulevar inferior x=472) -->
    <rect x="450" y="868" width="44" height="30" rx="4" fill="#991b1b" stroke="#fff" stroke-width="1.5" />
    <rect x="436" y="876" width="72" height="14" rx="2" fill="#b91c1c" opacity="0.9" />

    <!-- Contornos redondeados y áreas verdes centrales de las manzanas (ajustados a los lotes) -->
    <rect x="198" y="88" width="256" height="94" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="184" y="210" width="264" height="110" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="186" y="253" width="260" height="22" rx="4" fill="#16a34a" />

    <!-- Manzana 17 y 16 con borde derecho curvo abrazando la glorieta -->
    <path d="M 172 348 L 434 348 Q 444 392 406 442 L 166 442 Q 164 395 172 348 Z" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <path d="M 160 492 L 402 492 Q 440 540 422 586 L 154 586 Q 154 538 160 492 Z" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />

    <rect x="136" y="616" width="302" height="110" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="138" y="659" width="298" height="22" rx="4" fill="#15803d" />

    <!-- Manzanas derecha -->
    <rect x="520" y="88" width="280" height="94" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="576" y="210" width="218" height="110" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="578" y="253" width="214" height="22" rx="4" fill="#16a34a" />
    <rect x="576" y="348" width="212" height="94" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="574" y="492" width="206" height="94" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="570" y="616" width="202" height="110" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="572" y="659" width="198" height="22" rx="4" fill="#15803d" />

    <!-- Vegetación / Árboles en parque y camellones (sin tapar textos) -->
    <g>
      ${tree(520, 250, 7)} ${tree(524, 330, 8)} ${tree(528, 430, 9)} ${tree(532, 560, 8)} ${tree(540, 670, 7)}
      ${tree(225, 264, 5.5)} ${tree(285, 264, 5.5)} ${tree(395, 264, 5.5)}
      ${tree(190, 670, 5.5)} ${tree(270, 670, 5.5)} ${tree(385, 670, 5.5)}
      ${tree(615, 264, 5.5)} ${tree(715, 264, 5.5)}
      ${tree(610, 670, 5.5)} ${tree(710, 670, 5.5)}
    </g>

    <!-- Etiquetas de calles (limpias, centradas en sus carriles) -->
    <g font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#334155" text-anchor="middle">
      <text x="330" y="79">C. SENIA</text>
      <text x="655" y="79">C. SENIA</text>
      <text x="320" y="199">C. COLOMBO</text>
      <text x="680" y="199">C. COLOMBO</text>
      <text x="305" y="337">C. LEOPARDI</text>
      <text x="680" y="337">C. MILANO</text>
      <text x="290" y="471">C. MAGENTA</text>
      <text x="675" y="471">C. PANTI</text>
      <text x="290" y="605">C. MARTINO</text>
      <text x="670" y="605">C. MARMORA</text>
      <text x="280" y="743">C. TORINO</text>
      <text x="665" y="743">C. TORINO</text>
      <text x="480" y="290" transform="rotate(-84 480 290)">C. PASEO VITTORIA</text>
      <text x="476" y="660" transform="rotate(-82 476 660)">C. PASEO VITTORIA</text>
      <text x="116" y="470" transform="rotate(-84 116 470)">C. CAIROLI</text>
      <text x="810" y="470" transform="rotate(88 810 470)">C. METANA</text>
    </g>

    <!-- Círculos numerados de Manzana -->
    <g font-family="Inter, sans-serif" font-size="7.5" font-weight="700" fill="#fff" text-anchor="middle">
      <circle cx="515" cy="46" r="7.5" fill="#7f1d1d" /><text x="515" y="49">1</text>
      <circle cx="326" cy="135" r="7.5" fill="#7f1d1d" /><text x="326" y="138">19</text>
      <circle cx="658" cy="135" r="7.5" fill="#7f1d1d" /><text x="658" y="138">2</text>
      <circle cx="340" cy="264" r="7.5" fill="#7f1d1d" /><text x="340" y="267">18</text>
      <circle cx="660" cy="264" r="7.5" fill="#7f1d1d" /><text x="660" y="267">3</text>
      <circle cx="300" cy="395" r="7.5" fill="#7f1d1d" /><text x="300" y="398">17</text>
      <circle cx="680" cy="395" r="7.5" fill="#7f1d1d" /><text x="680" y="398">4</text>
      <circle cx="526" cy="450" r="7.5" fill="#7f1d1d" /><text x="526" y="453">5</text>
      <circle cx="295" cy="539" r="7.5" fill="#7f1d1d" /><text x="295" y="542">16</text>
      <circle cx="676" cy="539" r="7.5" fill="#7f1d1d" /><text x="676" y="542">6</text>
      <circle cx="330" cy="670" r="7.5" fill="#7f1d1d" /><text x="330" y="673">14</text>
      <circle cx="656" cy="670" r="7.5" fill="#7f1d1d" /><text x="656" y="673">8</text>
    </g>
  `;

  // Lotes individuales interactivos con huella arquitectónica de casa
  for (const lot of lots) {
    const dimmed = state.mapProtoFilter !== 'all' && lot.prototypeId !== state.mapProtoFilter;
    const isSelected = state.selectedLotId === lot.id;
    const st = statusStyle[lot.status] || { fill: '#e2e8f0', stroke: '#94a3b8', roof: '#cbd5e1' };
    const cx = lot.x + lot.w / 2;
    const cy = lot.y + lot.h / 2;
    const rot = lot.angle ? `transform="rotate(${lot.angle} ${cx} ${cy})"` : '';
    markup += `
      <g class="lot-group" data-lot="${lot.id}" ${rot}>
        <rect
          x="${lot.x}" y="${lot.y}" width="${lot.w}" height="${lot.h}" rx="2"
          fill="${st.fill}" fill-opacity="0.92"
          stroke="${isSelected ? '#0f172a' : st.stroke}" stroke-width="${isSelected ? '2.2' : '0.9'}"
          class="lot-rect ${isSelected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}"
        />
        <rect
          x="${lot.x + 2.5}" y="${lot.y + 2.5}" width="${Math.max(4, lot.w - 5)}" height="${Math.max(4, lot.h - 5)}" rx="1"
          fill="${st.roof}" opacity="0.45" pointer-events="none"
        />
        <text
          x="${cx}" y="${cy + 2.5}"
          font-family="Inter, sans-serif" font-size="6.5" font-weight="700"
          fill="#0f172a" text-anchor="middle" pointer-events="none"
          opacity="${dimmed ? '0.2' : '0.95'}"
        >${lot.number}</text>
      </g>
    `;
  }

  svg.innerHTML = markup;
  renderSelectedLotDetail();
}

function renderSelectedLotDetail() {
  const container = $('panelLotDetail');
  if (!state.selectedLotId) {
    container.innerHTML = `
      <div class="empty-lot-state">
        <div class="empty-icon">🏠</div>
        <h3>Toca un lote</h3>
        <p>Selecciona cualquier casa o lote en el plano para ver su superficie, recámaras, baños y precio.</p>
      </div>
    `;
    return;
  }

  const lot = state.lots.find(l => l.id === state.selectedLotId);
  const proto = state.prototypes.find(p => p.id === lot.prototypeId) || state.prototypes[0];
  const statusLabel = {
    disponible: 'Disponible',
    no_disponible: 'No disponible',
    vendido: 'Vendido'
  }[lot.status];

  container.innerHTML = `
    <div class="lot-detail-card">
      <img src="${proto.image}" alt="${proto.name}" />
      <span class="lot-status-pill ${lot.status}">${statusLabel}</span>
      <h3>Casa / Lote #${lot.number}</h3>
      <p style="font-size:12px;color:var(--muted);">Manzana ${lot.manzana} · ${lot.street}</p>
      <div class="lot-detail-price">${mxn.format(proto.price)}</div>
      <div class="lot-specs-grid">
        <div class="lot-spec-box"><small>Prototipo</small><strong>${proto.name}</strong></div>
        <div class="lot-spec-box"><small>Área terreno</small><strong>${proto.area} m²</strong></div>
        <div class="lot-spec-box"><small>Recámaras</small><strong>${proto.bedrooms}</strong></div>
        <div class="lot-spec-box"><small>Baños</small><strong>${proto.bathrooms}</strong></div>
      </div>
      <p style="font-size:12px;color:var(--muted);line-height:1.5;">${proto.description}</p>
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

  // Expandable development pills + prototype cards
  $('developmentAccordion').addEventListener('click', (e) => {
    const card = e.target.closest('.proto-card');
    if (card) {
      openPrototypeModal(card.dataset.proto);
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
    }
  });

  if ($('footerLatestProps')) {
    $('footerLatestProps').addEventListener('click', (e) => {
      const item = e.target.closest('.footer-mini-prop');
      if (item) openPrototypeModal(item.dataset.proto);
    });
  }

  $('developmentsGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.dev-card');
    if (!card) return;
    if (state.isAdmin) {
      openInteractiveMap();
    } else {
      document.getElementById('prototipos').scrollIntoView({ behavior: 'smooth' });
      showToast('Inicia sesión como Administrador en el icono superior derecho para abrir el Plano Interactivo');
    }
  });

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

  // Map interactions (Lot click, filter pills, tabs, zoom, pan)
  $('mapSvg').addEventListener('click', (e) => {
    const g = e.target.closest('.lot-group');
    if (!g) return;
    state.selectedLotId = g.dataset.lot;
    renderInteractiveMap();
  });

  $('mapProtoFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mproto]');
    if (!btn) return;
    state.mapProtoFilter = btn.dataset.mproto;
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
