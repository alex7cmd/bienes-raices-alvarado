const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', innerHTML: '', textContent: '', dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [], querySelector: () => null, getAttribute(name) { return this[name] ?? null; }, setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; } });
    return elements.get(id);
  };
  const context = vm.createContext({ Intl, console, location: { pathname: "/" }, setTimeout, clearTimeout, setInterval, clearInterval, AbortSignal, FormData, document: { documentElement: {dataset:{}}, getElementById: element, querySelectorAll: () => [] } });
  let source = ['shared','public','admin'].map(name => fs.readFileSync(path.join(__dirname, `../public/js/${name}.js`), 'utf8').replace(/\ninit(?:Public|Admin)App\(\)\.catch[^\n]+;\s*$/, '')).join('\n');
  vm.runInContext(source, context);
  const data = require('../data/seed').buildInitialData();
  context.data = data;
  vm.runInContext('state.site = data.site; state.prototypes = data.prototypes; state.developments = data.developments;', context);
  return { context, elements, element, run: code => vm.runInContext(code, context) };
}
test('un lote sin asignación no recibe un prototipo inventado', () => {
  const { run } = setup();
  assert.equal(run("resolveLotPrototype({ id: 'lote-1', a: 105, pr: '' }, 'sorento')"), null);
});
test('el precio del mapa sigue los cambios del CMS', () => {
  const { run } = setup();
  run("state.prototypes.find(p => p.id === 'ruche').price = 3456789");
  assert.equal(run("getDevMapPrototypes('sorento').find(p => p.id === 'ruche').price"), 3456789);
});
test('el CMS muestra todos los lotes y el filtro No disponible usa el mismo estado que el mapa', () => {
  const { run, element, context } = setup();
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/assets/maps/data/oporto.json')));
  context.mapData = data;
  run("state.cmsDevSlug = 'oporto'; state.devMapsCache.oporto = mapData;");
  element('lotStatusFilter').value = 'all';
  run('renderCmsLotsTable()');
  assert.equal((element('cmsLotsBody').innerHTML.match(/<tr /g) || []).length, 422);
  element('lotStatusFilter').value = 'no-disponible';
  run('renderCmsLotsTable()');
  assert.equal((element('cmsLotsBody').innerHTML.match(/<tr /g) || []).length, data.lots.filter(l => l.s === 'no-disponible').length);
  assert.equal(run("normalizeStatus('no_disponible')"), 'no-disponible');
});
test('texto de prototipos y búsquedas se escapa antes de insertarse como HTML', async () => {
  const { run, element, context } = setup();
  const payload = '<img src=x onerror=alert(1)>';
  context.payload = payload;
  const html = run('renderPrototypeDetailPanel({ id: "test", name: payload, description: payload, image: "x\\\" onerror=\\\"alert(1)", features: [payload] })');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes(payload));
  assert.ok(!html.includes('src="x" onerror='));
  element('cmsProtoSearchInput').value = payload;
  await run('renderCmsPrototypesGrid()');
  assert.ok(!element('cmsPrototypesGrid').innerHTML.includes(payload));
});
test('la galería usa la imagen guardada y fotografías asociadas sin añadir casas ajenas', () => {
  const { run } = setup();
  assert.equal(JSON.stringify(run("getProtoGallery({image: 'new.webp', gallery: ['old.webp','new.webp']})")), '["new.webp","old.webp"]');
  assert.equal(JSON.stringify(run("getProtoGallery({image: 'only.webp'})")), '["only.webp"]');
});
test('el carrusel respeta la portada y las imágenes de desarrollo configuradas', () => {
  const { run } = setup();
  run("state.site.heroImage = '/uploads/cover.webp'; state.developments.find(d => d.id === 'oporto').heroImage = '/uploads/oporto.webp';");
  assert.equal(run('getHeroSlides()[0].image'), '/uploads/cover.webp');
  assert.equal(run('getHeroSlides()[1].image'), '/uploads/oporto.webp');
});

test('el carrusel usa fotografías panorámicas separadas de la ficha', () => {
  const { run } = setup();
  run("state.site.heroImage = '/assets/images/hero.jpg'; state.developments.find(d => d.id === 'oporto').image = '/uploads/ficha.webp'");
  assert.equal(run('getHeroSlides()[0].image'), '/assets/images/hero-sorento.webp');
  assert.equal(run('getHeroSlides()[1].image'), '/assets/images/hero-oporto.webp');
});

