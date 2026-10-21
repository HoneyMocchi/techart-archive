/* 33 포워드 vs 디퍼드 렌더링 */
(() => {
  const f0 = n => num(n, 0);
  const srgb = v => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
  // 작은 장면: 바닥 + 구 3개 (뷰 공간에서 광선 교차로 G버퍼 생성)
  const BALLS = [{ c: [-0.9, -0.15, 3.4], r: 0.55, col: [0.85, 0.3, 0.25], rough: 0.3 }, { c: [0.45, -0.25, 3.0], r: 0.45, col: [0.3, 0.7, 0.85], rough: 0.7 }, { c: [1.3, -0.4, 3.9], r: 0.3, col: [0.9, 0.8, 0.3], rough: 0.15 }];
  function gbuf(x, y) {
    const d = V3.norm([x * 0.5, y * 0.5, 1]);
    let best = { t: Infinity };
    BALLS.forEach(b => { const oc = V3.mul(b.c, -1), bb = V3.dot(oc, d), c = V3.dot(oc, oc) - b.r * b.r, disc = bb * bb - c; if (disc > 0) { const t = -bb - Math.sqrt(disc); if (t > 0 && t < best.t) { const p = V3.mul(d, t); best = { t, p, n: V3.norm(V3.sub(p, b.c)), col: b.col, rough: b.rough }; } } });
    if (d[1] < 0) { const t = -0.7 / d[1]; if (t < best.t) { const p = V3.mul(d, t); best = { t, p, n: [0, 1, 0], col: (Math.floor(p[0] * 2) + Math.floor(p[2] * 2)) % 2 ? [0.6, 0.6, 0.58] : [0.4, 0.42, 0.45], rough: 0.8 }; } }
    return best;
  }

  lesson({
    topic: "deferred", title: "포워드 vs 디퍼드", desc: "조명을 언제 계산하나", stage: "하드웨어와 성능",
    sym: { N: "yellow", L: "gold" },
    hook: "물체를 그리면서 바로 모든 빛을 계산하면(포워드) 빛이 많을수록 느려집니다. ==먼저 화면에 재질 정보만 적어 두고, 빛은 나중에 그 화면 위에서 한꺼번에 계산하면==(디퍼드) 빛 수백 개도 감당됩니다. UE의 기본 방식이 디퍼드입니다.",
    blocks: [
      { h: "G버퍼: 화면에 재질을 먼저 적어 둔다" },
      "디퍼드의 첫 패스는 조명 없이 픽셀마다 ==기본색·노멀·깊이·거칠기==를 여러 장의 텍스처(G버퍼)에 씁니다. 둘째 패스가 이것만 보고 빛을 계산합니다. 버퍼를 하나씩 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let view = "final", nl = 6;
          C.seg({ options: [{ value: "base", label: "기본색" }, { value: "normal", label: "노멀" }, { value: "depth", label: "깊이" }, { value: "rough", label: "거칠기" }, { value: "final", label: "조명 결과" }], value: view, onChange: x => { view = x; } });
          C.slider({ label: "점광원 수", min: 1, max: 24, step: 1, value: nl, fmt: f0, onInput: x => { nl = x; } });
          C.play(true);
          F.loop(() => {});
          F.draw = g => {
            const t = F.t;
            const lights = Array.from({ length: nl }, (_, i) => { const a = i / nl * TAU + t * 0.6; return { p: [Math.cos(a) * 1.5, -0.2 + 0.3 * Math.sin(a * 2 + t), 3.3 + Math.sin(a) * 1.2], c: [[1, 0.5, 0.3], [0.3, 0.6, 1], [0.5, 1, 0.4], [1, 0.9, 0.5]][i % 4] }; });
            g.field(view === "final" ? 170 : 200, (x, y) => {
              const h = gbuf(x, y);
              if (!isFinite(h.t)) return [10, 12, 18, 255];
              if (view === "base") return h.col.map(srgb).concat(255);
              if (view === "normal") return h.n.map(v => (v * 0.5 + 0.5) * 255).concat(255);
              if (view === "depth") { const v = clamp(1 - (h.t - 2) / 6, 0, 1) * 255; return [v, v, v, 255]; }
              if (view === "rough") { const v = h.rough * 255; return [v, v, v, 255]; }
              const out = h.col.map(c => c * 0.03);
              lights.forEach(l => {
                const Ld = V3.sub(l.p, h.p), d2 = V3.dot(Ld, Ld), Ln = V3.mul(Ld, 1 / Math.sqrt(d2));
                const k = Math.max(0, V3.dot(h.n, Ln)) / (1 + d2 * 1.5) * 1.6;
                for (let i = 0; i < 3; i++) out[i] += h.col[i] * l.c[i] * k;
              });
              return out.map(srgb).concat(255);
            });
            L.set("eq", { base: "G버퍼 1: 기본색 (RGB)", normal: "G버퍼 2: 노멀 → RGB = N·0.5 + 0.5", depth: "깊이 버퍼: 위치를 복원하는 데 씀", rough: "G버퍼 3: 거칠기·금속성 등 재질 값", final: `조명 패스: 픽셀마다 G버퍼를 읽고 빛 ${nl}개를 더함` }[view]);
          };
        }
      } },

      { h: "비용 비교: 빛이 많아지면" },
      "포워드는 물체를 그릴 때마다 모든 빛을 계산하므로 ==겹쳐 그린 픽셀(오버드로)마다 빛 수만큼== 비용이 듭니다. 디퍼드는 G버퍼를 한 번 쓰고, 빛 계산은 ==최종 픽셀에 대해서만, 빛이 닿는 범위만== 합니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["포워드 ≈ 픽셀 × 오버드로 × 빛 = {fw}   ·   디퍼드 ≈ 픽셀 × (G버퍼 쓰기 + 빛 × 덮는 비율) = {df}"],
        setup(F, C, L) {
          let lights = 16, od = 2.5, cover = 0.15;
          C.slider({ label: "빛 개수", min: 1, max: 256, step: 1, value: lights, fmt: f0, onInput: x => { lights = x; } });
          C.slider({ label: "오버드로", min: 1, max: 6, value: od, fmt: x => "×" + num(x, 1), onInput: x => { od = x; } });
          C.slider({ label: "빛 하나가 덮는 화면 비율", min: 0.01, max: 1, value: cover, onInput: x => { cover = x; } });
          F.draw = g => {
            const fw = od * lights, df = 3 + lights * cover * 1.2, mx = Math.max(fw, df, 10);
            const bar = (y, v, c, name) => { g.poly([[2.2, y], [2.2 + v / mx * 7.4, y], [2.2 + v / mx * 7.4, y + 0.9], [2.2, y + 0.9]], { fill: c }); g.text(name, [2.1, y + 0.45], "white", { align: "right", size: 13, bold: true }); g.text(num(v, 0), [2.3 + v / mx * 7.4, y + 0.45], "white", { align: "left", size: 12 }); };
            bar(2.6, fw, PAL.orange, "포워드");
            bar(1.2, df, PAL.teal, "디퍼드");
            g.text("픽셀당 상대 비용", [5.9, 3.9], "grey", { size: 11 });
            L.set("fw", num(fw, 0)); L.set("df", num(df, 1));
          };
        }
      } },
      "대신 디퍼드는 ==G버퍼 메모리·대역폭==(26·34장)을 많이 쓰고, 픽셀마다 재질 정보가 한 벌뿐이라 ==반투명==과 ==MSAA==가 어렵습니다. 그래서 반투명은 따로 포워드로 그립니다.",

      { h: "타일 라이트 컬링: 빛을 칸별로 나누기" },
      "화면을 작은 칸(타일)으로 나누고 ==칸마다 그 칸에 닿는 빛만 목록으로== 만듭니다. 픽셀은 자기 칸 목록만 계산합니다. 빛을 끌어 보세요. 색이 진할수록 그 칸의 빛 개수가 많습니다(라이트 복잡도 뷰).",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 16, y0: 0, y1: 8 },
        eq: ["가장 붐비는 칸의 빛 {mx}개 / 전체 {n}개   (칸마다 평균 {avg}개)"],
        setup(F, C, L) {
          let rad = 2.2;
          const Ls = [[3, 2.5], [5, 5.5], [8.5, 4], [11, 2], [12.5, 6], [6.5, 1.5], [14, 3.5]];
          Ls.forEach(p => F.vec(p, "gold", { snap: 0.05 }));
          C.slider({ label: "빛 반경", min: 0.5, max: 5, value: rad, onInput: x => { rad = x; } });
          F.draw = g => {
            let mx = 0, sum = 0;
            for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) {
              let cnt = 0;
              Ls.forEach(p => { const dx = Math.max(i - p[0], 0, p[0] - (i + 1)), dy = Math.max(j - p[1], 0, p[1] - (j + 1)); if (dx * dx + dy * dy < rad * rad) cnt++; });
              mx = Math.max(mx, cnt); sum += cnt;
              const k = cnt / Ls.length;
              g.poly([[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], { fill: `rgb(${Math.round(lerp(20, 252, k))},${Math.round(lerp(24, 98, k))},${Math.round(lerp(34, 85, k))})`, stroke: "rgba(236,239,244,0.12)", w: 1 });
              if (cnt) g.text(String(cnt), [i + 0.5, j + 0.5], "white", { size: 11, halo: false });
            }
            Ls.forEach(p => g.circle(p, rad, "gold", { w: 1.5, alpha: 0.6, dash: [4, 4] }));
            L.set("mx", mx); L.set("n", Ls.length); L.set("avg", num(sum / 128, 1));
          };
        }
      } },
      { key: "현대 엔진은 디퍼드 + ==타일·클러스터 라이트 컬링==으로 수천 개의 동적 광원을 다룹니다. 반대로 모바일은 대역폭이 귀해 포워드(+ 클러스터)를 주로 씁니다." },

      { use: [
        ["엔진", "버퍼 시각화 뷰", "UE 뷰포트의 Buffer Visualization(BaseColor·WorldNormal·Roughness·SceneDepth)이 이 장의 G버퍼입니다. 이상한 조명은 여기서 원인을 찾습니다."],
        ["엔진", "포워드 셰이딩 옵션", "VR 프로젝트는 MSAA를 쓰려고 프로젝트 설정에서 Forward Shading을 켭니다. 모바일 렌더러도 기본이 포워드입니다."],
        ["최적화", "라이트 복잡도", "Light Complexity 뷰모드가 이 장의 타일 히트맵입니다. 빨간 영역은 반경 줄이기·그림자 끄기가 우선입니다."],
        ["실생활", "분업과 일괄 처리", "주문을 먼저 다 받아 적은 뒤 주방이 한꺼번에 조리하는 것과 같습니다. 같은 일을 모아서 하면 빠릅니다."]
      ] },

      { recap: [
        ["포워드: 그리면서 모든 빛", "빛·오버드로가 늘면 비용이 곱으로 증가"],
        ["디퍼드: G버퍼 → 조명 패스", "빛은 최종 픽셀에 대해서만"],
        ["G버퍼 = 기본색·노멀·깊이·재질", "대역폭·반투명·MSAA가 약점"],
        ["타일·클러스터 컬링", "칸마다 닿는 빛만 계산"]
      ] }
    ]
  });
})();
