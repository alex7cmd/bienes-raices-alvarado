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

async function checkAuth() {
  const wasAdmin = state.isAdmin;
  const res = await api('/api/auth/me');
  state.isAdmin = res.authenticated;
  state.adminEmail = res.email;
  state.sessionExpiresAt = res.expiresAt;
  if (wasAdmin && !state.isAdmin) expireAdminSession();
  updateSessionNotice();
  $('adminActiveDot')?.classList.toggle('hidden', !state.isAdmin);

  $('cmsAdminEmail').textContent = state.adminEmail || '';
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
  const detail = $('cmsSessionDetail');
  if (detail) detail.textContent = `Termina a las ${new Date(state.sessionExpiresAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:false })}. Recargar no amplía el plazo.`;
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
  $('adminActiveDot')?.classList.add('hidden');
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
  } else showOnlyView('login');
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
    <div class="cms-form-card cms-proto-horizontal" data-cms-proto="${escapeHtml(p.id)}">
      <div class="cms-proto-card-header"><h3>Prototipo: ${escapeHtml(p.name)}</h3>
      <span class="cms-location-pill">Estás editando: ficha de ${escapeHtml(p.name)}</span>
      <p class="cms-field-help cms-proto-location-title">Se muestra en la página de inicio, dentro de:</p>
      <div class="cms-proto-location-chips">
        ${(p.developments || []).map(id => {
          const development = state.developments.find(d => d.id === id);
          return `<span>${escapeHtml(development?.name || id)} → ${escapeHtml(p.name)}${p.availabilityByDevelopment?.[id] === 'sold-out' ? ' · Agotado' : ''}</span>`;
        }).join('') || '<span>Sin desarrollo asignado</span>'}
      </div>
      ${p.mediaByDevelopment?.montalese?.pending ? '<p class="cms-field-help">Ruche de Montalese: fotografías pendientes. La galería actual corresponde a Sorento y no se muestra en Montalese.</p>' : ''}
      </div>
      <div class="cms-proto-card-body">
      <div class="cms-proto-visual">
      ${renderCmsPrototypePreview(p)}
      <p class="cms-field-help cms-card-location">La vista previa cambia mientras editas. Los cambios se publican al guardar.</p>
      </div>
      <div class="cms-proto-editor">
      <h4>Datos del prototipo</h4>
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
      </div></div>
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

function renderCmsInventoryStatus(mapData, slug) {
  if ($('cmsAutoSyncStatus')) $('cmsAutoSyncStatus').dataset.inventorySync = slug;
  const counts = getMapCounts(mapData.lots);
  if ($('cmsSyncStatus')) {
    const sources = { 'planos.qavalta.com': 'Fuente: planos.qavalta.com', 'local-cache': 'Copia local', 'stale-cache': 'Última sincronización disponible' };
    const label = sources[mapData.source] || 'Copia local';
    $('cmsSyncStatus').textContent = `${label} · ${mapData.lots.length} lotes/unidades`;
    $('cmsSyncBadge').textContent = mapData.source === 'planos.qavalta.com'
      ? 'Los datos de lotes se consultan en planos.qavalta.com.'
      : mapData.source === 'stale-cache'
        ? 'Sin respuesta de la fuente. Mostramos la última copia disponible.'
        : 'Mostramos la copia local de los datos de lotes.';
  }

  $('cmsLotStats').innerHTML = `
    <div class="stat-box"><small>Total (${slug})</small><strong>${mapData.lots.length}</strong></div>
    <div class="stat-box"><small>Disponibles</small><strong style="color:var(--green)">${counts.disponible}</strong></div>
    <div class="stat-box"><small>Apartados</small><strong style="color:var(--amber)">${counts.reservado}</strong></div>
    <div class="stat-box"><small>No disponibles</small><strong>${counts.no_disponible}</strong></div>
    <div class="stat-box"><small>Vendidos</small><strong style="color:#ef4444">${counts.vendido}</strong></div>
  `;

  updateInventorySyncLabels(slug, mapData);
}
function refreshAdminInventory(mapData, slug) {
  renderCmsInventoryStatus(mapData, slug);
  renderCmsLotsTable();
}

async function renderAdminCms() {
  const { prototypes, developments, site } = state;
  const slug = state.cmsDevSlug || 'sorento';
  state.cmsDevSlug = slug;
  if ($('cmsDevSelect')) $('cmsDevSelect').value = slug;

  const mapData = await fetchDevMapData(slug);
  if (slug !== state.cmsDevSlug) return;
  renderCmsInventoryStatus(mapData, slug);

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
  const assignedPrototypes = getMappedDevPrototypes(mapData);
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
          ${assignedPrototypes.map(p => `<option value="${escapeHtml(p.name)}" ${String(l.pr).toLowerCase() === p.name.toLowerCase() ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
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


async function loadPublicData() {
  const data = await api('/api/public/site');
  Object.assign(state, {site:data.site, developments:data.developments, prototypes:data.prototypes});
}
function bindAdminEvents() {
  const info = $('cmsInfo');
  document.addEventListener('click', event => {
    if (info?.open && !info.contains(event.target)) info.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && info?.open) {
      info.open = false;
      info.querySelector('summary').focus();
    }
  });
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


  $('cmsToMapBtn').addEventListener('click', handleAsync(openInteractiveMap));
  $('cmsToPublicBtn').addEventListener('click', () => window.open('/sitio/', '_blank', 'noopener'));
  $('cmsLogoutBtn').addEventListener('click', handleAsync(async () => {
    await api('/api/auth/logout', {method:'POST'}); await checkAuth(); showOnlyView('login'); showToast('Sesión cerrada');
  }));
  document.querySelectorAll('.cms-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.cmstab;
      history.replaceState({}, '', `/admin/?seccion=${target}`);
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
    window.open(`/sitio/?desarrollo=${encodeURIComponent(state.cmsHeroSlug)}#top`, '_blank', 'noopener');
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
      window.open(`/sitio/?desarrollo=${encodeURIComponent(slug)}#prototipos`, '_blank', 'noopener');
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
async function initAdminApp() {
  initThemeScheduler(); bindAdminEvents(); bindMapEvents();
  $('loginView').classList.add('checking-session'); $('loginDescription').textContent = 'Verificando tu sesión…'; showOnlyView('login');
  try { await Promise.all([loadPublicData(),checkAuth()]); await restoreAdminRoute(); }
  finally { $('loginView').classList.remove('checking-session'); $('loginDescription').textContent = 'Ingresa para administrar el inventario, los precios y la portada.'; }
  initInventoryAutoSync();
  setInterval(updateSessionNotice,1000);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) handleAsync(checkAuth)();});
}
initAdminApp().catch(err => {console.error(err); showToast('No se pudo iniciar el administrador. Intenta recargar.');});