test('el aviso de sesión calcula tiempo real y alerta antes de vencer', () => {
  const { run, element } = setup();
  run("Date.now = () => 1000000; state.isAdmin = true; state.sessionExpiresAt = 1000000 + 2 * 60000; updateSessionNotice();");
  assert.equal(element('cmsSessionNotice').textContent, 'Acceso válido por 2 min más');
  assert.match(element('toast').textContent, /menos de 5 minutos/);
  run("location.pathname = '/admin'; state.currentView = 'admin'; state.sessionExpiresAt = 999999; updateSessionNotice();");
  assert.equal(run('state.isAdmin'), false);
  assert.equal(run('state.currentView'), 'login');
  assert.match(element('loginError').textContent, /La sesión terminó/);
});

test('las seis fotos se seleccionan en un mismo editor sin cambiar el catálogo guardado', () => {
  const { run, element } = setup();
  for (const [slug, name] of [['sorento','Sorento'], ['oporto','Oporto'], ['ardenza','Ardenza'], ['montalese','Montalese'], ['torres-qavalta','Torres Qavalta'], ['vittoria','Vittoria']]) {
    run(`selectCmsHeroSlide('${slug}')`);
    assert.equal(element('editHeroImage').value, `/assets/images/hero-${slug}.webp`);
    assert.match(element('saveHeroSlideBtn').textContent, new RegExp(name));
  }
  run("state.cmsHeroDrafts.oporto = '/uploads/borrador.webp'; selectCmsHeroSlide('oporto');");
  assert.equal(element('editHeroImage').value, '/uploads/borrador.webp');
  assert.equal(run('getHeroSlides()[1].image'), '/assets/images/hero-oporto.webp');
});


test('mapas simultáneos usan referencias propias para los autos y Torres no tiene tráfico', () => {
  const { run } = setup();
  const a = run("buildMapLifeOverlay({slug:'ardenza', bg:'map.webp'})");
  const b = run("buildMapLifeOverlay({slug:'ardenza', bg:'map.webp'})");
  const ids = html => [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(ids(a).every(id => !ids(b).includes(id)));
  for (const html of [a, b]) {
    assert.equal((html.match(/<animateMotion /g) || []).length, 4);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids(html).includes(match[1]));
  }
  assert.equal(run("buildMapLifeOverlay({slug:'torres-qavalta', bg:'map.webp', isTowerFloors:true})"), '');
});


test('Ruche y Malvasia resaltan las asignaciones oficiales del plano Sorento', () => {
  const { run, context } = setup();
  context.sorento = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/assets/maps/data/sorento.json')));
  assert.equal(run('getMappedDevPrototypes(sorento).length'), 4);
  for (const [prototype, count] of [['ruche', 25], ['malvasia', 28]]) {
    context.prototype = prototype;
    const html = run('buildDevMapSvgMarkup(sorento, {protoFilter:prototype})');
    const lots = [...html.matchAll(/class="qmap-lot [^"]*"[^>]*opacity="([^"]+)"/g)];
    assert.equal(lots.filter(match => match[1] === '1').length, count);
    assert.equal(lots.filter(match => match[1] === '0.14').length, 262 - count);
  }
});

test('los videos son solo la selección Qavalta y aparecen en la pestaña correcta antes del plano', () => {
  const { run, context, element } = setup();
  context.videos = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/assets/qavalta-videos.json')));
  run('state.videos = videos');
  const counts = { sorento: 3, oporto: 2, ardenza: 1, montalese: 2, vittoria: 2, 'torres-qavalta': 0 };
  for (const [slug, count] of Object.entries(counts)) {
    const html = run(`renderDevelopmentVideos(state.developments.find(d => d.id === ${JSON.stringify(slug)}))`);
    assert.equal((html.match(/<article class="qavalta-video-card"/g) || []).length, count, slug);
    assert.equal((html.match(/<iframe /g) || []).length, 0, 'La inserción está suspendida mientras TikTok la rechaza.');
    const ids = [...html.matchAll(/data-video-id="(\d+)"/g)].map(m => m[1]);
    const expected = context.videos.filter(v => v.developments.includes(slug)).map(v => v.url.split('/').pop());
    assert.deepEqual(ids, expected);
  }
  run("renderDevelopmentAccordion('sorento')");
  const html = element('developmentAccordion').innerHTML;
  assert.ok(html.indexOf('class="qavalta-videos"') < html.indexOf('class="dev-inline-map-section"'));
  assert.ok(!html.includes('embed-type="creator"'));
});

test('el reproductor rechaza URLs ajenas a los videos de Itzel y escapa títulos', () => {
  const { run, context } = setup();
  context.videos = [
    { url: 'https://evil.example/@itzealva/video/7605332429020171538', developments: ['sorento'] },
    { url: 'https://www.tiktok.com/@other/video/7605332429020171538', developments: ['sorento'] },
    { url: 'https://www.tiktok.com/@itzealva/photo/7605332429020171538', developments: ['sorento'] },
    { url: 'https://www.tiktok.com/@itzealva/video/7605332429020171538', title: '<img src=x onerror=alert(1)>', developments: ['sorento'] }
  ];
  run('state.videos = videos');
  const html = run("renderDevelopmentVideos({id:'sorento', name:'Sorento'})");
  assert.equal((html.match(/<iframe /g) || []).length, 1);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('evil.example'));
});

