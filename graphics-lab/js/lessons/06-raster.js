/* 06 래스터화와 보간 */
(() => {
  const f2 = n => num(n, 2);
  const edge = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  // 무게중심 좌표 [α, β, γ] (A, B, C 순)
  function bary(A, B, C, p) {
    const area = edge(A, B, C) || 1e-9;
    return [edge(B, C, p) / area, edge(C, A, p) / area, edge(A, B, p) / area];
  }
  const RA = rgb("red"), GB = rgb("green"), BC = rgb("blue");
  const mix3 = (w, a = 255) => [w[0] * RA[0] + w[1] * GB[0] + w[2] * BC[0], w[0] * RA[1] + w[1] * GB[1] + w[2] * BC[1], w[0] * RA[2] + w[1] * GB[2] + w[2] * BC[2], a];
  function triHandles(F, A, B, C) {
    F.vec(A, "red", { snap: 0.02 }); F.vec(B, "green", { snap: 0.02 }); F.vec(C, "blue", { snap: 0.02 });
  }
  function labelABC(g, A, B, C) {
    const ctr = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    [[A, "A", "red"], [B, "B", "green"], [C, "C", "blue"]].forEach(([p, s, c]) => {
      const d = V.norm(V.sub(p, ctr));
      g.tex(s, p, c, { dx: d[0] * 20, dy: -d[1] * 20 });
    });
  }

  lesson({
    topic: "raster", title: "래스터화와 보간", desc: "삼각형 → 픽셀", stage: "3D에서 화면으로",
    sym: { A: "red", B: "green", C: "blue", "α": "red", "β": "green", "γ": "blue", P: "white", E: "yellow", w: "teal", u: "pink" },
    hook: "화면은 격자이고 삼각형은 매끈합니다. 래스터화는 ==각 픽셀의 중심이 삼각형 안에 있는가?== 라는 질문을 수백만 번 하는 일입니다.",
    blocks: [
      { h: "픽셀 중심이 안에 있으면 칠한다" },
      "꼭짓점을 끌고 해상도를 바꿔 보세요. 칠해지는 것은 ==중심점(작은 점)이 삼각형 안에 들어온 픽셀==뿐입니다. 해상도가 낮을수록 가장자리가 계단처럼 보입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["칠해진 픽셀 {n} 개   /   전체 {all} 개"],
        setup(F, C, L) {
          const A = [-2.6, -1.6], B = [2.8, -0.9], Cc = [-0.3, 1.9];
          let res = 22, smoothColor = false;
          triHandles(F, A, B, Cc);
          C.slider({ label: "가로 픽셀 수", min: 6, max: 60, step: 1, value: res, fmt: x => num(x, 0), onInput: x => { res = x; } });
          C.seg({ options: [{ value: 0, label: "한 색" }, { value: 1, label: "꼭짓점 색 보간" }], value: 0, onChange: x => { smoothColor = !!x; } });
          F.draw = g => {
            const b = F.bounds(), px = (b.x1 - b.x0) / res, rows = Math.round((b.y1 - b.y0) / px);
            let n = 0;
            g.field(res, (x, y) => {
              const w = bary(A, B, Cc, [x, y]);
              if (w[0] < 0 || w[1] < 0 || w[2] < 0) return null;
              n++;
              return smoothColor ? mix3(w) : [92, 208, 179, 255];
            }, { smooth: false, rows });
            const c = G.c;
            c.beginPath();
            for (let i = 0; i <= res; i++) { const p = F.toS([b.x0 + i * px, 0]); c.moveTo(Math.round(p[0]) + 0.5, 0); c.lineTo(Math.round(p[0]) + 0.5, F.h); }
            for (let j = 0; j <= rows; j++) { const y = F.h * j / rows; c.moveTo(0, Math.round(y) + 0.5); c.lineTo(F.w, Math.round(y) + 0.5); }
            c.strokeStyle = "rgba(236,239,244,0.12)"; c.lineWidth = 1; c.stroke();
            if (res <= 32) {
              const ph = (b.y1 - b.y0) / rows;
              for (let i = 0; i < res; i++) for (let j = 0; j < rows; j++) g.dot([b.x0 + (i + 0.5) * px, b.y1 - (j + 0.5) * ph], "rgba(236,239,244,0.35)", 1.6);
            }
            g.poly([A, B, Cc], { stroke: "white", w: 2 });
            labelABC(g, A, B, Cc);
            L.set("n", n); L.set("all", res * rows);
          };
        }
      } },

      { h: "안쪽 판정: 엣지 함수" },
      "'안에 있다'는 것을 어떻게 계산할까요? 3장의 2D 외적이 답입니다. 변 $A → B$에 대해 점 $P$가 ==왼쪽이면 양수, 오른쪽이면 음수==. 배경색이 그 부호이고, 진하기는 값의 크기입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["E_AB(P) = (B − A) × (P − A) = {e1}", "{all3}"],
        setup(F, C, L) {
          const A = [-2.4, -1.3], B = [2.4, -0.8], Cc = [0, 1.7], P = [0.4, 0.2];
          let three = false;
          triHandles(F, A, B, Cc);
          F.vec(P, "white", { snap: 0.02 });
          C.seg({ options: [{ value: 0, label: "변 하나" }, { value: 1, label: "변 셋 모두" }], value: 0, onChange: x => { three = !!x; } });
          const POS = rgb("teal"), NEG = rgb("pink");
          F.draw = g => {
            g.field(200, (x, y) => {
              const p = [x, y];
              if (!three) {
                const e = edge(A, B, p), base = e >= 0 ? POS : NEG;
                return [base[0], base[1], base[2], 25 + Math.min(Math.abs(e) * 9, 110)];   // 진할수록 |E|가 큼
              }
              const w = [edge(B, Cc, p), edge(Cc, A, p), edge(A, B, p)];
              const inside = w.every(v => v >= 0), cnt = w.filter(v => v >= 0).length;
              return inside ? [POS[0], POS[1], POS[2], 110] : [NEG[0], NEG[1], NEG[2], 18 * (3 - cnt) + 10];
            });
            g.grid(1, { minor: false, axes: false, color: "rgba(88,196,221,0.08)" });
            const dir = V.norm(V.sub(B, A));
            g.line(V.sub(A, V.mul(dir, 10)), V.add(A, V.mul(dir, 10)), "white", { w: 1, alpha: 0.35, dash: [5, 5] });
            if (three) {
              [[B, Cc], [Cc, A]].forEach(([p, q]) => { const d = V.norm(V.sub(q, p)); g.line(V.sub(p, V.mul(d, 10)), V.add(p, V.mul(d, 10)), "white", { w: 1, alpha: 0.35, dash: [5, 5] }); });
              g.poly([A, B, Cc], { stroke: "white", w: 2 });
            }
            g.arrow(A, B, "yellow", { w: 3.5 });
            g.line(A, P, "white", { w: 1.5, dash: [4, 4], alpha: 0.7 });
            labelABC(g, A, B, Cc);
            g.tex("P", P, "white", { dx: 14, dy: -12 });
            const e1 = edge(A, B, P), e2 = edge(B, Cc, P), e3 = edge(Cc, A, P);
            L.set("e1", f2(e1) + (e1 >= 0 ? "  (왼쪽)" : "  (오른쪽)"));
            L.set("all3", three ? `$E_BC = ${f2(e2)}$,  $E_CA = ${f2(e3)}$  →  ${e1 >= 0 && e2 >= 0 && e3 >= 0 ? "셋 다 양수: 안" : "하나라도 음수: 밖"}` : "변 셋에 모두 왼쪽이면 삼각형 안");
          };
        }
      } },
      { key: "점이 ==세 변 모두의 왼쪽(엣지 함수 셋이 모두 양수)==이면 삼각형 안입니다. 곱셈 몇 번으로 끝나고 픽셀마다 독립이라 GPU가 수천 개를 동시에 계산합니다." },

      { h: "무게중심 좌표: 세 꼭짓점의 섞는 비율" },
      "엣지 함수 값을 전체 넓이로 나누면 ==세 개의 비율 $α, β, γ$== 가 나옵니다. 각각 $P$ 맞은편 작은 삼각형의 넓이 비율이고, 합은 언제나 1입니다. $P$를 꼭짓점 가까이 끌어 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["P = α·A + β·B + γ·C", "α = {a},   β = {b},   γ = {c}   (합 = {sum})"],
        setup(F, C, L) {
          const A = [-2.8, -1.6], B = [2.8, -1.4], Cc = [0, 1.9], P = [-0.2, -0.2];
          let showColor = true;
          triHandles(F, A, B, Cc);
          F.vec(P, "white", { snap: 0.02 });
          C.seg({ options: [{ value: 1, label: "색 보간 보기" }, { value: 0, label: "넓이만" }], value: 1, onChange: x => { showColor = !!x; } });
          F.draw = g => {
            g.grid(1, { minor: false, axes: false, color: "rgba(88,196,221,0.08)" });
            if (showColor) g.field(160, (x, y) => { const w = bary(A, B, Cc, [x, y]); return w[0] >= 0 && w[1] >= 0 && w[2] >= 0 ? mix3(w, 200) : null; });
            const w = bary(A, B, Cc, P);
            g.poly([P, B, Cc], { fill: hexA(PAL.red, 0.22), stroke: hexA(PAL.red, 0.9), w: 1.5 });
            g.poly([P, Cc, A], { fill: hexA(PAL.green, 0.22), stroke: hexA(PAL.green, 0.9), w: 1.5 });
            g.poly([P, A, B], { fill: hexA(PAL.blue, 0.22), stroke: hexA(PAL.blue, 0.9), w: 1.5 });
            const mid = (p, q) => [(P[0] + p[0] + q[0]) / 3, (P[1] + p[1] + q[1]) / 3];
            g.tex("α", mid(B, Cc), "red", { size: 20, bold: true }); g.tex("β", mid(Cc, A), "green", { size: 20, bold: true }); g.tex("γ", mid(A, B), "blue", { size: 20, bold: true });
            g.poly([A, B, Cc], { stroke: "white", w: 2 });
            const col3 = mix3(w.map(v => clamp(v, 0, 1)));
            g.circle(P, 0.2, "white", { fill: `rgb(${col3[0] | 0},${col3[1] | 0},${col3[2] | 0})`, w: 2 });
            labelABC(g, A, B, Cc);
            L.set("a", f2(w[0])); L.set("b", f2(w[1])); L.set("c", f2(w[2])); L.set("sum", f2(w[0] + w[1] + w[2]));
          };
        }
      } },
      "이 비율로 ==꼭짓점에 붙은 무엇이든 섞을 수 있습니다== — 색, UV, 노멀, 깊이. 픽셀 셰이더가 받는 '보간된 값'은 전부 이렇게 만들어집니다. $P$를 삼각형 밖으로 빼면 비율 하나가 음수가 되는 것도 확인해 보세요(= 엣지 함수 음수 = 밖).",

      { h: "원근 보정 보간" },
      "그런데 화면에서 구한 비율을 그대로 쓰면 ==기울어진 면의 텍스처가 휘어집니다==. 화면에서의 거리와 3D에서의 거리가 다르기 때문입니다. 두 방식을 바꿔 보며 대각선을 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["{mode}"],
        setup(F, C, L) {
          let tilt = 15, correct = false, show = true;
          C.seg({ options: [{ value: 0, label: "화면 비율 그대로 (아핀)" }, { value: 1, label: "원근 보정" }], value: 0, onChange: x => { correct = !!x; } });
          C.slider({ label: "면 세우기", min: 0, max: 80, step: 1, value: tilt, fmt: x => x + "°", onInput: x => { tilt = x; } });
          C.seg({ options: [{ value: 1, label: "삼각형 선 보기" }, { value: 0, label: "숨기기" }], value: 1, onChange: x => { show = !!x; } });
          F.draw = g => {
            const t = tilt * DEG;
            // 바닥 사각형(3D) → 화면. 카메라는 원점, z 앞쪽
            const Q = [[-1.6, 0], [1.6, 0], [1.6, 3.2], [-1.6, 3.2]].map(([x, d]) => {
              const y = -1.3 + d * Math.sin(t), z = 2.8 + d * Math.cos(t);
              return { s: [x * 4.5 / z, y * 4.5 / z], w: z, uv: [x > 0 ? 1 : 0, d > 0 ? 1 : 0] };
            });
            const tris = [[Q[0], Q[1], Q[2]], [Q[0], Q[2], Q[3]]];
            g.field(220, (x, y) => {
              for (const T of tris) {
                const w = bary(T[0].s, T[1].s, T[2].s, [x, y]);
                if (w[0] < 0 || w[1] < 0 || w[2] < 0) continue;
                let u, v;
                if (correct) {
                  const iw = w.map((k, i) => k / T[i].w), sw = iw[0] + iw[1] + iw[2];
                  u = (iw[0] * T[0].uv[0] + iw[1] * T[1].uv[0] + iw[2] * T[2].uv[0]) / sw;
                  v = (iw[0] * T[0].uv[1] + iw[1] * T[1].uv[1] + iw[2] * T[2].uv[1]) / sw;
                } else {
                  u = w[0] * T[0].uv[0] + w[1] * T[1].uv[0] + w[2] * T[2].uv[0];
                  v = w[0] * T[0].uv[1] + w[1] * T[1].uv[1] + w[2] * T[2].uv[1];
                }
                const chk = (Math.floor(u * 8) + Math.floor(v * 8)) % 2;
                return chk ? [236, 239, 244, 255] : [88, 196, 221, 255];
              }
              return null;
            });
            if (show) tris.forEach(T => g.poly(T.map(q => q.s), { stroke: "yellow", w: 1.5, alpha: 0.8 }));
            L.set("mode", correct ? "원근 보정: 비율을 1/w로 가중 → 칸이 멀수록 고르게 작아짐" : "아핀: 화면 비율 그대로 → 대각선에서 무늬가 꺾임 (PS1 시절의 일렁임)");
          };
        }
      } },
      { key: "보간할 값을 ==$w$(깊이)로 나눈 채로 섞은 뒤 다시 $1/w$의 보간값으로 나누면== 올바른 값이 나옵니다. 요즘 GPU는 이것을 자동으로 해 줍니다." },

      { h: "계단 현상과 MSAA" },
      "픽셀 하나에 샘플 하나면 '안/밖' 둘 중 하나라 가장자리가 계단이 됩니다. ==픽셀 안에 샘플을 여러 개 두고, 들어온 비율만큼 칠하면== 가장자리가 부드러워집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 16, y0: 0, y1: 8 },
        eq: ["픽셀 색 = 삼각형 색 × (안에 든 샘플 수 / {n})"],
        setup(F, C, L) {
          let ns = 1, ang = 24;
          const PAT = { 1: [[0.5, 0.5]], 4: [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]], 16: [] };
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) PAT[16].push([(i + 0.5 + (j % 2) * 0.25) / 4, (j + 0.5) / 4]);
          C.seg({ options: [{ value: 1, label: "샘플 1개" }, { value: 4, label: "MSAA 4×" }, { value: 16, label: "16×" }], value: 1, onChange: x => { ns = x; } });
          const sl = C.slider({ label: "가장자리 각도", min: 2, max: 60, step: 1, value: ang, fmt: x => x + "°", onInput: x => { ang = x; } });
          C.play();
          F.loop((dt, t) => { ang = 30 + 27 * Math.sin(t * 0.5); sl.set(ang); });
          F.draw = g => {
            const n = [Math.sin(ang * DEG), -Math.cos(ang * DEG)], o = [2, 2.2];
            const inside = p => (p[0] - o[0]) * n[0] + (p[1] - o[1]) * n[1] < 0;
            for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) {
              let k = 0;
              PAT[ns].forEach(s => { if (inside([i + s[0], j + s[1]])) k++; });
              const a = k / PAT[ns].length;
              g.poly([[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], { fill: `rgba(244,211,69,${a})`, stroke: "rgba(236,239,244,0.12)", w: 1 });
              PAT[ns].forEach(s => g.dot([i + s[0], j + s[1]], inside([i + s[0], j + s[1]]) ? "#10131A" : "rgba(236,239,244,0.45)", ns === 16 ? 1.6 : 2.6));
            }
            const d = [n[1], -n[0]];
            g.line(V.sub(o, V.mul(d, 30)), V.add(o, V.mul(d, 30)), "pink", { w: 2 });
            L.set("n", ns);
          };
        }
      } },
      "MSAA는 ==커버리지(얼마나 덮였나)만 여러 번 재고 셰이더는 한 번만 돌리기== 때문에 비교적 싸게 가장자리를 다듬습니다. TAA나 FXAA는 같은 문제를 시간·후처리로 푸는 다른 방법입니다.",

      { recap: [
        ["E_AB(P) = (B − A) × (P − A)", "변의 왼쪽(+) / 오른쪽(−)"],
        ["E_AB, E_BC, E_CA ≥ 0", "셋 다 양수면 삼각형 안"],
        ["P = α·A + β·B + γ·C", "무게중심 좌표 = 넓이 비율, 합 1"],
        ["값 = Σ(α_i · 값_i / w_i) / Σ(α_i / w_i)", "원근 보정 보간"],
        ["커버리지 = 안에 든 샘플 / 전체", "MSAA"]
      ] }
    ]
  });
})();
