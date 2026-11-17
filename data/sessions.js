const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Store only token hashes, outside public assets. Each session has its own file
// so independent Node processes can validate and revoke the same session.
function createSessionStore(directory, credentials) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const validToken = token => typeof token === 'string' && /^[a-f0-9]{48}$/.test(token);
  const filename = token => path.join(directory, `${crypto.createHash('sha256').update(token).digest('hex')}.json`);
  const signature = (token, session) => crypto.createHmac('sha256', token)
    .update(JSON.stringify([session.email, session.expiresAt, credentials.email, credentials.password]))
    .digest('hex');
  const remove = token => {
    if (!validToken(token)) return;
    try { fs.unlinkSync(filename(token)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  };
  const get = token => {
    if (!validToken(token)) return null;
    let session;
    try { session = JSON.parse(fs.readFileSync(filename(token), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return null; throw error; }
    if (!session || session.email !== credentials.email || !Number.isFinite(session.expiresAt)
      || !/^[a-f0-9]{64}$/.test(session.signature || '')) return null;
    if (session.expiresAt <= Date.now()) { remove(token); return null; }
    const expected = signature(token, session);
    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(session.signature, 'hex'))) return null;
    return { email: session.email, expiresAt: session.expiresAt };
  };
  return {
    get,
    set(token, session) {
      if (!validToken(token)) throw new Error('Token de sesión no válido.');
      const stored = { email: session.email, expiresAt: session.expiresAt, signature: signature(token, session) };
      fs.writeFileSync(filename(token), JSON.stringify(stored), { flag: 'wx', mode: 0o600 });
    },
    delete: remove,
    cleanup(now) {
      for (const file of fs.readdirSync(directory)) {
        if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
        const target = path.join(directory, file);
        try {
          const session = JSON.parse(fs.readFileSync(target, 'utf8'));
          if (!Number.isFinite(session?.expiresAt) || session.expiresAt <= now) fs.unlinkSync(target);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
    }
  };
}

module.exports = { createSessionStore };