test('solo mensajes del reproductor propio pueden cambiar su estado o mostrar la alternativa', () => {
  const { context, run } = setup();
  let hidden = false, fallbackShown = false;
  const source = {};
  const frame = { contentWindow: source, dataset: {}, isConnected: true, classList: { add: () => { hidden = true; } }, closest: () => ({ querySelector: () => ({ classList: { remove: () => { fallbackShown = true; } } }) }) };
  context.document.querySelectorAll = () => [frame];
  context.event = { origin: 'https://evil.example', source, data: { 'x-tiktok-player': true, type: 'onPlayerError' } };
  run('handleDevelopmentVideoMessage(event)');
  assert.equal(hidden, false);
  context.event.origin = 'https://www.tiktok.com'; context.event.source = {};
  run('handleDevelopmentVideoMessage(event)');
  assert.equal(hidden, false);
  context.event.source = source;
  context.event.data = { 'x-tiktok-player': true, type: 'onPlayerReady' };
  run('handleDevelopmentVideoMessage(event)');
  assert.equal(frame.dataset.playerReady, '1');
  context.event.data = { 'x-tiktok-player': true, type: 'onPlayerError', value: { errorCode: 3002 } };
  run('handleDevelopmentVideoMessage(event)');
  assert.equal(hidden, false);
  context.event.data.value.errorCode = 2001;
  run('handleDevelopmentVideoMessage(event)');
  assert.equal(hidden, true); assert.equal(fallbackShown, true);
});


test('el zoom permite800%, limita excesos y conserva el restablecimiento del plano', () => {
  const { run, element } = setup();
  assert.equal(run('limitMapZoom(20)'), 8);
  assert.equal(run('limitMapZoom(5)'), 5);
  assert.equal(run('limitMapZoom(-1)'), 0.6);
  assert.equal(run('limitMapZoom(0.5, 1)'), 1);
  run('state.zoom = limitMapZoom(12); state.panX = 25; state.panY = -20; applyTransform()');
  assert.equal(element('zoomPercentLabel').textContent, '800%');
  assert.equal(element('mapSvg').style.transform, 'translate(25px, -20px) scale(8)');
  run('resetZoom()');
  assert.equal(element('zoomPercentLabel').textContent, '100%');
  assert.equal(element('mapSvg').style.transform, 'translate(0px, 0px) scale(1)');
});

test('el plano conserva la vista ligera y usa el original HD únicamente al ampliar', () => {
  const {run,context} = setup();
  const attrs = {href:'/preview.webp'};
  const image = {dataset:{mapBackground:'sorento'},getAttribute:k=>attrs[k],setAttribute:(k,v)=>{attrs[k]=v;}};
  context.svg = {querySelector:()=>image};
  run('updateMapResolution(svg,1)'); assert.equal(attrs.href,'/preview.webp');
  run('updateMapResolution(svg,2)'); assert.equal(attrs.href,'/assets/maps/hd/sorento.webp');
  run('updateMapResolution(svg,8)'); assert.equal(attrs.href,'/assets/maps/hd/sorento.webp');
  image.onerror(); assert.equal(attrs.href,'/preview.webp');
  run('updateMapResolution(svg,3)'); run('updateMapResolution(svg,1)'); assert.equal(attrs.href,'/preview.webp');
});

