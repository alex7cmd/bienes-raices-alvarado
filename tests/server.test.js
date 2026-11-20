const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
let fixture, server, base, cookie;
const originalFetch = global.fetch;
let remoteCalls = 0;
let upstreamFails = false;
const project = path.join(__dirname, '..');
const password = 'test-only-password';
async function request(route, { method = 'GET', body, authenticated = false, headers = {} } = {}) {
  return originalFetch(base + route, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(authenticated ? { Cookie: cookie } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
}
before(async () => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), '.alvarado-test-'));
  fs.copyFileSync(path.join(project, 'server.js'), path.join(fixture, 'server.js'));
  fs.cpSync(path.join(project, 'data'), path.join(fixture, 'data'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'public'));
  for (const item of ['assets', 'js', 'css', 'index.html', 'admin', 'sitio']) fs.symlinkSync(path.join(project, 'public', item), path.join(fixture, 'public', item));
  fs.symlinkSync(path.join(project, 'node_modules'), path.join(fixture, 'node_modules'));
  process.env.ADMIN_PASSWORD = password;
  global.fetch = async (url, options) => {
    if (!String(url).startsWith('https://planos.qavalta.com/')) return originalFetch(url, options);
    remoteCalls++;
    await new Promise(resolve => setTimeout(resolve, 20));
    if (upstreamFails) return new Response('{}', { status: 503 });
    if (String(url).includes('/torres?')) return Response.json([{ pisos: [{ nombre: 'Planta Baja', departamentos: [{ svgSlotId: 'Flat1Dpto2', estatus: 'no-disponible', nombre: 'Depto2' }] }] }]);
    if (String(url).includes('/lotes?slug=')) return Response.json([{ svgId: 'test-unknown-id', status: 'disponible' }, { svgId: 'Mza1Lote2', status: 'vendido', protoName: 'Malvasia', protoPrecio: 4450000 }]);
    // Simulate a contact arriving while the administrator waits for upstream sync.
    const dbPath = path.join(fixture, 'data/db.json');
    const db = JSON.parse(fs.readFileSync(dbPath));
    db.leads ||= [];
    db.leads.push({ id: 'concurrent-contact' });
    fs.writeFileSync(dbPath, JSON.stringify(db));
    return Response.json([{ slug: 'sorento', precioDesde: 2700000 }]);
  };
  const app = require(path.join(fixture, 'server.js'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  global.fetch = originalFetch;
  delete process.env.ADMIN_PASSWORD;
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(fixture, { recursive: true, force: true });
});
test('las migraciones conservan catálogo, solicitudes y modificaciones en reinicios', () => {
  const dbPath = path.join(fixture, 'data/db.json');
  const db = JSON.parse(fs.readFileSync(dbPath));
  db.prototypes[0].price = 1234567;
  db.leads = [{ id: 'preserved' }];
  db.qavaltaLotOverrides = { sorento: { existing: { status: 'vendido' } } };
  delete db.mapVersion;
  fs.writeFileSync(dbPath, JSON.stringify(db));
  const { ensureDatabase } = require(path.join(fixture, 'data/seed'));
  ensureDatabase(); ensureDatabase();
  const next = JSON.parse(fs.readFileSync(dbPath));
  assert.equal(next.prototypes[0].price, 1234567);
  assert.deepEqual(next.leads, db.leads);
  assert.deepEqual(next.qavaltaLotOverrides, db.qavaltaLotOverrides);
});
test('cookies malformadas y rutas inexistentes producen respuestas correctas', async () => {
  assert.equal((await request('/api/auth/me', { headers: { Cookie: 'qvalta_admin=%ZZ' } })).status, 200);
  assert.equal((await request('/api/admin/leads')).status, 401);
  const missing = await request('/api/unknown');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /json/);
  assert.equal((await request('/assets/missing.webp')).status, 404);
  assert.equal((await request('/js/missing.js')).status, 404);
});
test('HTML no se cachea y los recursos estáticos tienen caché y MIME seguros', async () => {
  assert.match((await request('/')).headers.get('cache-control'), /no-store/);
  const adminPage = await request('/admin?seccion=site');
  assert.equal(adminPage.status, 200);
  assert.match(adminPage.headers.get('cache-control'), /no-store/);
  const res = await request('/js/shared.js');
  assert.match(res.headers.get('cache-control'), /max-age=86400/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
test('login emite cookie HttpOnly con caducidad', async () => {
  const res = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@bienesraicesalvarado.com.mx', password } });
  assert.equal(res.status, 200);
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Max-Age=28800/);
  cookie = setCookie.split(';')[0];
  const login = await res.json();
  const me = await (await request('/api/auth/me', { authenticated: true })).json();
  assert.equal(me.authenticated, true);
  assert.equal(me.expiresAt, login.expiresAt);
  assert.ok(me.expiresAt > Date.now() + 28790000);
  assert.equal((await (await request('/api/auth/me', { authenticated: true })).json()).expiresAt, me.expiresAt, 'refrescar no renueva la sesión');
});
test('CMS rechaza precios inválidos y URLs ejecutables sin cambiar los datos', async () => {
  const before = JSON.parse(fs.readFileSync(path.join(fixture, 'data/db.json')));
  for (const price of ['', 'NaN', '-1', {}, null]) {
    assert.equal((await request('/api/admin/prototypes/areni', { method: 'PATCH', authenticated: true, body: { price } })).status, 400);
  }
  for (const image of ['javascript:alert(1)', '//evil.example/image.jpg', 'https://example.com/" onerror="alert(1)']) {
    assert.equal((await request('/api/admin/prototypes/areni', { method: 'PATCH', authenticated: true, body: { image } })).status, 400);
  }
  assert.equal((await request('/api/admin/site', { method: 'PATCH', authenticated: true })).status, 400);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture, 'data/db.json'))), before);
});
test('CMS guarda precios y contenido válido que se refleja en la API pública', async () => {
  const res = await request('/api/admin/prototypes/areni', { method: 'PATCH', authenticated: true, body: { price: '2345678', description: 'Texto con < y comillas "' } });
  assert.equal(res.status, 200);
  const data = await (await request('/api/public/site')).json();
  assert.equal(data.prototypes.find(p => p.id === 'areni').price, 2345678);
});
test('el CMS guarda fotos distintas para el carrusel y la ficha del desarrollo', async () => {
  const before = await (await request('/api/public/site')).json();
  const originalImage = before.developments.find(d => d.id === 'oporto').image;
  const response = await request('/api/admin/developments/oporto', { method: 'PATCH', authenticated: true, body: { heroImage: '/uploads/hero-test.webp' } });
  assert.equal(response.status, 200);
  const site = await (await request('/api/public/site')).json();
  const dev = site.developments.find(d => d.id === 'oporto');
  assert.equal(dev.heroImage, '/uploads/hero-test.webp');
  assert.equal(dev.image, originalImage);
});

