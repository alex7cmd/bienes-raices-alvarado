// Network-only: never cache inventories, authenticated pages, credentials or uploads.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sin conexión</title><body style="font:18px system-ui;background:#10243b;color:white;padding:10vh 8vw"><h1>Sin conexión</h1><p>Conéctate a internet para consultar información actualizada.</p><button onclick="location.reload()">Volver a intentar</button></body></html>`, {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
