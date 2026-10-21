/* 62 SDF 심화: 부드러운 그림자 · 반복 공간 · 거리의 정직함 (이니고 킬레즈 기법) */
(() => {
  const f2 = n => num(n, 2);
  const sdCircle = (p, c, r) => Math.hypot(p[0] - c[0], p[1] - c[1]) - r;
  const sdBox = (p, c, b) => { const dx = Math.abs(p[0] - c[0]) - b[0], dy = Math.abs(p[1] - c[1]) - b[1]; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0); };
  function sdfColor(d, dim = 1) {
    const out = d > 0 ? [0.9, 0.6, 0.3] : [0.4, 0.7, 0.85];
    const k = (1 - Math.exp(-4 * Math.abs(d))) * (0.8 + 0.2 * Math.cos(60 * d));
    const e = clamp(1 - Math.abs(d) / 0.015, 0, 1);
    return out.map(v => lerp(v * k, 1, e) * 255 * dim).concat(255);
  }

  lesson({
    topic: "sdfadv", title: "SDF 심화: 그림자·반복·정직한 거리", desc: "거리 하나로 얻는 공짜 정보", stage: "그래픽스 연구 노트",
    sym: { h: "yellow", t: "teal", k: "orange", s: "pink", d: "yellow" },
    hook: "23장에서 SDF로 모양을 만들고 광선을 쏘았습니다. 이니고 킬레즈가 정리한 진짜 재미는 그다음입니다. 광선이 물체 ==옆을 얼마나 아슬아슬하게 지나갔는지==만 기억해도 부드러운 반그림자가 나오고, 좌표를 접으면 물체 하나로 무한히 반복됩니다. 대신 거리 함수가 '정직'하지 않으면 모든 게 무너집니다.",
    blocks: [
      { h: "부드러운 그림자: 아슬아슬함을 기록" },
      "바닥의 한 점에서 빛 쪽으로 광선을 행진시키며 ==가장 가까이 스친 비율 $h / t$== 의 최솟값을 기억합니다. 물체에 부딪히면 0(그림자), 멀찍이 지나가면 1(빛), 그 사이면 반그림자입니다. 광선을 더 쏘지 않고 한 번의 행진으로 얻는 근사입니다. 빛(노랑)과 조사점(흰색)을 끌어 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["그림자 = min(k · h / t)   ·   조사점 {res}"],
        setup(F, C, L) {
          const Lp = [1.4, 0.85], P = [-1.2, -0.6];
          let k = 8, better = 1;
          const lh = F.vec(Lp, "yellow", { snap: 0.01 }); F.vec(P, "white", { snap: 0.01 });
          let ck = "", cb = [];
          C.slider({ label: "선명도 $k$", min: 2, max: 32, step: 1, value: k, fmt: x => x, onInput: x => { k = x; } });
          C.seg({ options: [{ value: 0, label: "기본 k·h/t" }, { value: 1, label: "개선판(삼각측량)" }], value: better, onChange: x => { better = x; } });
          const scene = p => Math.min(sdCircle(p, [0.1, 0.05], 0.32), sdBox(p, [-0.6, 0.35], [0.22, 0.12]), sdBox(p, [0.75, -0.4], [0.1, 0.3]));
          const shadow = (p, track) => {
            const dx = Lp[0] - p[0], dy = Lp[1] - p[1], D = Math.hypot(dx, dy), ux = dx / D, uy = dy / D;
            let res = 1, t = 0.02, ph = 1e9, best = null;
            for (let i = 0; i < 48 && t < D; i++) {
              const q = [p[0] + ux * t, p[1] + uy * t], h = scene(q);
              if (track) track.push([q, h]);
              if (h < 0.001) return [0, q];
              let r;
              if (better) { const y = h * h / (2 * ph), d = Math.sqrt(Math.max(0, h * h - y * y)); r = k * d / Math.max(0.0001, t - y); }
              else r = k * h / t;
              if (r < res) { res = r; best = q; }
              ph = h; t += clamp(h, 0.01, 0.25);
            }
            return [clamp(res, 0, 1), best];
          };
          F.draw = g => {
            // 조사점만 움직일 때는 그림자 그림을 다시 계산하지 않음 (빛을 끄는 동안은 해상도를 낮춤)
            const cols = F.active === lh ? 80 : 130, key = [Lp[0], Lp[1], k, better, cols, F.w].join(), hit = key === ck;
            if (!hit) { ck = key; cb = []; }
            g.field(cols, (x, y, i, j) => {
              const id = j * 1000 + i;
              if (hit && cb[id]) return cb[id];
              const p = [x, y], d = scene(p);
              if (d < 0) return (cb[id] = [70, 90, 120, 255]);
              const s = shadow(p)[0], fall = 1 / (1 + 0.25 * ((x - Lp[0]) ** 2 + (y - Lp[1]) ** 2));
              const v = (0.08 + 0.92 * s * fall);
              return (cb[id] = [255 * v * 0.98, 255 * v * 0.86, 255 * v * 0.62, 255]);
            });
            const tr = [], r = shadow(P, tr);
            tr.forEach(([q, h]) => g.circle(q, Math.max(0, h), "white", { w: 1, alpha: 0.35 }));
            g.line(P, Lp, "yellow", { w: 1.2, dash: [5, 5], alpha: 0.7 });
            if (r[1]) g.dot(r[1], "orange", 5);
            L.set("res", f2(r[0]));
          };
        }
      } },
      { key: "주황 점이 ==가장 아슬아슬하게 스친 곳==입니다. 개선판(세바스티안 앨톤의 삼각측량)은 직전 걸음의 거리 원과 지금 원이 겹치는 곳에서 실제 최근접점을 추정해, 날카로운 모서리 근처의 띠무늬를 줄입니다." },

      { h: "반복 공간: 좌표를 접어 무한 복제" },
      "$q = p − s · round(p / s)$ 는 평면을 크기 $s$ 칸으로 접습니다. 물체 하나의 SDF로 무한히 많은 복제가 생기고 비용은 그대로입니다. 그런데 물체가 ==칸 중심에서 벗어나거나 칸보다 크면== 이웃 칸의 물체가 보이지 않아 거리가 틀립니다. 빨간 원은 '거리가 실제보다 크게 나온' 곳으로, 광선이 물체를 뚫고 지나갑니다.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["q = p − s · round(p / s)   ·   {mode}"],
        setup(F, C, L) {
          const off = [0.18, 0.1], P = [0.62, 0.4];
          let s = 0.8, r = 0.22, nb = 0;
          F.vec(off, "teal", { snap: 0.01, constrain: q => [clamp(q[0], -0.4, 0.4), clamp(q[1], -0.4, 0.4)] }); F.vec(P, "white", { snap: 0.01 });
          C.slider({ label: "반지름", min: 0.1, max: 0.5, value: r, onInput: x => { r = x; } });
          C.seg({ options: [{ value: 0, label: "자기 칸만" }, { value: 1, label: "이웃 칸까지 확인" }], value: nb, onChange: x => { nb = x; } });
          const naive = p => { const q = [p[0] - s * Math.round(p[0] / s), p[1] - s * Math.round(p[1] / s)]; return sdCircle(q, off, r); };
          const exact = p => {
            const ix = Math.round(p[0] / s), iy = Math.round(p[1] / s); let d = 1e9;
            for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) d = Math.min(d, sdCircle([p[0] - s * (ix + i), p[1] - s * (iy + j)], off, r));
            return d;
          };
          F.draw = g => {
            const fn = nb ? exact : naive;
            g.field(200, (x, y) => sdfColor(fn([x, y]), 0.85));
            for (let x = -2.4; x <= 2.4; x += s) g.line([x + s / 2, -1.2], [x + s / 2, 1.2], "white", { w: 1, alpha: 0.15 });
            for (let y = -1.6; y <= 1.6; y += s) g.line([-2.1, y + s / 2], [2.1, y + s / 2], "white", { w: 1, alpha: 0.15 });
            const d = fn(P), dt = exact(P), bad = d > dt + 0.01;
            g.circle(P, Math.max(0, d), bad ? "red" : "white", { w: 2, dash: [4, 4] });
            L.set("mode", bad ? `거리 ${f2(d)} > 실제 ${f2(dt)}  → 과대평가!` : `거리 ${f2(d)} (정확)`);
          };
        }
      } },

      { h: "정직한 거리: 기울기는 1을 넘지 않아야" },
      "구 추적은 '거리 $d$ 안에는 아무것도 없다'는 약속에 기댑니다. 표면에 물결을 더하는 식으로 SDF를 비틀면 ==기울기가 1보다 커져(립시츠 조건 위반)== 약속이 깨지고, 광선이 얇은 부분을 뚫고 지나갑니다. 걸음을 줄이면(완화 계수) 고쳐지지만 걸음 수가 늘어납니다.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["p ← p + {relax} · d(p)   ·   빗나간 광선 {miss} / 24   ·   평균 {steps}걸음"],
        setup(F, C, L) {
          let amp = 0.12, relax = 1;
          C.slider({ label: "물결 세기", min: 0, max: 0.25, value: amp, onInput: x => { amp = x; } });
          C.slider({ label: "완화 계수", min: 0.3, max: 1, value: relax, onInput: x => { relax = x; } });
          const sd = p => Math.hypot(p[0] - 0.4, p[1]) - 0.65 + amp * Math.sin(14 * p[0]) * Math.sin(14 * p[1]);
          F.draw = g => {
            g.field(160, (x, y) => sdfColor(sd([x, y]), 0.6));
            const O = [-1.85, 0];
            let miss = 0, tot = 0;
            for (let i = 0; i < 24; i++) {
              const a = (i / 23 - 0.5) * 0.9, dir = [Math.cos(a), Math.sin(a)];
              // 정답: 아주 잘게 걸어 처음 표면에 닿는 곳
              let tt = 0; while (tt < 4.2 && sd(V.add(O, V.mul(dir, tt))) > 0) tt += 0.004;
              let t = 0, n = 0;
              for (; n < 120 && t < 4.2; n++) { const d = sd(V.add(O, V.mul(dir, t))); if (Math.abs(d) < 0.002) break; t += relax * d; }
              tot += n;
              const ok = tt >= 4.2 ? t >= 4.2 : Math.abs(t - tt) < 0.03;
              if (!ok) miss++;
              const hit = V.add(O, V.mul(dir, Math.min(t, 4.2)));
              g.line(O, hit, ok ? "teal" : "red", { w: ok ? 1.2 : 2, alpha: ok ? 0.6 : 1 });
              if (t < 4.2) g.dot(hit, ok ? "teal" : "red", 3);
            }
            g.dot(O, "white", 5);
            L.set("relax", f2(relax)); L.set("miss", miss); L.set("steps", num(tot / 24, 0));
          };
        }
      } },
      { key: "SDF를 바꿀 때는 ==기울기의 최댓값으로 나눠== 정직하게 되돌리는 것이 원칙입니다(크기를 $s$배 키우면 거리에도 $s$를 곱하기). 정확한 SDF는 그림자·AO·외곽선까지 공짜로 주지만, 경계(bound)만 맞는 SDF는 레이마칭에만 쓸 수 있습니다." },

      { use: [
        ["셰이더", "Shadertoy 장면", "킬레즈의 'Rainforest', 'Selfie Girl' 같은 장면이 이 세 기법으로 그림자·반복·변형을 처리합니다. 원문 글 'soft shadows', 'domain repetition', 'distance functions'가 iquilezles.org에 있습니다."],
        ["엔진", "UE 거리장 그림자", "UE의 메시 거리장(Mesh Distance Field) 그림자와 AO가 이 장의 $k · h / t$ 방식으로 반그림자를 만듭니다. Lumen 소프트웨어 레이 트레이싱도 거리장을 행진합니다."],
        ["게임", "Dreams와 Claybook", "Media Molecule의 Dreams, Second Order의 Claybook은 장면 전체를 SDF로 모델링하고 렌더링합니다."],
        ["TA", "머티리얼 SDF 효과", "UI 아이콘, 데칼, 포스필드 같은 효과를 Custom 노드 SDF로 만들 때 반복·부드러운 그림자 식을 그대로 씁니다. 크기를 바꿀 때 거리도 같이 곱하는 것을 잊지 마세요."]
      ] },

      { recap: [
        ["min(k · h / t)", "광선 하나로 얻는 부드러운 그림자"],
        ["p − s · round(p / s)", "반복 공간: 이웃 칸 확인이 필요할 때가 있음"],
        ["|∇d| ≤ 1", "립시츠 조건: 어기면 광선이 뚫고 지나감"],
        ["완화 계수 < 1", "안전하지만 걸음 수 증가"]
      ] }
    ]
  });
})();
