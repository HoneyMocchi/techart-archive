/* 73 MLAA·SMAA: 계단 모양을 읽어 원래 선을 되살리기 (호르헤 히메네스) */
(() => {
  const f3 = n => num(n, 3);
  // 계단 한 줄의 재구성선: 왼쪽 끝 높이 yl, 오른쪽 끝 높이 yr (경계선 기준 −0.5, 0, +0.5), 길이 len
  // U 모양(양끝이 같은 쪽)은 가운데에서 꺾이는 두 선, 나머지는 곧은 선
  const lineAt = (yl, yr, len) => (x => {
    if (yl && yl === yr) { const m = len / 2; return x < m ? lerp(yl, 0, x / m) : lerp(0, yr, (x - m) / m); }
    return lerp(yl, yr, x / len);
  });
  // 픽셀 열 [i, i+1]에서 경계 위/아래 면적
  const areas = (fn, i) => { let up = 0, dn = 0; for (let k = 0; k < 16; k++) { const y = fn(i + (k + 0.5) / 16); if (y > 0) up += y; else dn -= y; } return [up / 16, dn / 16]; };
  // MLAA 한 방향 패스: get(i, j)는 0/1, 결과는 blend(i, j, oi, oj, w)로 알림
  function pass(get, W, H, blend, lines) {
    for (let j = 0; j < H - 1; j++) {
      let i = 0;
      while (i < W) {
        if (get(i, j) === get(i, j + 1)) { i++; continue; }
        let a = i; while (i < W && get(i, j) !== get(i, j + 1)) i++;
        const b = i, side = (x, y0, y1) => { const up = get(x, j + 1) !== get(y0, j + 1), dn = get(x, j) !== get(y0, j); return up && !dn ? 0.5 : dn && !up ? -0.5 : 0; };
        const yl = a > 0 ? side(a - 1, a) : 0, yr = b < W ? side(b, b - 1) : 0, len = b - a, fn = lineAt(yl, yr, len);
        if (lines) lines.push({ j, a, b, fn });
        for (let x = a; x < b; x++) {
          const [up, dn] = areas(fn, x - a);
          if (up) blend(x, j + 1, x, j, up);
          if (dn) blend(x, j, x, j + 1, dn);
        }
      }
    }
  }

  lesson({
    topic: "smaa", title: "MLAA와 SMAA", desc: "계단 모양을 읽어 선을 되살리기", stage: "그래픽스 연구 노트",
    sym: { d: "teal" },
    hook: "후처리 안티에일리어싱은 완성된 그림 한 장만 보고 계단을 지웁니다. FXAA(51장)가 경계를 흐리는 쪽이라면, ==MLAA와 그 후계 SMAA==는 계단의 ==모양(L·Z·U)을 읽어 원래 있었을 직선을 복원==하고, 그 선이 각 픽셀을 덮는 ==면적==만큼 이웃 색을 섞습니다. 호르헤 히메네스 팀이 GPU에서 실시간으로 돌게 만든 방법입니다.",
    blocks: [
      { h: "세 단계: 경계 → 모양 → 면적" },
      "꼭짓점을 끌어 삼각형을 움직이고 단계를 바꿔 보세요. ① 이웃과 색이 다른 곳에 ==경계(빨강)==를 긋습니다. ② 경계가 끊기는 양끝이 위로 꺾이는지 아래로 꺾이는지 보고 ==재구성선(노랑)==을 긋습니다. ③ 선이 픽셀을 덮는 ==면적만큼 건너편 색을 섞습니다==. 마지막은 픽셀마다 실제 덮인 비율(정답)입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 28, y0: 0, y1: 14 },
        eq: ["{eq}   ·   정답과의 평균 오차: 원본 {e0} → MLAA {e1}"],
        setup(F, C, L) {
          const W = 28, H = 14, T = [[2.3, 2.2], [25.6, 4.7], [9.4, 12.2]];
          let st = 2;
          T.forEach(p => F.vec(p, "white", { snap: 0.05 }));
          C.seg({ options: [{ value: 0, label: "원본" }, { value: 1, label: "경계 + 재구성선" }, { value: 2, label: "MLAA 결과" }, { value: 3, label: "정답(덮인 비율)" }], value: st, onChange: x => { st = x; } });
          const inside = (x, y) => { const s = (a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); const d1 = s(T[0], T[1]), d2 = s(T[1], T[2]), d3 = s(T[2], T[0]); return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0); };
          F.draw = g => {
            const I = [], cov = [];
            for (let j = 0; j < H; j++) { I.push([]); cov.push([]); for (let i = 0; i < W; i++) { I[j].push(inside(i + 0.5, j + 0.5) ? 1 : 0); let c = 0; for (let s = 0; s < 64; s++) c += inside(i + ((s & 7) + 0.5) / 8, j + ((s >> 3) + 0.5) / 8); cov[j].push(c / 64); } }
            const out = I.map(r => r.slice()), hl = [], vl = [];
            const get = (i, j) => I[clamp(j, 0, H - 1)][clamp(i, 0, W - 1)];
            pass(get, W, H, (i, j, oi, oj, w) => { out[j][i] += (I[oj][oi] - I[j][i]) * w; }, hl);
            pass((i, j) => get(j, i), H, W, (i, j, oi, oj, w) => { out[i][j] += (I[oi][oj] - I[i][j]) * w; }, vl);
            let e0 = 0, e1 = 0;
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { out[j][i] = clamp(out[j][i], 0, 1); e0 += Math.abs(I[j][i] - cov[j][i]); e1 += Math.abs(out[j][i] - cov[j][i]); }
            const src = st === 3 ? cov : st === 2 ? out : I;
            g.field(W, (x, y, i, jj) => { const v = src[H - 1 - jj][i]; return [lerp(26, 255, v), lerp(30, 134, v), lerp(42, 47, v), 255]; }, { rows: H, smooth: false });
            for (let x = 0; x <= W; x++) g.line([x, 0], [x, H], "black", { w: 1, alpha: 0.3 });
            for (let y = 0; y <= H; y++) g.line([0, y], [W, y], "black", { w: 1, alpha: 0.3 });
            if (st === 1) {
              for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
                if (j < H - 1 && I[j][i] !== I[j + 1][i]) g.line([i, j + 1], [i + 1, j + 1], "red", { w: 3 });
                if (i < W - 1 && I[j][i] !== I[j][i + 1]) g.line([i + 1, j], [i + 1, j + 1], "red", { w: 3 });
              }
              hl.forEach(l => { const pts = []; for (let k = 0; k <= 20; k++) { const x = (l.b - l.a) * k / 20; pts.push([l.a + x, l.j + 1 + l.fn(x)]); } g.poly(pts, { stroke: "yellow", w: 2, close: false }); });
              vl.forEach(l => { const pts = []; for (let k = 0; k <= 20; k++) { const x = (l.b - l.a) * k / 20; pts.push([l.j + 1 + l.fn(x), l.a + x]); } g.poly(pts, { stroke: "yellow", w: 2, close: false }); });
            }
            g.poly(T, { stroke: "white", w: 1, alpha: st === 3 ? 0.5 : 0.25, dash: [4, 4] });
            L.set("eq", ["픽셀 중심이 안이면 1, 밖이면 0 → 계단", "빨강 = 경계, 노랑 = 양끝 꺾임으로 되살린 직선", "재구성선이 덮는 면적만큼 건너편 색과 섞음", "픽셀 안 64점 중 삼각형 안 비율"][st]);
            L.set("e0", f3(e0 / (W * H))); L.set("e1", f3(e1 / (W * H)));
          };
        }
      } },
      { key: "모든 과정이 ==그림 한 장과 몇 번의 텍스처 읽기==로 끝납니다. 장면 정보(삼각형, 깊이)가 필요 없어서 어떤 렌더러에도 붙일 수 있습니다. 대신 픽셀보다 가는 선처럼 ==이미 정보가 사라진 경우는 되살릴 수 없습니다==." },

      { h: "면적 텍스처: 계산을 미리 구워 두기" },
      "③단계의 면적은 ==양끝 모양(위·평평·아래)과 양끝까지의 거리 $d_1$, $d_2$== 만으로 정해집니다. 그래서 SMAA는 모든 경우를 미리 계산해 작은 텍스처(AreaTex)에 담아 두고, 셰이더는 한 번 읽기만 합니다. 왼쪽 표의 칸을 눌러 보세요. 빨강 = 경계 위 면적, 초록 = 아래 면적입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["왼쪽 끝 {l}, 오른쪽 끝 {r}, d₁ = {d1}, d₂ = {d2}  →  위 {up}, 아래 {dn}"],
        setup(F, C, L) {
          const T3 = [0.5, 0, -0.5], NM = { "0.5": "위로", "0": "평평", "-0.5": "아래로" }, S = 8;
          let sel = { bl: 0, br: 2, d1: 2, d2: 4 };
          const cell = (bl, br, d1, d2) => { const len = d1 + d2 + 1, fn = lineAt(T3[bl], T3[br], len); return areas(fn, d1); };
          F.onTap = (p, sx, sy, moving) => {
            if (p[0] < 0.1 || p[0] > 1.9 || p[1] < 0.1 || p[1] > 1.9) return;
            const u = (p[0] - 0.1) / 1.8 * 3 * S, v = (1.9 - p[1]) / 1.8 * 3 * S;
            sel = { bl: Math.floor(v / S), br: Math.floor(u / S), d1: Math.floor(v) % S, d2: Math.floor(u) % S };
          };
          F.draw = g => {
            g.field(3 * S, (x, y, i, j) => { const a = cell(Math.floor(j / S), Math.floor(i / S), j % S, i % S); return [clamp(a[0] * 2, 0, 1) * 255, clamp(a[1] * 2, 0, 1) * 255, 40, 255]; }, { rect: { x0: 0.1, x1: 1.9, y0: 0.1, y1: 1.9 }, rows: 3 * S, smooth: false });
            for (let k = 1; k < 3; k++) { g.line([0.1 + k * 0.6, 0.1], [0.1 + k * 0.6, 1.9], "white", { w: 1.5 }); g.line([0.1, 0.1 + k * 0.6], [1.9, 0.1 + k * 0.6], "white", { w: 1.5 }); }
            const cx = 0.1 + (sel.br * S + sel.d2 + 0.5) / (3 * S) * 1.8, cy = 1.9 - (sel.bl * S + sel.d1 + 0.5) / (3 * S) * 1.8;
            g.circle([cx, cy], 0.04, "white", { w: 2 });
            g.text("↓ 왼쪽 끝 모양 · d₁", [0.1, 1.96], "grey", { size: 10, align: "left" }); g.text("→ 오른쪽 끝 모양 · d₂", [1.9, 0.04], "grey", { size: 10, align: "right" });
            // 오른쪽: 선택한 경우의 계단과 재구성선
            const len = sel.d1 + sel.d2 + 1, sc = Math.min(0.17, 1.7 / (len + 2)), ox = 2.95 - (len + 2) * sc / 2, oy = 1.0, yl = T3[sel.bl], yr = T3[sel.br], fn = lineAt(yl, yr, len);
            const X = x => ox + (x + 1) * sc, Y = y => oy + y * sc * 1.6;
            for (let x = -1; x <= len; x++) for (let r = -1; r <= 0; r++) g.poly([[X(x), Y(r)], [X(x + 1), Y(r)], [X(x + 1), Y(r + 1)], [X(x), Y(r + 1)]], { stroke: "rgba(255,255,255,0.15)", w: 1, fill: x === sel.d1 ? "rgba(244,211,69,0.12)" : null });
            g.line([X(0), Y(0)], [X(len), Y(0)], "red", { w: 3 });
            if (yl) g.line([X(0), Y(0)], [X(0), Y(yl * 2)], "red", { w: 3 });
            if (yr) g.line([X(len), Y(0)], [X(len), Y(yr * 2)], "red", { w: 3 });
            const pts = []; for (let k = 0; k <= 40; k++) { const x = len * k / 40; pts.push([X(x), Y(fn(x))]); } g.poly(pts, { stroke: "yellow", w: 2.5, close: false });
            const a = cell(sel.bl, sel.br, sel.d1, sel.d2);
            L.set("l", NM[String(yl)]); L.set("r", NM[String(yr)]); L.set("d1", sel.d1); L.set("d2", sel.d2); L.set("up", num(a[0], 3)); L.set("dn", num(a[1], 3));
          };
        }
      } },
      { key: "SMAA는 MLAA에 ==대각선 패턴 검출, 코너 보존, 날카로운 형상 보호, 그리고 시간 축(SMAA T2x·S2x)==을 더한 것입니다. 경계 검출도 밝기·색·깊이 중 고를 수 있습니다. 히메네스 외 'SMAA: Enhanced Subpixel Morphological Antialiasing'(2012)이 원문이고, 소스가 공개되어 있습니다." },

      { use: [
        ["게임", "널리 쓰인 AA", "크라이시스 2의 MLAA 변형, 이후 SMAA는 많은 PC·콘솔 게임의 옵션 메뉴에 들어갔습니다. 지금도 TAA를 끄고 싶은 게임이나 에뮬레이터, ReShade 같은 후처리 도구에서 기본 선택지입니다."],
        ["엔진", "UE·Unity 지원", "Unity URP·HDRP의 'SMAA' 안티에일리어싱 모드가 이것이고, UE는 5.x에서 SMAA를 실험 기능으로 추가했습니다(r.AntiAliasingMethod)."],
        ["TA", "면적 텍스처와 룩업", "AreaTex·SearchTex처럼 '복잡한 계산을 미리 구워 텍스처로 읽기'는 BRDF LUT(17장), 컬러 그레이딩 LUT(45장)와 같은 발상입니다."],
        ["실생활", "벡터화와 업스케일", "픽셀 아트를 매끈하게 키우는 hqx·xBR·Kopf-Lischinski 같은 '픽셀 아트 벡터화'도 계단 모양을 읽어 선을 되살린다는 같은 생각입니다."]
      ] },

      { recap: [
        ["경계 검출", "이웃과 밝기·색이 다른 곳"],
        ["L·Z·U 모양 + 거리 d₁, d₂", "양끝 꺾임으로 원래 직선 추정"],
        ["재구성선이 덮는 면적", "그만큼 건너편 색 섞기"],
        ["AreaTex", "면적 계산을 미리 구워 한 번 읽기"]
      ] }
    ]
  });
})();