test('las solicitudes de contacto validan texto, correo y teléfono', async () => {
  for (const body of [{ nombre: '  ', email: 'a@b.com', telefono: '12345678' }, { nombre: 'Ana', email: 'invalido', telefono: '12345678' }, { nombre: {}, email: 'a@b.com', telefono: '12345678' }]) {
    assert.equal((await request('/api/public/contact', { method: 'POST', body })).status, 400);
  }
  const res = await request('/api/public/contact', { method: 'POST', body: { nombre: ' Ana ', email: 'ana@example.com', telefono: '+52 55 1234 5678' } });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.ok, true); assert.ok(data.id); assert.equal(data.lead, undefined);
});
test('mapas comparten peticiones remotas simultáneas y conservan la caché', async () => {
  const start = remoteCalls;
  const responses = await Promise.all(Array.from({ length: 8 }, () => request('/api/public/qavalta-map/sorento')));
  assert.ok(responses.every(r => r.status === 200));
  assert.equal(remoteCalls - start, 1);
  await request('/api/public/qavalta-map/sorento?refresh=1');
  assert.equal(remoteCalls - start, 1, 'un visitante no fuerza consultas remotas');
});
test('lotes y desarrollos inexistentes no se pueden editar; los estados se validan', async () => {
  assert.equal((await request('/api/public/qavalta-map/no-existe')).status, 404);
  assert.equal((await request('/api/admin/qavalta-lots/sorento/no-existe', { method: 'PUT', authenticated: true, body: { status: 'vendido' } })).status, 404);
  const map = JSON.parse(fs.readFileSync(path.join(project, 'public/assets/maps/data/sorento.json')));
  const route = `/api/admin/qavalta-lots/sorento/${encodeURIComponent(map.lots[0].id)}`;
  assert.equal((await request(route, { method: 'PUT', authenticated: true, body: { status: 'incorrecto' } })).status, 400);
  assert.equal((await request(route, { method: 'PUT', authenticated: true, body: { prototipo: 'Areni' } })).status, 400);
  assert.equal((await request(route, { method: 'PUT', authenticated: true, body: { status: 'reservado', precio: 0, prototipo: '' } })).status, 200);
  const data = await (await request('/api/public/qavalta-map/sorento')).json();
  assert.equal(data.lots[0].s, 'reservado'); assert.equal(data.lots[0].p, 0); assert.equal(data.lots[0].pr, '');
});
test('ediciones de departamentos se reflejan también en los conteos de cada piso', async () => {
  const map = JSON.parse(fs.readFileSync(path.join(project, 'public/assets/maps/data/torres-qavalta.json')));
  const lot = map.floors[0].lots[0];
  const res = await request(`/api/admin/qavalta-lots/torres-qavalta/${encodeURIComponent(lot.id)}`, { method: 'PUT', authenticated: true, body: { status: 'reservado' } });
  assert.equal(res.status, 200);
  const data = await (await request('/api/public/qavalta-map/torres-qavalta')).json();
  assert.equal(data.floors[0].lots[0].s, 'reservado');
});
test('Torres consulta estados de departamentos y los refleja en sus pisos', async () => {
  const map = await (await request('/api/public/qavalta-map/torres-qavalta')).json();
  assert.equal(map.source, 'planos.qavalta.com');
  const flat = map.lots.find(l => l.id === 'Flat1Dpto2');
  assert.equal(flat.s, 'reservado', 'conserva la modificación explícita del administrador');
  assert.equal(map.floors[0].lots.find(l => l.id === flat.id).s, flat.s);
});

