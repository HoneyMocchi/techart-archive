/* 25 몬테카를로와 경로 추적 */
(() => {
  const f2 = n => num(n, 2);

  lesson({
    topic: "pathtrace", title: "몬테카를로와 경로 추적", desc: "무작위로 평균 내기", stage: "빛을 따라가는 렌더링",
    sym: { N: "gold", "π": "yellow", p: "teal", f: "yellow" },
    hook: "현실의 빛은 벽에 튕기고 또 튕깁니다(간접광). 모든 경로를 셀 수는 없으니 ==무작위로 몇 개만 골라 평균을 냅니다==. 샘플이 적으면 지글지글한 노이즈, 많을수록 정답에 가까워집니다.",
    blocks: [
      { h: "무작위로 넓이 재기" },
      "정사각형 안에 점을 무작위로 뿌리고 ==원 안에 떨어진 비율×4== 를 구하면 $π$ 가 나옵니다. 재생해서 점을 늘려 보세요. 오른쪽 그래프는 오차인데, ==점이 100배가 되어야 오차가 10배 줄어듭니다==($1/√N$).",
      { fig: {
        aspect: 0.5, view: { x0: -1.1, x1: 3.3, y0: -1.1, y1: 1.1 },
        eq: ["π ≈ 4 · (안에 든 점) / N = 4 · {in} / {n} = {est}   (오차 {err})"],
        setup(F, C, L) {
          let pts = [], inside = 0, hist = [], seed = 1;
          const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const add = k => { for (let i = 0; i < k; i++) { const p = [rnd() * 2 - 1, rnd() * 2 - 1]; const hit = p[0] * p[0] + p[1] * p[1] <= 1; if (hit) inside++; if (pts.length < 6000) pts.push([p, hit]); } hist.push([pts.length > 0 ? n() : 1, Math.abs(4 * inside / n() - Math.PI)]); };
          let count = 0; const n = () => count;
          const addN = k => { count += k; add(k); };
          C.play(true);
          C.button("↺ 처음부터", () => { pts = []; inside = 0; hist = []; count = 0; seed = 1 + Math.floor(Math.random() * 1000); });
          F.loop(() => { if (count < 200000) addN(count < 200 ? 2 : count < 2000 ? 20 : 400); });
          F.draw = g => {
            g.poly([[-1, -1], [1, -1], [1, 1], [-1, 1]], { stroke: "grey", w: 1.5 });
            g.circle([0, 0], 1, "yellow", { w: 2 });
            pts.forEach(([p, h]) => g.dot(p, h ? "yellow" : "rgba(138,147,166,0.6)", 1.6));
            // 오차 그래프 (로그-로그)
            const X = v => 1.3 + clamp(Math.log10(v) / 5.3, 0, 1) * 1.9, Y = e => -1 + clamp((Math.log10(e + 1e-6) + 4) / 4, 0, 1) * 2;
            g.poly([[1.3, -1], [3.2, -1], [3.2, 1], [1.3, 1]], { stroke: "rgba(236,239,244,0.2)", w: 1 });
            g.poly([[1.3, Y(1.7)], [3.2, Y(1.7 / Math.sqrt(Math.pow(10, 5.3)))]], { stroke: "teal", w: 1.5, dash: [4, 4], close: false });
            hist.forEach(([nn, e]) => g.dot([X(nn), Y(e)], "orange", 1.8));
            g.text("오차 (로그)", [1.3, 1], "grey", { align: "left", size: 10, dy: -8 }); g.text("N →", [3.2, -1], "grey", { align: "right", size: 10, dy: 10 });
            g.text("1/√N", [2.6, Y(1.7 / Math.sqrt(Math.pow(10, 3.4)))], "teal", { size: 11, dy: -10 });
            const est = count ? 4 * inside / count : 0;
            L.set("in", inside); L.set("n", count); L.set("est", num(est, 4)); L.set("err", num(Math.abs(est - Math.PI), 4));
          };
        }
      } },
      { key: "몬테카를로 적분은 ==차원이 아무리 높아도 같은 속도($1/√N$)로 수렴==합니다. 빛의 경로는 튕길 때마다 차원이 늘어나서, 이 방법 말고는 현실적인 답이 없습니다." },

      { h: "경로 추적: 튕기는 빛을 무작위로 따라가기" },
      "벽이 빨강·초록인 상자 방(코넬 박스)입니다. 픽셀마다 광선을 쏘고, 맞은 곳에서 ==무작위 방향으로 다시 튕겨== 천장 조명에 닿을 때까지 따라갑니다. 프레임마다 픽셀당 샘플 하나씩 더해 평균 냅니다. 흰 공 옆면에 ==벽의 빨강·초록이 번지는 것==(간접광)을 보세요.",
      { fig: {
        aspect: 0.62, view: { x0: -1, x1: 1, y0: -0.62, y1: 0.62 },
        eq: ["픽셀 색 = (1/N) Σ (경로 하나가 가져온 빛)   →   샘플 {spp}개 / 픽셀"],
        setup(F, C, L) {
          const RW = 96, RH = 60;
          let acc = new Float32Array(RW * RH * 3), spp = 0, maxB = 3;
          C.play(true);
          C.slider({ label: "최대 튕김", min: 1, max: 5, step: 1, value: maxB, fmt: x => num(x, 0), onInput: x => { maxB = x; acc.fill(0); spp = 0; } });
          C.button("↺ 다시", () => { acc.fill(0); spp = 0; });
          let seed = 7;
          const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
          const walls = [
            { n: [1, 0, 0], d: 1, col: [0.75, 0.15, 0.12] }, { n: [-1, 0, 0], d: 1, col: [0.15, 0.6, 0.18] },
            { n: [0, 1, 0], d: 1, col: [0.75, 0.75, 0.72] }, { n: [0, -1, 0], d: 1, col: [0.75, 0.75, 0.72] },
            { n: [0, 0, -1], d: 1, col: [0.75, 0.75, 0.72] }
          ];
          const balls = [{ c: [-0.4, -0.62, 0.25], r: 0.38, col: [0.85, 0.85, 0.85] }, { c: [0.45, -0.7, -0.2], r: 0.3, col: [0.85, 0.75, 0.4] }];
          function hit(o, d) {
            let best = { t: Infinity };
            walls.forEach(w => {
              const den = V3.dot(w.n, d);
              if (den < -1e-6) {
                const t = -(V3.dot(w.n, o) + w.d) / den, p = V3.add(o, V3.mul(d, t));
                if (t > 1e-4 && t < best.t && p[2] >= -1.001 && Math.abs(p[0]) <= 1.001 && Math.abs(p[1]) <= 1.001) best = { t, n: w.n, col: w.col };   // 방 안쪽 면만
              }
            });
            balls.forEach(b => { const oc = V3.sub(o, b.c), bb = V3.dot(oc, d), c = V3.dot(oc, oc) - b.r * b.r, disc = bb * bb - c; if (disc > 0) { const t = -bb - Math.sqrt(disc); if (t > 1e-4 && t < best.t) { const p = V3.add(o, V3.mul(d, t)); best = { t, n: V3.norm(V3.sub(p, b.c)), col: b.col }; } } });
            return best;
          }
          // 천장 조명: |x|, |z| < LS 인 사각형(y = 1). 맞은 곳마다 조명 위 한 점으로 그림자 광선을 쏘는 '직접광 샘플링'으로 수렴을 빠르게 합니다.
          const LS = 0.4, LE = 7, LA = (2 * LS) * (2 * LS);
          const onLight = p => p[1] > 0.999 && Math.abs(p[0]) < LS && Math.abs(p[2]) < LS;
          function radiance(o, d) {
            let thr = [1, 1, 1], L0 = [0, 0, 0];
            for (let b = 0; b <= maxB; b++) {
              const h = hit(o, d);
              if (!isFinite(h.t)) break;
              const p = V3.add(o, V3.mul(d, h.t));
              if (onLight(p)) { if (b === 0) L0 = L0.map(v => v + LE); break; }   // 직접 본 조명만 더함(나머지는 직접광 샘플링이 담당)
              thr = thr.map((v, i) => v * h.col[i]);
              const n = h.n, q = V3.add(p, V3.mul(n, 1e-3));
              // 직접광: 조명 위 무작위 점
              const lp = [(rnd() * 2 - 1) * LS, 0.999, (rnd() * 2 - 1) * LS], ld = V3.sub(lp, q), dist2 = V3.dot(ld, ld), ldn = V3.mul(ld, 1 / Math.sqrt(dist2));
              const cos1 = V3.dot(n, ldn), cos2 = ldn[1];
              if (cos1 > 0 && cos2 > 0) { const sh = hit(q, ldn); if (sh.t * sh.t >= dist2 - 1e-3) { const k = LE * cos1 * cos2 * LA / (Math.PI * dist2); L0 = L0.map((v, i) => v + thr[i] * k); } }
              // 다음 튕김: 코사인 가중 반구 샘플
              const u1 = rnd(), u2 = rnd(), r = Math.sqrt(u1), phi = TAU * u2;
              const a = Math.abs(n[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0], tt = V3.norm(V3.cross(a, n)), bt = V3.cross(n, tt);
              d = V3.norm(V3.add(V3.add(V3.mul(tt, r * Math.cos(phi)), V3.mul(bt, r * Math.sin(phi))), V3.mul(n, Math.sqrt(1 - u1))));
              o = q;
            }
            return L0;
          }
          F.loop(() => {
            if (spp >= 2000) return;
            for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) {
              const x = (i + rnd()) / RW * 2 - 1, y = 1 - (j + rnd()) / RH * 2;
              const d = V3.norm([x * 0.8, y * 0.8 * RH / RW, 1]);
              const c = radiance([0, 0, -2.6], d), k = (j * RW + i) * 3;
              acc[k] += c[0]; acc[k + 1] += c[1]; acc[k + 2] += c[2];
            }
            spp++;
          });
          F.draw = g => {
            const n = Math.max(1, spp);
            g.field(RW, (x, y, i, j) => {
              const k = (j * RW + i) * 3, tm = v => Math.pow(clamp((v / n) / (1 + v / n), 0, 1), 1 / 2.2) * 255;
              return [tm(acc[k]), tm(acc[k + 1]), tm(acc[k + 2]), 255];
            }, { rows: RH, smooth: spp > 8 });
            L.set("spp", spp);
          };
        }
      } },
      "처음 몇 샘플은 점이 흩뿌려진 듯 지글거리다가, 수십·수백 샘플이 쌓이면 부드러워집니다. 실시간 게임은 픽셀당 1~2 샘플밖에 못 쏘므로 ==AI·시간 누적 디노이저==로 나머지를 메웁니다.",

      { h: "중요도 샘플링: 중요한 곳을 더 자주" },
      "뾰족한 함수의 넓이(노란 곡선 아래)를 무작위로 잽니다. 고르게 뽑으면(주황) 대부분이 거의 0인 곳에 떨어져 낭비됩니다. ==함수 모양을 닮은 분포로 뽑고 그 확률로 나누면==(청록) 같은 샘플 수로 훨씬 빨리 정답에 붙습니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["추정값 = (1/N) Σ f(x_i) / p(x_i)   — 정답 {truth}: 고르게 {u}, 중요도 {im}"],
        setup(F, C, L) {
          const f = x => Math.exp(-Math.pow((x - 0.7) / 0.05, 2)) * 3 + 0.1;   // 0~1에서 뾰족
          const truth = 0.1 + 3 * 0.05 * Math.sqrt(Math.PI) * 0.5 * (erf((1 - 0.7) / 0.05) + erf(0.7 / 0.05));
          function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
          let su = 0, si = 0, n = 0, hu = [], hi = [], seed = 5, lastU = [], lastI = [];
          const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const gaussS = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
          const sig = 0.07;
          const pdfI = x => 0.6 * Math.exp(-Math.pow((x - 0.7) / sig, 2) / 2) / (sig * Math.sqrt(TAU)) + 0.4;   // 섞은 분포(뾰족 + 균등)
          C.play(true);
          C.button("↺ 처음부터", () => { su = si = n = 0; hu = []; hi = []; });
          F.loop(() => {
            if (n > 4000) return;
            for (let k = 0; k < 4; k++) {
              const xu = rnd(); su += f(xu); lastU.push(xu);
              let xi = rnd() < 0.6 ? 0.7 + gaussS() * sig : rnd();
              if (xi < 0 || xi > 1) xi = rnd();
              si += f(xi) / pdfI(xi); lastI.push(xi);
              n++;
            }
            if (lastU.length > 60) { lastU = lastU.slice(-60); lastI = lastI.slice(-60); }
            hu.push(su / n); hi.push(si / n);
          });
          F.draw = g => {
            const X = x => 0.3 + x * 4.2, Yf = y => 0.3 + y * 1.1;
            const pts = []; for (let k = 0; k <= 200; k++) { const x = k / 200; pts.push([X(x), Yf(f(x))]); }
            g.poly(pts.concat([[X(1), Yf(0)], [X(0), Yf(0)]]), { fill: "rgba(244,211,69,0.15)", stroke: "yellow", w: 2 });
            lastU.forEach(x => g.dot([X(x), 0.2], "orange", 3)); lastI.forEach(x => g.dot([X(x), 0.08], "teal", 3));
            // 오른쪽: 추정값 수렴
            const GX = k => 5 + k / Math.max(1, hu.length) * 4.7, GY = v => 2.1 + (v - truth) * 1.6;
            g.line([5, GY(truth)], [9.7, GY(truth)], "white", { w: 1.5, dash: [4, 4] });
            if (hu.length > 1) {
              g.poly(hu.map((v, k) => [GX(k), clamp(GY(v), 0.1, 4.1)]), { stroke: "orange", w: 2, close: false });
              g.poly(hi.map((v, k) => [GX(k), clamp(GY(v), 0.1, 4.1)]), { stroke: "teal", w: 2.5, close: false });
            }
            g.text("정답", [9.7, GY(truth)], "white", { size: 11, align: "right", dy: -9 });
            L.set("truth", num(truth, 3)); L.set("u", n ? num(su / n, 3) : "—"); L.set("im", n ? num(si / n, 3) : "—");
          };
        }
      } },
      "렌더러는 이 원리로 ==빛 쪽, 반사가 강한 방향 쪽을 더 자주 쏩니다==. 매끈한 금속은 반사 방향 근처만, 확산면은 $cos$ 모양으로(위 코넬 박스가 그렇게 합니다) 뽑습니다.",

      { use: [
        ["엔진", "패스 트레이서와 Lumen", "UE의 Path Tracer 뷰 모드는 이 장의 방법으로 기준(정답) 이미지를 만듭니다. Lumen은 같은 간접광을 실시간으로 근사합니다."],
        ["게임", "디노이저", "RTX 게임의 실시간 경로 추적은 픽셀당 1샘플 수준이라 DLSS Ray Reconstruction 같은 디노이저가 노이즈를 지웁니다."],
        ["아트", "라이트맵 굽기", "GPU Lightmass 같은 라이트맵 베이커가 오프라인으로 수천 샘플을 쏴 간접광을 텍스처에 굽습니다."],
        ["실생활", "금융·물리 시뮬레이션", "몬테카를로는 주가 위험 계산, 방사선 치료 계획, 날씨 예측 앙상블에도 쓰이는 범용 계산법입니다."]
      ] },

      { recap: [
        ["(1/N) Σ f(x_i)", "몬테카를로 적분, 오차 ∝ 1/√N"],
        ["경로 추적", "무작위로 튕기며 빛을 찾아 평균"],
        ["(1/N) Σ f(x_i) / p(x_i)", "중요도 샘플링: 닮은 분포로 뽑고 확률로 나눔"],
        ["샘플 부족 = 노이즈", "실시간은 디노이저로 보완"]
      ] }
    ]
  });
})();
