// Fondo de galaxia en movimiento: estrellas que se desplazan en capas, nebulosas que respiran
// y una estrella fugaz de vez en cuando. Se adapta al tema claro u oscuro de la app.
(function () {
  if (window.__galaxy) return; window.__galaxy = true;
  var st = document.createElement('style');
  st.textContent = 'html:not(#gx){background:var(--bg,#0e0e16)!important}html body:not(#gx),html .auth:not(#gx),html #authOverlay:not(#gx){background:transparent!important}#galaxy-bg{position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block}';
  document.head.appendChild(st);
  var cv = document.createElement('canvas'); cv.id = 'galaxy-bg'; cv.setAttribute('aria-hidden', 'true');
  function mount() { document.body.insertBefore(cv, document.body.firstChild); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  var c = cv.getContext('2d'), W = 0, H = 0, D = 1, stars = [], dark = true, base = [14, 14, 22], accent = [124, 92, 255];
  function rgb(s) { var m = String(s).match(/\d+(\.\d+)?/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; }
  function theme() {
    var cs = getComputedStyle(document.documentElement);
    base = rgb(cs.backgroundColor) || base;
    var a = cs.getPropertyValue('--accent') || cs.getPropertyValue('--brand') || cs.getPropertyValue('--primary');
    if (a && a.trim()) { var t = document.createElement('i'); t.style.color = a.trim(); document.body.appendChild(t); accent = rgb(getComputedStyle(t).color) || accent; t.remove(); }
    dark = (0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2]) < 128;
  }
  function seed() {
    var n = Math.round(Math.min(260, W * H / 4200)); stars = [];
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), p: Math.random() * 6.28, h: Math.random() });
  }
  function size() { D = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; c.setTransform(D, 0, 0, D, 0, 0); seed(); }
  var shoot = null;
  function frame(t) {
    t /= 1000;
    c.clearRect(0, 0, W, H);
    // nebulosas
    var neb = [[accent, .25, .3, .55], [[90, 140, 255], .8, .2, .45], [[255, 110, 190], .6, .85, .5]];
    for (var k = 0; k < neb.length; k++) {
      var col = neb[k][0], x = W * (neb[k][1] + .06 * Math.sin(t * .05 + k * 2)), y = H * (neb[k][2] + .05 * Math.cos(t * .04 + k)), r = Math.max(W, H) * neb[k][3] * (1 + .08 * Math.sin(t * .1 + k));
      var g = c.createRadialGradient(x, y, 0, x, y, r), a = dark ? .2 : .1;
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // estrellas en capas (las cercanas se mueven más rápido)
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], sp = .8 + s.z * 7;
      var x2 = (s.x + t * sp) % (W + 4), y2 = (s.y + t * sp * .35) % (H + 4);
      var tw = .5 + .5 * Math.sin(t * (1 + s.z * 2) + s.p), r2 = .4 + s.z * 1.5;
      var tint = s.h < .15 ? '200,215,255' : s.h > .92 ? '255,225,190' : (dark ? '255,255,255' : '60,60,110');
      c.fillStyle = 'rgba(' + tint + ',' + ((dark ? .35 : .22) + tw * (dark ? .6 : .3)) + ')';
      c.beginPath(); c.arc(x2, y2, r2, 0, 6.29); c.fill();
      if (s.z > .93 && dark) { c.fillStyle = 'rgba(255,255,255,' + tw * .12 + ')'; c.beginPath(); c.arc(x2, y2, r2 * 4, 0, 6.29); c.fill(); }
    }
    // estrella fugaz
    if (!shoot && Math.random() < .004) shoot = { x: Math.random() * W * .8, y: Math.random() * H * .4, l: 0 };
    if (shoot) {
      shoot.l += .02; var L = shoot.l, sx = shoot.x + L * W * .4, sy = shoot.y + L * H * .2;
      var lg = c.createLinearGradient(sx, sy, sx - 110, sy - 55);
      lg.addColorStop(0, (dark ? 'rgba(255,255,255,' : 'rgba(80,80,140,') + (1 - L) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = lg; c.lineWidth = 1.8; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 110, sy - 55); c.stroke();
      if (L >= 1) shoot = null;
    }
  }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(ts) { if (!document.hidden) frame(ts); requestAnimationFrame(loop); }
  function start() { theme(); size(); if (reduce) frame(20000); else requestAnimationFrame(loop); setInterval(function () { var d = dark, b = base + ''; theme(); if (reduce && (d !== dark || b !== base + '')) frame(20000); }, 1500); }
  addEventListener('resize', function () { size(); if (reduce) frame(20000); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
