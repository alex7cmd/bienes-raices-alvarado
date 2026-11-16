const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sourceModule = path.join(__dirname, '../data/storage.js');
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alvarado-storage-'));
  const previous = path.join(root, 'previous/app_source');
  const current = path.join(root, 'current/app_source');
  const shared = path.join(root, 'shared');
  fs.mkdirSync(path.join(previous, 'data'), { recursive: true });
  fs.mkdirSync(path.join(previous, 'public/uploads'), { recursive: true });
  fs.mkdirSync(path.join(current, 'data'), { recursive: true });
  fs.copyFileSync(sourceModule, path.join(current, 'data/storage.js'));
  const data = JSON.stringify({ site: { heroTitle: 'Contenido existente' }, leads: [{ id: 'preservar' }], prototypes: [{ price: 1234567 }], qavaltaLotOverrides: { sorento: { lote1: { status: 'vendido' } } } });
  fs.writeFileSync(path.join(previous, 'data/db.json'), data);
  fs.writeFileSync(path.join(previous, 'public/uploads/example.webp'), 'test-upload-content');
  const run = () => execFileSync(process.execPath, ['-e', "const s=require('./data/storage');s.initializeStorage();"], { cwd: current, env: { ...process.env, APP_DATA_DIR: shared, APP_MIGRATION_SOURCE: previous }, stdio: ['ignore','pipe','pipe'] });
  return { root, previous, current, shared, data, run, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
test('migra datos y cargas a una carpeta compartida, con respaldo verificado', () => {
  const f = fixture();
  try {
    f.run();
    assert.equal(fs.readFileSync(path.join(f.shared, 'db.json'), 'utf8'), f.data);
    assert.equal(fs.readFileSync(path.join(f.previous, 'data/db.json'), 'utf8'), f.data);
    assert.equal(fs.readFileSync(path.join(f.shared, 'uploads/example.webp'), 'utf8'), 'test-upload-content');
    const backup = fs.readdirSync(f.shared).find(n => n.startsWith('db-before-migration-'));
    assert.equal(fs.readFileSync(path.join(f.shared, backup), 'utf8'), f.data);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.shared, 'migration-complete.json'))).uploads, 1);
  } finally { f.cleanup(); }
});
test('otro despliegue utiliza los datos compartidos sin reemplazarlos ni depender del build anterior', () => {
  const f = fixture();
  try {
    f.run();
    const updated = JSON.parse(f.data); updated.leads.push({ id: 'solicitud-nueva' });
    fs.writeFileSync(path.join(f.shared, 'db.json'), JSON.stringify(updated));
    fs.rmSync(f.previous, { recursive: true });
    f.run();
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.shared, 'db.json'))), updated);
  } finally { f.cleanup(); }
});
test('la ausencia de una base persistente ya inicializada detiene el inicio', () => {
  const f = fixture();
  try {
    f.run(); fs.unlinkSync(path.join(f.shared, 'db.json'));
    assert.throws(f.run);
    assert.equal(fs.existsSync(path.join(f.shared, 'db.json')), false);
  } finally { f.cleanup(); }
});
test('una base de origen inválida no crea datos ni completa la migración', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.previous, 'data/db.json'), 'invalid-json');
    assert.throws(f.run);
    assert.equal(fs.existsSync(path.join(f.shared, 'db.json')), false);
    assert.equal(fs.existsSync(path.join(f.shared, 'migration-complete.json')), false);
  } finally { f.cleanup(); }
});
