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
  p = getPrototypeForDevelopment(p);
  if (!p) return '';
  const gallery = getProtoGallery(p);
  const activeIdx = Math.max(0, Math.min(slideIdx, gallery.length - 1));
  const isDepto = p.type === 'departamento' || (Array.isArray(p.developments) && p.developments.length === 1 && p.developments[0] === 'torres-qavalta');
  const devSlug = state.currentView === 'map' ? state.mapDevSlug : (state.publicDevSlug || (Array.isArray(p.developments) && p.developments[0]) || 'sorento');
  const amenPhotos = AMENITIES_GALLERY[devSlug] || AMENITIES_GALLERY.vittoria;
  return `
    <div class="proto-tab-panel" data-active-proto="${escapeHtml(p.id)}" data-slide-idx="${activeIdx}">
      <div class="proto-panel-media">
        <div class="proto-panel-stage">
          ${p.mediaPending ? renderPendingPrototypeMedia() : `
          <img class="proto-panel-main-img" src="${escapeHtml(gallery[activeIdx])}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <button type="button" class="proto-gallery-btn" data-proto-gallery="${escapeHtml(p.id)}" aria-label="Ver galería de ${escapeHtml(p.name)}">${svgIcon('gallery')} Ver galería</button>
          `}
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
                <img src="${escapeHtml(getProtoThumbnail(p, src))}" alt="${escapeHtml(p.name)} vista ${idx + 1}" loading="lazy" />
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
            <h3>${escapeHtml(p.name)} ${renderSoldOutBadge(p)}</h3>
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
          <span class="proto-panel-subtitle">Características y amenidades · Toca para ver fotos</span>
          <div class="proto-features-chips">
            ${(p.features || []).map((f, i) => `
              <button type="button" class="proto-chip proto-chip-interactive" data-amen-feature-idx="${i}" data-amen-label="${escapeHtml(f)}" aria-expanded="false">
                <span class="proto-chip-main">${featureIcon(f)} <span>${escapeHtml(f)}</span></span>
                <img class="proto-chip-thumb" src="${escapeHtml(amenPhotos[i % amenPhotos.length])}" alt="${escapeHtml(f)}" loading="lazy" />
              </button>
            `).join('')}
          </div>
          <div class="inline-amen-gallery hidden" data-dev-slug="${escapeHtml(devSlug)}"></div>
        </div>
      </div>
    </div>
  `;
}

