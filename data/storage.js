const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APP_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(APP_ROOT, process.env.APP_DATA_DIR)
  : path.join(APP_ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = process.env.APP_DATA_DIR
  ? path.join(DATA_DIR, 'uploads')
  : path.join(APP_ROOT, 'public', 'uploads');

const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function initializeStorage() {
  if (!process.env.APP_DATA_DIR) return;
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const marker = path.join(DATA_DIR, 'migration-complete.json');
  if (fs.existsSync(marker)) {
    if (!fs.existsSync(DB_PATH)) throw new Error('Falta la base de datos persistente; se aborta para evitar generar datos de demostración.');
    return;
  }
  if (!process.env.APP_MIGRATION_SOURCE) {
    throw new Error('Configura APP_MIGRATION_SOURCE para inicializar el almacenamiento persistente desde la versión anterior.');
  }
  const sourceRoot = path.resolve(APP_ROOT, process.env.APP_MIGRATION_SOURCE);
  const sourceDB = path.join(sourceRoot, 'data', 'db.json');
  JSON.parse(fs.readFileSync(sourceDB, 'utf8'));
  const sourceHash = digest(sourceDB);
  if (!fs.existsSync(DB_PATH)) {
    const temporary = path.join(DATA_DIR, 'db-migration.tmp');
    fs.copyFileSync(sourceDB, temporary, fs.constants.COPYFILE_EXCL);
    if (digest(temporary) !== sourceHash) throw new Error('No se pudo verificar la copia de datos.');
    fs.renameSync(temporary, DB_PATH);
  } else if (digest(DB_PATH) !== sourceHash) {
    throw new Error('La migración está incompleta y la base de destino difiere del origen. No se reemplazaron datos.');
  }
  const backup = path.join(DATA_DIR, `db-before-migration-${sourceHash.slice(0, 16)}.json`);
  if (!fs.existsSync(backup)) fs.copyFileSync(sourceDB, backup, fs.constants.COPYFILE_EXCL);
  if (digest(backup) !== sourceHash) throw new Error('No se pudo verificar el respaldo de migración.');

  const sourceUploads = path.join(sourceRoot, 'public', 'uploads');
  fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
  let uploads = 0;
  function copyUploads(directory, relative = '') {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('La carpeta de cargas contiene un enlace simbólico que requiere revisión.');
      const from = path.join(directory, entry.name);
      const toRelative = path.join(relative, entry.name);
      const to = path.join(UPLOADS_DIR, toRelative);
      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        copyUploads(from, toRelative);
      } else if (entry.isFile()) {
        if (!fs.existsSync(to)) fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
        if (digest(from) !== digest(to)) throw new Error('Una carga no coincide con su copia. Se aborta la migración.');
        uploads++;
      }
    }
  }
  copyUploads(sourceUploads);
  if (digest(sourceDB) !== sourceHash) throw new Error('La base de origen cambió durante la migración. Revisa los datos antes de reintentar.');
  fs.writeFileSync(marker, JSON.stringify({ completedAt: new Date().toISOString(), databaseSha256: sourceHash, uploads }, null, 2), { flag: 'wx', mode: 0o600 });
}

module.exports = { DB_PATH, UPLOADS_DIR, initializeStorage };
