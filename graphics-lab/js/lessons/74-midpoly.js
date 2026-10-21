/* 74 미드폴리와 가중 노멀 */
(() => {
  const MB = b => (b >= 1048576 ? num(b / 1048576, 1) + " MB" : num(b / 1024, 0) + " KB");
  // 모서리를 깎은 사각형 단면 (반폭 0.8, 깎은 폭 c, 모서리 분할 s)
  function beveled(c, s) {
    const h = 0.8, pts = [];
    [[1, -1, -90], [1, 1, 0], [-1, 1, 90], [-1, -1, 180]].forEach(([sx, sy, a0]) => {
      const cx = sx * (h - c), cy = sy * (h - c);
      for (let k = 0; k <= s; k++) { const a = (a0 + 90 * k / s) * DEG; pts.push([cx + c * Math.cos(a), cy + c * Math.sin(a)]); }
    });
    return pts;
  }
  const nrm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

  lesson({
    topic: "midpoly", title: "미드폴리와 가중 노멀", desc: "노멀 맵 없이 매끈한 모서리", stage: "배경 아트 기법",
    sym: { N: "yellow", L: "gold", w: "teal" },
    hook: "하이폴리를 구워 로우폴리에 노멀 맵으로 입히는 방식(39장)은 에셋마다 ==고유 텍스처==가 필요합니다. 배경처럼 에셋이 수천 개라면 메모리가 버티지 못합니다. ==미드폴리==는 모서리를 실제 폴리곤으로 살짝 깎고(베벨), ==정점 노멀을 면 넓이로 가중==해 노멀 맵 없이 매끈한 하이라이트를 얻습니다. 표면은 공유 타일 텍스처와 트림 시트(76장)로 칠합니다.",
    blocks: [
      { h: "정점 노멀을 어떻게 정하느냐" },
      "모서리를 깎은 상자의 단면입니다. 바깥 띠가 그 면의 밝기입니다. '부드럽게'는 이웃 면 노멀을 똑같이 평균해 ==넓은 면 전체에 그라데이션 얼룩==이 생깁니다. '하드 엣지'는 면마다 노멀을 따로 둬 깨끗하지만 베벨이 각져 보입니다. '면적 가중'은 넓은 면이 노멀을 차지하고 ==좁은 베벨만 휘어== 하이라이트가 모서리에 둥글게 맺힙니다.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 2, c = 0.12, s = 2, la = 0.9;
          C.seg({ options: [{ value: 0, label: "부드럽게 (평균)" }, { value: 1, label: "하드 엣지" }, { value: 2, label: "면적 가중 노멀" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "베벨 폭", min: 0.02, max: 0.4, value: c, onInput: x => { c = x; } });
          C.slider({ label: "베벨 분할", min: 1, max: 4, step: 1, value: s, fmt: x => x, onInput: x => { s = x; } });
          C.slider({ label: "빛 방향", min: 0, max: 6.28, value: la, fmt: x => num(x / DEG, 0) + "°", onInput: x => { la = x; } });
          F.draw = g => {
            const P = beveled(c, s), n = P.length, Ld = [Math.cos(la), Math.sin(la)];
            const faces = P.map((p, i) => { const q = P[(i + 1) % n], d = V.sub(q, p), len = Math.hypot(d[0], d[1]); return { p, q, len, n: len > 1e-6 ? nrm([d[1], -d[0]]) : null }; });
            // 정점 노멀: 정점 i는 면 i−1과 면 i 사이
            const vn = P.map((_, i) => {
              const a = faces[(i - 1 + n) % n], b = faces[i];
              if (!a.n) return b.n; if (!b.n) return a.n;
              return mode === 2 ? nrm([a.n[0] * a.len + b.n[0] * b.len, a.n[1] * a.len + b.n[1] * b.len]) : nrm([a.n[0] + b.n[0], a.n[1] + b.n[1]]);
            });
            g.poly(P, { fill: "#232A38", stroke: "grey", w: 1.5 });
            faces.forEach((f, i) => {
              if (!f.n) return;
              const n0 = mode === 1 ? f.n : vn[i], n1 = mode === 1 ? f.n : vn[(i + 1) % n], K = 24;
              for (let k = 0; k < K; k++) {
                const t = (k + 0.5) / K, nn = nrm([lerp(n0[0], n1[0], t), lerp(n0[1], n1[1], t)]);
                const d = Math.max(0, V.dot(nn, Ld)), sp = Math.pow(d, 60), v = 0.1 + 0.55 * d + 0.9 * sp;
                const a = V.lerp(f.p, f.q, k / K), b = V.lerp(f.p, f.q, (k + 1) / K), o = V.mul(f.n, 0.2);
                const c8 = Math.round(clamp(v, 0, 1) * 255);
                g.poly([a, b, V.add(b, o), V.add(a, o)], { fill: `rgb(${c8},${Math.round(c8 * 0.95)},${Math.round(c8 * 0.88)})` });
              }
            });
            if (mode !== 1) P.forEach((p, i) => g.arrow(p, V.add(p, V.mul(vn[i], 0.32)), "yellow", { w: 1.6, head: 7 }));
            else faces.forEach(f => { if (f.n) { const m = V.lerp(f.p, f.q, 0.5); g.arrow(m, V.add(m, V.mul(f.n, 0.32)), "yellow", { w: 1.6, head: 7 }); } });
            g.arrow([1.75 - Ld[0] * 0.35, 0.85 - Ld[1] * 0.35], [1.75, 0.85], "gold", { w: 2.5, head: 9 });
            g.text("빛", [1.75, 0.6], "gold", { size: 11 });
            L.set("eq", ["$N_정점 = normalize(N_1 + N_2)$   넓은 면까지 노멀이 기울어 그라데이션 얼룩", "면마다 $N$ 을 따로 (정점 분리)   깨끗하지만 각진 모서리, 보통 노멀 맵이 필요", "$N_정점 = normalize(w_1 N_1 + w_2 N_2)$, $w$ = 면 넓이   넓은 면은 평평, 베벨만 둥글게"][mode]);
          };
        }
      } },
      { key: "가중 노멀은 ==모델링 툴에서 굽는 정점 데이터==라 실행 비용이 없습니다(3ds Max·Blender의 Weighted Normal, Maya의 Face Weighted Normals). 엔진으로 가져올 때 노멀을 다시 계산하지 않도록 '노멀 가져오기'를 켜야 합니다." },

      { h: "메모리: 고유 노멀 맵 vs 정점 몇 개" },
      "에셋 하나만 보면 고유 노멀 맵이 편합니다. 하지만 에셋 수가 늘면 ==고유 텍스처는 개수만큼 늘고, 미드폴리는 공유 텍스처 몇 장 + 정점 조금==이라 금방 역전됩니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["고유 노멀 맵: {n} × {map} = {uniq}   ·   미드폴리: 공유 {shared} + {n} × 정점 {v} × 32B = {mid}"],
        setup(F, C, L) {
          let n = 120, res = 2048, v = 1500;
          C.slider({ label: "에셋 수", min: 1, max: 500, step: 1, value: n, fmt: x => x + "개", onInput: x => { n = x; } });
          C.seg({ options: [{ value: 1024, label: "고유 맵 1K" }, { value: 2048, label: "2K" }, { value: 4096, label: "4K" }], value: res, onChange: x => { res = +x; } });
          C.slider({ label: "베벨로 늘어난 정점 (에셋당)", min: 200, max: 8000, step: 100, value: v, fmt: x => num(x, 0), onInput: x => { v = x; } });
          F.draw = g => {
            // BC5 노멀 = 1바이트/픽셀, 밉 포함 4/3배. 공유 세트: 2K 컬러(BC7)+노멀(BC5) 4벌
            const map = res * res * 4 / 3, uniq = n * map, shared = 4 * 2 * 2048 * 2048 * 4 / 3, mid = shared + n * v * 32, mx = Math.max(uniq, mid);
            [[uniq, "고유 노멀 맵", PAL.orange, 2.5], [mid, "미드폴리 + 공유", PAL.teal, 1.2]].forEach(([b, nm, col, y]) => {
              const w = Math.max(0.05, b / mx * 6.2);
              g.poly([[2.8, y], [2.8 + w, y], [2.8 + w, y + 0.8], [2.8, y + 0.8]], { fill: col });
              g.text(nm, [2.7, y + 0.4], "white", { size: 12, bold: true, align: "right" }); g.text(MB(b), [2.9 + w, y + 0.4], "white", { size: 12, align: "left" });
            });
            const cross = Math.ceil(shared / Math.max(1, map - v * 32));
            g.text(map > v * 32 ? `에셋 ${cross}개부터 미드폴리가 가벼움` : "정점이 너무 많아 역전되지 않음", [9.8, 0.45], "grey", { size: 11, align: "right" });
            L.set("n", n); L.set("map", MB(map)); L.set("uniq", MB(uniq)); L.set("shared", MB(shared)); L.set("v", num(v, 0)); L.set("mid", MB(mid));
          };
        }
      } },

      { use: [
        ["게임", "스타 시티즌·둠·AC", "Star Citizen의 우주선, id Software의 둠(2016) 배경, 어쌔신 크리드 시리즈의 건물이 미드폴리 + 트림 시트 + 공유 디테일 노멀 조합으로 유명합니다."],
        ["툴", "모델링 설정", "Blender의 Bevel(Harden Normals) + Weighted Normal 모디파이어, 3ds Max의 Weighted Normals, Maya의 Face Weighted Normals 스크립트가 표준 도구입니다."],
        ["엔진", "UE·Unity 가져오기", "FBX 가져오기에서 노멀 'Import Normals'(UE) / 'Import'(Unity)로 두어 엔진이 노멀을 다시 계산하지 않게 합니다. 나나이트 메시는 정점이 늘어도 부담이 적어 미드폴리와 잘 맞습니다."],
        ["TA", "파이프라인 결정", "에셋 수·재사용률·카메라 거리로 '고유 베이크 vs 미드폴리'를 정하고, 베벨 폭 기준(예: 5mm·1cm)과 가중 노멀 규칙을 문서화해 아티스트가 같은 결과를 내게 합니다."]
      ] },

      { recap: [
        ["normalize(N₁ + N₂)", "평균: 넓은 면에 얼룩"],
        ["면마다 N 분리", "하드 엣지: 노멀 맵 필요"],
        ["normalize(w₁N₁ + w₂N₂)", "면적 가중: 베벨만 둥글게"],
        ["공유 텍스처 + 정점 조금", "에셋이 많을수록 미드폴리가 유리"]
      ] }
    ]
  });
})();
