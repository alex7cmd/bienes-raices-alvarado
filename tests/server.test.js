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
  for (const item of ['assets', 'js', 'css', 'index.html']) fs.symlinkSync(path.join(project, 'public', item), path.join(fixture, 'public', item));
  fs.symlinkSync(path.join(project, 'node_modules'), path.join(fixture, 'node_modules'));
  process.env.ADMIN_PASSWORD = password;
  global.fetch = async (url, options) => {
    if (!String(url).startsWith('https://planos.qavalta.com/')) return originalFetch(url, options);
    remoteCalls++;
    await new Promise(resolve => setTimeout(resolve, 20));
    if (upstreamFails) return new Response('{}', { status: 503 });
    if (String(url).includes('/torres?')) return Response.json([{ pisos: [{ nombre: 'Planta Baja', departamentos: [{ svgSlotId: 'Flat1Dpto2', estatus: 'no-disponible', nombre: 'Depto2' }] }] }]);
    if (String(url).endsWith('/lotes')) return Response.json([{ svgId: 'test-unknown-id', status: 'disponible' }]);
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
  const res = await request('/js/app.js');
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