function renderInlineAmenitiesGallery(container, devSlug, activeIdx = 0, activeLabel = '') {
  if (!container) return;
  const photos = AMENITIES_GALLERY[devSlug] || AMENITIES_GALLERY.vittoria;
  if (!photos.length) return;
  const dev = state.developments.find(d => d.id === devSlug) || { name: devSlug };
  const idx = ((activeIdx % photos.length) + photos.length) % photos.length;
  container.dataset.amenIdx = String(idx);
  container.dataset.amenLabel = activeLabel;
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="inline-amen-stage">
      <img src="${escapeHtml(photos[idx])}" alt="${escapeHtml(dev.name)} - ${escapeHtml(activeLabel || 'Amenidad')}" />
      <div class="amen-stage-overlay">
        <span class="amen-kicker">AMENIDADES · ${escapeHtml(dev.name.toUpperCase())}</span>
        ${activeLabel ? `<h4>${escapeHtml(activeLabel)}</h4>` : ''}
      </div>
      <span class="proto-photo-counter">${idx + 1} / ${photos.length}</span>
      <button type="button" class="inline-amen-close" aria-label="Cerrar galería de amenidades">✕</button>
      ${photos.length > 1 ? `
        <button type="button" class="proto-photo-arrow proto-photo-prev inline-amen-prev" aria-label="Foto anterior">‹</button>
        <button type="button" class="proto-photo-arrow proto-photo-next inline-amen-next" aria-label="Foto siguiente">›</button>
      ` : ''}
    </div>
    ${photos.length > 1 ? `
      <div class="amen-filmstrip inline-amen-filmstrip">
        ${photos.map((src, i) => `
          <button type="button" class="amen-thumb inline-amen-thumb ${i === idx ? 'active' : ''}" data-inline-amen-idx="${i}" aria-label="Ver foto de amenidad ${i + 1}">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(dev.name)} amenidad ${i + 1}" loading="lazy" />
          </button>
        `).join('')}
      </div>
    ` : ''}
  `;
}

function setPanelSlide(panel, protoId, nextIdx) {
  const p = getPrototypeForDevelopment(state.prototypes.find(x => x.id === protoId), state.currentView === 'map' ? state.mapDevSlug : state.publicDevSlug);
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

function isAllowedTiktokVideo(video) {
  const url = String(video?.url || '');
  if (/^https:\/\/www\.tiktok\.com\/@(?:itzealva|bienes\.races57)\/video\/[0-9]{19}$/.test(url)) return true;
  return video?.custom === true && /^https:\/\/www\.tiktok\.com\/@[A-Za-z0-9_.]+\/video\/[0-9]{15,22}$/.test(url);
}

// Curated Qavalta posts only; never embed the personal profile feed.
function renderDevelopmentVideos(development) {
  const videos = (state.videos || []).filter(video =>
    Array.isArray(video.developments) && video.developments.includes(development.id)
    && isAllowedTiktokVideo(video)
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
  state.publicDevSlug = activeDev.id;
  const devProtos = getDevelopmentPrototypes(activeDev.id);
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
    <div class="dev-tabs-swipe-hint" aria-hidden="true">
      <span>Desliza para ver desarrollos</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
    </div>
    <div class="unified-dev-tabs" role="tablist" aria-label="Desarrollos residenciales">
      ${state.developments.map(dev => {
        const count = getDevelopmentPrototypes(dev.id).filter(p => p.salesStatus !== 'sold-out').length;
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
                ${specBox('gallery', 'Modelos', `${devProtos.filter(p => p.salesStatus !== 'sold-out').length} disponibles${devProtos.some(p => p.salesStatus === 'sold-out') ? ' · 1 agotado' : ''}`)}
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
                <span class="dev-proto-tab-name">${escapeHtml(p.name)} ${renderSoldOutBadge(p)}</span>
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
                <small class="inventory-sync-status" data-inventory-sync="${escapeHtml(activeDev.id)}" role="status">Actualización automática cada 60 s</small>
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
  const p = getPrototypeForDevelopment(state.prototypes.find(x => x.id === protoId), state.currentView === 'map' ? state.mapDevSlug : state.publicDevSlug);
  if (!p) return;
  const gallery = getProtoGallery(p);
  let activeIdx = Math.max(0, Math.min(initialIdx, gallery.length - 1));
  const waMsg = encodeURIComponent(`Hola, me interesa información del prototipo ${p.name} (${mxn.format(p.price)}).`);
  $('protoModalContent').innerHTML = `
    <div class="proto-modal-gallery">
      <div class="proto-modal-stage">
        ${p.mediaPending ? renderPendingPrototypeMedia() : `
        <img id="protoModalMainImg" src="${escapeHtml(gallery[activeIdx])}" alt="${escapeHtml(p.name)}" />
        <button type="button" class="proto-gallery-btn" id="protoModalFullscreenBtn" aria-label="Ver galería a pantalla completa">⤢ Pantalla completa</button>
        `}
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
              <img src="${escapeHtml(getProtoThumbnail(p, src))}" alt="${escapeHtml(p.name)} ${idx + 1}" loading="lazy" />
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${p.video ? `<video preload="none" src="${escapeHtml(p.video)}" controls style="width:100%;border-radius:12px;margin-bottom:16px;max-height:220px;"></video>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;">
      <h2 style="font-size:24px;">${escapeHtml(p.name)} ${renderSoldOutBadge(p)}</h2>
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
  const p = getPrototypeForDevelopment(state.prototypes.find(x => x.id === protoId), state.currentView === 'map' ? state.mapDevSlug : state.publicDevSlug);
  if (!p) return;
  const gallery = getProtoGallery(p);
  if (!gallery.length) return;
  fsGalleryState = { protoId: p.id, gallery, idx: initialIdx };
  $('fsGalleryTitle').textContent = p.name;
  $('fsGalleryPrice').textContent = mxn.format(p.price);
  $('fsGalleryThumbs').innerHTML = gallery.map((src, i) => `
    <button type="button" class="fs-gallery-thumb ${i === initialIdx ? 'active' : ''}" data-fs-idx="${i}" aria-label="Foto ${i + 1}">
      <img src="${escapeHtml(getProtoThumbnail(p, src))}" alt="${escapeHtml(p.name)} ${i + 1}" loading="lazy" />
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
function renderInlineSelectedLot(mapSec, lot, slug) {
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

function refreshInlineInventory(slug, data) {
  const section = document.querySelector(`.dev-inline-map-section[data-inline-map="${slug}"]`);
  if (!section) return;
  const counts = getMapCounts(data.lots);
  for (const key of ['disponible','reservado','no_disponible','vendido']) {
    const label = section.querySelector(`[data-c="${key}"]`);
    if (label) label.textContent = counts[key];
  }
  const selectedLotId = section.dataset.selectedLotId;
  patchInventoryMap(section.querySelector('.dev-inline-svg'), data, {floorId:section.dataset.floorId, selectedLotId});
  const lot = data.lots.find(l => l.id === selectedLotId);
  if (lot) renderInlineSelectedLot(section, lot, slug);
  section.querySelectorAll('[data-inline-floor]').forEach(button => {
    const floor = data.floors?.find(f => f.id === Number(button.dataset.inlineFloor));
    if (floor) button.title = `${floor.lots.filter(l => normalizeStatus(l.s) === 'disponible').length} disponibles`;
  });
}

async function loadInlineDevMap(slug, floorId = null) {
  const section = document.querySelector(`.dev-inline-map-section[data-inline-map="${slug}"]`);
  if (!section) return;
  const svg = section.querySelector('.dev-inline-svg');
  if (!svg || (svg.dataset.loaded === slug && floorId === null)) return;
  try {
    const mapData = await fetchDevMapData(slug);
    updateInventorySyncLabels(slug, mapData);
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
    section.dataset.floorId = activeFloorId || '';
    svg.dataset.loaded = slug;
    observeMapMotion(svg);
  } catch (err) {
    console.error(err);
  }
}


async function loadPublicData() {
  const [data, videos] = await Promise.all([api('/api/public/site'), api('/assets/qavalta-videos.json?v=1.0.0-6').catch(() => [])]);
  Object.assign(state, {site:data.site, developments:data.developments, prototypes:data.prototypes, videos:Array.isArray(data.videos)?data.videos:(Array.isArray(videos)?videos:[])});
  renderPublicSite();
}
function bindPublicEvents() {
  window.addEventListener('message', handleDevelopmentVideoMessage);
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

  // Inline map pan + two-finger pinch zoom (mouse + touch)
  const applyInlineMapTransform = (vpInline, wrap, svg, sc, px, py) => {
    if (!wrap) return;
    updateMapResolution(svg, sc);
    wrap.dataset.scale = String(sc);
    wrap.dataset.panX = String(px);
    wrap.dataset.panY = String(py);
    wrap.style.width = `${sc * 100}%`;
    wrap.style.height = `${sc * 100}%`;
    wrap.style.left = `${-((sc - 1) * 50)}%`;
    wrap.style.top = `${-((sc - 1) * 50)}%`;
    wrap.style.transform = `translate(${px}px, ${py}px)`;
    if (vpInline) vpInline.classList.toggle('is-zoomed', sc > 1);
  };
  let inlineDrag = null;
  let inlinePinch = null;
  const getTouchDist = (t0, t1) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  const startInlinePan = (clientX, clientY, target) => {
    const vpInline = target.closest('.dev-inline-map-viewport');
    if (!vpInline || target.closest('.dev-inline-zoom-bar')) return null;
    const wrap = vpInline.querySelector('.dev-inline-svg-wrap');
    if (!wrap) return null;
    const sc = Number(wrap.dataset.scale || 1);
    if (sc <= 1) return null;
    return {
      vpInline,
      wrap,
      svg: vpInline.querySelector('.dev-inline-svg'),
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
    applyInlineMapTransform(inlineDrag.vpInline, inlineDrag.wrap, inlineDrag.svg, inlineDrag.sc, px, py);
  });
  window.addEventListener('mouseup', () => { inlineDrag = null; });
  $('developmentAccordion').addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const vpInline = e.target.closest('.dev-inline-map-viewport');
      if (!vpInline || e.target.closest('.dev-inline-zoom-bar')) return;
      const wrap = vpInline.querySelector('.dev-inline-svg-wrap');
      if (!wrap) return;
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      if (dist <= 0) return;
      inlineDrag = null;
      inlinePinch = {
        vpInline,
        wrap,
        svg: vpInline.querySelector('.dev-inline-svg'),
        startDist: dist,
        startScale: Number(wrap.dataset.scale || 1),
        startPanX: Number(wrap.dataset.panX || 0),
        startPanY: Number(wrap.dataset.panY || 0)
      };
      return;
    }
    if (e.touches.length !== 1) return;
    inlineDrag = startInlinePan(e.touches[0].clientX, e.touches[0].clientY, e.target);
  }, { passive: true });
  $('developmentAccordion').addEventListener('touchmove', (e) => {
    if (inlinePinch && e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      if (dist <= 0) return;
      const sc = limitMapZoom(+(inlinePinch.startScale * (dist / inlinePinch.startDist)).toFixed(2), 1);
      const px = sc === 1 ? 0 : inlinePinch.startPanX;
      const py = sc === 1 ? 0 : inlinePinch.startPanY;
      applyInlineMapTransform(inlinePinch.vpInline, inlinePinch.wrap, inlinePinch.svg, sc, px, py);
      return;
    }
    if (!inlineDrag || e.touches.length !== 1) return;
    e.preventDefault();
    const px = e.touches[0].clientX - inlineDrag.startX;
    const py = e.touches[0].clientY - inlineDrag.startY;
    applyInlineMapTransform(inlineDrag.vpInline, inlineDrag.wrap, inlineDrag.svg, inlineDrag.sc, px, py);
  }, { passive: false });
  $('developmentAccordion').addEventListener('touchend', (e) => {
    if (e.touches.length < 2) inlinePinch = null;
    if (e.touches.length === 0) inlineDrag = null;
  });
  $('developmentAccordion').addEventListener('touchcancel', () => { inlineDrag = null; inlinePinch = null; });

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
      const amenChip = e.target.closest('.proto-chip-interactive');
      if (amenChip) {
        const featBox = panel.querySelector('.proto-panel-features');
        const inlineGal = featBox?.querySelector('.inline-amen-gallery');
        const wasActive = amenChip.classList.contains('active') && inlineGal && !inlineGal.classList.contains('hidden');
        featBox?.querySelectorAll('.proto-chip-interactive').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-expanded', 'false');
        });
        if (wasActive) {
          inlineGal.classList.add('hidden');
        } else if (inlineGal) {
          amenChip.classList.add('active');
          amenChip.setAttribute('aria-expanded', 'true');
          renderInlineAmenitiesGallery(
            inlineGal,
            inlineGal.dataset.devSlug || 'sorento',
            Number(amenChip.dataset.amenFeatureIdx || 0),
            amenChip.dataset.amenLabel || ''
          );
        }
        return;
      }
      const inlineGal = panel.querySelector('.inline-amen-gallery');
      if (inlineGal && !inlineGal.classList.contains('hidden')) {
        const curAmenIdx = Number(inlineGal.dataset.amenIdx || 0);
        const curAmenLabel = inlineGal.dataset.amenLabel || '';
        const amenSlug = inlineGal.dataset.devSlug || 'sorento';
        if (e.target.closest('.inline-amen-close')) {
          inlineGal.classList.add('hidden');
          panel.querySelectorAll('.proto-chip-interactive').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
          });
          return;
        }
        if (e.target.closest('.inline-amen-prev')) {
          renderInlineAmenitiesGallery(inlineGal, amenSlug, curAmenIdx - 1, curAmenLabel);
          return;
        }
        if (e.target.closest('.inline-amen-next')) {
          renderInlineAmenitiesGallery(inlineGal, amenSlug, curAmenIdx + 1, curAmenLabel);
          return;
        }
        const amenThumb = e.target.closest('.inline-amen-thumb');
        if (amenThumb) {
          renderInlineAmenitiesGallery(inlineGal, amenSlug, Number(amenThumb.dataset.inlineAmenIdx || 0), curAmenLabel);
          return;
        }
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
      if (act === 'in') sc = limitMapZoom(+(sc + 0.35).toFixed(2), 1);
      else if (act === 'out') sc = Math.max(1, +(sc - 0.35).toFixed(2));
      else { sc = 1; px = 0; py = 0; }
      if (sc === 1) { px = 0; py = 0; }
      applyInlineMapTransform(vpInline, wrap, mapSec.querySelector('.dev-inline-svg'), sc, px, py);
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
        mapSec.dataset.selectedLotId = lot.id;
        renderInlineSelectedLot(mapSec, lot, slug);
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


}
function initMobileDrawer() {
  const menuBtn = $('mobileMenuBtn');
  const drawer = $('mobileNavDrawer');
  const backdrop = $('mobileDrawerBackdrop');
  const closeBtn = $('mobileDrawerClose');
  if (!menuBtn || !drawer || !backdrop) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.remove('hidden');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeDrawer = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.add('hidden');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  menuBtn.addEventListener('click', () => {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('[data-drawer-close]').forEach(el => {
    el.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
}

async function initPublicApp() {
  initThemeScheduler(); initMobileDrawer(); bindPublicEvents(); bindMapEvents(); initDevelopmentDockLayout();
  await loadPublicData();
  initInventoryAutoSync();
  const slug = new URLSearchParams(location.search).get('desarrollo');
  if (state.developments.some(d => d.id === slug)) { renderDevelopmentAccordion(slug); await loadInlineDevMap(slug); }
}
initPublicApp().catch(err => {console.error(err); showToast('No se pudo cargar la página. Intenta recargar.');});
