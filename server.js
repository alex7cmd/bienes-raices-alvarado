const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ensureDatabase, DB_PATH } = require('./data/seed');
const { UPLOADS_DIR } = require('./data/storage');

ensureDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Admin credentials (override via environment variables in SiteGround)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bienesraicesalvarado.com.mx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'Qvalta2026!');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const loginAttempts = new Map();
const activeSessions = new Map();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin')) {
    try {
      if (new URL(req.get('Origin')).host !== req.get('host')) return res.status(403).json({ error: 'Origen no permitido.' });
    } catch { return res.status(403).json({ error: 'Origen no permitido.' }); }
  }
  next();
});
app.use(express.json({ limit: '256kb' }));
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions) if (session.expiresAt <= now) activeSessions.delete(token);
  for (const [ip, attempt] of loginAttempts) if (attempt.resetAt <= now) loginAttempts.delete(ip);
}, 60 * 1000);
cleanup.unref();

// Cache-Control: evitar caché en HTML y API para actualizaciones inmediatas
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use('/uploads', express.static(UPLOADS_DIR, { etag: true, maxAge: '1d', dotfiles: 'deny' }));

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  maxAge: '1d',
  setHeaders(res, file) {
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  }
}));

// File upload configuration
const uploadsDir = UPLOADS_DIR;
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Usa JPG, PNG, WEBP, MP4 o WEBM.'));
    }
  }
});

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) {
      try { cookies[k] = decodeURIComponent(v.join('=')); } catch { /* Ignore malformed cookies. */ }
    }
  });
  return cookies;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  const token = cookies.qvalta_admin;
  const session = token && activeSessions.get(token);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) { activeSessions.delete(token); return false; }
  return true;
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Acceso exclusivo para Administrador.' });
  }
  next();
}

function validateFields(body, numericFields = [], textFields = [], mediaFields = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Se esperaba un objeto JSON.';
  for (const key of numericFields) {
    if (body[key] === undefined) continue;
    if (!['number', 'string'].includes(typeof body[key]) || String(body[key]).trim() === '' || !Number.isFinite(Number(body[key])) || Number(body[key]) < 0) return `${key}: usa un número válido mayor o igual a cero.`;
  }
  for (const key of [...textFields, ...mediaFields]) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'string' || body[key].length > 5000) return `${key}: texto no válido (máximo 5000 caracteres).`;
  }
  for (const key of mediaFields) {
    const value = body[key];
    if (value === undefined || value === '') continue;
    if (value.startsWith('/') && !value.startsWith('//') && !/[\\\s<>"']/.test(value)) continue;
    try { if (['https:', 'http:'].includes(new URL(value).protocol) && !/[\s<>"']/.test(value)) continue; } catch {}
    return `${key}: usa una ruta local o URL HTTP/HTTPS válida.`;
  }
  return null;
}

// --- AUTH ROUTES ---
app.get('/api/auth/me', (req, res) => {
  res.json({ authenticated: isAdmin(req), email: isAdmin(req) ? ADMIN_EMAIL : null });
});

app.post('/api/auth/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Configura ADMIN_PASSWORD en el servidor para habilitar el acceso.' });
  const now = Date.now();
  const key = req.ip;
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= 10) {
    res.setHeader('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' });
  }
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    loginAttempts.delete(key);
    activeSessions.set(token, { email, expiresAt: now + SESSION_TTL_MS });
    res.setHeader('Set-Cookie', `qvalta_admin=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secureCookie}`);
    return res.json({ ok: true, email });
  }
  loginAttempts.set(key, { count: attempt && attempt.resetAt > now ? attempt.count + 1 : 1, resetAt: attempt && attempt.resetAt > now ? attempt.resetAt : now + 15 * 60 * 1000 });
  return res.status(401).json({ error: 'Credenciales incorrectas.' });
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.qvalta_admin) activeSessions.delete(cookies.qvalta_admin);
  res.setHeader('Set-Cookie', `qvalta_admin=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureCookie}`);
  res.json({ ok: true });
});

// --- LIVE SYNC WITH PLANOS.QAVALTA.COM ---
const QAVALTA_DEV_IDS = {
  sorento: 1,
  oporto: 2,
  ardenza: 3,
  montalese: 5,
  'torres-qavalta': 6,
  vittoria: 7
};
const qavaltaLiveCache = new Map();
const qavaltaPending = new Map();
const baseMaps = new Map();
const QAVALTA_CACHE_TTL_MS = 60 * 1000;

