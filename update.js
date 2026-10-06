// Actualización automática: cada vez que vuelves a abrir la app (o cada 10 minutos) revisa si hay
// una versión nueva publicada. Si la hay y acabas de volver a la app, se recarga sola; si la estás
// usando, aparece un aviso para actualizar con un toque y no se pierde lo que estás haciendo.
(function () {
  if (window.__autoUpdate) return; window.__autoUpdate = true;
  var current = null, hidden_at = 0, bannerShown = false;
  function hash(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; }
  function fetchVersion() {
    return fetch('sw.js?check=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { return t ? hash(t) : null; }).catch(function () { return null; });
  }
  function apply() {
    var go = function () { location.reload(); };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) return go();
        reg.update().catch(function () {}).then(function () { setTimeout(go, 400); });
      }).catch(go);
    } else go();
  }
  function banner() {
    if (bannerShown) return; bannerShown = true;
    var b = document.createElement('button');
    b.setAttribute('style', 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:9999;border:0;border-radius:999px;padding:12px 20px;font:700 15px system-ui,-apple-system,sans-serif;background:#fff;color:#111;box-shadow:0 10px 30px rgba(0,0,0,.45);cursor:pointer');
    b.textContent = 'Hay una versión nueva · Toca para actualizar';
    b.onclick = apply; document.body.appendChild(b);
  }
  function check(justReturned) {
    fetchVersion().then(function (v) {
      if (v == null) return;
      if (current == null) { current = v; return; }
      if (v !== current) { if (justReturned) apply(); else banner(); }
    });
  }
  check(false);
  setInterval(function () { if (document.visibilityState === 'visible') check(false); }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { hidden_at = Date.now(); return; }
    check(Date.now() - hidden_at > 3000);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) check(true); });
})();
