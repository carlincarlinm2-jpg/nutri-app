// Fondo de galaxia negra: estrellas que titilan, algunas con destello en cruz, una Vía Láctea
// muy suave que gira lento y estrellas fugaces de vez en cuando. En tema claro se vuelve discreto.
(function () {
  if (window.__galaxy) return; window.__galaxy = true;
  var st = document.createElement('style');
  st.id = 'galaxy-css';
  document.head.appendChild(st);
  var cv = document.createElement('canvas'); cv.id = 'galaxy-bg'; cv.setAttribute('aria-hidden', 'true');
  function mount() { document.body.insertBefore(cv, document.body.firstChild); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  var c = cv.getContext('2d'), W = 0, H = 0, D = 1, stars = [], dust = [], dark = true, shoot = null;
  function rgb(s) { var m = String(s).match(/\d+(\.\d+)?/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; }
  function theme() {
    // Lee el color de fondo que define la app (--bg) para saber si está en tema oscuro o claro.
    var probe = document.createElement('i'); probe.style.color = 'var(--bg, #000)'; document.body.appendChild(probe);
    var b = rgb(getComputedStyle(probe).color) || [0, 0, 0]; probe.remove();
    var was = dark; dark = (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2]) < 128;
    st.textContent = 'html:not(#gx){background:' + (dark ? '#000' : 'var(--bg,#f4f4f7)') + '!important}html body:not(#gx),html .auth:not(#gx),html #authOverlay:not(#gx){background:transparent!important}#galaxy-bg{position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block}';
    var mt = document.querySelector('meta[name="theme-color"]'); if (mt && dark) mt.setAttribute('content', '#000000');
    return was !== dark;
  }
  function seed() {
    var n = Math.round(Math.min(420, W * H / 2600)); stars = [];
    for (var i = 0; i < n; i++) {
      var z = Math.pow(Math.random(), 2.2);
      stars.push({ x: Math.random() * W, y: Math.random() * H, z: z, p: Math.random() * 6.28, sp: .6 + Math.random() * 2.4, h: Math.random(), flare: z > .82 && Math.random() < .5 });
    }
    dust = []; for (var j = 0; j < 260; j++) { var t = Math.random(); dust.push({ t: t, o: (Math.random() - .5) * (.12 + Math.random() * .1), r: Math.random() * 1.1 + .2, a: Math.random() }); }
  }
  function size() { D = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; c.setTransform(D, 0, 0, D, 0, 0); seed(); }
  function frame(ms) {
    var t = ms / 1000;
    c.clearRect(0, 0, W, H);
    var ink = dark ? '255,255,255' : '40,40,80';
    // Vía Láctea: una banda diagonal muy tenue que gira despacio
    c.save(); c.translate(W / 2, H / 2); c.rotate(-.55 + Math.sin(t * .01) * .05);
    var L = Math.hypot(W, H), bw = Math.min(W, H) * .32;
    var g = c.createLinearGradient(0, -bw, 0, bw);
    g.addColorStop(0, 'rgba(120,110,200,0)'); g.addColorStop(.5, dark ? 'rgba(150,140,230,.07)' : 'rgba(120,110,200,.05)'); g.addColorStop(1, 'rgba(120,110,200,0)');
    c.fillStyle = g; c.fillRect(-L, -bw, L * 2, bw * 2);
    for (var j = 0; j < dust.length; j++) { var d = dust[j]; var x = (d.t - .5) * L * 1.1, y = d.o * L; c.fillStyle = 'rgba(' + ink + ',' + (.15 + .25 * (.5 + .5 * Math.sin(t * .8 + d.a * 9))) * (dark ? 1 : .5) + ')'; c.fillRect(x, y, d.r, d.r); }
    c.restore();
    // estrellas
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var x2 = (s.x + t * (1 + s.z * 4)) % (W + 6), y2 = s.y;
      var tw = .5 + .5 * Math.sin(t * s.sp + s.p); tw = tw * tw;
      var r = .35 + s.z * 1.7;
      var col = s.h < .12 ? '180,205,255' : s.h > .93 ? '255,220,180' : ink;
      var a = (dark ? .25 : .12) + tw * (dark ? .75 : .35);
      c.fillStyle = 'rgba(' + col + ',' + a + ')';
      c.beginPath(); c.arc(x2, y2, r, 0, 6.29); c.fill();
      if (s.flare && dark) {
        var fl = r * (4 + tw * 7);
        c.strokeStyle = 'rgba(' + col + ',' + tw * .55 + ')'; c.lineWidth = .8;
        c.beginPath(); c.moveTo(x2 - fl, y2); c.lineTo(x2 + fl, y2); c.moveTo(x2, y2 - fl); c.lineTo(x2, y2 + fl); c.stroke();
        var gg = c.createRadialGradient(x2, y2, 0, x2, y2, r * 6); gg.addColorStop(0, 'rgba(' + col + ',' + tw * .35 + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)');
        c.fillStyle = gg; c.beginPath(); c.arc(x2, y2, r * 6, 0, 6.29); c.fill();
      }
    }
    // estrella fugaz
    if (!shoot && Math.random() < .003) shoot = { x: Math.random() * W * .8, y: Math.random() * H * .45, l: 0, a: .35 + Math.random() * .3 };
    if (shoot) {
      shoot.l += .018; var k = shoot.l, sx = shoot.x + k * W * .45, sy = shoot.y + k * W * .45 * shoot.a, len = 140;
      var lg = c.createLinearGradient(sx, sy, sx - len, sy - len * shoot.a);
      lg.addColorStop(0, 'rgba(' + ink + ',' + Math.sin(k * Math.PI) + ')'); lg.addColorStop(1, 'rgba(' + ink + ',0)');
      c.strokeStyle = lg; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - len, sy - len * shoot.a); c.stroke();
      if (k >= 1) shoot = null;
    }
  }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(ts) { if (!document.hidden) frame(ts); requestAnimationFrame(loop); }
  function start() { theme(); size(); if (reduce) frame(20000); else requestAnimationFrame(loop); setInterval(function () { if (theme() && reduce) frame(20000); }, 1500); }
  addEventListener('resize', function () { size(); if (reduce) frame(20000); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
