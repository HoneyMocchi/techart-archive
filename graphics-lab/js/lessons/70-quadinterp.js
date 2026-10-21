/* 70 사각형 보간: 두 삼각형 · 역쌍선형 · 투영 (네이선 리드, 이니고 킬레즈) */
(() => {
  const cr = (a, b) => a[0] * b[1] - a[1] * b[0];
  // 쌍선형의 역: p = lerp(lerp(a, b, u), lerp(d, c, u), v) 를 u, v 에 대해 풂 (2차 방정식)
  function invBilinear(p, a, b, c, d) {
    const e = V.sub(b, a), f = V.sub(d, a), g = [a[0] - b[0] + c[0] - d[0], a[1] - b[1] + c[1] - d[1]], h = V.sub(p, a);
    const k2 = cr(g, f), k1 = cr(e, f) + cr(h, g), k0 = cr(h, e);
    const solveU = v => { const dx = e[0] + g[0] * v, dy = e[1] + g[1] * v; return Math.abs(dx) > Math.abs(dy) ? (h[0] - f[0] * v) / dx : (h[1] - f[1] * v) / dy; };
    if (Math.abs(k2) < 1e-6) { const v = -k0 / k1; return [solveU(v), v]; }
    let w = k1 * k1 - 4 * k0 * k2; if (w < 0) return null; w = Math.sqrt(w);
    let v = (-k1 - w) / (2 * k2), u = solveU(v);
    if (u < 0 || u > 1 || v < 0 || v > 1) { v = (-k1 + w) / (2 * k2); u = solveU(v); }
    return [u, v];
  }
  // 단위 정사각형 → 사각형 호모그래피 (Heckbert)
  function homography(P) {
    const [p0, p1, p2, p3] = P, sx = p0[0] - p1[0] + p2[0] - p3[0], sy = p0[1] - p1[1] + p2[1] - p3[1];
    const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
    const M = [p1[0] - p0[0] + g * p1[0], p3[0] - p0[0] + h * p3[0], p0[0], p1[1] - p0[1] + g * p1[1], p3[1] - p0[1] + h * p3[1], p0[1], g, h, 1];
    const [a, b, c, d, e, f, gg, hh, i] = M;
    const A = e * i - f * hh, B = -(d * i - f * gg), Cc = d * hh - e * gg, det = a * A + b * B + c * Cc || 1e-9;
    const Inv = [A, -(b * i - c * hh), b * f - c * e, B, a * i - c * gg, -(a * f - c * d), Cc, -(a * hh - b * gg), a * e - b * d].map(x => x / det);
    return {
      fwd: (u, v) => { const w = gg * u + hh * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; },
      inv: p => { const w = Inv[6] * p[0] + Inv[7] * p[1] + Inv[8]; return [(Inv[0] * p[0] + Inv[1] * p[1] + Inv[2]) / w, (Inv[3] * p[0] + Inv[4] * p[1] + Inv[5]) / w]; }
    };
  }
  // 두 삼각형(0-1-2, 0-2-3)의 아핀 보간
  function triInv(p, P) {
    const bary = (A, B, Cc) => { const d = cr(V.sub(B, A), V.sub(Cc, A)), l1 = cr(V.sub(p, A), V.sub(Cc, A)) / d, l2 = cr(V.sub(B, A), V.sub(p, A)) / d; return [1 - l1 - l2, l1, l2]; };
    let w = bary(P[0], P[1], P[2]);
    if (w[0] >= -1e-6 && w[1] >= -1e-6 && w[2] >= -1e-6) return [w[1] + w[2], w[2]];
    w = bary(P[0], P[2], P[3]);
    if (w[0] >= -1e-6 && w[1] >= -1e-6 && w[2] >= -1e-6) return [w[1], w[1] + w[2]];
    return null;
  }
  const triFwd = (u, v, P) => (v <= u ? V.add(V.add(V.mul(P[0], 1 - u), V.mul(P[1], u - v)), V.mul(P[2], v)) : V.add(V.add(V.mul(P[0], 1 - v), V.mul(P[2], u)), V.mul(P[3], v - u)));
  const bilFwd = (u, v, P) => V.lerp(V.lerp(P[0], P[1], u), V.lerp(P[3], P[2], u), v);
  const tex = (u, v) => {
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const c = ((Math.floor(u * 8) + Math.floor(v * 8)) & 1) ? [236, 239, 244] : [70, 80, 100];
    const ring = Math.abs(Math.hypot(u - 0.5, v - 0.5) - 0.3) < 0.025;
    return ring ? [255, 134, 47, 255] : [c[0], c[1], c[2], 255];
  };
  const PRESET = {
    trap: [[-1.6, -0.85], [1.6, -0.85], [0.7, 0.8], [-0.7, 0.8]],
    kite: [[-1.2, -0.7], [1.5, -0.9], [0.9, 0.85], [-0.3, 0.5]]
  };

  lesson({
    topic: "quadinterp", title: "사각형 보간", desc: "사다리꼴 텍스처가 꺾이는 이유", stage: "그래픽스 연구 노트",
    sym: { u: "pink", v: "teal", q: "orange" },
    hook: "GPU는 삼각형만 그립니다. 그래서 사각형은 대각선으로 잘린 ==두 삼각형==이고, 각자 따로 아핀 보간을 합니다. 직사각형이면 문제없지만, 사다리꼴이나 찌그러진 사각형에 텍스처를 입히면 ==대각선에서 무늬가 꺾입니다==. 네이선 리드의 'Quadrilateral Interpolation'과 이니고 킬레즈의 역쌍선형 글이 다룬 문제입니다.",
    blocks: [
      { h: "꼭짓점을 끌어 비틀어 보기" },
      "네 꼭짓점을 끌어 보세요. '두 삼각형'은 대각선(점선)을 경계로 ==체커와 주황 원이 꺾입니다==. '역쌍선형'은 사각형 전체를 하나의 쌍선형 면으로 보고 픽셀마다 $(u, v)$ 를 거꾸로 풉니다. '투영'은 사각형을 ==비스듬히 본 직사각형==으로 해석합니다(원근 바닥처럼).",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["{eq}"],
        setup(F, C, L) {
          const P = PRESET.trap.map(p => p.slice());
          let m = 0;
          P.forEach((p, i) => F.vec(p, ["pink", "teal", "yellow", "orange"][i], { snap: 0.01 }));
          C.seg({ options: [{ value: 0, label: "두 삼각형 (GPU 기본)" }, { value: 1, label: "역쌍선형" }, { value: 2, label: "투영 (호모그래피)" }], value: m, onChange: x => { m = x; } });
          C.button("사다리꼴", () => PRESET.trap.forEach((q, i) => { P[i][0] = q[0]; P[i][1] = q[1]; }));
          C.button("찌그러진 사각형", () => PRESET.kite.forEach((q, i) => { P[i][0] = q[0]; P[i][1] = q[1]; }));
          F.draw = g => {
            const H = homography(P);
            g.field(220, (x, y) => {
              const p = [x, y], uv = m === 0 ? triInv(p, P) : m === 1 ? invBilinear(p, P[0], P[1], P[2], P[3]) : H.inv(p);
              return uv ? tex(uv[0], uv[1]) : null;
            });
            g.poly(P, { stroke: "white", w: 1.5, alpha: 0.6 });
            if (m === 0) g.line(P[0], P[2], "white", { w: 1.5, dash: [5, 5] });
            L.set("eq", ["삼각형마다 따로 $u, v$ 를 선형 보간 → 대각선에서 기울기가 바뀜(꺾임)", "$p = lerp(lerp(a, b, u), lerp(d, c, u), v)$ 를 픽셀마다 2차 방정식으로 풂", "$p = H · (u, v, 1)$ 의 역: 원근처럼 먼 쪽이 촘촘해짐"][m]);
          };
        }
      } },

      { h: "격자선으로 비교하기" },
      "같은 사각형에 세 방법의 $u, v$ 격자선을 겹쳤습니다. ==두 삼각형(회색)은 대각선에서 꺾이고==, 역쌍선형(분홍)은 각 변을 고르게 나눈 곧은 선, 투영(청록)은 곧은 선이지만 간격이 원근처럼 변합니다. 어떤 것이 '정답'인지는 그 사각형이 무엇을 뜻하느냐에 달려 있습니다.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["회색 = 두 삼각형   ·   분홍 = 역쌍선형   ·   청록 = 투영"],
        setup(F, C, L) {
          const P = PRESET.trap.map(p => p.slice());
          P.forEach((p, i) => F.vec(p, "white", { snap: 0.01 }));
          F.draw = g => {
            const H = homography(P);
            const lines = (fwd, color, w) => {
              for (let k = 0; k <= 8; k++) {
                const a = [], b = [];
                for (let s = 0; s <= 40; s++) { a.push(fwd(k / 8, s / 40)); b.push(fwd(s / 40, k / 8)); }
                g.poly(a, { stroke: color, w, close: false, alpha: 0.85 }); g.poly(b, { stroke: color, w, close: false, alpha: 0.85 });
              }
            };
            lines((u, v) => triFwd(u, v, P), "grey", 2.5);
            lines((u, v) => bilFwd(u, v, P), "pink", 1.5);
            lines((u, v) => H.fwd(u, v), "teal", 1.5);
          };
        }
      } },
      { key: "사다리꼴이 ==원근으로 본 직사각형==이라면(바닥, 도로) 투영이 맞고, 버텍스 셰이더에서 $(u·q, v·q, q)$ 를 넘긴 뒤 픽셀에서 $q$ 로 나누면 됩니다(네이선 리드의 방법). 모양 자체가 사다리꼴이라면(UI 패널, 스플라인 메시의 한 칸) 역쌍선형이 맞습니다." },

      { use: [
        ["게임", "UI와 2D 변형", "사다리꼴로 기울인 UI 카드, 스플라인을 따라 휘는 도로·강 메시, 2D 스프라이트 메시 변형에서 텍스처가 대각선으로 꺾이는 버그가 바로 이것입니다."],
        ["엔진", "고치는 방법", "정점 수를 늘려 사각형을 잘게 쪼개거나, 정점에 $q$ 를 추가로 넣어 투영 보간을 하거나, 픽셀 셰이더에서 역쌍선형을 풉니다(킬레즈의 invBilinear)."],
        ["글", "참고 글", "Nathan Reed 'Quadrilateral Interpolation, Part 1·2'(2012)와 iquilezles.org 'inverse bilinear interpolation'에 식과 셰이더 코드가 있습니다."],
        ["TA", "UV 펴기와 리토폴로지", "모델링에서 사다리꼴 쿼드에 체커를 입혀 보면 같은 꺾임이 보입니다. 엔진은 결국 삼각형으로 그리므로, UV 왜곡 점검은 삼각형 분할 상태로 해야 정확합니다."]
      ] },

      { recap: [
        ["두 삼각형 + 아핀", "GPU 기본: 대각선에서 꺾임"],
        ["역쌍선형", "사각형 전체를 하나의 면으로, 2차 방정식"],
        ["호모그래피 (uvq)", "원근으로 본 직사각형으로 해석"],
        ["무엇을 뜻하는 사각형인가", "그에 따라 정답이 다름"]
      ] }
    ]
  });
})();