test('sincronizar no elimina solicitudes que llegaron mientras se esperaba la API remota', async () => {
  const res = await request('/api/admin/qavalta-sync', { method: 'POST', authenticated: true, body: {} });
  assert.equal(res.status, 200);
  const db = JSON.parse(fs.readFileSync(path.join(fixture, 'data/db.json')));
  assert.ok(db.leads.some(l => l.id === 'concurrent-contact'));
  const published = await res.json();
  assert.equal(published.developments.find(d => d.id === 'sorento').startingPrice, 3200000);
  assert.deepEqual(published.developments.find(d => d.id === 'oporto').prototypeOrder, ['areni-3r','belora']);
  assert.equal(db.developments.find(d => d.id === 'sorento').startingPrice, 2700000);
});
test('un fallo remoto usa datos locales y no declara una sincronización exitosa', async () => {
  upstreamFails = true;
  const res = await request('/api/admin/qavalta-sync', { method: 'POST', authenticated: true, body: {} });
  assert.equal(res.status, 502);
  const data = await (await request('/api/public/qavalta-map/oporto')).json();
  assert.equal(data.source, 'local-cache'); assert.equal(data.syncedAt, null); assert.equal(data.lots.length, 422);
});
test('archivos disfrazados de imagen se rechazan y eliminan', async () => {
  const form = new FormData(); form.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/jpeg' }), 'fake.jpg');
  const res = await originalFetch(base + '/api/admin/upload', { method: 'POST', headers: { Cookie: cookie }, body: form });
  assert.equal(res.status, 400);
  assert.deepEqual(fs.readdirSync(path.join(fixture, 'public/uploads')), []);
});
test('solicitudes de otro origen no modifican datos y logout invalida la sesión', async () => {
  assert.equal((await request('/api/admin/site', { method: 'PATCH', authenticated: true, body: {}, headers: { Origin: 'https://otro.example' } })).status, 403);
  assert.equal((await request('/api/auth/logout', { method: 'POST', authenticated: true })).status, 200);
  assert.equal((await request('/api/admin/leads', { authenticated: true })).status, 401);
});

test('la sesión expirada se rechaza y no se recupera al refrescar', async () => {
  const login = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@bienesraicesalvarado.com.mx', password } });
  cookie = login.headers.get('set-cookie').split(';')[0];
  const realNow = Date.now;
  const future = realNow() + 8 * 60 * 60 * 1000 + 1;
  try {
    Date.now = () => future;
    assert.equal((await request('/api/admin/lots', { authenticated: true })).status, 401);
    const me = await (await request('/api/auth/me', { authenticated: true })).json();
    assert.equal(me.authenticated, false);
    assert.equal(me.expiresAt, null);
  } finally { Date.now = realNow; }
});


test('la sincronización obtiene la asignación oficial protoName para el filtro', async () => {
  upstreamFails = false;
  const data = await (await request('/api/public/qavalta-map/sorento')).json();
  const lot = data.lots.find(l => l.id === 'Mza1Lote2');
  assert.equal(lot.pr, 'Malvasia');
  assert.equal(lot.pp, 4450000);
});

