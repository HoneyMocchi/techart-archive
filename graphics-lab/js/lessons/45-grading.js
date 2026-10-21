/* 45 컬러 그레이딩과 LUT */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = t => t * t * (3 - 2 * t); return lerp(lerp(hash(i, j), hash(i + 1, j), s(fx)), lerp(hash(i, j + 1), hash(i + 1, j + 1), s(fx)), s(fy)); };
  // 원본 이미지(감마 공간 0~1): 노을 하늘 · 산 · 호수 · 풀
  function scene(u, v) {
    if (v > 0.55) { const t = (v - 0.55) / 0.45, sun = Math.exp(-Math.pow(Math.hypot(u - 0.7, v - 0.62) / 0.06, 2)); return [lerp(0.95, 0.35, t) + sun * 0.3, lerp(0.6, 0.45, t) + sun * 0.3, lerp(0.45, 0.7, t) + sun * 0.1]; }
    const ridge = 0.45 + 0.08 * Math.sin(u * 9) + 0.05 * vn(u * 12, 1);
    if (v > ridge) return [0.35, 0.3, 0.4];
    if (v > 0.32) { const n = vn(u * 30, v * 30); return [0.2 + 0.1 * n, 0.35 + 0.15 * n, 0.15]; }
    if (v > 0.18) return [0.3 + 0.2 * vn(u * 50, v * 10), 0.45, 0.55];
    return [0.12, 0.2, 0.09 + 0.06 * vn(u * 40, v * 40)];
  }
  const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // 단조 3차 보간 커브: 점 (0,0), p1..p3, (1,1)
  function curve(pts, x) {
    const P = [[0, 0], ...pts, [1, 1]];
    let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++;
    const a = P[i], b = P[i + 1], t = (x - a[0]) / (b[0] - a[0] || 1);
    const s = t * t * (3 - 2 * t), lin = lerp(a[1], b[1], t), sm = lerp(a[1], b[1], s);
    return clamp(lerp(lin, sm, 0.5), 0, 1);
  }

  lesson({
    topic: "grading", title: "컬러 그레이딩과 LUT", desc: "화면 전체의 색 보정", stage: "테크아트 실전",
    sym: {},
    hook: "같은 장면도 색 보정 하나로 아침·노을·공포 분위기가 됩니다. 영화의 색 보정을 게임은 ==매 프레임 모든 픽셀에 적용==해야 하므로, 복잡한 보정을 미리 ==3D 색 표(LUT) 한 장으로 구워 두고 한 번 읽는== 방법을 씁니다.",
    blocks: [
      { h: "톤 커브: 밝기별로 다르게" },
      "가로가 입력 밝기, 세로가 출력 밝기입니다. 세 점(어두운 곳·중간·밝은 곳)을 끌어 보세요. ==S자로 만들면 대비가 올라가고==, 어두운 점을 올리면 그림자가 뜹니다. 아래 막대그래프는 밝기 분포(히스토그램)입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["출력 = 커브(입력)   — 각 채널에 같은 커브 적용"],
        setup(F, C, L) {
          const pts = [[0.25, 0.18], [0.5, 0.52], [0.75, 0.84]];
          const G0 = [2.25, 0.35], GS = 1.5;
          pts.forEach((p, i) => F.handle({ color: ["blue", "green", "gold"][i], get: () => [G0[0] + p[0] * GS, G0[1] + p[1] * GS], set: (x, y) => { p[1] = clamp((y - G0[1]) / GS, 0, 1); p[0] = clamp((x - G0[0]) / GS, i === 0 ? 0.05 : pts[i - 1][0] + 0.05, i === 2 ? 0.95 : pts[i + 1][0] - 0.05); } }));
          F.draw = g => {
            const hist = new Array(32).fill(0);
            g.field(200, (x, y) => {
              if (x > 2 || y < 0.1 || y > 1.9) return null;
              const c = scene(x / 2, (y - 0.1) / 1.8).map(v => curve(pts, clamp(v, 0, 1)));
              hist[Math.min(31, Math.floor(luma(c) * 32))]++;
              return c.map(v => v * 255).concat(255);
            }, { rect: { x0: 0, x1: 2, y0: 0.1, y1: 1.9 }, smooth: false });
            g.poly([G0, [G0[0] + GS, G0[1]], [G0[0] + GS, G0[1] + GS], [G0[0], G0[1] + GS]], { stroke: "rgba(236,239,244,0.25)", w: 1 });
            g.line(G0, [G0[0] + GS, G0[1] + GS], "grey", { w: 1, dash: [3, 4] });
            const mx = Math.max(...hist);
            hist.forEach((h, i) => g.poly([[G0[0] + i / 32 * GS, G0[1]], [G0[0] + (i + 1) / 32 * GS, G0[1]], [G0[0] + (i + 1) / 32 * GS, G0[1] + h / mx * 0.5], [G0[0] + i / 32 * GS, G0[1] + h / mx * 0.5]], { fill: "rgba(236,239,244,0.12)" }));
            const cp = []; for (let i = 0; i <= 60; i++) { const x = i / 60; cp.push([G0[0] + x * GS, G0[1] + curve(pts, x) * GS]); }
            g.poly(cp, { stroke: "yellow", w: 2.5, close: false });
            g.text("입력 →", [G0[0] + GS, G0[1]], "grey", { size: 10, align: "right", dy: 10 });
          };
        }
      } },

      { h: "3D LUT: 모든 색에 대한 답을 미리 표로" },
      "색 보정(채도·색온도·대비)을 ==가능한 모든 RGB 조합에 대해 미리 계산해 3D 표==로 만듭니다. 화면에서는 픽셀 색을 좌표로 써서 표를 읽기만 하면 됩니다. 위 띠가 펼친 LUT(파랑 칸 단위로 자른 슬라이스)입니다. 표 크기를 줄이면 무엇이 변하는지 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: 0, x1: 4, y0: 0, y1: 2.24 },
        eq: ["결과 = LUT[r, g, b]   ({n}³ 칸, 보간: {it})"],
        setup(F, C, L) {
          let sat = 1.3, temp = 0.15, con = 1.15, n = 16, tri = true;
          C.slider({ label: "채도", min: 0, max: 2, value: sat, onInput: x => { sat = x; } });
          C.slider({ label: "색온도", min: -0.4, max: 0.4, value: temp, onInput: x => { temp = x; } });
          C.slider({ label: "대비", min: 0.6, max: 1.6, value: con, onInput: x => { con = x; } });
          C.seg({ options: [{ value: 4, label: "4³" }, { value: 8, label: "8³" }, { value: 16, label: "16³" }, { value: 32, label: "32³" }], value: 16, onChange: x => { n = +x; } });
          C.seg({ options: [{ value: 1, label: "3선형 보간" }, { value: 0, label: "가장 가까운 칸" }], value: 1, onChange: x => { tri = !!x; } });
          const grade = c => { const l = luma(c); let o = c.map(v => lerp(l, v, sat)); o = [o[0] + temp * 0.3, o[1] + temp * 0.05, o[2] - temp * 0.3]; return o.map(v => clamp((v - 0.5) * con + 0.5, 0, 1)); };
          F.draw = g => {
            const lut = [];
            for (let b = 0; b < n; b++) for (let gg = 0; gg < n; gg++) for (let r = 0; r < n; r++) lut.push(grade([r / (n - 1), gg / (n - 1), b / (n - 1)]));
            const at = (r, gg, b) => lut[(b * n + gg) * n + r];
            const look = c => {
              const f = c.map(v => clamp(v, 0, 1) * (n - 1));
              if (!tri) return at(Math.round(f[0]), Math.round(f[1]), Math.round(f[2]));
              const i = f.map(v => Math.min(n - 2, Math.floor(v))), t = f.map((v, k) => v - i[k]);
              const res = [0, 0, 0];
              for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const w = (dx ? t[0] : 1 - t[0]) * (dy ? t[1] : 1 - t[1]) * (dz ? t[2] : 1 - t[2]), q = at(i[0] + dx, i[1] + dy, i[2] + dz); for (let k = 0; k < 3; k++) res[k] += q[k] * w; }
              return res;
            };
            // 펼친 LUT 띠
            g.field(n * n, (x, y) => { const i = Math.floor(x / 4 * n * n), b = Math.floor(i / n), r = i % n, gg = Math.floor((y - 1.9) / 0.3 * n); const q = at(r, clamp(gg, 0, n - 1), b); return q.map(v => v * 255).concat(255); }, { rect: { x0: 0, x1: 4, y0: 1.9, y1: 2.2 }, rows: n, smooth: false });
            g.field(220, (x, y) => {
              if (y > 1.82) return null;
              const left = x < 2, u = (left ? x : x - 2) / 2, c = scene(u, y / 1.82);
              return (left ? c : look(c)).map(v => v * 255).concat(255);
            }, { rect: { x0: 0, x1: 4, y0: 0, y1: 1.82 }, smooth: false });
            g.line([2, 0], [2, 1.82], "white", { w: 2 });
            g.text("원본", [1, 1.72], "white", { size: 12, bold: true }); g.text("LUT 적용", [3, 1.72], "white", { size: 12, bold: true });
            L.set("n", n); L.set("it", tri ? "3선형" : "없음 → 표가 작으면 색 띠");
          };
        }
      } },
      { key: "LUT 하나에 ==채도·색온도·대비·커브·영화풍 보정까지 모두== 들어갑니다. 보정이 아무리 복잡해도 실행 비용은 텍스처 읽기 한 번입니다. 그래서 아트 디렉터가 포토샵에서 만든 보정을 그대로 게임에 가져올 수 있습니다." },

      { h: "리프트 · 감마 · 게인: 어두운 곳·중간·밝은 곳에 따로 색 넣기" },
      "세 색상환의 점을 끌어 ==그림자(리프트), 중간톤(감마), 밝은 곳(게인)==에 서로 다른 색을 섞습니다. 영화의 '청록 그림자 + 주황 피부'(틸 앤 오렌지)를 만들어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["결과 = (게인 · (입력 + 리프트 · (1 − 입력)))^(1 / 감마)"],
        setup(F, C, L) {
          const W = [[0.45, 0.42], [1.35, 0.42], [2.25, 0.42]], R = 0.32;
          const off = [[-0.12, 0.1], [0, 0], [0.1, -0.06]];
          off.forEach((o, i) => F.handle({ color: "white", get: () => V.add(W[i], o), set: (x, y) => { let d = V.sub([x, y], W[i]); if (V.len(d) > R) d = V.mul(V.norm(d), R); o[0] = d[0]; o[1] = d[1]; } }));
          const tint = o => { const a = Math.atan2(o[1], o[0]), s = V.len(o) / R; return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.cos(a - 2.094), 0.5 + 0.5 * Math.cos(a + 2.094)].map(c => (c - 0.5) * s); };
          F.draw = g => {
            const lift = tint(off[0]).map(v => v * 0.3), gam = tint(off[1]).map(v => 1 + v * 0.8), gain = tint(off[2]).map(v => 1 + v * 0.6);
            g.field(220, (x, y) => {
              if (x < 2.8 && y < 0.9) {
                for (let i = 0; i < 3; i++) { const d = V.sub([x, y], W[i]); if (V.len(d) < R) { const a = Math.atan2(d[1], d[0]), s = V.len(d) / R; return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.cos(a - 2.094), 0.5 + 0.5 * Math.cos(a + 2.094)].map(c => lerp(0.5, c, s) * 230).concat(255); } }
                return [16, 19, 26, 255];
              }
              if (y < 0.95) return [16, 19, 26, 255];
              const c = scene(x / 4, (y - 0.95) / 1.05);
              const o = c.map((v, k) => Math.pow(clamp(gain[k] * (v + lift[k] * (1 - v)), 0, 1), 1 / gam[k]));
              return o.map(v => v * 255).concat(255);
            }, { smooth: false });
            ["리프트 (그림자)", "감마 (중간)", "게인 (밝은 곳)"].forEach((t, i) => g.text(t, [W[i][0], 0.03], "grey", { size: 11, dy: -2 }));
          };
        }
      } },

      { use: [
        ["엔진", "포스트 프로세스 그레이딩", "UE 포스트 프로세스의 Color Grading(Global·Shadows·Midtones·Highlights 색상환)과 Color Grading LUT 텍스처가 이 장입니다. 16³ LUT를 256×16 스트립으로 저장합니다."],
        ["TA", "LUT 파이프라인", "중립 LUT 스트립을 스크린샷 위에 얹어 포토샵·DaVinci에서 보정하고, 그 LUT만 잘라 엔진에 넣는 흐름을 아티스트에게 툴로 제공합니다."],
        ["게임", "상황별 분위기", "실내·실외, 체력 낮음, 회상 장면마다 포스트 프로세스 볼륨으로 LUT를 바꾸고 섞어 분위기를 전환합니다."],
        ["실생활", "사진 필터와 영화", "인스타그램 필터와 영화 색 보정(DI)이 같은 커브·LUT입니다. 카메라 회사의 'Log → Rec.709' 변환표도 LUT로 배포됩니다."]
      ] },

      { recap: [
        ["출력 = 커브(입력)", "톤 커브: S자 = 대비"],
        ["결과 = LUT[r, g, b]", "모든 보정을 3D 표 한 장으로, 3선형 보간"],
        ["리프트 · 감마 · 게인", "그림자·중간·밝은 곳에 따로 색"],
        ["보정 비용 = 텍스처 읽기 한 번", "실시간 그레이딩의 핵심"]
      ] }
    ]
  });
})();
