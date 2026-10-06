// Cambia cualquier emoji que aparezca en pantalla por su ilustración 3D (Microsoft Fluent Emoji 3D,
// licencia MIT), del mismo tamaño que el texto que lo rodea. Si un dibujo no existe, deja una ficha discreta.
(function () {
  if (window.__art3d) return; window.__art3d = true;
  var BASE = 'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/';
  var RE = /\p{Extended_Pictographic}|[#*0-9]️?⃣/u;
  var seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  var css = document.createElement('style');
  css.textContent = 'img.e3d{width:1.18em;height:1.18em;vertical-align:-.2em;display:inline-block;object-fit:contain;pointer-events:none;-webkit-user-drag:none}span.e3x{display:inline-block;width:1.1em;height:1.1em;border-radius:30%;background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.06));vertical-align:-.18em}';
  document.head.appendChild(css);
  function code(g) { var out = []; for (var ch of g) { var cp = ch.codePointAt(0); out.push(cp.toString(16)); } return out.join('-'); }
  function variants(c) {
    var v = [c];
    if (c.indexOf('fe0f') >= 0) v.push(c.replace(/-fe0f/g, '')); else v.push(c.replace(/^([0-9a-f]+)/, '$1-fe0f'));
    if (c.indexOf('-200d-') >= 0) v.push(c.split('-200d-')[0]);
    var noSkin = c.replace(/-1f3f[b-f]/g, ''); if (noSkin !== c) v.push(noSkin);
    return v;
  }
  function fail(img) {
    var list = img.__v || [], i = (img.__i || 0) + 1;
    if (i < list.length) { img.__i = i; img.src = BASE + list[i] + '.webp'; return; }
    var s = document.createElement('span'); s.className = 'e3x'; s.setAttribute('aria-hidden', 'true'); img.replaceWith(s);
  }
  function makeImg(g) {
    var img = document.createElement('img'); img.className = 'e3d'; img.alt = ''; img.decoding = 'async'; img.draggable = false;
    img.__v = variants(code(g)); img.__i = 0; img.onerror = function () { fail(img); };
    img.src = BASE + img.__v[0] + '.webp'; return img;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, SELECT: 1, TITLE: 1, CODE: 1, PRE: 1 };
  function convertText(node) {
    var t = node.nodeValue; if (!t || !RE.test(t)) return;
    var p = node.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('svg,[data-noart]'))) return;
    var parts = seg ? Array.from(seg.segment(t), function (x) { return x.segment; }) : Array.from(t);
    var frag = document.createDocumentFragment(), buf = '';
    for (var i = 0; i < parts.length; i++) {
      var g = parts[i];
      if (RE.test(g) && !/^[0-9#*]$/.test(g)) { if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; } frag.appendChild(makeImg(g)); }
      else buf += g;
    }
    if (buf) frag.appendChild(document.createTextNode(buf));
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (root.nodeType === 3) return convertText(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = tw.nextNode())) if (RE.test(n.nodeValue)) list.push(n);
    list.forEach(convertText);
  }
  var pending = new Set(), sched = false;
  function flush() { sched = false; pending.forEach(function (n) { if (n.isConnected) walk(n); }); pending.clear(); }
  function queue(n) { pending.add(n); if (!sched) { sched = true; setTimeout(flush, 0); } }
  function start() {
    walk(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') queue(m.target); else m.addedNodes.forEach(queue); }); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
