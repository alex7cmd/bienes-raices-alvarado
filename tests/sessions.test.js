const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createSessionStore } = require('../data/sessions');
const credentials = { email: 'admin@example.test', password: 'test-only-password' };
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alvarado-sessions-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, token: crypto.randomBytes(24).toString('hex'), session: { email: credentials.email, expiresAt: Date.now() + 28800000 }, store: createSessionStore(directory, credentials) };
}
test('una instancia nueva recupera la sesión sin ampliar su vencimiento', t => {
  const f = fixture(t); f.store.set(f.token, f.session);
  const restarted = createSessionStore(f.directory, credentials);
  assert.deepEqual(restarted.get(f.token), f.session);
  assert.deepEqual(restarted.get(f.token), f.session);
  const raw = fs.readFileSync(path.join(f.directory, fs.readdirSync(f.directory)[0]), 'utf8');
  assert.ok(!raw.includes(f.token)); assert.ok(!raw.includes(credentials.password));
  assert.equal(fs.statSync(path.join(f.directory, fs.readdirSync(f.directory)[0])).mode & 0o777, 0o600);
});
test('cerrar sesión revoca el acceso de todas las instancias', t => {
  const f = fixture(t); f.store.set(f.token, f.session);
  const other = createSessionStore(f.directory, credentials);
  other.delete(f.token);
  assert.equal(f.store.get(f.token), null);
});
test('sesiones vencidas, tokens alterados y credenciales cambiadas se rechazan', t => {
  const f = fixture(t); f.store.set(f.token, f.session);
  assert.equal(f.store.get('../db'), null);
  assert.equal(f.store.get(crypto.randomBytes(24).toString('hex')), null);
  assert.equal(createSessionStore(f.directory, { ...credentials, password: 'changed' }).get(f.token), null);
  const expired = crypto.randomBytes(24).toString('hex');
  f.store.set(expired, { ...f.session, expiresAt: Date.now() - 1 });
  assert.equal(f.store.get(expired), null);
});
test('alterar el vencimiento o corromper el archivo no concede acceso', t => {
  const f = fixture(t); f.store.set(f.token, f.session);
  const file = path.join(f.directory, fs.readdirSync(f.directory)[0]);
  const data = JSON.parse(fs.readFileSync(file)); data.expiresAt += 10000;
  fs.writeFileSync(file, JSON.stringify(data)); assert.equal(f.store.get(f.token), null);
  fs.writeFileSync(file, '{invalid'); assert.equal(f.store.get(f.token), null);
});