async function getQavaltaMapWithLiveSync(slug, forceRefresh = false) {
  const safeSlug = String(slug || '').toLowerCase();
  if (!Object.hasOwn(QAVALTA_DEV_IDS, safeSlug)) return null;
  if (!baseMaps.has(safeSlug)) {
    const baseFile = path.join(__dirname, 'public', 'assets', 'maps', 'data', `${safeSlug}.json`);
    if (!fs.existsSync(baseFile)) return null;
    baseMaps.set(safeSlug, JSON.parse(fs.readFileSync(baseFile, 'utf8')));
  }
  const baseMap = baseMaps.get(safeSlug);
  let cached = qavaltaLiveCache.get(safeSlug);
  if (safeSlug !== 'torres-qavalta' && (forceRefresh || !cached || Date.now() - cached.ts >= QAVALTA_CACHE_TTL_MS)) {
    if (!qavaltaPending.has(safeSlug)) {
      const pending = (async () => {
        try {
          const resp = await fetch(`https://planos.qavalta.com/api/desarrollos/${QAVALTA_DEV_IDS[safeSlug]}/lotes`, { signal: AbortSignal.timeout(5000) });
          if (!resp.ok) throw new Error('Sin respuesta del catálogo remoto');
          const rows = await resp.json();
          if (!Array.isArray(rows) || !rows.length) throw new Error('Catálogo remoto vacío');
          const bySvgId = Object.create(null);
          for (const row of rows) if (typeof row.svgId === 'string') bySvgId[row.svgId] = row;
          qavaltaLiveCache.set(safeSlug, { ts: Date.now(), bySvgId, source: 'planos.qavalta.com', syncedAt: new Date().toISOString() });
        } catch {
          const previous = qavaltaLiveCache.get(safeSlug);
          qavaltaLiveCache.set(safeSlug, { ...previous, ts: Date.now(), source: previous?.bySvgId ? 'stale-cache' : 'local-cache' });
        }
      })();
      qavaltaPending.set(safeSlug, pending);
      pending.finally(() => qavaltaPending.delete(safeSlug));
    }
    await qavaltaPending.get(safeSlug);
    cached = qavaltaLiveCache.get(safeSlug);
  }
  const liveMap = cached?.bySvgId;
  const source = cached?.source || 'local-cache';

  const db = readDB();
  const overrides = (db.qavaltaLotOverrides && db.qavaltaLotOverrides[safeSlug]) || {};
  const mergedLots = baseMap.lots.map(l => {
    const live = liveMap ? liveMap[l.id] : null;
    const ov = overrides[l.id] || null;
    return {
      ...l,
      n: live?.nombre || l.n,
      m: live?.manzana ?? l.m,
      a: live?.area ?? l.a,
      p: ov?.precio ?? (live?.precio ?? l.p),
      s: ov?.status || live?.status || l.s,
      pr: ov?.prototipo ?? (live?.prototipo || l.pr)
    };
  });

  return {
    ...baseMap,
    lots: mergedLots,
    source,
    syncedAt: cached?.syncedAt || null,
    ...(baseMap.floors ? { floors: baseMap.floors.map(f => ({ ...f, lots: f.lots.map(l => mergedLots.find(m => m.id === l.id) || l) })) } : {})
  };
}

