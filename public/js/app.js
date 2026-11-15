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

  renderPrototypesGrid('all');
}

function renderPrototypesGrid(bedFilter) {
  const filtered = state.prototypes.filter(p => {
    if (bedFilter === '2') return p.bedrooms === 2;
    if (bedFilter === '3') return p.bedrooms >= 3;
    return true;
  });

  $('prototypesGrid').innerHTML = filtered.map(p => `
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
      </div>
    </article>
  `).join('');
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
      <div class="lot-spec-box"><small>Terreno</small><strong>${p.area} m²</strong></div>
      <div class="lot-spec-box"><small>Recámaras</small><strong>${p.bedrooms}</strong></div>
      <div class="lot-spec-box"><small>Baños</small><strong>${p.bathrooms}</strong></div>
      <div class="lot-spec-box"><small>Estac.</small><strong>${p.parking}</strong></div>
    </div>
    <a href="https://wa.me/${state.site.whatsapp}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa" style="margin-top:8px;">Solicitar información por WhatsApp →</a>
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

  // Trazado arquitectónico fiel a la fotografía (viewBox 940 x 940 sin caja gris alrededor)
  svg.setAttribute('viewBox', '45 10 850 925');
  const tree = (x, y, r = 7) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="#15803d" opacity="0.9" />
    <circle cx="${x - 1.5}" cy="${y - 1.5}" r="${r * 0.65}" fill="#22c55e" opacity="0.85" />
  `;

  let markup = `
    <!-- Perímetro trapezoidal del fraccionamiento -->
    <polygon points="155,18 865,18 825,922 65,922" fill="#cfd8e3" stroke="#64748b" stroke-width="2" />
    <!-- Calles pavimentadas -->
    <polygon points="196,24 816,24 786,912 108,912" fill="#e2e8f0" />

    <!-- Líneas discontinuas de calles horizontales -->
    <g stroke="#94a3b8" stroke-width="1" stroke-dasharray="6 6" opacity="0.7">
      <line x1="196" y1="80" x2="812" y2="80" />
      <line x1="184" y1="200" x2="808" y2="200" />
      <line x1="170" y1="336" x2="804" y2="336" />
      <line x1="158" y1="470" x2="800" y2="470" />
      <line x1="146" y1="604" x2="794" y2="604" />
      <line x1="132" y1="744" x2="790" y2="744" />
    </g>

    <!-- Bulevar curvo C. Paseo Vittoria (S-curve suave alrededor del parque y glorieta) -->
    <path d="M 488 76 Q 496 200 482 325 Q 465 405 462 462 Q 462 525 480 610 Q 496 720 488 890"
          fill="none" stroke="#f8fafc" stroke-width="48" stroke-linecap="round" />
    <path d="M 488 76 Q 496 200 482 325 Q 465 405 462 462 Q 462 525 480 610 Q 496 720 488 890"
          fill="none" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="7 7" />

    <!-- Parque Central Curvo (Manzana 5) -->
    <path d="M 498 205 Q 472 340 482 465 Q 492 590 508 725 L 558 725 L 558 205 Z"
          fill="#22c55e" stroke="#ffffff" stroke-width="2.5" />
    <path d="M 482 385 Q 486 450 492 515 L 558 515 L 558 385 Z" fill="#14532d" />
    <!-- Senderos del parque central -->
    <path d="M 520 220 Q 505 340 515 465 Q 525 590 535 710" fill="none" stroke="#dcfce7" stroke-width="3" opacity="0.65" />

    <!-- Glorieta central entre Manzanas 17 y 16 -->
    <circle cx="458" cy="466" r="34" fill="#f8fafc" stroke="#94a3b8" stroke-width="2" />
    <circle cx="458" cy="466" r="20" fill="#16a34a" />
    <circle cx="458" cy="466" r="10" fill="#991b1b" />

    <!-- Caseta de acceso principal (abajo al centro) -->
    <rect x="448" y="868" width="44" height="30" rx="4" fill="#991b1b" stroke="#fff" stroke-width="1.5" />
    <rect x="434" y="876" width="72" height="14" rx="2" fill="#b91c1c" opacity="0.9" />

    <!-- Contornos redondeados y áreas verdes centrales de las manzanas -->
    <rect x="204" y="88" width="268" height="100" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="190" y="208" width="286" height="116" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="192" y="254" width="282" height="22" rx="4" fill="#16a34a" />

    <!-- Manzana 17 y 16 con borde derecho curvo abrazando la glorieta -->
    <path d="M 176 344 L 448 344 Q 460 390 422 444 L 170 444 Q 168 394 176 344 Z" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <path d="M 164 488 L 418 488 Q 456 540 434 588 L 158 588 Q 158 538 164 488 Z" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />

    <rect x="138" y="612" width="336" height="116" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="140" y="658" width="332" height="22" rx="4" fill="#15803d" />

    <!-- Manzanas derecha -->
    <rect x="510" y="88" width="286" height="100" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="568" y="208" width="222" height="116" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="570" y="254" width="218" height="22" rx="4" fill="#16a34a" />
    <rect x="568" y="344" width="214" height="100" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="566" y="488" width="208" height="100" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="562" y="612" width="204" height="116" rx="10" fill="#f8fafc" stroke="#475569" stroke-width="1.2" />
    <rect x="564" y="658" width="200" height="22" rx="4" fill="#15803d" />

    <!-- Vegetación / Árboles en camellones y parque -->
    <g>
      ${tree(488, 120, 6)} ${tree(488, 165, 6)} ${tree(484, 240, 7)} ${tree(476, 310, 7)}
      ${tree(512, 260, 8)} ${tree(516, 330, 9)} ${tree(522, 430, 10)} ${tree(528, 560, 9)} ${tree(536, 670, 8)}
      ${tree(472, 570, 7)} ${tree(482, 650, 7)} ${tree(486, 740, 6)}
      ${tree(230, 265, 6)} ${tree(290, 265, 6)} ${tree(410, 265, 6)}
      ${tree(200, 669, 6)} ${tree(280, 669, 6)} ${tree(420, 669, 6)}
      ${tree(610, 265, 6)} ${tree(710, 265, 6)}
      ${tree(605, 669, 6)} ${tree(705, 669, 6)}
    </g>

    <!-- Etiquetas de calles -->
    <g font-family="Inter, sans-serif" font-size="8.5" font-weight="700" fill="#334155" text-anchor="middle">
      <text x="335" y="80">C. SENIA</text>
      <text x="650" y="80">C. SENIA</text>
      <text x="330" y="200">C. COLOMBO</text>
      <text x="675" y="200">C. COLOMBO</text>
      <text x="310" y="336">C. LEOPARDI</text>
      <text x="675" y="336">C. MILANO</text>
      <text x="295" y="470">C. MAGENTA</text>
      <text x="670" y="470">C. PANTI</text>
      <text x="300" y="604">C. MARTINO</text>
      <text x="665" y="604">C. MARMORA</text>
      <text x="290" y="744">C. TORINO</text>
      <text x="660" y="744">C. TORINO</text>
      <text x="480" y="320" transform="rotate(-84 480 320)">C. PASEO VITTORIA</text>
      <text x="478" y="650" transform="rotate(-76 478 650)">C. PASEO VITTORIA</text>
      <text x="122" y="470" transform="rotate(-84 122 470)">C. CAIROLI</text>
      <text x="802" y="470" transform="rotate(88 802 470)">C. METANA</text>
    </g>

    <!-- Círculos numerados de Manzana (como en la foto) -->
    <g font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">
      <circle cx="515" cy="49" r="8" fill="#7f1d1d" /><text x="515" y="52">1</text>
      <circle cx="338" cy="138" r="8" fill="#7f1d1d" /><text x="338" y="141">19</text>
      <circle cx="653" cy="138" r="8" fill="#7f1d1d" /><text x="653" y="141">2</text>
      <circle cx="355" cy="265" r="8" fill="#7f1d1d" /><text x="355" y="268">18</text>
      <circle cx="640" cy="265" r="8" fill="#7f1d1d" /><text x="640" y="268">3</text>
      <circle cx="315" cy="394" r="8" fill="#7f1d1d" /><text x="315" y="397">17</text>
      <circle cx="675" cy="394" r="8" fill="#7f1d1d" /><text x="675" y="397">4</text>
      <circle cx="520" cy="450" r="8" fill="#7f1d1d" /><text x="520" y="453">5</text>
      <circle cx="310" cy="538" r="8" fill="#7f1d1d" /><text x="310" y="541">16</text>
      <circle cx="670" cy="538" r="8" fill="#7f1d1d" /><text x="670" y="541">6</text>
      <circle cx="355" cy="669" r="8" fill="#7f1d1d" /><text x="355" y="672">14</text>
      <circle cx="640" cy="669" r="8" fill="#7f1d1d" /><text x="640" y="672">8</text>
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

  // Public prototype filters & cards
  $('publicProtoFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    $('publicProtoFilters').querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPrototypesGrid(btn.dataset.filter);
  });

  $('prototypesGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.proto-card');
    if (card) openPrototypeModal(card.dataset.proto);
  });

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
