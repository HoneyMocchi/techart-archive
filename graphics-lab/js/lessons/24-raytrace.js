/* 24 레이 트레이싱 */
(() => {
  const f2 = n => num(n, 2);
  // 2D 광선-원 교차: [t0, t1] 또는 null
  function hitCircle2(o, d, c, r) {
    const oc = V.sub(o, c), b = V.dot(oc, d), cc = V.dot(oc, oc) - r * r, disc = b * b - cc;
    if (disc < 0) return { disc, t: null, b, cc };
    const s = Math.sqrt(disc);
    return { disc, t: [-b - s, -b + s], b, cc };
  }

  lesson({
    topic: "raytrace", title: "레이 트레이싱", desc: "픽셀마다 광선 쏘기", stage: "빛을 따라가는 렌더링",
    sym: { O: "white", d: "yellow", t: "teal", b: "orange", c: "pink", C: "pink", r: "gold", P: "white" },
    hook: "래스터화는 '삼각형이 어느 픽셀을 덮나'를 묻고, 레이 트레이싱은 반대로 =='이 픽셀에서 쏜 광선이 무엇에 맞나'==를 묻습니다. 반사·굴절·그림자가 자연스럽게 따라옵니다.",
    blocks: [
      { h: "광선과 구의 교차 = 2차 방정식" },
      "광선 $P(t) = O + t·d$ 가 원(3D에선 구)에 닿는 $t$를 구하면 2차 방정식이 됩니다. ==판별식이 음수면 빗나감, 0이면 스침, 양수면 두 점==에서 만납니다. 시작점·방향·원을 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["t = −b ± √(b^2 − c),   b = (O − C)·d,   c = |O − C|^2 − r^2", "판별식 b^2 − c = {disc}   →   {res}"],
        setup(F, C, L) {
          const O = [-3.3, -0.8], aim = [1.0, 0.3], Cc = [0.8, 0.2];
          F.vec(O, "white", { snap: 0.01 });
          F.vec(aim, "yellow", { base: () => O, constrain: q => V.mul(V.norm(q), 1), snap: 0.001 });
          F.vec(Cc, "pink", { snap: 0.01 });
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            const r = 1.1, d = V.norm(aim), h = hitCircle2(O, d, Cc, r);
            g.circle(Cc, r, "pink", { fill: "rgba(227,111,200,0.15)", w: 2 });
            const end = h.t && h.t[0] > 0 ? h.t[0] : 9;
            g.line(O, V.add(O, V.mul(d, 9)), "yellow", { w: 1.2, alpha: 0.35, dash: [5, 5] });
            g.arrow(O, V.add(O, V.mul(d, Math.min(end, 9))), "yellow", { w: 3 });
            if (h.t) h.t.forEach((t, i) => { if (t > 0) { g.dot(V.add(O, V.mul(d, t)), i ? "teal" : "orange", 6); g.tex(i ? "t₁" : "t₀", V.add(O, V.mul(d, t)), i ? "teal" : "orange", { dy: -16, size: 15 }); } });
            if (h.t && h.t[0] > 0) { const P = V.add(O, V.mul(d, h.t[0])), n = V.norm(V.sub(P, Cc)); g.arrow(P, V.add(P, V.mul(n, 0.7)), "yellow", { w: 2, head: 8 }); }
            L.set("disc", f2(h.disc)); L.set("res", h.disc < -0.001 ? "음수: 빗나감" : Math.abs(h.disc) < 0.02 ? "0: 스침" : h.t[1] < 0 ? "교차는 뒤쪽: 빗나감" : "양수: 두 점에서 만남 (가까운 t₀가 보이는 점)");
          };
        }
      } },

      { h: "맞은 곳에서 다시 쏘기: 반사" },
      "거울에 맞으면 반사 방향으로 광선을 ==한 번 더== 쏩니다. 튕김 횟수를 늘려 보세요. 레이 트레이싱의 반사가 '진짜'인 이유는 화면 밖에 있는 물체도 이렇게 찾아가 비추기 때문입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["d' = d − 2(d·N)N   ({n}번 튕김)"],
        setup(F, C, L) {
          const O = [-3.4, 1.3], aim = [1, -0.45];
          let bounces = 4;
          F.vec(O, "white", { snap: 0.01 });
          F.vec(aim, "yellow", { base: () => O, constrain: q => V.mul(V.norm(q), 1), snap: 0.001 });
          C.slider({ label: "튕김 횟수", min: 0, max: 12, step: 1, value: bounces, fmt: x => num(x, 0), onInput: x => { bounces = x; } });
          const balls = [[[-1, -0.6], 0.7], [[1.4, 0.7], 0.6], [[2.6, -1.1], 0.5], [[-2.2, -1.5], 0.35], [[0.3, 1.5], 0.3]];
          F.draw = g => {
            g.poly([[-3.9, -1.95], [3.9, -1.95], [3.9, 1.95], [-3.9, 1.95]], { stroke: "grey", w: 2 });
            balls.forEach(([c, r]) => g.circle(c, r, "purple", { fill: "rgba(177,137,198,0.25)", w: 2 }));
            let o = O.slice(), d = V.norm(aim), n = 0;
            for (let k = 0; k <= bounces; k++) {
              let best = Infinity, N = null;
              balls.forEach(([c, r]) => { const h = hitCircle2(o, d, c, r); if (h.t && h.t[0] > 1e-3 && h.t[0] < best) { best = h.t[0]; N = V.norm(V.sub(V.add(o, V.mul(d, best)), c)); } });
              [[0, -3.9, 1], [0, 3.9, -1], [1, -1.95, 1], [1, 1.95, -1]].forEach(([ax, v, s]) => { if (Math.abs(d[ax]) > 1e-9) { const t = (v - o[ax]) / d[ax]; if (t > 1e-3 && t < best) { best = t; N = ax ? [0, s] : [s, 0]; } } });
              if (!N) break;                                   // 상자 밖에서 쏘면 맞을 것이 없음
              const p = V.add(o, V.mul(d, best));
              g.line(o, p, "yellow", { w: 2.5, alpha: 1 - k / (bounces + 2) });
              g.dot(p, "orange", 4);
              d = V.sub(d, V.mul(N, 2 * V.dot(d, N))); o = p; n = k;
            }
            g.circle(O, 0.12, "white", { fill: PAL.bg, w: 2.5 });
            L.set("n", n);
          };
        }
      } },

      { h: "픽셀마다 광선: 작은 레이 트레이서" },
      "이제 화면의 픽셀마다 광선을 쏩니다. 맞은 점에서 ==빛 쪽으로 그림자 광선==을 쏘아 가려졌는지 보고, 거울 공이면 ==반사 광선==을 이어서 쏩니다. 해를 끌고 반사 깊이를 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["색 = 직접광 · (그림자 광선이 막히지 않으면 1) + 반사율 · trace(반사 광선)   (깊이 {k})"],
        setup(F, C, L) {
          let depth = 2;
          const sun = [1.2, 0.75];
          F.vec(sun, "gold", { snap: 0.01 });
          C.slider({ label: "반사 깊이", min: 0, max: 4, step: 1, value: depth, fmt: x => num(x, 0), onInput: x => { depth = x; } });
          const S = [{ c: [-0.75, 0, 3.2], r: 0.55, col: [0.9, 0.3, 0.25], m: 0.1 }, { c: [0.45, -0.05, 3.6], r: 0.5, col: [0.95, 0.95, 0.95], m: 0.85 }, { c: [1.2, -0.25, 2.6], r: 0.3, col: [0.3, 0.75, 0.85], m: 0.2 }];
          function hit(o, d) {
            let best = { t: Infinity };
            S.forEach(s => { const oc = V3.sub(o, s.c), b = V3.dot(oc, d), c = V3.dot(oc, oc) - s.r * s.r, disc = b * b - c; if (disc > 0) { const t = -b - Math.sqrt(disc); if (t > 1e-3 && t < best.t) best = { t, s }; } });
            if (d[1] < 0) { const t = (-0.55 - o[1]) / d[1]; if (t > 1e-3 && t < best.t) best = { t, floor: true }; }
            return best;
          }
          function trace(o, d, k, Ld) {
            const h = hit(o, d);
            if (!isFinite(h.t)) return [0.25 + d[1] * 0.3, 0.32 + d[1] * 0.35, 0.5 + d[1] * 0.4];
            const p = V3.add(o, V3.mul(d, h.t));
            const n = h.floor ? [0, 1, 0] : V3.norm(V3.sub(p, h.s.c));
            const base = h.floor ? ((Math.floor(p[0] * 2) + Math.floor(p[2] * 2)) % 2 ? [0.75, 0.75, 0.72] : [0.35, 0.36, 0.4]) : h.s.col;
            const m = h.floor ? 0.15 : h.s.m;
            const shadow = isFinite(hit(V3.add(p, V3.mul(n, 1e-3)), Ld).t) ? 0.15 : 1;
            const dif = Math.max(0, V3.dot(n, Ld)) * shadow;
            let col = base.map(c => c * (0.08 + 0.9 * dif));
            if (k > 0 && m > 0) { const r = V3.sub(d, V3.mul(n, 2 * V3.dot(d, n))); const rc = trace(V3.add(p, V3.mul(n, 1e-3)), r, k - 1, Ld); col = col.map((c, i) => lerp(c, rc[i], m)); }
            return col;
          }
          F.draw = g => {
            const Ld = V3.norm([sun[0], sun[1] + 0.3, -0.6]);
            g.field(200, (x, y) => {
              const d = V3.norm([x * 0.5, y * 0.5, 1]);
              const c = trace([0, 0.15, 0], d, depth, Ld);
              return [Math.pow(clamp(c[0], 0, 1), 1 / 2.2) * 255, Math.pow(clamp(c[1], 0, 1), 1 / 2.2) * 255, Math.pow(clamp(c[2], 0, 1), 1 / 2.2) * 255, 255];
            });
            g.circle(sun, 0.07, "gold", { fill: "gold", w: 0 });
            L.set("k", depth);
          };
        }
      } },
      { key: "레이 트레이싱의 비용은 ==광선 수 × 교차 검사 수==입니다. 장면의 삼각형 수백만 개를 하나씩 검사할 수는 없으니, 27장의 BVH 같은 공간 자료구조가 필수입니다." },

      { use: [
        ["엔진", "하드웨어 레이 트레이싱", "UE의 RT 반사·그림자·Lumen 하드웨어 모드가 이 장의 반사·그림자 광선을 RTX GPU의 전용 회로로 쏩니다."],
        ["게임", "스크린 스페이스의 한계", "화면에 보이는 것만 반사하는 SSR은 화면 밖 물체를 못 비춥니다. 레이 트레이싱 반사가 차이 나는 지점이 바로 여기입니다."],
        ["영상", "영화·애니메이션", "픽사·디즈니 장편과 VFX는 오래전부터 레이 트레이싱(경로 추적)으로 렌더합니다. 프레임당 몇 시간씩 걸리기도 합니다."],
        ["실생활", "건축·제품 시각화", "인테리어 시안, 자동차 컨피규레이터, 렌즈 설계 프로그램이 같은 광선 추적 원리를 씁니다."]
      ] },

      { recap: [
        ["P(t) = O + t·d", "광선"],
        ["t = −b ± √(b^2 − c)", "구와의 교차: 판별식으로 맞음/빗나감"],
        ["d' = d − 2(d·N)N", "반사 광선"],
        ["그림자 광선이 막히면 그림자", "섀도우 맵 없이 정확한 그림자"]
      ] }
    ]
  });
})();
