/* 38 텍셀 밀도와 UV 레이아웃 */
(() => {
  const f0 = n => num(n, 0);
  const edge = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

  lesson({
    topic: "texel", title: "텍셀 밀도와 UV 레이아웃", desc: "1미터에 몇 픽셀인가", stage: "테크아트 실전",
    sym: { u: "green", v: "red" },
    hook: "같은 화면에 놓인 벽과 소품의 텍스처 선명도가 다르면 눈에 거슬립니다. TA는 ==월드 1미터당 텍셀 수(텍셀 밀도)==를 기준으로 해상도와 UV 크기를 맞추고, UV 섬 사이 여백으로 밉맵 번짐을 막습니다.",
    blocks: [
      { h: "텍셀 밀도 맞추기" },
      "크기가 다른 세 물체에 같은 체크 무늬를 입혔습니다. 칸 크기가 다르면 밀도가 다른 것입니다. ==목표 밀도(점선 칸)와 같아지도록== 각 물체의 텍스처 해상도를 골라 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: 0, y1: 5 },
        eq: ["밀도 = 텍스처 해상도 × UV 비율 / 월드 크기(m)   →   벽 {a}, 상자 {b}, 컵 {c} px/m   (목표 {t})"],
        setup(F, C, L) {
          const objs = [{ name: "벽 4m", size: 4, x: 0.3, w: 4, res: 1024 }, { name: "상자 1m", size: 1, x: 4.8, w: 1.6, res: 1024 }, { name: "컵 0.25m", size: 0.25, x: 7.2, w: 0.9, res: 1024 }];
          let target = 512;
          objs.forEach((o, i) => C.slider({ label: o.name, min: 6, max: 12, step: 1, value: 10, fmt: x => Math.pow(2, x) + "", onInput: x => { o.res = Math.pow(2, x); } }));
          C.seg({ options: [{ value: 256, label: "목표 256 px/m" }, { value: 512, label: "512" }, { value: 1024, label: "1024" }], value: 512, onChange: x => { target = +x; } });
          F.draw = g => {
            const dens = objs.map(o => o.res / o.size);
            objs.forEach((o, i) => {
              const sc = o.w / o.size;                         // 화면 단위 / m
              const cell = 32 / dens[i] * sc;                   // 32텍셀짜리 체크 칸의 화면 크기
              const y0 = 0.6, h = Math.min(4, o.w * (i === 0 ? 0.9 : 1));
              g.field(260, (x, y) => {
                if (x < o.x || x > o.x + o.w || y < y0 || y > y0 + h) return undefined;
                return (Math.floor((x - o.x) / cell) + Math.floor((y - y0) / cell)) % 2 ? [236, 239, 244, 255] : [88, 120, 170, 255];
              }, { rect: { x0: o.x, x1: o.x + o.w, y0: y0, y1: y0 + h }, smooth: false });
              const ok = Math.abs(Math.log2(dens[i] / target)) < 0.01;
              g.text(o.name, [o.x + o.w / 2, y0], ok ? "green" : "orange", { dy: 12, size: 12, bold: true });
              g.text(f0(dens[i]) + " px/m", [o.x + o.w / 2, y0 + h], ok ? "green" : "orange", { dy: -10, size: 11 });
              const tc = 32 / target * sc;
              g.poly([[o.x, y0 + h + 0.35], [o.x + tc, y0 + h + 0.35], [o.x + tc, y0 + h + 0.35 + tc], [o.x, y0 + h + 0.35 + tc]], { stroke: "yellow", w: 1.5, dash: [3, 3] });
            });
            L.set("a", f0(dens[0])); L.set("b", f0(dens[1])); L.set("c", f0(dens[2])); L.set("t", target);
          };
        }
      } },
      { key: "기준은 '모두 같은 해상도'가 아니라 ==모두 같은 밀도==입니다. 4m 벽과 25cm 컵이 같은 밀도가 되려면 해상도가 16배 차이 나야 합니다. 카메라에 가까이 오는 1인칭 무기는 의도적으로 더 높게 잡습니다." },

      { h: "UV 패딩: 밉맵이 이웃 섬을 섞는다" },
      "아틀라스에 UV 섬 두 개가 있습니다. 밉 단계가 올라갈수록 픽셀을 평균 내므로 ==섬 바깥의 배경색이 가장자리로 번져== 모델에 검은 이음매가 생깁니다. 섬을 바깥으로 늘려 칠하는 패딩(엣지 팽창)을 늘려 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["밉 {m} 에서 한 텍셀 = 원본 {n}×{n} 픽셀 평균   ·   패딩 {p} px"],
        setup(F, C, L) {
          let mip = 3, pad = 0;
          C.slider({ label: "밉 단계", min: 0, max: 5, step: 1, value: mip, fmt: f0, onInput: x => { mip = x; } });
          C.slider({ label: "패딩 (px)", min: 0, max: 16, step: 1, value: pad, fmt: f0, onInput: x => { pad = x; } });
          const N = 64;
          const isl = (i, j) => (i > 6 && i < 30 && j > 8 && j < 50 ? 1 : (i > 34 && i < 58 && j > 20 && j < 44 ? 2 : 0));
          const COL = [[0, 0, 0], [230, 120, 60], [90, 190, 120]];
          let cache = {};
          const build = () => {
            const key = pad;
            if (cache.key === key) return cache;
            let img = [];
            for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) img.push(isl(i, j));
            for (let k = 0; k < pad; k++) { const nx = img.slice(); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (img[j * N + i]) continue; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a >= 0 && a < N && b >= 0 && b < N && img[b * N + a]) { nx[j * N + i] = img[b * N + a]; break; } } } img = nx; }
            const levels = [img.map(v => COL[v])];
            for (let m = 1; m <= 5; m++) { const s = N >> m, prev = levels[m - 1], ps = s * 2, cur = []; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const a = prev[(2 * j) * ps + 2 * i], b = prev[(2 * j) * ps + 2 * i + 1], c = prev[(2 * j + 1) * ps + 2 * i], d = prev[(2 * j + 1) * ps + 2 * i + 1]; cur.push([0, 1, 2].map(k => (a[k] + b[k] + c[k] + d[k]) / 4)); } levels.push(cur); }
            cache = { key, levels };
            return cache;
          };
          F.draw = g => {
            const { levels } = build(), s = N >> mip, lv = levels[mip];
            g.field(256, (x, y) => {
              if (x < 2) { const i = Math.floor(x / 2 * s), j = Math.floor((2 - y) / 2 * s); const c = lv[j * s + i]; return [...c, 255]; }
              // 오른쪽: 섬 1(주황)의 가장자리를 모델 위에서 확대해 본 모습 — 이음매 근처를 같은 밉으로 샘플
              const u = 7 / 64 + (x - 2) / 2 * (22 / 64), v = 30 / 64 + (y - 1) * 0.02;
              const i = clamp(Math.floor(u * s), 0, s - 1), j = clamp(Math.floor(v * s), 0, s - 1), c = lv[j * s + i];
              return [...c, 255];
            }, { smooth: false });
            g.line([2, 0], [2, 2], "white", { w: 2 });
            g.text("아틀라스 (밉 " + mip + ")", [1, 1.92], "white", { size: 12, bold: true }); g.text("모델 위 섬 가장자리", [3, 1.92], "white", { size: 12, bold: true });
            L.set("m", mip); L.set("n", 1 << mip); L.set("p", pad);
          };
        }
      } },
      "패딩은 ==가장 높은 밉에서 한 텍셀이 되는 크기==까지 필요합니다. 2048 텍스처에서 밉 4까지 버티려면 16px 정도입니다. 베이킹 툴과 Substance의 'Dilation' 설정이 이것입니다.",

      { h: "UV 왜곡: 늘어난 곳 찾기" },
      "모델 위 삼각형(오른쪽)과 UV 위 삼각형(왼쪽)의 ==넓이 비율==이 다르면 텍스처가 늘어나거나 줄어듭니다. UV 꼭짓점을 끌어 체크 무늬와 색(파랑 = 압축, 빨강 = 늘어남)을 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["늘어남 = (모델 넓이 / 모델 전체) ÷ (UV 넓이 / UV 전체) = {s}"],
        setup(F, C, L) {
          const P = [[0.4, -1.6], [3.6, -1.4], [3.2, 1.6], [0.6, 1.4]];
          const UV = [[-3.6, -1.6], [-1.0, -1.6], [-1.2, 0.9], [-3.4, 1.4]];
          UV.forEach(q => F.vec(q, "green", { snap: 0.02 }));
          const tris = [[0, 1, 2], [0, 2, 3]];
          const area = (a, b, c) => Math.abs(edge(a, b, c)) / 2;
          F.draw = g => {
            const tp = tris.map(t => area(P[t[0]], P[t[1]], P[t[2]])), tu = tris.map(t => area(UV[t[0]], UV[t[1]], UV[t[2]]));
            const sp = tp[0] + tp[1], su = tu[0] + tu[1];
            const st = tris.map((_, k) => (tp[k] / sp) / (tu[k] / su || 1e-6));
            g.field(240, (x, y) => {
              for (let k = 0; k < 2; k++) {
                const t = tris[k], A = P[t[0]], B = P[t[1]], Cc = P[t[2]], ar = edge(A, B, Cc);
                const w = [edge(B, Cc, [x, y]) / ar, edge(Cc, A, [x, y]) / ar, edge(A, B, [x, y]) / ar];
                if (w.every(q => q >= 0)) {
                  const uv = [0, 1].map(c => w[0] * UV[t[0]][c] + w[1] * UV[t[1]][c] + w[2] * UV[t[2]][c]);
                  const chk = (Math.floor(uv[0] * 3) + Math.floor(uv[1] * 3)) % 2 ? 1 : 0.55;
                  const s = Math.log2(st[k]), heat = s > 0 ? [252, 98, 85] : [88, 196, 221], m = clamp(Math.abs(s), 0, 1);
                  return [0, 1, 2].map(i => lerp(220, heat[i], m) * chk).concat(255);
                }
              }
              return null;
            });
            g.poly(UV, { fill: "rgba(131,193,103,0.12)", stroke: "green", w: 2 }); g.line(UV[0], UV[2], "green", { w: 1, dash: [3, 3] });
            g.poly(P, { stroke: "white", w: 1.5 }); g.line(P[0], P[2], "white", { w: 1, dash: [3, 3] });
            g.text("UV", [-2.3, 1.85], "white", { size: 12, bold: true }); g.text("모델", [2, 1.85], "white", { size: 12, bold: true });
            L.set("s", st.map(v => num(v, 2)).join(", "));
          };
        }
      } },

      { use: [
        ["TA", "밀도 기준표와 검사 툴", "프로젝트 시작 시 '배경 512px/m, 캐릭터 1024px/m' 같은 기준을 정하고, 에디터 유틸리티로 위반 에셋을 찾아냅니다."],
        ["엔진", "뷰 모드로 확인", "UE의 Required Texture Resolution·Material Texture Scale 뷰 모드가 화면에서 텍셀 밀도가 맞는지 색으로 보여 줍니다."],
        ["아트", "UV 레이아웃 툴", "RizomUV·Maya UV의 Texel Density 설정, 섬 간 여백(Shell Padding)이 이 장의 밀도와 패딩입니다."],
        ["실생활", "인쇄 해상도(DPI)", "인쇄물의 '인치당 점 수(DPI)'도 같은 개념입니다. 포스터와 명함이 같은 DPI여야 선명도가 같습니다."]
      ] },

      { recap: [
        ["밀도 = 해상도 × UV 비율 / 월드 크기", "px/m로 물체끼리 맞추기"],
        ["밉 n 단계 = 2^n × 2^n 픽셀 평균", "섬 바깥 색이 번짐"],
        ["패딩 ≥ 2^(최대 밉)", "엣지 팽창으로 이음매 방지"],
        ["모델 넓이 비율 ÷ UV 넓이 비율", "UV 늘어남 검사"]
      ] }
    ]
  });
})();
