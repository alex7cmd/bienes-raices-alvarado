const catalog = require('./prototype-galleries.json');
const { buildInitialData } = require('./seed');
const defaults = new Map(buildInitialData().prototypes.map(p => [p.id, p.image]));
const galleries = new Map(catalog.prototypes.map(p => [p.id, p]));

// A response projection: never rewrite CMS data or the persistent database.
function withPrototypeGallery(prototype) {
  const verified = galleries.get(prototype.id);
  if (!verified?.images.length) return prototype;
  const images = [...new Set(verified.images.map(image => image.src))];
  const image = !prototype.image || prototype.image === defaults.get(prototype.id)
    ? images[0] : prototype.image;
  return {
    ...prototype,
    image,
    gallery: [...new Set([...(Array.isArray(prototype.gallery) ? prototype.gallery : []), ...images])],
    galleryThumbs: Object.fromEntries(verified.images.filter(photo => photo.thumbnail).map(photo => [photo.src, photo.thumbnail]))
  };
}
module.exports = { withPrototypeGallery };
