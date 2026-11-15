const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ensureDatabase, DB_PATH } = require('./data/seed');

ensureDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Admin credentials (override via environment variables in SiteGround)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bienesraicesalvarado.com.mx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Qvalta2026!';
const activeSessions = new Map();

app.use(express.json({ limit: '10mb' }));

// Cache-Control: evitar caché en HTML y API para actualizaciones inmediatas
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  maxAge: '1h'
}));

// File upload configuration
const uploadsDir = path.join(__dirname, 'public', 'uploads');
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
    if (k) cookies[k] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  const token = cookies.qvalta_admin;
  return Boolean(token && activeSessions.has(token));
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Acceso exclusivo para Administrador.' });
  }
  next();
}

// --- AUTH ROUTES ---
app.get('/api/auth/me', (req, res) => {
  res.json({ authenticated: isAdmin(req), email: isAdmin(req) ? ADMIN_EMAIL : null });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    activeSessions.set(token, { email, createdAt: Date.now() });
    res.setHeader('Set-Cookie', `qvalta_admin=${token}; HttpOnly; Path=/; SameSite=Lax`);
    return res.json({ ok: true, email });
  }
  return res.status(401).json({ error: 'Credenciales incorrectas.' });
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.qvalta_admin) activeSessions.delete(cookies.qvalta_admin);
  res.setHeader('Set-Cookie', 'qvalta_admin=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
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
  if (!nombre || !email || !telefono) {
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
  res.json({ ok: true, lead });
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

  const { status, prototypeId } = req.body || {};
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

app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// Fallback to index.html for SPA routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Qvalta / Bienes Raíces Alvarado corriendo en http://localhost:${PORT}`);
});
