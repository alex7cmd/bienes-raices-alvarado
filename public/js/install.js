(() => {
  const prefix = document.documentElement.dataset.app === 'admin' ? '/admin/' : '/sitio/';
  const buttons = [...document.querySelectorAll('[data-install-app]')];
  let prompt;
  const hide = () => buttons.forEach(button => button.classList.add('hidden'));
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); prompt = event;
    if (!window.matchMedia('(display-mode: standalone)').matches) buttons.forEach(button => button.classList.remove('hidden'));
  });
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (!prompt) return;
    const current = prompt; prompt = null; hide();
    try { await current.prompt(); await current.userChoice; } catch (error) { console.error('No se pudo abrir la instalación',error); }
  }));
  window.addEventListener('appinstalled', () => {prompt = null; hide();});
  if ('serviceWorker' in navigator) window.addEventListener('load', () => {
    navigator.serviceWorker.register(prefix + 'sw.js', {scope:prefix, updateViaCache:'none'}).catch(error => console.error('No se pudo registrar la aplicación',error));
  });
})();
