/* ===== 그림(Figure): 캔버스 · 좌표계 · 드래그 핸들 · 애니메이션 · 그리기 도구 =====
   월드 좌표는 수학 관례(y 위쪽)를 따르고, 화면 변환은 F.toS / F.toW가 맡습니다. */

const MATH_FONT = '"Cambria Math", "STIX Two Math", "Latin Modern Math", "Times New Roman", serif';
const UI_FONT = '"Pretendard Variable", Pretendard, "Malgun Gothic", system-ui, sans-serif';

const ease = t => t * t * (3 - 2 * t);                 // 3b1b의 smooth 곡선
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const snap = (v, s = 0.1) => Math.round(v / s) * s;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, k) => [a[0] * k, a[1] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  cross: (a, b) => a[0] * b[1] - a[1] * b[0],
  len: a => Math.hypot(a[0], a[1]),
  norm: a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
  rot: (a, t) => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)],
  lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)],
  ang: a => Math.atan2(a[1], a[0]),
  perp: a => [-a[1], a[0]]
};
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
};

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function col(c) { return PAL[c] || c; }
function rgb(hex) { const n = parseInt((PAL[hex] || hex).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

let figSerial = 0;
const COARSE = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

function makeFig(block, opts, lessonCtx) {
  const F = {
    id: ++figSerial, opts, L: lessonCtx,
    wrap: block.querySelector(".fig-stage"),
    canvas: document.createElement("canvas"),
    w: 0, h: 0, dpr: 1, unit: 40, ox: 0, oy: 0, view: opts.view,
    handles: [], draw: null, onPan: null, onTap: null,
    hover: null, active: null, touched: false,
    inView: false, playing: false, t: 0, _raf: 0, _loop: null, _intro: null
  };
  F.canvas.className = "fig-canvas";
  F.wrap.appendChild(F.canvas);
  F.ctx = F.canvas.getContext("2d");

  /* ---------- 크기와 좌표계 ---------- */
  F.setView = v => { F.view = v; F.fit(); };
  F.fit = () => {
    const v = F.view || { x0: -5, x1: 5, y0: -3, y1: 3 };
    const sx = F.w / (v.x1 - v.x0), sy = F.h / (v.y1 - v.y0);
    // stretch: 그래프처럼 가로·세로 배율을 따로 (기본은 같은 배율로 맞춤)
    F.unit = Math.min(sx, sy);
    F.ux = v.stretch ? sx : F.unit;
    F.uy = v.stretch ? sy : F.unit;
    F.ox = F.w / 2 - ((v.x0 + v.x1) / 2) * F.ux;
    F.oy = F.h / 2 + ((v.y0 + v.y1) / 2) * F.uy;
  };
  F.resize = () => {
    const w = Math.max(240, F.wrap.clientWidth);
    const aspect = typeof opts.aspect === "function" ? opts.aspect(w) : (opts.aspect || 0.56);
    const h = Math.round(Math.min(opts.maxH || 560, w * aspect));
    if (w === F.w && h === F.h) return;
    F.dpr = Math.min(2, window.devicePixelRatio || 1);
    F.w = w; F.h = h;
    F.canvas.width = Math.round(w * F.dpr);
    F.canvas.height = Math.round(h * F.dpr);
    F.canvas.style.height = h + "px";
    F.fit();
    if (F.onResize) F.onResize();
  };
  F.toS = p => [F.ox + p[0] * F.ux, F.oy - p[1] * F.uy];
  F.toW = (sx, sy) => [(sx - F.ox) / F.ux, (F.oy - sy) / F.uy];
  F.bounds = () => { const a = F.toW(0, F.h), b = F.toW(F.w, 0); return { x0: a[0], y0: a[1], x1: b[0], y1: b[1] }; };

  /* ---------- 그리기 ---------- */
  F.redraw = () => {
    if (F._raf) return;
    F._raf = requestAnimationFrame(() => { F._raf = 0; F.paint(); });
  };
  F.paint = () => {
    if (!F.w) return;
    const c = F.ctx;
    c.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
    c.fillStyle = PAL.bg;
    c.fillRect(0, 0, F.w, F.h);
    G.use(F);
    if (F.draw) F.draw(G, F);
    F.handles.forEach(hd => {
      if (hd.hidden && hd.hidden()) return;
      const p = hd.screen ? hd.get() : F.toS(hd.get());
      const hot = hd === F.hover || hd === F.active;
      c.beginPath();
      c.arc(p[0], p[1], (hot ? 15 : 12) * (COARSE ? 1.35 : 1), 0, TAU);
      c.fillStyle = hexA(col(hd.color || "white"), hot ? 0.28 : 0.14);
      c.fill();
      c.beginPath();
      c.arc(p[0], p[1], (hot ? 7 : 6) * (COARSE ? 1.3 : 1), 0, TAU);
      c.fillStyle = col(hd.color || "white");
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = PAL.bg;
      c.stroke();
    });
    if (!F.touched && F.handles.length && opts.hint !== false) {
      c.font = `500 12px ${UI_FONT}`;
      c.fillStyle = "rgba(236,239,244,0.45)";
      c.textAlign = "right"; c.textBaseline = "bottom";
      c.fillText(COARSE ? "● 점을 손가락으로 끌어 보세요" : "● 점을 끌어 보세요", F.w - 10, F.h - 8);
    }
  };

  /* ---------- 입력 ---------- */
  // 손가락은 마우스보다 굵으니 터치 화면에서는 판정 반경을 넓힙니다
  function pick(sx, sy, radius) {
    let best = null, bd = radius || (COARSE ? 40 : 22);
    F.handles.forEach(hd => {
      if (hd.hidden && hd.hidden()) return;
      const p = hd.screen ? hd.get() : F.toS(hd.get());
      const d = Math.hypot(p[0] - sx, p[1] - sy);
      if (d < bd) { bd = d; best = hd; }
    });
    return best;
  }
  function local(e) { const r = F.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function moveHandle(hd, sx, sy) {
    if (hd.screen) hd.set(sx, sy);
    else { const p = F.toW(sx, sy); hd.set(p[0], p[1]); }
  }
  let last = null;
  // 터치: 핸들 근처에서 시작하면 가로채고, 아니면 세로 스크롤은 페이지에 양보합니다.
  // 3D 회전 그림은 가로로 끌면 돌고(touch-action: pan-y), 세로로 끌면 페이지가 스크롤됩니다.
  const wantsTouch = (sx, sy) => !!(pick(sx, sy, 56) || (singleGrab() && pick(sx, sy, 110)));
  const singleGrab = () => (opts.grabNearest ?? F.handles.length === 1) && F.handles.length && !F.onPan && !F.onTap;
  F.canvas.addEventListener("touchstart", e => {
    const r = F.canvas.getBoundingClientRect(), t = e.touches[0];
    syncSize();
    if (wantsTouch(t.clientX - r.left, t.clientY - r.top)) e.preventDefault();
  }, { passive: false });
  F.canvas.addEventListener("pointerdown", e => {
    syncSize();
    const [sx, sy] = local(e);
    const touch = e.pointerType === "touch";
    if (touch && !wantsTouch(sx, sy) && !F.onPan && !F.onTap) return;
    F.touched = true;
    let hd = pick(sx, sy, touch ? 56 : undefined);
    if (!hd && singleGrab() && (!touch || pick(sx, sy, 110))) {
      hd = F.handles.find(h => !(h.hidden && h.hidden()) && !h.fixed);   // 빈 곳을 눌러도 첫 핸들이 따라옵니다
    }
    if (hd) { F.active = hd; moveHandle(hd, sx, sy); }
    else if (F.onTap) F.onTap(F.toW(sx, sy), sx, sy);
    last = [sx, sy];
    F.canvas.setPointerCapture(e.pointerId);
    F.redraw();
    e.preventDefault();
  });
  F.canvas.addEventListener("pointermove", e => {
    const [sx, sy] = local(e);
    if (F.active) { moveHandle(F.active, sx, sy); F.redraw(); }
    else if (last && F.onPan) { F.onPan(sx - last[0], sy - last[1]); F.redraw(); }
    else if (last && F.onTap) { F.onTap(F.toW(sx, sy), sx, sy, true); F.redraw(); }
    else {
      const hd = pick(sx, sy);
      if (hd !== F.hover) { F.hover = hd; F.redraw(); }
      F.canvas.style.cursor = hd ? "grab" : (F.onPan ? "move" : (F.onTap ? "crosshair" : "default"));
    }
    if (last) last = [sx, sy];
  });
  const end = () => { F.active = null; last = null; F.redraw(); };
  F.canvas.addEventListener("pointerup", end);
  F.canvas.addEventListener("pointercancel", end);
  F.canvas.addEventListener("pointerleave", () => { if (!last && F.hover) { F.hover = null; F.redraw(); } });
  // 레이아웃이 바뀌면(늦게 보임, 사이드바 접기, 화면 회전) 캔버스 크기와 좌표계를 즉시 다시 맞춥니다
  function syncSize() { const w = Math.max(240, F.wrap.clientWidth); if (F.wrap.clientWidth && w !== F.w) { F.resize(); F.paint(); } }
  if (window.ResizeObserver) new ResizeObserver(syncSize).observe(F.wrap);

  F.handle = h => { F.handles.push(h); return h; };
  // 배열 p(=[x, y])를 직접 고치는 벡터 핸들. base가 있으면 그 점을 기준으로 한 상대 벡터입니다.
  F.vec = (p, color, o = {}) => F.handle({
    color, fixed: o.fixed,
    get: () => (o.base ? V.add(o.base(), p) : p),
    set: (x, y) => {
      const b = F.bounds(), m = 0.15;
      x = clamp(x, b.x0 + m, b.x1 - m); y = clamp(y, b.y0 + m, b.y1 - m);
      let q = [x, y];
      if (o.base) q = V.sub(q, o.base());
      if (o.constrain) q = o.constrain(q);
      p[0] = snap(q[0], o.snap ?? 0.1); p[1] = snap(q[1], o.snap ?? 0.1);
      if (o.onChange) o.onChange();
    }
  });

  /* ---------- 애니메이션 ---------- */
  F.loop = fn => { F._loop = fn; };
  F.play = on => {
    F.playing = on === undefined ? !F.playing : on;
    if (F.playBtn) F.playBtn.classList.toggle("on", F.playing), F.playBtn.textContent = F.playing ? "❚❚ 멈춤" : "▶ 재생";
    if (F.playing) tick.last = performance.now(), requestAnimationFrame(tick);
  };
  function tick(now) {
    if (!F.playing) return;
    const dt = Math.min(0.05, (now - tick.last) / 1000);
    tick.last = now;
    if (F.inView && F.L.isActive()) { F.t += dt; F._loop(dt, F.t); F.paint(); }
    requestAnimationFrame(tick);
  }
  // 한 번 재생되는 전환 애니메이션 (예: 격자가 행렬을 따라 변형)
  F.tween = (ms, fn) => new Promise(done => {
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      fn(ease(k));
      F.paint();
      if (k < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });

  const io = new IntersectionObserver(es => {
    F.inView = es[0].isIntersecting;
    if (F.inView && F._intro) { const f = F._intro; F._intro = null; f(); }
  }, { threshold: 0.35 });
  io.observe(F.canvas);
  F.intro = fn => { F._intro = fn; };

  return F;
}

/* ---------- 그리기 도구: 월드 좌표 기반 ---------- */
const G = {
  get F() { return G._F; },
  use(F) { G._F = F; G.c = F.ctx; return G; },
  grid(step = 1, o = {}) {
    const F = G._F, c = G.c, b = F.bounds();
    const draw = (s, color, w) => {
      c.beginPath();
      for (let x = Math.ceil(b.x0 / s) * s; x <= b.x1; x += s) { const p = F.toS([x, 0]); c.moveTo(Math.round(p[0]) + 0.5, 0); c.lineTo(Math.round(p[0]) + 0.5, F.h); }
      for (let y = Math.ceil(b.y0 / s) * s; y <= b.y1; y += s) { const p = F.toS([0, y]); c.moveTo(0, Math.round(p[1]) + 0.5); c.lineTo(F.w, Math.round(p[1]) + 0.5); }
      c.strokeStyle = color; c.lineWidth = w; c.stroke();
    };
    if (o.minor !== false) draw(step / 2, "rgba(88,196,221,0.07)", 1);
    draw(step, o.color || PAL.grid, 1);
    if (o.axes !== false) {
      const p = F.toS([0, 0]);
      c.beginPath(); c.moveTo(0, p[1]); c.lineTo(F.w, p[1]); c.moveTo(p[0], 0); c.lineTo(p[0], F.h);
      c.strokeStyle = "rgba(236,239,244,0.55)"; c.lineWidth = 1.5; c.stroke();
    }
    return G;
  },
  // 변형된 격자: m = [a, b, c, d] (열 벡터 î=(a,c), ĵ=(b,d))
  gridM(m, n = 8, o = {}) {
    const c = G.c, F = G._F;
    const T = p => F.toS([m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]]);
    c.beginPath();
    for (let i = -n; i <= n; i++) {
      let a = T([i, -n]), b = T([i, n]); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
      a = T([-n, i]); b = T([n, i]); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
    }
    c.strokeStyle = o.color || "rgba(88,196,221,0.55)"; c.lineWidth = o.w || 1.2; c.stroke();
    return G;
  },
  line(a, b, color = "white", o = {}) {
    const c = G.c, F = G._F, p = F.toS(a), q = F.toS(b);
    c.save();
    c.globalAlpha = o.alpha ?? 1;
    c.setLineDash(o.dash || []);
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
    c.strokeStyle = col(color); c.lineWidth = o.w || 2; c.lineCap = "round"; c.stroke();
    c.restore();
    return G;
  },
  arrow(a, b, color = "yellow", o = {}) {
    G.arrowS(G._F.toS(a), G._F.toS(b), color, o);
    return G;
  },
  arrowS(p, q, color = "yellow", o = {}) {
    const c = G.c;
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
    if (L < 0.5) return G;
    const w = o.w || 3.5, head = Math.min(o.head || 14, L * 0.6), ux = dx / L, uy = dy / L;
    const bx = q[0] - ux * head, by = q[1] - uy * head;
    c.save();
    c.globalAlpha = o.alpha ?? 1;
    c.setLineDash(o.dash || []);
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(bx + ux, by + uy);
    c.strokeStyle = col(color); c.lineWidth = w; c.lineCap = "round"; c.stroke();
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(q[0], q[1]);
    c.lineTo(bx - uy * head * 0.45, by + ux * head * 0.45);
    c.lineTo(bx + uy * head * 0.45, by - ux * head * 0.45);
    c.closePath(); c.fillStyle = col(color); c.fill();
    c.restore();
    // 라벨: 화살촉 바로 앞, 진행 방향의 왼쪽
    if (o.label && o.mid) {
      // 가운데 라벨: 화살표 중간, 진행 방향의 왼쪽(o.mid < 0이면 오른쪽)
      const side = o.mid < 0 ? -1 : 1;
      G.texS(o.label, (p[0] + q[0]) / 2 + uy * 16 * side + (o.ldx || 0), (p[1] + q[1]) / 2 - ux * 16 * side + (o.ldy || 0), color, { size: o.lsize });
    } else if (o.label) G.texS(o.label, q[0] + ux * 14 + uy * 12 + (o.ldx || 0), q[1] + uy * 14 - ux * 12 + (o.ldy || 0), color, { size: o.lsize });
    return G;
  },
  dot(p, color = "white", r = 4.5) {
    const c = G.c, s = G._F.toS(p);
    c.beginPath(); c.arc(s[0], s[1], r, 0, TAU); c.fillStyle = col(color); c.fill();
    return G;
  },
  circle(ctr, r, color = "white", o = {}) {
    const c = G.c, F = G._F, s = F.toS(ctr);
    c.save(); c.globalAlpha = o.alpha ?? 1; c.setLineDash(o.dash || []);
    c.beginPath(); c.arc(s[0], s[1], r * F.unit, 0, TAU);
    if (o.fill) { c.fillStyle = col(o.fill); c.fill(); }
    if (o.w !== 0) { c.strokeStyle = col(color); c.lineWidth = o.w || 2; c.stroke(); }
    c.restore();
    return G;
  },
  // 각도는 수학 관례(반시계 +)
  arc(ctr, r, a0, a1, color = "blue", o = {}) {
    const c = G.c, F = G._F, s = F.toS(ctr);
    c.save(); c.globalAlpha = o.alpha ?? 1; c.setLineDash(o.dash || []);
    c.beginPath();
    if (o.fill) c.moveTo(s[0], s[1]);
    c.arc(s[0], s[1], o.px ? r : r * F.unit, -a0, -a1, a1 > a0);
    if (o.fill) { c.closePath(); c.fillStyle = col(o.fill); c.fill(); }
    if (o.w !== 0) { c.strokeStyle = col(color); c.lineWidth = o.w || 2.5; c.stroke(); }
    c.restore();
    return G;
  },
  poly(pts, o = {}) {
    const c = G.c, F = G._F;
    c.save(); c.globalAlpha = o.alpha ?? 1; c.setLineDash(o.dash || []);
    c.beginPath();
    pts.forEach((p, i) => { const s = F.toS(p); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); });
    if (o.close !== false) c.closePath();
    if (o.fill) { c.fillStyle = col(o.fill); c.fill(); }
    if (o.stroke) { c.strokeStyle = col(o.stroke); c.lineWidth = o.w || 2; c.lineJoin = "round"; c.stroke(); }
    c.restore();
    return G;
  },
  // 수식 느낌의 라벨(이탤릭 세리프)
  tex(str, p, color = "white", o = {}) {
    const s = G._F.toS(p);
    return G.texS(str, s[0] + (o.dx || 0), s[1] + (o.dy || 0), color, o);
  },
  texS(str, x, y, color = "white", o = {}) {
    const c = G.c;
    c.font = `${o.italic === false ? "" : "italic "}${o.bold ? "700 " : "500 "}${o.size || 19}px ${MATH_FONT}`;
    c.textAlign = o.align || "center"; c.textBaseline = o.base || "middle";
    if (o.halo !== false) { c.lineWidth = 4; c.strokeStyle = PAL.bg; c.strokeText(str, x, y); }
    c.fillStyle = col(color); c.fillText(str, x, y);
    return G;
  },
  // 일반 글자(한글 설명 라벨)
  text(str, p, color = "grey", o = {}) {
    const s = G._F.toS(p);
    return G.textS(str, s[0] + (o.dx || 0), s[1] + (o.dy || 0), color, o);
  },
  textS(str, x, y, color = "grey", o = {}) {
    const c = G.c;
    c.font = `${o.bold ? 700 : 500} ${o.size || 13}px ${UI_FONT}`;
    c.textAlign = o.align || "center"; c.textBaseline = o.base || "middle";
    if (o.halo !== false) { c.lineWidth = 4; c.strokeStyle = PAL.bg; c.strokeText(str, x, y); }
    c.fillStyle = col(color); c.fillText(str, x, y);
    return G;
  },
  // 픽셀 단위 그림: 저해상도 버퍼를 fn(월드 x, y) → [r, g, b, a(0~255)]로 채운 뒤 캔버스 크기로 늘립니다.
  // 영역 rect(월드)를 주면 그 안만 채웁니다. smooth=false면 픽셀이 또렷하게 보입니다.
  field(cols, fn, o = {}) {
    const F = G._F, c = G.c;
    const r = o.rect || { x0: F.bounds().x0, x1: F.bounds().x1, y0: F.bounds().y0, y1: F.bounds().y1 };
    const p0 = F.toS([r.x0, r.y1]), p1 = F.toS([r.x1, r.y0]);
    const wpx = p1[0] - p0[0], hpx = p1[1] - p0[1];
    const rows = o.rows || Math.max(1, Math.round(cols * hpx / wpx));
    const key = cols + "x" + rows;
    if (!F._field || F._field.key !== key) {
      const cv = document.createElement("canvas");
      cv.width = cols; cv.height = rows;
      F._field = { key, cv, ctx: cv.getContext("2d"), img: null };
      F._field.img = F._field.ctx.createImageData(cols, rows);
    }
    const fd = F._field, d = fd.img.data;
    for (let j = 0; j < rows; j++) {
      const y = lerp(r.y1, r.y0, (j + 0.5) / rows);
      for (let i = 0; i < cols; i++) {
        const x = lerp(r.x0, r.x1, (i + 0.5) / cols);
        const px = fn(x, y, i, j);
        const k = (j * cols + i) * 4;
        if (px) { d[k] = px[0]; d[k + 1] = px[1]; d[k + 2] = px[2]; d[k + 3] = px[3] ?? 255; }
        else d[k + 3] = 0;
      }
    }
    fd.ctx.putImageData(fd.img, 0, 0);
    c.save();
    c.imageSmoothingEnabled = o.smooth !== false;
    c.drawImage(fd.cv, p0[0], p0[1], wpx, hpx);
    c.restore();
    return G;
  },
  // 직각 표시
  rightAngle(at, d1, d2, size = 0.25, color = "grey") {
    const a = V.add(at, V.mul(V.norm(d1), size)), b = V.add(at, V.mul(V.norm(d2), size));
    return G.poly([a, V.add(a, V.mul(V.norm(d2), size)), b], { stroke: color, w: 1.5, close: false });
  }
};

/* ---------- 3D 카메라(궤도) ---------- */
function makeCam(F, o = {}) {
  const cam = { yaw: o.yaw ?? 0.6, pitch: o.pitch ?? 0.35, dist: o.dist ?? 9, fov: o.fov ?? 40, scale: o.scale ?? 1, ortho: 0 };
  cam.basis = () => {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const fwd = [-sy * cp, -sp, -cy * cp];          // 카메라 → 원점
    const right = [cy, 0, -sy];
    const up = V3.cross(right, fwd);
    return { fwd, right, up, pos: V3.mul(fwd, -cam.dist) };
  };
  // 반환: [sx, sy, 깊이]
  cam.project = p => {
    const b = cam.basis(), d = V3.sub(p, b.pos);
    const x = V3.dot(d, b.right), y = V3.dot(d, b.up), z = V3.dot(d, b.fwd);
    const f = 1 / Math.tan((cam.fov * DEG) / 2);
    const persp = f / Math.max(0.1, z), orth = f / cam.dist;
    const k = lerp(persp, orth, cam.ortho) * (F.h / 2) * cam.scale;
    return [F.w / 2 + x * k, F.h / 2 - y * k, z];
  };
  cam.orbit = () => {
    F.onPan = (dx, dy) => {
      cam.yaw -= dx * 0.01;
      cam.pitch = clamp(cam.pitch + dy * 0.01, -1.4, 1.4);
    };
  };
  cam.line = (a, b, color, o2 = {}) => {
    const c = F.ctx, p = cam.project(a), q = cam.project(b);
    c.save(); c.globalAlpha = o2.alpha ?? 1; c.setLineDash(o2.dash || []);
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
    c.strokeStyle = col(color); c.lineWidth = o2.w || 2; c.lineCap = "round"; c.stroke(); c.restore();
  };
  cam.arrow = (a, b, color, o2 = {}) => { G.arrowS(cam.project(a), cam.project(b), color, o2); };
  cam.poly = (pts, o2 = {}) => {
    const c = F.ctx;
    c.save(); c.globalAlpha = o2.alpha ?? 1;
    c.beginPath();
    pts.forEach((p, i) => { const s = cam.project(p); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); });
    c.closePath();
    if (o2.fill) { c.fillStyle = col(o2.fill); c.fill(); }
    if (o2.stroke) { c.strokeStyle = col(o2.stroke); c.lineWidth = o2.w || 1.5; c.stroke(); }
    c.restore();
  };
  cam.dot = (p, color, r = 4.5) => {
    const s = cam.project(p), c = F.ctx;
    c.beginPath(); c.arc(s[0], s[1], r, 0, TAU); c.fillStyle = col(color); c.fill();
  };
  cam.tex = (str, p, color, o2 = {}) => { const s = cam.project(p); G.texS(str, s[0] + (o2.dx || 0), s[1] + (o2.dy || 0), color, o2); };
  cam.floor = (n = 4, step = 1) => {
    for (let i = -n; i <= n; i += step) {
      cam.line([i, 0, -n], [i, 0, n], PAL.grid, { w: 1 });
      cam.line([-n, 0, i], [n, 0, i], PAL.grid, { w: 1 });
    }
  };
  return cam;
}

/* ---------- 그림 아래 조작부 ---------- */
function makeControls(el, F, sym) {
  const C = {};
  C.slider = o => {
    const row = document.createElement("label");
    row.className = "ctl-slider";
    row.innerHTML = `<span class="ctl-label">${fmtText(o.label, sym)}</span><input type="range"><output></output>`;
    const input = row.querySelector("input"), out = row.querySelector("output");
    input.min = o.min; input.max = o.max; input.step = o.step ?? 0.01; input.value = o.value;
    const show = () => { out.textContent = o.fmt ? o.fmt(+input.value) : num(+input.value, 2); };
    input.addEventListener("input", () => { F.touched = true; o.onInput(+input.value); show(); F.redraw(); });
    show();
    el.appendChild(row);
    return { set(v) { input.value = v; show(); }, get: () => +input.value, el: row };
  };
  C.seg = o => {
    const box = document.createElement("div");
    box.className = "ctl-seg";
    o.options.forEach(opt => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = fmtText(opt.label, sym);
      b.dataset.v = opt.value;
      b.addEventListener("click", () => {
        box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
        F.touched = true; o.onChange(opt.value); F.redraw();
      });
      if (opt.value === o.value) b.classList.add("on");
      box.appendChild(b);
    });
    el.appendChild(box);
    return box;
  };
  C.button = (label, fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "ctl-btn";
    b.innerHTML = fmtText(label, sym);
    b.addEventListener("click", () => { F.touched = true; fn(); F.redraw(); });
    el.appendChild(b);
    return b;
  };
  C.play = (startOn = false) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "ctl-btn ctl-play";
    b.addEventListener("click", () => { F.touched = true; F.play(); });
    el.prepend(b);
    F.playBtn = b;
    b.textContent = "▶ 재생";
    if (startOn) F.intro(() => F.play(true));
    return b;
  };
  return C;
}
