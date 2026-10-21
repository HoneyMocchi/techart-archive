/* 77 텍스처 아틀라스: 아틀라스 안에서 반복하기 · 채우기 */
(() => {
  const fract = x => x - Math.floor(x);
  const N = 64;   // 아틀라스 64×64, 칸 4개(각 32×32)
  const TILE_COL = [[0.75, 0.3, 0.22], [0.3, 0.6, 0.3], [0.25, 0.45, 0.8], [0.9, 0.78, 0.3]];
  const atlas0 = (() => {
    const a = new Float32Array(N * N * 3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = (x >= 32 ? 1 : 0) + (y >= 32 ? 2 : 0), lx = x % 32, ly = y % 32;
      let c = TILE_COL[t];
      if (t === 0) { const r = Math.floor(ly / 8), bx = (lx + (r % 2) * 8) % 16; if (ly % 8 === 0 || bx === 0) c = [0.85, 0.82, 0.76]; }
      else if ((lx + ly) % 8 < 2) c = c.map(k => k * 0.8);
      for (let k = 0; k < 3; k++) a[(y * N + x) * 3 + k] = c[k];
    }
    return a;
  })();
  const MIPS = [{ n: N, a: atlas0 }];
  while (MIPS[MIPS.length - 1].n > 1) {
    const p = MIPS[MIPS.length - 1], n = p.n / 2, a = new Float32Array(n * n * 3);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (let k = 0; k < 3; k++)
      a[(y * n + x) * 3 + k] = (p.a[((2 * y) * p.n + 2 * x) * 3 + k] + p.a[((2 * y) * p.n + 2 * x + 1) * 3 + k] + p.a[((2 * y + 1) * p.n + 2 * x) * 3 + k] + p.a[((2 * y + 1) * p.n + 2 * x + 1) * 3 + k]) / 4;
    MIPS.push({ n, a });
  }
  // 반복(wrap) 쌍선형 + 트라이리니어
  const bil = (m, u, v) => {
    const x = u * m.n - 0.5, y = v * m.n - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, n = m.n;
    const at = (a, b, k) => m.a[((((b % n) + n) % n) * n + (((a % n) + n) % n)) * 3 + k];
    return [0, 1, 2].map(k => lerp(lerp(at(i, j, k), at(i + 1, j, k), fx), lerp(at(i, j + 1, k), at(i + 1, j + 1, k), fx), fy));
  };
  const sample = (u, v, lod) => {
    lod = clamp(lod, 0, MIPS.length - 1); const l0 = Math.floor(lod), l1 = Math.min(MIPS.length - 1, l0 + 1), f = lod - l0;
    const a = bil(MIPS[l0], u, v), b = bil(MIPS[l1], u, v);
    return a.map((x, k) => lerp(x, b[k], f));
  };

  lesson({
    topic: "atlas", title: "텍스처 아틀라스", desc: "여러 장을 한 장에 모을 때 생기는 일", stage: "배경 아트 기법",
    sym: { u: "pink", v: "teal" },
    hook: "작은 텍스처 여러 장을 ==한 장(아틀라스)에 모으면== 머티리얼과 드로우 콜을 합칠 수 있습니다. 소품, 풀잎, UI, 데칼이 모두 아틀라스를 씁니다. 대신 칸 하나를 ==반복(타일링)하려면 셰이더가 직접 좌표를 접어야== 하고, 밉맵에서 이웃 칸이 섞여 들어옵니다. 그리고 칸들을 빈틈없이 채우는 일도 숙제입니다.",
    blocks: [
      { h: "아틀라스 안에서 반복하기: 이음새 선" },
      "멀어지는 바닥에 아틀라스의 빨간 벽돌 칸만 반복해 깔았습니다. 하드웨어 반복(wrap)은 아틀라스 전체에 걸리므로, 셰이더에서 $uv' = 칸 시작 + fract(uv) · 칸 크기$ 로 접습니다. 그런데 GPU는 ==옆 픽셀과의 uv 차이==로 밉을 고릅니다(21장). $fract$ 가 0으로 돌아가는 곳에서 차이가 갑자기 커져 ==가장 흐린 밉이 골라지고, 칸마다 선이 생깁니다==.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 0, rep = 1;
          C.seg({ options: [{ value: 0, label: "접은 뒤 미분 (기본)" }, { value: 1, label: "접기 전 미분 (SampleGrad)" }, { value: 2, label: "+ 반 텍셀 안쪽으로" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "반복 밀도", min: 0.5, max: 3, value: rep, onInput: x => { rep = x; } });
          F.draw = g => {
            const W = 160, H = 80, HOR = 6;
            const base = (i, j) => { const z = 60 / (j - HOR + 0.5), x = (i - W / 2) / W * z * 1.4; return [x * rep * 0.25, z * rep * 0.25]; };
            const fold = (uv, inset) => [inset + fract(uv[0]) * (0.5 - 2 * inset), inset + fract(uv[1]) * (0.5 - 2 * inset)];
            g.field(W, (x, y, i, j) => {
              if (j < HOR) return [20, 24, 34, 255];
              const b = base(i, j), bx = base(i + 1, j), by = base(i, j + 1);
              let du, dv;
              if (mode === 0) { const a = fold(b, 0), ax = fold(bx, 0), ay = fold(by, 0); du = Math.hypot(ax[0] - a[0], ax[1] - a[1]); dv = Math.hypot(ay[0] - a[0], ay[1] - a[1]); }
              else { du = Math.hypot(bx[0] - b[0], bx[1] - b[1]) * 0.5; dv = Math.hypot(by[0] - b[0], by[1] - b[1]) * 0.5; }
              const lod = Math.log2(Math.max(du, dv) * N + 1e-9);
              const inset = mode === 2 ? 0.5 * Math.pow(2, Math.max(0, lod)) / N : 0;
              const uv = fold(b, Math.min(inset, 0.24));
              return sample(uv[0], uv[1], lod).map(k => Math.pow(clamp(k, 0, 1), 1 / 1.6) * 255).concat(255);
            }, { rows: H, smooth: false });
            // 아틀라스 미리보기
            g.field(N, (x, y, i, j) => [atlas0[(j * N + i) * 3] * 255, atlas0[(j * N + i) * 3 + 1] * 255, atlas0[(j * N + i) * 3 + 2] * 255, 255], { rect: { x0: 1.76, x1: 1.98, y0: 0.76, y1: 0.98 }, rows: N, smooth: false });
            g.poly([[1.76, 0.87], [1.87, 0.87], [1.87, 0.98], [1.76, 0.98]], { stroke: "yellow", w: 1.5 });
            L.set("eq", ["$lod = log_2(|∂uv'/∂x|)$ — $fract$ 이 끊기는 곳에서 미분이 튀어 흐린 밉 → 칸마다 선", "미분은 접기 전 $uv$ 로 계산해 넘김 ($SampleGrad$, $ddx(uv) · 칸 크기$) → 선이 사라짐", "밉 텍셀 반 개만큼 안쪽에서 읽기 → 이웃 칸(초록·파랑) 번짐 감소. 그래도 칸보다 큰 밉에서는 못 막음"][mode]);
          };
        }
      } },
      { key: "아틀라스 반복의 정석은 ==접기 전 좌표로 미분을 구해 SampleGrad로 넘기기 + 밉 단계 수 제한 + 칸 둘레 패딩==(38장, 52장)입니다. 그래도 먼 거리 번짐은 남기 때문에, 반복이 많은 재질은 다음 장의 ==텍스처 배열==로 옮기는 것이 깔끔합니다." },

      { h: "칸 채우기: 선반 패킹" },
      "크기가 제각각인 그림을 아틀라스에 넣는 가장 흔한 방법은 ==높이순으로 정렬해 선반(줄)을 쌓는 것==입니다. 패딩(밉 번짐 방지 여백)을 늘리면 낭비가 늘고, 아틀라스는 보통 2의 거듭제곱 크기라 조금만 넘쳐도 ==두 배로 커집니다==.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["아틀라스 {S}×{S}   ·   그림이 차지한 비율 {fill}   ·   패딩 {pad}px"],
        setup(F, C, L) {
          let cnt = 40, pad = 4, sort = 1, seed = 3;
          C.slider({ label: "그림 수", min: 5, max: 120, step: 1, value: cnt, fmt: x => x + "장", onInput: x => { cnt = x; } });
          C.slider({ label: "패딩", min: 0, max: 16, step: 1, value: pad, fmt: x => x + "px", onInput: x => { pad = x; } });
          C.seg({ options: [{ value: 1, label: "높이순 정렬" }, { value: 0, label: "들어온 순서" }], value: sort, onChange: x => { sort = +x; } });
          C.button("다른 그림 세트", () => { seed++; });
          F.draw = g => {
            let s = seed * 7919; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
            const items = []; for (let k = 0; k < cnt; k++) items.push({ w: Math.round(16 + rnd() * 112), h: Math.round(16 + rnd() * 112 * (rnd() < 0.3 ? 0.35 : 1)), k });
            const order = sort ? items.slice().sort((a, b) => b.h - a.h) : items;
            let S = 64, placed;
            for (; S <= 8192; S *= 2) {
              placed = []; let x = 0, y = 0, sh = 0, ok = true;
              for (const it of order) {
                const w = it.w + pad * 2, h = it.h + pad * 2;
                if (w > S) { ok = false; break; }
                if (x + w > S) { y += sh; x = 0; sh = 0; }
                if (y + h > S) { ok = false; break; }
                placed.push({ ...it, x: x + pad, y: y + pad }); x += w; sh = Math.max(sh, h);
              }
              if (ok) break;
            }
            const X0 = 1.05, Y0 = 0.08, SZ = 1.84, k = SZ / S;
            g.poly([[X0, Y0], [X0 + SZ, Y0], [X0 + SZ, Y0 + SZ], [X0, Y0 + SZ]], { fill: "rgba(255,255,255,0.04)", stroke: "grey", w: 1 });
            let area = 0;
            placed.forEach(p => {
              area += p.w * p.h;
              const x0 = X0 + p.x * k, y1 = Y0 + SZ - p.y * k;
              if (pad) g.poly([[x0 - pad * k, y1 + pad * k], [x0 + (p.w + pad) * k, y1 + pad * k], [x0 + (p.w + pad) * k, y1 - (p.h + pad) * k], [x0 - pad * k, y1 - (p.h + pad) * k]], { fill: "rgba(252,98,85,0.25)" });
              g.poly([[x0, y1], [x0 + p.w * k, y1], [x0 + p.w * k, y1 - p.h * k], [x0, y1 - p.h * k]], { fill: `hsl(${(p.k * 47) % 360},45%,52%)` });
            });
            g.text("빨강 = 패딩", [X0 + SZ + 0.08, Y0 + 0.1], "red", { size: 10, align: "left" });
            L.set("S", S); L.set("fill", num(area / (S * S) * 100, 0) + "%"); L.set("pad", pad);
          };
        }
      } },

      { use: [
        ["엔진", "UE·Unity 아틀라스", "UE의 Paper2D·UMG 스프라이트, 나이아가라 서브UV 플립북, Unity의 Sprite Atlas가 같은 패킹을 합니다. 머티리얼에서 칸 반복은 UE의 Custom 노드 또는 'TextureSampleGrad' 계열 입력(DDX/DDY 핀)으로 처리합니다."],
        ["게임", "소품·풀·데칼", "오픈 월드의 풀잎·나뭇잎 카드, 작은 소품 수십 개, 데칼 모음이 아틀라스 한 장을 나눠 써서 머티리얼 하나로 그려집니다(인스턴싱과 궁합이 좋음)."],
        ["툴", "패킹 도구", "TexturePacker, Unity Sprite Packer, Houdini Labs Texture Sheets, Substance의 Atlas Maker가 선반·MaxRects 패킹과 패딩·회전 옵션을 제공합니다."],
        ["TA", "결정 기준", "칸을 반복할 일이 없으면 아틀라스, 반복·먼 거리 노출이 많으면 텍스처 배열(78장), 수가 아주 많고 화면별로 다르면 가상 텍스처를 고릅니다."]
      ] },

      { recap: [
        ["칸 시작 + fract(uv) · 칸 크기", "아틀라스 안에서 반복"],
        ["접기 전 uv로 미분 → SampleGrad", "이음새 선 제거"],
        ["반 텍셀 안쪽 + 패딩", "이웃 칸 번짐 줄이기"],
        ["높이순 선반 패킹", "2의 거듭제곱 크기 안에 빈틈 적게"]
      ] }
    ]
  });
})();