app.get('/api/public/qavalta-map/:slug', async (req, res) => {
  try {
    const payload = await getQavaltaMapWithLiveSync(req.params.slug, req.query.refresh === '1' && isAdmin(req));
    if (!payload) return res.status(404).json({ error: 'Mapa de desarrollo no encontrado.' });
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/qavalta-sync', requireAdmin, async (req, res) => {
  try {
    qavaltaLiveCache.clear();
    const resp = await fetch('https://planos.qavalta.com/api/desarrollos', {
      signal: AbortSignal.timeout(6000)
    });
    if (!resp.ok) return res.status(502).json({ error: 'No se pudo sincronizar con Qavalta. Se conservaron los datos locales.' });
    const remoteDevs = await resp.json();
    if (!Array.isArray(remoteDevs)) return res.status(502).json({ error: 'Respuesta de Qavalta no válida.' });
    const db = readDB();
    if (req.body?.resetOverrides === true) db.qavaltaLotOverrides = {};
    for (const rd of remoteDevs) {
      const local = db.developments.find(d => d.id === rd?.slug);
      if (local && Number.isFinite(Number(rd.precioDesde)) && Number(rd.precioDesde) > 0) {
        local.startingPrice = Number(rd.precioDesde);
      }
    }
    writeDB(db);
    res.json({ ok: true, syncedAt: new Date().toISOString(), developments: db.developments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/qavalta-lots/:slug/:lotId', requireAdmin, (req, res) => {
  const safeSlug = req.params.slug;
  const lotId = req.params.lotId;
  if (!Object.hasOwn(QAVALTA_DEV_IDS, safeSlug)) return res.status(404).json({ error: 'Desarrollo no encontrado.' });
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/assets/maps/data', `${safeSlug}.json`), 'utf8'));
  if (!map.lots.some(l => l.id === lotId)) return res.status(404).json({ error: 'Lote no encontrado.' });
  const error = validateFields(req.body, ['precio'], ['prototipo', 'status']);
  if (error) return res.status(400).json({ error });
  if (req.body.status !== undefined && !['disponible', 'reservado', 'no-disponible', 'vendido'].includes(req.body.status)) return res.status(400).json({ error: 'Estado no válido.' });
  const db = readDB();
  if (!db.qavaltaLotOverrides) db.qavaltaLotOverrides = {};
  if (!db.qavaltaLotOverrides[safeSlug]) db.qavaltaLotOverrides[safeSlug] = {};
  const { status, prototipo, precio } = req.body || {};
  if (prototipo && !db.prototypes.some(p => p.name === prototipo && p.developments?.includes(safeSlug))) return res.status(400).json({ error: 'El prototipo no pertenece a este desarrollo.' });
  db.qavaltaLotOverrides[safeSlug][lotId] = {
    ...(db.qavaltaLotOverrides[safeSlug][lotId] || {}),
    ...(status ? { status } : {}),
    ...(prototipo !== undefined ? { prototipo } : {}),
    ...(precio !== undefined ? { precio: Number(precio) } : {})
  };
  writeDB(db);
  res.json({ ok: true, override: db.qavaltaLotOverrides[safeSlug][lotId] });
});

// --- PUBLIC SITE DATA ---
app.get('/api/public/site', (req, res) => {
  const db = readDB();
  res.json({
    site: db.site,
    developments: db.developments,
    prototypes: db.prototypes
  });
});

// --- PUBLIC CONTACT FORM ---
app.post('/api/public/contact', (req, res) => {
  const { nombre, apellidos, email, telefono, mensaje } = req.body || {};
  const error = validateFields(req.body, [], ['nombre', 'apellidos', 'email', 'telefono', 'mensaje']);
  if (error) return res.status(400).json({ error });
  if (!nombre?.trim() || !email?.trim() || !telefono?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !/^[+()\d\s.-]{7,30}$/.test(telefono.trim())) {
    return res.status(400).json({ error: 'Por favor completa nombre, correo y teléfono.' });
  }
  const db = readDB();
  if (!Array.isArray(db.leads)) db.leads = [];
  const lead = {
    id: crypto.randomBytes(6).toString('hex'),
    nombre: String(nombre).trim(),
    apellidos: String(apellidos || '').trim(),
    email: String(email).trim(),
    telefono: String(telefono).trim(),
    mensaje: String(mensaje || '').trim(),
    targetEmail: db.site.contactEmail || 'leilani@bienesraicesalvarado.com.mx',
    createdAt: new Date().toISOString()
  };
  db.leads.unshift(lead);
  writeDB(db);
  res.status(201).json({ ok: true, id: lead.id });
});

app.get('/api/admin/leads', requireAdmin, (req, res) => {
  const db = readDB();
  res.json({ leads: db.leads || [] });
});

// --- ADMIN-ONLY INTERACTIVE MAP DATA ---
app.get('/api/admin/lots', requireAdmin, (req, res) => {
  const db = readDB();
  const counts = { disponible: 0, no_disponible: 0, vendido: 0 };
  for (const lot of db.lots) {
    if (counts[lot.status] !== undefined) counts[lot.status]++;
  }
  res.json({
    lots: db.lots,
    prototypes: db.prototypes,
    developments: db.developments,
    counts
  });
});

// --- ADMIN CMS MUTATIONS (Content-Only: no layout changes) ---
app.patch('/api/admin/lots/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const lot = db.lots.find(l => l.id === req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lote/Casa no encontrado.' });

  const error = validateFields(req.body, [], ['status', 'prototypeId']);
  if (error) return res.status(400).json({ error });
  const { status, prototypeId } = req.body;
  if (status !== undefined && !['disponible', 'no_disponible', 'vendido'].includes(status)) return res.status(400).json({ error: 'Estado no válido.' });
  if (prototypeId !== undefined && !db.prototypes.some(p => p.id === prototypeId)) return res.status(400).json({ error: 'Prototipo no encontrado.' });
  if (status && ['disponible', 'no_disponible', 'vendido'].includes(status)) {
    lot.status = status;
  }
  if (prototypeId && db.prototypes.some(p => p.id === prototypeId)) {
    lot.prototypeId = prototypeId;
  }

  writeDB(db);
  res.json({ ok: true, lot });
});

app.patch('/api/admin/prototypes/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const proto = db.prototypes.find(p => p.id === req.params.id);
  if (!proto) return res.status(404).json({ error: 'Prototipo no encontrado.' });

  const error = validateFields(req.body, ['price', 'bedrooms', 'bathrooms', 'area', 'parking'], ['name', 'description'], ['image', 'video']);
  if (error) return res.status(400).json({ error });
  const allowedFields = ['name', 'price', 'bedrooms', 'bathrooms', 'area', 'parking', 'description', 'image', 'video'];
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      proto[key] = ['price', 'bedrooms', 'bathrooms', 'area', 'parking'].includes(key)
        ? Number(req.body[key])
        : String(req.body[key]);
    }
  }

  writeDB(db);
  res.json({ ok: true, prototype: proto });
});