test('sitio y administrador tienen documentos, código y ámbitos instalables independientes', async () => {
  const redirect = await originalFetch(base + '/admin?seccion=site', {redirect:'manual'});
  assert.equal(redirect.headers.get('location'), '/admin/?seccion=site');
  const root = await originalFetch(base + '/?origen=prueba', {redirect:'manual'});
  assert.equal(root.headers.get('location'), '/sitio/?origen=prueba');
  const publicHtml = await (await request('/sitio/')).text();
  const adminHtml = await (await request('/admin/')).text();
  assert.ok(publicHtml.includes('id="publicView"') && !publicHtml.includes('id="loginForm"') && !publicHtml.includes('id="adminView"'));
  assert.ok(adminHtml.includes('id="loginForm"') && adminHtml.includes('id="adminView"') && !adminHtml.includes('id="publicView"'));
  assert.ok(publicHtml.includes('/js/public.js') && !publicHtml.includes('/js/admin.js'));
  assert.ok(adminHtml.includes('/js/admin.js') && !adminHtml.includes('/js/public.js'));
  const manifests = [];
  for (const scope of ['/sitio/','/admin/']) {
    const response = await request(scope+'manifest.webmanifest');
    assert.match(response.headers.get('content-type'), /manifest\+json/);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const manifest = await response.json(); manifests.push(manifest);
    assert.equal(manifest.scope,scope); assert.equal(manifest.start_url,scope); assert.equal(manifest.display,'standalone');
    assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
    for (const icon of manifest.icons) {
      const asset = await request(icon.src); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),/image\/png/);
      const png = Buffer.from(await asset.arrayBuffer());
      const dimension = Number(icon.sizes.split('x')[0]);
      assert.equal(png.readUInt32BE(16),dimension); assert.equal(png.readUInt32BE(20),dimension);
    }
    const worker = await request(scope+'sw.js'); assert.match(worker.headers.get('content-type'),/javascript/); assert.match(worker.headers.get('cache-control'),/no-store/);
  }
  assert.notEqual(manifests[0].id,manifests[1].id);
  assert.notEqual(manifests[0].icons[0].src,manifests[1].icons[0].src);
});

test('la oferta comercial y Ruche por desarrollo se aplican sin escribir el inventario persistente', async () => {
  const file=path.join(fixture,'data/db.json');
  const before=fs.readFileSync(file,'utf8');
  const data=await (await request('/api/public/site')).json();
  assert.deepEqual(data.prototypes.filter(p=>p.developments.includes('oporto')).map(p=>p.id).sort(), ['areni-3r','belora']);
  const ruche=data.prototypes.find(p=>p.id==='ruche');
  assert.equal(ruche.availabilityByDevelopment.sorento,'sold-out');
  assert.equal(ruche.mediaByDevelopment.montalese.pending,true);
  assert.equal(data.developments.find(d=>d.id==='sorento').startingPrice,3200000);
  assert.equal(fs.readFileSync(file,'utf8'),before);
});


test('los videos guardados reciben la identidad verificada sin reescribir la base', async () => {
  const file=path.join(fixture,'data/db.json');
  const db=JSON.parse(fs.readFileSync(file));
  db.videos=[{url:'https://www.tiktok.com/@itzealva/video/7574163128146038034',title:'Mi título guardado',developments:['vittoria']},
    {url:'https://www.tiktok.com/@bienes.races57/video/7697496993328925973',title:'Recorrido antiguo',developments:['montalese']}];
  fs.writeFileSync(file,JSON.stringify(db));
  const before=fs.readFileSync(file,'utf8');
  const data=await (await request('/api/public/site')).json();
  assert.equal(data.videos.length,2);
  assert.deepEqual(data.videos[0].prototypeIds,['arveto']);
  assert.equal(data.videos[0].title,'Mi título guardado');
  assert.equal(data.videos[1].verificationStatus,'pending');
  assert.equal(fs.readFileSync(file,'utf8'),before);
});

test('el administrador puede asociar un nuevo enlace a su modelo y rechaza modelos inexistentes', async () => {
  const login=await request('/api/auth/login',{method:'POST',body:{email:'admin@bienesraicesalvarado.com.mx',password}});
  cookie=login.headers.get('set-cookie').split(';')[0];
  const url='https://www.tiktok.com/@itzealva/video/7000000000000000123';
  let res=await request('/api/admin/videos',{method:'POST',authenticated:true,body:{url,title:'Arveto nuevo',developments:['vittoria'],prototypeId:'inventado'}});
  assert.equal(res.status,400);
  res=await request('/api/admin/videos',{method:'POST',authenticated:true,body:{url,title:'Arveto nuevo',developments:['vittoria'],prototypeId:'arveto'}});
  assert.equal(res.status,201);
  const video=(await res.json()).videos.find(v=>v.url===url);
  assert.equal(video.scope,'model'); assert.deepEqual(video.prototypeIds,['arveto']);
});
