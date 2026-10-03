// Sonidos de la app: se generan al momento (sin archivos), con timbre tipo marimba/cristal y un eco suave.
// Uso: sfx('tap'|'toggle'|'open'|'close'|'ok'|'done'|'undo'|'coin'|'celebrate'|'error'|'whoosh'|'record'|'stop')
// La preferencia se guarda por app: localStorage '<app>_sound' = 'on' | 'off'.
(function (root) {
  const APP = (document.currentScript && document.currentScript.dataset.app) || 'app';
  let ctx = null, master = null, wet = null, comp = null;
  function on() { try { return localStorage.getItem(APP + '_sound') !== 'off'; } catch (e) { return true; } }
  function set(v) { try { localStorage.setItem(APP + '_sound', v ? 'on' : 'off'); } catch (e) {} if (v) play('ok'); }
  function impulse(c, secs = 1.4, decay = 3.2) {
    const len = Math.floor(c.sampleRate * secs), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx);
    wet = ctx.createGain(); wet.gain.value = 0.22; wet.connect(conv); conv.connect(comp);
    return ctx;
  }
  function out(node, send = 1) { node.connect(master); if (send) { const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(wet); } }
  // Nota tipo marimba: fundamental + parcial 4x que se apaga rápido.
  function mallet(f, at = 0, vol = 0.12, dur = 0.55) {
    const t = ctx.currentTime + at, g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f; o1.connect(g);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(vol * 0.5, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4.01; o2.connect(g2); g2.connect(g);
    out(g, 0.6); [o1, o2].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
  }
  // Campanita de cristal: parciales inarmónicos con caída larga.
  function glass(f, at = 0, vol = 0.07, dur = 1.2) {
    const t = ctx.currentTime + at, g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([r, a]) => { const o = ctx.createOscillator(), ga = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * r; ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(t); o.stop(t + dur + 0.05); });
    out(g, 1);
  }
  // Clic suave (ruido filtrado muy corto), como el tacto de iOS.
  function click(at = 0, vol = 0.06, freq = 2800, dur = 0.018) {
    const t = ctx.currentTime + at, len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const s = ctx.createBufferSource(); s.buffer = buf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = vol; s.connect(bp); bp.connect(g); out(g, 0.15); s.start(t);
  }
  function whoosh(at = 0, up = true, vol = 0.05, dur = 0.28) {
    const t = ctx.currentTime + at, len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
    const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(up ? 500 : 2200, t); f.frequency.exponentialRampToValueAtTime(up ? 2200 : 500, t + dur);
    const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); out(g, 0.4); s.start(t);
  }
  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568, A4: 440, F5: 698.46, G4: 392 };
  const S = {
    tap() { click(0, 0.05); },
    toggle() { click(0, 0.06, 3200); click(0.06, 0.045, 2400); },
    open() { whoosh(0, true, 0.035, 0.22); mallet(N.G5, 0.03, 0.05, 0.3); },
    close() { whoosh(0, false, 0.03, 0.2); },
    ok() { mallet(N.E5, 0, 0.1); mallet(N.B5, 0.08, 0.09); },
    done() { mallet(N.C6, 0, 0.09); mallet(N.E6, 0.07, 0.08); mallet(N.G6, 0.14, 0.07, 0.8); },
    undo() { mallet(N.B5, 0, 0.08); mallet(N.E5, 0.08, 0.08); },
    coin() { glass(N.E6, 0, 0.06); glass(N.A5 * 2, 0.09, 0.06, 1.4); },
    celebrate() { [N.C5, N.E5, N.G5, N.B5, N.D6].forEach((f, i) => mallet(f, i * 0.07, 0.09, 0.7)); glass(N.G6, 0.38, 0.05, 1.6); glass(N.D6 * 2, 0.5, 0.03, 1.6); },
    error() { mallet(N.D5, 0, 0.09, 0.4); mallet(N.A4, 0.1, 0.09, 0.5); },
    whoosh() { whoosh(0, true, 0.05); },
    record() { mallet(N.G5, 0, 0.08, 0.35); mallet(N.D6, 0.09, 0.08, 0.5); },
    stop() { mallet(N.D6, 0, 0.07, 0.35); mallet(N.G5, 0.08, 0.07, 0.45); },
  };
  function play(n) { if (!on()) return; try { if (!init()) return; S[n] && S[n](); } catch (e) {} }
  // Clic suave en cualquier botón (sin repetir el de navegación si el botón tiene data-nosfx).
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button,[role=button],.tap,[onclick]'); if (!b || b.dataset.nosfx != null) return;
    play('tap');
  }, { passive: true, capture: true });
  root.sfx = play; root.soundOn = on; root.setSound = set;
})(window);
