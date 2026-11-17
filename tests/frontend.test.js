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
  const context = vm.createContext({ Intl, console, location: { pathname: "/" }, setTimeout, clearTimeout, setInterval, clearInterval, AbortSignal, FormData, document: { getElementById: element, querySelectorAll: () => [] } });
  let source = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
  source = source.replace(/\ninit\(\)\.catch[^\n]+;\s*$/, '');
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
    assert.equal((html.match(/<animateMotion /g) || []).length, 3);
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
