// Oferta comercial confirmada por el cliente el 17 de noviembre de 2026.
// Independiente del inventario de lotes que mantiene la API de Qavalta.
const modelOrder = {
  oporto: ['areni-3r', 'belora'],
  ardenza: ['montello', 'moscatel'],
  montalese: ['belat', 'arveto', 'brachetto', 'ruche'],
  sorento: ['malvasia', 'gracciano', 'loureira', 'ruche']
};
function withSalesCatalog(prototype) {
  const developments = [
    ...(prototype.developments || []).filter(id => !Object.hasOwn(modelOrder, id)),
    ...Object.keys(modelOrder).filter(id => modelOrder[id].includes(prototype.id))
  ];
  return {
    ...prototype,
    ...(prototype.id === 'areni-3r' ? { name: 'Areni 3R' } : {}),
    developments,
    ...(prototype.id === 'ruche' ? {
      availabilityByDevelopment: { ...prototype.availabilityByDevelopment, sorento: 'sold-out' },
      mediaByDevelopment: { ...prototype.mediaByDevelopment, montalese: { pending: true } }
    } : {})
  };
}
function withSalesDevelopment(development, prototypes) {
  const order = modelOrder[development.id];
  if (!order) return development;
  const available = prototypes.map(withSalesCatalog).filter(p => order.includes(p.id) && p.availabilityByDevelopment?.[development.id] !== 'sold-out');
  const prices = available.map(p => Number(p.price)).filter(p => p > 0 && Number.isFinite(p));
  return { ...development, prototypeOrder: order, ...(prices.length ? { startingPrice: Math.min(...prices) } : {}) };
}
module.exports = { modelOrder, withSalesCatalog, withSalesDevelopment };
