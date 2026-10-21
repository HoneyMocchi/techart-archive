/* 50 TextureGather */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

  lesson({
    topic: "gather", title: "TextureGather", desc: "2×2 텍셀을 한 번에", stage: "TA 도구 상자",
    sym: { x: "green", y: "red", z: "blue", w: "orange", f: "yellow" },
    hook: "보통 텍스처 읽기는 바이리니어로 섞인 값 하나를 돌려줍니다. `Gather`는 ==섞기 전의 이웃 텍셀 4개(한 채널)를 한 번에== 돌려줍니다. 섞는 방법을 직접 정하고 싶을 때(그림자 비교, 최소·최대, 커스텀 필터) 읽기 횟수를 4분의 1로 줄입니다.",
    blocks: [
      { h: "무엇을 돌려주나" },
      "작은 텍스처를 확대했습니다. 흰 점(UV)을 끌어 보세요. `GatherRed`는 바이리니어가 쓸 ==바로 그 2×2 텍셀의 R 값 넷==을 $(x, y, z, w)$로 돌려줍니다. 순서는 ==왼쪽 아래 $x$에서 시작해 반시계==($x$ → $y$ 오른쪽 아래 → $z$ 오른쪽 위 → $w$ 왼쪽 위)입니다. 텍스처 좌표는 $v$가 아래로 커집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 8, y0: 0, y1: 4 },
        eq: ["Gather = (x, y, z, w) = ({gx}, {gy}, {gz}, {gw})", "바이리니어 = lerp(lerp(w, z, f_x), lerp(x, y, f_x), f_y) = {bl}"],
        setup(F, C, L) {
          const N = 6, cs = 0.62, O = [0.3, 0.2];
          const val = (i, j) => Math.round(hash(i, j) * 9) / 9;
          const P = [2.2, 1.9];
          F.vec(P, "white", { snap: 0.005, constrain: q => [clamp(q[0], O[0] + cs * 0.5, O[0] + cs * (N - 0.5)), clamp(q[1], O[1] + cs * 0.5, O[1] + cs * (N - 0.5))] });
          F.draw = g => {
            const top = O[1] + N * cs, cell = (i, j) => [O[0] + i * cs, top - (j + 1) * cs];   // j(= v)는 아래로 증가
            const tx = (P[0] - O[0]) / cs - 0.5, ty = (top - P[1]) / cs - 0.5, i0 = Math.floor(tx), j0 = Math.floor(ty), fx = tx - i0, fy = ty - j0;
            for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
              const v = val(i, j), c = Math.round(40 + 200 * v);
              const inQ = (i === i0 || i === i0 + 1) && (j === j0 || j === j0 + 1);
              const b = cell(i, j);
              g.poly([b, [b[0] + cs, b[1]], [b[0] + cs, b[1] + cs], [b[0], b[1] + cs]], { fill: `rgb(${c},${Math.round(c * 0.4)},${Math.round(c * 0.35)})`, stroke: inQ ? "yellow" : "rgba(16,19,26,0.6)", w: inQ ? 2.5 : 1 });
              g.text(num(v, 2), [b[0] + cs / 2, b[1] + cs / 2], "white", { size: 10 });
            }
            // D3D 규칙: w = (0,0) 왼쪽 위, z = (1,0) 오른쪽 위, y = (1,1) 오른쪽 아래, x = (0,1) 왼쪽 아래
            const W = val(i0, j0), Z = val(i0 + 1, j0), Y = val(i0 + 1, j0 + 1), X = val(i0, j0 + 1);
            [["w", i0, j0, "orange"], ["z", i0 + 1, j0, "blue"], ["y", i0 + 1, j0 + 1, "red"], ["x", i0, j0 + 1, "green"]].forEach(([t, i, j, c]) => { const b = cell(i, j); g.tex(t, [b[0] + cs * 0.2, b[1] + cs * 0.8], c, { size: 15, bold: true }); });
            const bl = lerp(lerp(W, Z, fx), lerp(X, Y, fx), fy);
            // 오른쪽: 반환값
            const R0 = 5.0;
            [["x", X, "green"], ["y", Y, "red"], ["z", Z, "blue"], ["w", W, "orange"]].forEach(([s, v, c], k) => { g.poly([[R0 + k * 0.7, 0.8], [R0 + k * 0.7 + 0.55, 0.8], [R0 + k * 0.7 + 0.55, 0.8 + v * 2.2], [R0 + k * 0.7, 0.8 + v * 2.2]], { fill: c }); g.tex(s, [R0 + k * 0.7 + 0.27, 0.8], c, { dy: 14 }); });
            g.text("Gather 한 번이 돌려주는 값", [R0 + 1.35, 3.4], "white", { size: 11, bold: true });
            L.set("gx", f2(X)); L.set("gy", f2(Y)); L.set("gz", f2(Z)); L.set("gw", f2(W)); L.set("bl", f2(bl));
          };
        }
      } },

      { h: "그림자 필터링: 한 번에 네 번 비교" },
      "섀도우 맵(18장)은 '섞은 깊이'가 아니라 ==텍셀마다 비교한 결과를 섞어야== 합니다. `GatherCmp`는 4개 텍셀을 각각 비교한 결과를 한 번에 줍니다. 이를 바이리니어 가중치로 섞으면 읽기 한 번으로 부드러운 가장자리가 나옵니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 1, res = 16;
          C.seg({ options: [{ value: 0, label: "비교 1번 (점)" }, { value: 1, label: "Gather 1번 (2×2 가중)" }, { value: 2, label: "Gather 4번 (4×4)" }], value: 1, onChange: x => { mode = x; } });
          C.slider({ label: "섀도우 맵 해상도", min: 6, max: 40, step: 1, value: res, fmt: x => num(x, 0), onInput: x => { res = x; } });
          F.draw = g => {
            const px = 4 / res;
            const occ = (i, j) => { const x = (i + 0.5) * px - 2, y = (j + 0.5) * px - 1; return Math.hypot(x + 0.2, y) < 0.7 || (x > 0.6 && x < 1.3 && y > -0.6 && y < 0.5) ? 1 : 0; };
            const g4 = (tx, ty) => { const i = Math.floor(tx), j = Math.floor(ty), fx = tx - i, fy = ty - j; return lerp(lerp(occ(i, j), occ(i + 1, j), fx), lerp(occ(i, j + 1), occ(i + 1, j + 1), fx), fy); };
            g.field(240, (x, y) => {
              const tx = (x + 2) / px - 0.5, ty = (y + 1) / px - 0.5;
              let s;
              if (mode === 0) s = occ(Math.round(tx), Math.round(ty));
              else if (mode === 1) s = g4(tx, ty);
              else s = (g4(tx - 1, ty - 1) + g4(tx + 1, ty - 1) + g4(tx - 1, ty + 1) + g4(tx + 1, ty + 1)) / 4;
              const lit = 1 - s;
              return [lerp(45, 235, lit), lerp(45, 222, lit), lerp(60, 185, lit), 255];
            });
            L.set("eq", ["읽기 1번, 비교 1번 → 계단", "읽기 1번, 비교 4번을 바이리니어 가중으로 → 부드러운 1텍셀 가장자리", "읽기 4번, 비교 16번 → 더 넓고 부드러운 PCF"][mode]);
          };
        }
      } },

      { h: "깊이 피라미드: 4개 중 가장 먼 값" },
      "가려짐 컬링(35장)에 쓰는 HZB는 깊이 버퍼를 절반씩 줄이며 ==2×2 중 가장 먼 깊이(최댓값)==를 남깁니다. 평균이 아니라 최댓값이 필요하니 바이리니어로는 안 되고, Gather 한 번으로 4개를 받아 `max`를 취합니다. 단계를 올려 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["HZB[n+1](p) = max(Gather(HZB[n], p))   ·   단계 {lv}: {s}×{s}"],
        setup(F, C, L) {
          let lv = 1;
          C.slider({ label: "피라미드 단계", min: 0, max: 4, step: 1, value: lv, fmt: x => num(x, 0), onInput: x => { lv = x; } });
          const N = 32, base = [];
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / N, y = j / N; let d = 0.9 - y * 0.3; if (Math.hypot(x - 0.35, y - 0.4) < 0.2) d = 0.3; if (x > 0.6 && x < 0.85 && y > 0.2 && y < 0.75) d = 0.45; base.push(d); }
          const levels = [base];
          for (let k = 1; k <= 4; k++) { const s = N >> k, p = levels[k - 1], ps = s * 2, c = []; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) c.push(Math.max(p[2 * j * ps + 2 * i], p[2 * j * ps + 2 * i + 1], p[(2 * j + 1) * ps + 2 * i], p[(2 * j + 1) * ps + 2 * i + 1])); levels.push(c); }
          F.draw = g => {
            const s = N >> lv, d = levels[lv];
            g.field(256, (x, y) => {
              if (x < 2) { const i = Math.floor(x / 2 * N), j = Math.floor((2 - y) / 2 * N); const v = base[j * N + i]; return [v * 255, v * 230, v * 200, 255]; }
              const i = Math.floor((x - 2) / 2 * s), j = Math.floor((2 - y) / 2 * s); const v = d[j * s + i]; return [v * 255, v * 230, v * 200, 255];
            }, { smooth: false });
            g.line([2, 0], [2, 2], "white", { w: 2 });
            g.text("깊이 버퍼 (어두울수록 가까움)", [1, 1.93], "white", { size: 11, bold: true }); g.text("HZB 단계 " + lv + " (보수적으로 가장 먼 값)", [3, 1.93], "white", { size: 11, bold: true });
            L.set("lv", lv); L.set("s", s);
          };
        }
      } },
      { key: "`Gather`는 ==읽는 양은 그대로, 읽는 횟수만 4분의 1==입니다. 바이리니어 섞기가 맞지 않는 데이터(깊이 비교, 최댓값, 물체 ID, 가중 평균을 직접 정해야 하는 디노이저)에서 빛을 발합니다." },

      { use: [
        ["엔진", "그림자 필터", "UE의 섀도우 필터링은 GatherCmp 기반 PCF를 씁니다. 그림자 품질 옵션은 Gather 횟수(커널 크기)를 바꾸는 것입니다."],
        ["엔진", "HZB와 컬링", "Hierarchical Z-Buffer 생성, 나나이트의 가려짐 컬링이 2×2 max(또는 min) 축소입니다."],
        ["셰이더", "커스텀 필터", "깊이를 고려한 업샘플(양방향 필터), 디노이저, 엣지 검출에서 4개 이웃을 한 번에 받아 가중치를 직접 계산합니다."],
        ["TA", "주의할 점", "반환 순서(x, y, z, w)가 직관과 다르고, 텍셀 중심 오프셋(0.5)을 잘못 주면 한 칸 밀린 값을 받습니다. 디버그 뷰로 꼭 확인합니다."]
      ] },

      { recap: [
        ["Gather(t, uv) = (x, y, z, w)", "섞기 전 2×2 텍셀 한 채널"],
        ["x 왼쪽 아래 → y → z → w 왼쪽 위", "반환 순서 (반시계)"],
        ["GatherCmp + 바이리니어 가중", "읽기 1번 부드러운 그림자"],
        ["max(Gather)", "HZB 깊이 피라미드"]
      ] }
    ]
  });
})();
