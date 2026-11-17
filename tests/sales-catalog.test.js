const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildInitialData } = require('../data/seed');
const { withSalesCatalog, withSalesDevelopment } = require('../data/sales-catalog');

test('la oferta confirmada del cliente se aplica por desarrollo y conserva Torres y Vittoria', () => {
  const db = buildInitialData();
  const original = structuredClone(db);
  const projected = db.prototypes.map(withSalesCatalog);
  const expected = {
    oporto: ['areni-3r', 'belora'], ardenza: ['montello', 'moscatel'],
    montalese: ['belat', 'arveto', 'brachetto', 'ruche'],
    sorento: ['malvasia', 'gracciano', 'loureira', 'ruche']
  };
  for (const [slug, models] of Object.entries(expected)) {
    assert.deepEqual(projected.filter(p => p.developments.includes(slug)).map(p => p.id).sort(), [...models].sort());
  }
  for (const slug of ['vittoria', 'torres-qavalta']) {
    assert.deepEqual(projected.filter(p => p.developments.includes(slug)).map(p => p.id), db.prototypes.filter(p => p.developments.includes(slug)).map(p => p.id));
  }
  assert.equal(projected.find(p => p.id === 'areni-3r').name, 'Areni 3R');
  assert.equal(projected.find(p => p.id === 'ruche').availabilityByDevelopment.sorento, 'sold-out');
  assert.equal(projected.find(p => p.id === 'ruche').mediaByDevelopment.montalese.pending, true);
  assert.deepEqual(db, original);
});

test('el precio Desde usa modelos disponibles y sigue los precios editados en CMS', () => {
  const db = buildInitialData();
  const sorento = db.developments.find(d => d.id === 'sorento');
  assert.equal(withSalesDevelopment(sorento, db.prototypes).startingPrice, 3200000);
  db.prototypes.find(p => p.id === 'loureira').price = 3150000;
  assert.equal(withSalesDevelopment(sorento, db.prototypes).startingPrice, 3150000);
  assert.equal(sorento.startingPrice, 2600000);
});