app.patch('/api/admin/developments/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const dev = db.developments.find(d => d.id === req.params.id);
  if (!dev) return res.status(404).json({ error: 'Desarrollo no encontrado.' });

  const error = validateFields(req.body, ['startingPrice'], ['name', 'tagline'], ['image']);
  if (error) return res.status(400).json({ error });
  const { name, tagline, startingPrice, image } = req.body || {};
  if (name !== undefined) dev.name = String(name);
  if (tagline !== undefined) dev.tagline = String(tagline);
  if (startingPrice !== undefined) dev.startingPrice = Number(startingPrice);
  if (image !== undefined) dev.image = String(image);

  writeDB(db);
  res.json({ ok: true, development: dev });
});

app.patch('/api/admin/site', requireAdmin, (req, res) => {
  const db = readDB();
  const error = validateFields(req.body, [], ['eyebrow', 'heroTitle', 'heroSubtitle', 'phoneDisplay', 'whatsapp'], ['heroImage']);
  if (error) return res.status(400).json({ error });
  if (req.body.whatsapp !== undefined && !/^\d{7,15}$/.test(req.body.whatsapp)) return res.status(400).json({ error: 'WhatsApp debe contener de 7 a 15 dígitos.' });
  const { eyebrow, heroTitle, heroSubtitle, heroImage, phoneDisplay, whatsapp } = req.body || {};
  if (eyebrow !== undefined) db.site.eyebrow = String(eyebrow);
  if (heroTitle !== undefined) db.site.heroTitle = String(heroTitle);
  if (heroSubtitle !== undefined) db.site.heroSubtitle = String(heroSubtitle);
  if (heroImage !== undefined) db.site.heroImage = String(heroImage);
  if (phoneDisplay !== undefined) db.site.phoneDisplay = String(phoneDisplay);
  if (whatsapp !== undefined) db.site.whatsapp = String(whatsapp);

  writeDB(db);
  res.json({ ok: true, site: db.site });
});

app.post('/api/admin/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const handle = await fs.promises.open(req.file.path, 'r');
  const buffer = Buffer.alloc(32);
  try { await handle.read(buffer, 0, buffer.length, 0); } finally { await handle.close(); }
  const ext = path.extname(req.file.filename);
  const valid = {
    '.jpg': buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    '.jpeg': buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    '.png': buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    '.webp': buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
    '.gif': ['GIF87a','GIF89a'].includes(buffer.toString('ascii', 0, 6)),
    '.mp4': buffer.toString('ascii', 4, 8) === 'ftyp',
    '.mov': ['ftyp','moov','wide','mdat'].includes(buffer.toString('ascii', 4, 8)),
    '.webm': buffer.subarray(0, 4).equals(Buffer.from([26,69,223,163]))
  }[ext];
  if (!valid) {
    await fs.promises.unlink(req.file.path);
    return res.status(400).json({ error: 'El contenido del archivo no corresponde a su extensión.' });
  }
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta API no encontrada.' }));
app.use(['/assets', '/uploads', '/js', '/css'], (req, res) => res.status(404).end());
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err instanceof multer.MulterError ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : (err.status || (err.message.startsWith('Formato no permitido') ? 400 : 500));
  res.status(status).json({ error: status === 500 ? 'Error interno. Intenta de nuevo.' : (err.code === 'LIMIT_FILE_SIZE' ? 'El archivo excede el límite de 25 MB.' : err.message) });
});

// Fallback to index.html for SPA routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Qavalta / Bienes Raíces Alvarado corriendo en http://localhost:${PORT}`));
}
module.exports = app;
