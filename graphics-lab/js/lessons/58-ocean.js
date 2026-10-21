/* 58 게르스트너 바다 */
(() => {
  const f2 = n => num(n, 2);
  const srgb = v => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
  // 파도 목록: [방향각, 파장, 진폭, 가파름]
  function makeWaves(n, wind, steep) {
    const W = [];
    for (let i = 0; i < n; i++) {
      const a = wind + (((i * 7919) % 13) / 13 - 0.5) * 1.6, L = 9 / Math.pow(1.45, i), A = L * 0.035;
      W.push({ d: [Math.cos(a), Math.sin(a)], k: TAU / L, A, w: Math.sqrt(9.8 * TAU / L), Q: steep / (n * 0.6) });
    }
    return W;
  }
  // 게르스트너: 수평 변위 + 높이, 그리고 해석적 노멀과 야코비안
  function gerstner(W, x, z, t) {
    let dx = 0, dz = 0, h = 0, nx = 0, nz = 0, ny = 1, jxx = 1, jzz = 1, jxz = 0;
    W.forEach(w => {
      const ph = w.k * (w.d[0] * x + w.d[1] * z) - w.w * t, c = Math.cos(ph), s = Math.sin(ph), QA = w.Q * w.A, WA = w.k * w.A;
      dx += QA * w.d[0] * c; dz += QA * w.d[1] * c; h += w.A * s;
      nx -= w.d[0] * WA * c; nz -= w.d[1] * WA * c; ny -= w.Q * WA * s;
      jxx -= w.Q * WA * w.d[0] * w.d[0] * s; jzz -= w.Q * WA * w.d[1] * w.d[1] * s; jxz -= w.Q * WA * w.d[0] * w.d[1] * s;
    });
    return { p: [x + dx, h, z + dz], n: V3.norm([nx, ny, nz]), J: jxx * jzz - jxz * jxz };
  }

  lesson({
    topic: "ocean", title: "게르스트너 바다", desc: "파도 여러 개를 더하기", stage: "고급 효과 제작",
    sym: { Q: "pink", A: "gold", k: "orange", "ω": "teal", d: "yellow", J: "purple" },
    hook: "25장의 게르스트너 파도 하나는 너무 규칙적입니다. 바다는 ==방향·파장이 다른 파도 여러 개의 합==입니다. 여기에 해석적으로 구한 노멀, 프레넬 반사, 마루에 생기는 거품까지 더하면 실시간 바다가 됩니다.",
    blocks: [
      { h: "파도를 겹치면 바다가 된다" },
      "위에서 내려다본 높이입니다(밝을수록 높음). 파도 개수를 늘려 보세요. ==파장이 짧을수록 진폭도 작게== 주면 큰 너울 위에 잔물결이 얹힙니다. 바람 방향을 돌리면 파도 방향들이 함께 돕니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 40, y0: 0, y1: 20 },
        eq: ["높이 = Σ A_i · sin(k_i · (d_i · p) − ω_i t),   ω = √(g · k)   (파도 {n}개)"],
        setup(F, C, L) {
          let n = 5, wind = 0.4, steep = 0.6;
          C.play(true);
          C.slider({ label: "파도 개수", min: 1, max: 12, step: 1, value: n, fmt: x => num(x, 0), onInput: x => { n = x; } });
          C.slider({ label: "바람 방향", min: -3.14, max: 3.14, value: wind, fmt: x => num(x / DEG, 0) + "°", onInput: x => { wind = x; } });
          F.loop(() => {});
          F.draw = g => {
            const W = makeWaves(n, wind, steep), t = F.t;
            g.field(F.playing ? 140 : 200, (x, y) => { const r = gerstner(W, x, y, t), v = clamp(0.5 + r.p[1] * 1.2, 0, 1); return [lerp(10, 120, v), lerp(40, 190, v), lerp(80, 230, v), 255]; });
            g.arrow([3, 3], [3 + Math.cos(wind) * 4, 3 + Math.sin(wind) * 4], "white", { w: 2.5, label: "바람" });
            L.set("n", n);
          };
        }
      } },
      "파도 속도가 $ω = √(g·k)$ 인 것(분산 관계)이 중요합니다. ==긴 파도가 빨리 가고 짧은 파도가 느리게== 가야 실제 바다처럼 보입니다. 모든 파도를 같은 속도로 움직이면 무늬가 통째로 미끄러집니다.",

      { h: "노멀과 거품: 미분을 식으로" },
      "게르스트너는 식이 정해져 있어 ==노멀을 해석적으로== 구할 수 있습니다. 그리고 수평으로 점들이 모이는 정도(야코비안 $J$)가 0 근처로 떨어지는 곳 — 파도가 접히는 마루 — 에 거품을 칠합니다. 가파름을 올려 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 20, y0: -2.4, y1: 2.4 },
        eq: ["J = (∂x'/∂x)(∂z'/∂z) − (∂x'/∂z)^2   ·   J < {thr} 이면 거품   ·   최소 J = {jm}"],
        setup(F, C, L) {
          let steep = 0.9, thr = 0.35;
          C.play(true);
          C.slider({ label: "가파름 Q", min: 0, max: 1.4, value: steep, onInput: x => { steep = x; } });
          C.slider({ label: "거품 문턱", min: 0, max: 0.8, value: thr, onInput: x => { thr = x; } });
          F.loop(() => {});
          F.draw = g => {
            const W = makeWaves(3, 0, steep).map(w => ({ ...w, d: [1, 0] })), t = F.t;
            const pts = [], foam = [];
            let jm = 9;
            for (let x = -2; x <= 22; x += 0.05) { const r = gerstner(W, x, 0, t); pts.push([r.p[0], r.p[1] * 6]); jm = Math.min(jm, r.J); if (r.J < thr) foam.push([r.p[0], r.p[1] * 6]); }
            g.poly(pts.concat([[22, -2.4], [-2, -2.4]]), { fill: "rgba(30,90,140,0.7)", stroke: "blue", w: 2 });
            foam.forEach(p => g.dot(p, "white", 3));
            for (let x = 0.5; x < 20; x += 1.5) { const r = gerstner(W, x, 0, t), p = [r.p[0], r.p[1] * 6], nn = V.norm([r.n[0], r.n[1] * 0.2 + r.n[1] * 0.8]); g.arrow(p, V.add(p, V.mul(V.norm([r.n[0] * 6, r.n[1]]), 0.9)), "yellow", { w: 1.5, head: 6 }); void nn; }
            L.set("thr", f2(thr)); L.set("jm", f2(jm));
          };
        }
      } },

      { h: "바다 셰이딩: 프레넬 + 바닷속 색 + 거품" },
      "같은 파도로 바다를 그립니다. 멀리 비스듬한 곳은 ==프레넬(16장)로 하늘이 비치고==, 가까이 정면은 ==물속 색==이 보입니다. 해 방향으로는 반사 하이라이트, 마루에는 거품이 얹힙니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["색 = lerp(물속 색, 하늘 반사, F) + 해 하이라이트 + 거품(J)"],
        setup(F, C, L) {
          let steep = 0.7, sunAz = 0.2, n = 6;
          C.play(true);
          C.slider({ label: "가파름", min: 0, max: 1.3, value: steep, onInput: x => { steep = x; } });
          C.slider({ label: "해 방향", min: -1, max: 1, value: sunAz, onInput: x => { sunAz = x; } });
          F.loop(() => {});
          F.draw = g => {
            const W = makeWaves(n, 1.4, steep), t = F.t, Ld = V3.norm([Math.sin(sunAz), 0.25, Math.cos(sunAz)]);
            g.field(F.playing ? 120 : 220, (x, y) => {
              const rd = V3.norm([x * 0.6, y * 0.6 - 0.25, 1]);
              if (rd[1] >= -0.005) { const s = Math.pow(Math.max(0, V3.dot(rd, Ld)), 200) * 4; return [srgb(0.45 + s), srgb(0.62 + s), srgb(0.9 + s * 0.8), 255]; }
              const tt = 2.2 / -rd[1], px = rd[0] * tt, pz = rd[2] * tt;
              const r = gerstner(W, px, pz, t), nN = r.n, cosv = Math.max(0, -V3.dot(rd, nN));
              const Fr = 0.02 + 0.98 * Math.pow(1 - cosv, 5);
              const refl = V3.sub(rd, V3.mul(nN, 2 * V3.dot(rd, nN)));
              const sky = [0.45 + 0.3 * Math.max(0, refl[1]), 0.6 + 0.25 * Math.max(0, refl[1]), 0.9], deep = [0.02, 0.12, 0.18], sss = [0.05, 0.35, 0.35];
              const water = deep.map((c, i) => c + sss[i] * Math.max(0, r.p[1] * 2.5));
              const spec = Math.pow(Math.max(0, V3.dot(refl, Ld)), 300) * 6;
              const foam = clamp((0.4 - r.J) * 3, 0, 1);
              const fog = clamp(tt / 120, 0, 1);
              const c = water.map((w, i) => lerp(lerp(w, sky[i], Fr) + spec, 0.9, foam));
              return c.map((v, i) => srgb(lerp(v, [0.6, 0.72, 0.9][i], fog))).concat(255);
            });
          };
        }
      } },
      { key: "실시간 바다는 보통 ==큰 파도는 게르스트너 몇 개, 잔물결은 노멀 맵이나 FFT(스펙트럼) 시뮬레이션==으로 나눕니다. 게르스트너는 식이 단순해 CPU에서도 같은 높이를 계산할 수 있어 배가 파도를 타는 물리와 맞추기 쉽습니다." },

      { use: [
        ["엔진", "Water 플러그인", "UE Water 시스템의 Gerstner Wave 에셋이 이 장의 파도 목록(방향·파장·진폭·가파름)이고, 버퍼에 담아 WPO와 물리 부력에 같이 씁니다."],
        ["게임", "항해와 해전", "배의 흔들림·부력을 계산하려면 CPU에서도 같은 높이가 필요합니다. 게르스트너는 식이 짧아 CPU·GPU가 같은 답을 내기 쉽습니다."],
        ["TA", "FFT 바다와 조합", "AAA 바다는 FFT(필립스·JONSWAP 스펙트럼)로 수천 개 파도를 합성하고, 해안선·배 주변은 게르스트너·플로우맵으로 손봅니다."],
        ["실생활", "실제 파도의 원운동", "물 입자는 파도를 따라 앞으로 흘러가지 않고 제자리에서 원을 그립니다. 수영할 때 파도 위에서 위아래로만 흔들리는 이유입니다."]
      ] },

      { recap: [
        ["Σ 게르스트너 파도", "방향·파장·진폭이 다른 파도의 합"],
        ["ω = √(g·k)", "분산 관계: 긴 파도가 빠름"],
        ["해석적 노멀 · 야코비안 J", "J가 작은 마루 = 거품"],
        ["lerp(물속, 하늘, 프레넬)", "바다 셰이딩의 기본"]
      ] }
    ]
  });
})();
