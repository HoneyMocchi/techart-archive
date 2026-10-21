/* 48 PCA: 주성분 분석 */
(() => {
  const f2 = n => num(n, 2);
  // 2×2 공분산의 고유값·고유벡터
  function pca2(pts) {
    const n = pts.length, m = [0, 0];
    pts.forEach(p => { m[0] += p[0] / n; m[1] += p[1] / n; });
    let sxx = 0, sxy = 0, syy = 0;
    pts.forEach(p => { const dx = p[0] - m[0], dy = p[1] - m[1]; sxx += dx * dx / n; sxy += dx * dy / n; syy += dy * dy / n; });
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    const v1 = Math.abs(sxy) > 1e-9 ? V.norm([l1 - syy, sxy]) : (sxx >= syy ? [1, 0] : [0, 1]);
    return { m, sxx, sxy, syy, l1, l2, v1, v2: V.perp(v1) };
  }

  lesson({
    topic: "pca", title: "PCA: 주성분 분석", desc: "데이터가 가장 퍼진 방향", stage: "TA 도구 상자",
    sym: { "λ": "orange", v: "yellow", "Σ": "purple" },
    hook: "점들이 흩어져 있을 때 ==가장 길게 퍼진 방향==을 찾는 방법이 PCA입니다. 공분산 행렬의 고유벡터가 그 방향입니다. 텍스처 압축의 끝 색 고르기, 물체에 딱 맞는 상자 만들기, 색 팔레트 뽑기에 TA가 실제로 씁니다.",
    blocks: [
      { h: "가장 퍼진 방향 찾기" },
      "점을 끌어 보세요. [[yellow:노란 축]]이 첫째 주성분(가장 길게 퍼진 방향), [[teal:청록 축]]이 둘째입니다. 회색 선을 돌려 보면 ==점들을 그 선에 그림자 낼 때의 퍼짐(분산)이 노란 축에서 가장 큽니다==.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["Σ = [[{a}, {b}; {b}, {c}]]   →   λ_1 = {l1},  λ_2 = {l2}", "회색 선 위 분산 = {pv}"],
        setup(F, C, L) {
          const pts = [[-2.4, -1.2], [-1.6, -0.5], [-0.8, -0.9], [-0.2, 0.1], [0.5, 0.2], [1.1, 0.9], [1.9, 0.6], [2.6, 1.4], [0.2, -0.6], [-1.1, 0.3]];
          let ang = 0.2;
          pts.forEach(p => F.vec(p, "white", { snap: 0.02 }));
          C.slider({ label: "회색 선 각도", min: -1.57, max: 1.57, value: ang, fmt: x => num(x / DEG, 0) + "°", onInput: x => { ang = x; } });
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            const P = pca2(pts), d = [Math.cos(ang), Math.sin(ang)];
            const pv = pts.reduce((s, p) => s + Math.pow(V.dot(V.sub(p, P.m), d), 2), 0) / pts.length;
            g.line(V.sub(P.m, V.mul(d, 5)), V.add(P.m, V.mul(d, 5)), "grey", { w: 1.5, alpha: 0.7 });
            pts.forEach(p => { const q = V.add(P.m, V.mul(d, V.dot(V.sub(p, P.m), d))); g.line(p, q, "grey", { w: 1, dash: [2, 3], alpha: 0.5 }); g.dot(q, "grey", 3); });
            // 타원
            const e = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU; e.push(V.add(P.m, V.add(V.mul(P.v1, Math.cos(a) * Math.sqrt(P.l1) * 2), V.mul(P.v2, Math.sin(a) * Math.sqrt(Math.max(0, P.l2)) * 2)))); }
            g.poly(e, { stroke: "purple", w: 1.5, fill: "rgba(177,137,198,0.08)" });
            g.arrow(P.m, V.add(P.m, V.mul(P.v1, Math.sqrt(P.l1) * 2)), "yellow", { w: 3.5 });
            g.arrow(P.m, V.add(P.m, V.mul(P.v2, Math.sqrt(Math.max(0, P.l2)) * 2)), "teal", { w: 3.5 });
            g.dot(P.m, "pink", 5);
            L.set("a", f2(P.sxx)); L.set("b", f2(P.sxy)); L.set("c", f2(P.syy)); L.set("l1", f2(P.l1)); L.set("l2", f2(P.l2)); L.set("pv", f2(pv));
          };
        }
      } },
      { key: "공분산 행렬 $Σ$의 ==고유벡터 = 퍼짐의 방향, 고유값 = 그 방향의 분산==입니다. 4장의 행렬 그림으로 보면, $Σ$는 원을 타원으로 늘리는 변환이고 고유벡터는 '방향은 그대로 늘어나기만 하는' 특별한 축입니다." },

      { h: "실전 ①: BC1 압축의 끝 색 고르기" },
      "37장의 BC1은 블록의 16색을 ==직선 위 4단계==로 표현합니다. 그 직선을 경계 상자의 대각선으로 고르면 색이 비스듬히 퍼진 블록에서 오차가 커지고, ==PCA 축으로 고르면== 줄어듭니다. 색 점(R–G 평면)을 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -0.1, x1: 2.3, y0: -0.1, y1: 1.1 },
        eq: ["오차 합: 경계 상자 대각선 {e1}   vs   PCA 축 {e2}"],
        setup(F, C, L) {
          const cols = [[0.15, 0.75], [0.25, 0.7], [0.3, 0.6], [0.42, 0.55], [0.5, 0.45], [0.55, 0.42], [0.65, 0.33], [0.75, 0.25], [0.8, 0.2], [0.35, 0.68], [0.6, 0.38], [0.7, 0.3]];
          let method = "pca";
          cols.forEach(p => F.vec(p, "white", { snap: 0.005, constrain: q => [clamp(q[0], 0, 1), clamp(q[1], 0, 1)] }));
          C.seg({ options: [{ value: "box", label: "경계 상자 대각선" }, { value: "pca", label: "PCA 축" }], value: method, onChange: x => { method = x; } });
          const encode = endp => { const pal = [0, 1 / 3, 2 / 3, 1].map(t => V.lerp(endp[0], endp[1], t)); let err = 0; const q = cols.map(c => { let b = pal[0], bd = 1e9; pal.forEach(p => { const d = V.len(V.sub(c, p)); if (d < bd) { bd = d; b = p; } }); err += bd; return b; }); return { pal, q, err }; };
          F.draw = g => {
            g.field(120, (x, y) => (x >= 0 && x <= 1 && y >= 0 && y <= 1 ? [x * 255, y * 255, 90, 255] : null), { rect: { x0: 0, x1: 1, y0: 0, y1: 1 }, smooth: true });
            const mn = [Math.min(...cols.map(c => c[0])), Math.min(...cols.map(c => c[1]))], mx = [Math.max(...cols.map(c => c[0])), Math.max(...cols.map(c => c[1]))];
            const P = pca2(cols), proj = cols.map(c => V.dot(V.sub(c, P.m), P.v1));
            const box = [mn, mx], pcaE = [V.add(P.m, V.mul(P.v1, Math.min(...proj))), V.add(P.m, V.mul(P.v1, Math.max(...proj)))];
            const A = encode(box), B = encode(pcaE), use = method === "pca" ? B : A, endp = method === "pca" ? pcaE : box;
            g.poly([mn, [mx[0], mn[1]], mx, [mn[0], mx[1]]], { stroke: "rgba(236,239,244,0.4)", w: 1, dash: [4, 4] });
            g.line(endp[0], endp[1], method === "pca" ? "yellow" : "orange", { w: 2.5 });
            use.pal.forEach(p => g.circle(p, 0.025, "white", { w: 2 }));
            cols.forEach((c, i) => g.line(c, use.q[i], "red", { w: 1, alpha: 0.7 }));
            // 오른쪽: 원래 블록 vs 압축 블록
            cols.forEach((c, i) => {
              const x = 1.25 + (i % 4) * 0.12, y = 0.95 - Math.floor(i / 4) * 0.12, q = use.q[i];
              g.poly([[x, y], [x + 0.11, y], [x + 0.11, y - 0.11], [x, y - 0.11]], { fill: `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},90)` });
              g.poly([[x + 0.55, y], [x + 0.66, y], [x + 0.66, y - 0.11], [x + 0.55, y - 0.11]], { fill: `rgb(${Math.round(q[0] * 255)},${Math.round(q[1] * 255)},90)` });
            });
            g.text("원본", [1.47, 1.0], "white", { size: 11, bold: true }); g.text("압축", [2.02, 1.0], "white", { size: 11, bold: true });
            g.text("R →", [1, 0], "grey", { size: 10, dy: 10, align: "right" }); g.text("G ↑", [0, 1], "grey", { size: 10, dx: -14 });
            L.set("e1", num(A.err, 3)); L.set("e2", num(B.err, 3));
          };
        }
      } },

      { h: "실전 ②: 물체에 딱 맞는 상자(OBB)" },
      "충돌·컬링용 상자를 축에 맞춰(AABB) 만들면 비스듬한 물체에서 빈 공간이 많습니다. ==PCA 축으로 상자를 돌리면==(OBB) 훨씬 꼭 맞습니다. 물체를 돌려 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["넓이: AABB {a}   vs   PCA OBB {b}   ({r}%)"],
        setup(F, C, L) {
          let rot = 0.6;
          C.slider({ label: "물체 회전", min: -1.57, max: 1.57, value: rot, fmt: x => num(x / DEG, 0) + "°", onInput: x => { rot = x; } });
          let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const base = Array.from({ length: 60 }, () => [(rnd() - 0.5) * 4.4, (rnd() - 0.5) * 1.1 + Math.sin(rnd() * 6) * 0.15]);
          F.draw = g => {
            const pts = base.map(p => V.rot(p, rot));
            const mn = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))], mx = [Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
            const P = pca2(pts), a = pts.map(p => V.dot(V.sub(p, P.m), P.v1)), b = pts.map(p => V.dot(V.sub(p, P.m), P.v2));
            const a0 = Math.min(...a), a1 = Math.max(...a), b0 = Math.min(...b), b1 = Math.max(...b);
            const corner = (s, t) => V.add(P.m, V.add(V.mul(P.v1, s), V.mul(P.v2, t)));
            g.poly([mn, [mx[0], mn[1]], mx, [mn[0], mx[1]]], { stroke: "orange", w: 2, fill: "rgba(255,134,47,0.08)" });
            g.poly([corner(a0, b0), corner(a1, b0), corner(a1, b1), corner(a0, b1)], { stroke: "yellow", w: 2.5, fill: "rgba(244,211,69,0.1)" });
            pts.forEach(p => g.dot(p, "white", 3));
            const A = (mx[0] - mn[0]) * (mx[1] - mn[1]), B = (a1 - a0) * (b1 - b0);
            L.set("a", f2(A)); L.set("b", f2(B)); L.set("r", num(B / A * 100, 0));
          };
        }
      } },

      { use: [
        ["TA", "텍스처 압축기", "BC1·BC7 인코더(DirectXTex, ISPC 등)는 블록 색의 PCA 축으로 시작점을 잡고 미세 조정합니다. 압축 품질 옵션 차이가 이 탐색량입니다."],
        ["엔진", "충돌·바운드", "메시의 OBB·캡슐 충돌체 자동 생성, 오클루더 박스, 데칼 상자 맞추기에 PCA 축을 씁니다."],
        ["TA", "색 팔레트·스타일 분석", "레퍼런스 이미지 색들의 주성분으로 주된 색 흐름을 뽑아 팔레트·LUT 제작이나 색 일관성 검사에 씁니다."],
        ["실생활", "얼굴 인식과 데이터 분석", "고유얼굴(eigenface), 설문 데이터 요약, 주식 수익률의 주된 변동 요인 찾기가 모두 PCA입니다."]
      ] },

      { recap: [
        ["Σ = 평균에서의 공분산", "데이터의 퍼짐을 행렬로"],
        ["Σ v = λ v", "고유벡터 = 퍼짐 방향, 고유값 = 분산"],
        ["PCA 축 위 4단계", "BC1 끝 색 선택"],
        ["PCA 축으로 돌린 상자", "OBB: AABB보다 꼭 맞음"]
      ] }
    ]
  });
})();