test('Ruche muestra agotado solo en Sorento y espera sus fotos propias en Montalese', () => {
  const { run, context, element } = setup();
  const { withSalesCatalog, withSalesDevelopment } = require('../data/sales-catalog');
  const { withPrototypeGallery } = require('../data/galleries');
  const db = require('../data/seed').buildInitialData();
  context.salesPrototypes = db.prototypes.map(withPrototypeGallery).map(withSalesCatalog);
  context.salesDevelopments = db.developments.map(d => withSalesDevelopment(d, db.prototypes));
  run('state.prototypes = salesPrototypes; state.developments = salesDevelopments; state.publicDevSlug = "sorento";');
  const sorento = run('renderPrototypeDetailPanel(state.prototypes.find(p=>p.id === "ruche"))');
  assert.match(sorento, /Agotado/);
  assert.match(sorento, /images\/galleries\/ruche\//);
  run('state.publicDevSlug = "montalese";');
  const montalese = run('renderPrototypeDetailPanel(state.prototypes.find(p=>p.id === "ruche"))');
  assert.match(montalese, /Fotografías próximamente/);
  assert.doesNotMatch(montalese, /Agotado|images\/galleries\/ruche\/|data-proto-gallery/);
  assert.equal(run('resolveLotPrototype({pr:"Ruche"},"montalese").image'), '');
  run('openFullscreenGallery("ruche")');
  assert.equal(element('fsGalleryThumbs').innerHTML, '');
  element("protoModalFullscreenBtn").addEventListener = () => {};
  run('openPrototypeModal("ruche")');
  assert.match(element('protoModalContent').innerHTML, /Fotografías próximamente/);
  assert.doesNotMatch(element('protoModalContent').innerHTML, /images\/galleries\/ruche\//);
  assert.deepEqual(JSON.parse(run('JSON.stringify(getDevelopmentPrototypes("oporto").map(p=>p.id))')), ['areni-3r','belora']);
  // Official map history still resolves models removed from the commercial list.
  assert.equal(run('resolveLotPrototype({pr:"Montello"},"oporto").id'), 'montello');
});

test('la actualización automática conserva zoom, filtros y selección y evita consultas solapadas', async () => {
  const { run, context, element } = setup();
  const layer = { innerHTML: '' };
  element('mapSvg').querySelector = () => layer;
  context.reply = { slug:'sorento', source:'planos.qavalta.com', syncedAt:'2026-11-17T18:00:00Z', lots:[{id:'L1',n:'Lote 1',t:'g',d:'0,0 1,0 1,1',s:'vendido',pr:'Ruche'}] };
  let resolveRequest;
  context.waitForInventory = () => new Promise(resolve => { resolveRequest = resolve; });
  run('state.currentView="map"; state.mapDevSlug="sorento"; state.selectedLotId="L1"; state.zoom=3; state.panX=42; state.mapStatusFilter="disponible"; state.mapProtoFilter="ruche"; var refreshCalls=0; var selectedUpdates=0; fetchDevMapData=async()=>{refreshCalls++; await waitForInventory(); state.devMapsCache.sorento=reply; return reply;}; renderSelectedLotDetail=()=>selectedUpdates++;');
  const first = run('refreshVisibleInventory()');
  await run('refreshVisibleInventory()');
  assert.equal(run('refreshCalls'), 1);
  resolveRequest();
  await first;
  assert.equal(run('state.zoom'), 3);
  assert.equal(run('state.panX'), 42);
  assert.equal(run('state.selectedLotId'), 'L1');
  assert.equal(run('state.mapStatusFilter'), 'disponible');
  assert.equal(run('state.mapProtoFilter'), 'ruche');
  assert.equal(run('selectedUpdates'), 1);
  assert.match(layer.innerHTML, /selected/);
  assert.match(layer.innerHTML, /opacity="0.14"/);
  context.document.hidden = true;
  await run('refreshVisibleInventory()');
  assert.equal(run('refreshCalls'), 1);
});

test('la sincronización automática usa 60 s, reanuda al volver y conserva la copia ante errores', async () => {
  const { run, context, element } = setup();
  const listeners = {};
  let tick, interval;
  context.setInterval = (callback, ms) => { tick=callback; interval=ms; return 1; };
  context.document.addEventListener = (event, callback) => { listeners[event]=callback; };
  context.window = {addEventListener:(event,callback)=>{listeners[event]=callback;}};
  run('var autoCalls=0; refreshVisibleInventory=async()=>autoCalls++; initInventoryAutoSync(); initInventoryAutoSync();');
  assert.equal(interval, 60000);
  await tick();
  context.document.hidden = false;
  await listeners.visibilitychange();
  await listeners.online();
  assert.equal(run('autoCalls'), 3);
  // A failed refresh must label existing data as stale rather than stamp it as a new sync.
  context.oldMap = {source:'planos.qavalta.com',syncedAt:'2026-11-17T18:00:00Z'};
  const label=element('sync-label'); context.syncLabel=label;
  run('setInventorySyncLabel(syncLabel,oldMap,true)');
  assert.equal(label.dataset.syncState, 'stale');
  assert.match(label.textContent, /Sin respuesta de Qavalta/);
  assert.doesNotMatch(label.textContent, /Automática cada/);
});

test('el CMS conserva la asignación histórica al editar lotes de modelos retirados de la oferta', () => {
  const {run,context,element}=setup();
  const {withSalesCatalog}=require('../data/sales-catalog');
  context.projectedPrototypes=require('../data/seed').buildInitialData().prototypes.map(withSalesCatalog);
  context.mapData={slug:'oporto',lots:[{id:'L1',n:'1',pr:'Montello',s:'disponible',a:90}]};
  run('state.prototypes=projectedPrototypes;state.cmsDevSlug="oporto";state.devMapsCache.oporto=mapData');
  element('lotStatusFilter').value='all';run('renderCmsLotsTable()');
  assert.match(element('cmsLotsBody').innerHTML, /value="Montello" selected/);
});
