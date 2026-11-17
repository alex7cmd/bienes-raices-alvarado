const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { withPrototypeGallery } = require('../data/galleries');
const { buildInitialData } = require('../data/seed');
const catalog = require('../data/prototype-galleries.json');

test('cada modelo tiene sus fotos originales verificadas y conserva la galería de departamentos', () => {
  const prototypes = buildInitialData().prototypes;
  for (const entry of catalog.prototypes) {
    assert.ok(prototypes.some(p => p.id === entry.id));
    for (const image of entry.images) {
      for (const [url, hash] of [[image.src, image.sha256], [image.thumbnail, image.thumbnailSha256]]) {
        if (!url) continue;
        assert.ok(url.startsWith(`/assets/images/galleries/${entry.id}/`));
        const bytes = fs.readFileSync(path.join(__dirname, '../public', url));
        assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), hash);
      }
    }
  }
  assert.equal(catalog.prototypes.find(p => p.id === 'moscatel').images.filter(i => i.source.includes('bienesraicesalvarado')).length, 15);
  assert.equal(catalog.prototypes.find(p => p.id === 'areni').images.length, 10);
  assert.notEqual(withPrototypeGallery(prototypes.find(p => p.id === 'moscato')).image, withPrototypeGallery(prototypes.find(p => p.id === 'moscatel')).image);
  for (const prototype of prototypes) {
    const enriched = withPrototypeGallery(prototype);
    assert.ok(new Set([enriched.image, ...enriched.gallery]).size > 1, prototype.id);
  }
  for (const id of ['flat-1', 'flat-2']) {
    const prototype = prototypes.find(p => p.id === id);
    assert.deepEqual(withPrototypeGallery(prototype), prototype);
  }
});

test('las galerías completan catálogos persistentes sin reemplazar ediciones ni modificar la base', () => {
  const prototype = { ...buildInitialData().prototypes.find(p => p.id === 'areni'), image: '/uploads/fachada-personal.jpg', gallery: ['/uploads/interior-personal.jpg'], price: 1234567, description: 'Texto del administrador', developments: ['oporto'] };
  const before = structuredClone(prototype);
  const enriched = withPrototypeGallery(prototype);
  assert.deepEqual(prototype, before);
  assert.equal(enriched.image, prototype.image);
  assert.ok(enriched.gallery.includes(prototype.gallery[0]));
  assert.equal(enriched.gallery.length, 11);
  for (const key of ['price', 'description', 'developments']) assert.deepEqual(enriched[key], prototype[key]);
  const unknown = { id: 'modelo-personal', image: '/uploads/nueva.jpg' };
  assert.deepEqual(withPrototypeGallery(unknown), unknown);
});
