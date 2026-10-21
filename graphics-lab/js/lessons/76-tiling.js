/* 76 타일 텍스처와 반복 깨기 · 트림 시트 */
(() => {
  const fract = x => x - Math.floor(x);
  const HT = new Float32Array(4096); { let s = 31; for (let k = 0; k < 4096; k++) { s = (Math.imul(s, 1664525) + 1013904223) | 0; HT[k] = (s >>> 8) / 16777216; } }
  const h2 = (x, y) => HT[(x & 63) | ((y & 63) << 6)];
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(h2(i, j), h2(i + 1, j), u), lerp(h2(i, j + 1), h2(i + 1, j + 1), u), v); };
  // 주기 1인 자갈 텍스처(보로노이 4×4 칸, 주기적으로 해시) + 눈에 띄는 얼룩 하나 → 반복이 잘 보임
  function stones(u, v) {
    const U = fract(u) * 4, Vv = fract(v) * 4, i = Math.floor(U), j = Math.floor(Vv);
    let d1 = 9, d2 = 9, id = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const ci = (i + a + 4) & 3, cj = (j + b + 4) & 3, px = i + a + 0.2 + 0.6 * h2(ci, cj), py = j + b + 0.2 + 0.6 * h2(ci + 9, cj + 5);
      const d = (U - px) ** 2 + (Vv - py) ** 2;
      if (d < d1) { d2 = d1; d1 = d; id = ci + cj * 4; } else if (d < d2) d2 = d;
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1), t = h2(id, 3) * 0.25;
    let c = edge < 0.08 ? [0.22, 0.2, 0.18] : [0.52 + t, 0.48 + t * 0.9, 0.42 + t * 0.7];
    const st = Math.hypot(fract(u) - 0.3, fract(v) - 0.62);
    if (st < 0.11) c = c.map(k => k * 0.45);
    return c;
  }
  // 육각(삼각 격자) 스토캐스틱 타일링: 정점 3개마다 무작위 오프셋, 무게중심 가중
  function hexTile(u, v, sharp) {
    const sx = u * 2.6, sy = v * 2.6, k = sx - 0.57735027 * sy, l = 1.15470054 * sy;
    const bx = Math.floor(k), by = Math.floor(l), fx = k - bx, fy = l - by, fz = 1 - fx - fy;
    let w, vs;
    if (fz > 0) { w = [fz, fy, fx]; vs = [[bx, by], [bx, by + 1], [bx + 1, by]]; }
    else { w = [-fz, 1 - fy, 1 - fx]; vs = [[bx + 1, by + 1], [bx + 1, by], [bx, by + 1]]; }
    let sum = 0; const c = [0, 0, 0];
    vs.forEach((p, i) => {
      const wt = Math.pow(w[i], sharp), ou = h2(p[0] + 17, p[1] + 3) * 7, ov = h2(p[0] + 5, p[1] + 29) * 7;
      const s = stones(u + ou, v + ov); for (let q = 0; q < 3; q++) c[q] += s[q] * wt; sum += wt;
    });
    return c.map(x => x / sum);
  }
  // 트림 시트: 위에서부터 줄(행)마다 다른 무늬, u 방향으로 반복
  const ROWS = [
    { n: "볼트 줄", v0: 0, v1: 0.12 }, { n: "금속 패널 가장자리", v0: 0.12, v1: 0.3 }, { n: "고무 띠", v0: 0.3, v1: 0.42 },
    { n: "몰딩", v0: 0.42, v1: 0.62 }, { n: "콘크리트", v0: 0.62, v1: 1 }
  ];
  function trim(u, v) {
    u = fract(u);
    if (v < 0.12) { const t = (v - 0) / 0.12, d = Math.hypot(fract(u * 6) - 0.5, t - 0.5); return d < 0.22 ? [0.75, 0.75, 0.72] : d < 0.28 ? [0.25, 0.26, 0.28] : [0.45, 0.47, 0.5]; }
    if (v < 0.3) { const t = (v - 0.12) / 0.18; return t < 0.12 ? [0.85, 0.86, 0.88] : t > 0.88 ? [0.22, 0.23, 0.25] : [0.5 + 0.04 * Math.sin(u * 60), 0.52, 0.56]; }
    if (v < 0.42) { const r = fract(u * 18); return r < 0.5 ? [0.16, 0.16, 0.17] : [0.22, 0.22, 0.23]; }
    if (v < 0.62) { const t = (v - 0.42) / 0.2, p = 0.55 + 0.35 * Math.cos(t * 9.4); return [p * 0.92, p * 0.88, p * 0.8]; }
    const n = vn(u * 30, v * 30) * 0.12 + vn(u * 90, v * 90) * 0.06;
    return [0.6 + n, 0.59 + n, 0.56 + n];
  }

  lesson({
    topic: "tiling", title: "타일 텍스처와 트림 시트", desc: "적은 텍스처로 넓은 배경 칠하기", stage: "배경 아트 기법",
    sym: { u: "pink", v: "teal" },
    hook: "넓은 바닥과 벽을 고유 텍스처로 칠할 수는 없습니다. 그래서 배경은 ==반복되는 타일 텍스처==와 ==여러 줄 무늬를 한 장에 모은 트림 시트==로 칠합니다. 대신 두 가지 숙제가 생깁니다. 멀리서 ==반복 무늬가 눈에 띄는 것==과, 모델 UV를 시트의 ==어느 줄에 맞추느냐==입니다.",
    blocks: [
      { h: "반복 깨기" },
      "자갈 텍스처 한 장을 반복했습니다. 일부러 넣은 검은 얼룩 때문에 ==격자로 반복==되는 게 바로 보입니다. 큰 노이즈로 밝기를 흔들면(매크로 변화) 조금 낫고, 칸마다 다른 위치를 읽어 섞으면(이니고 킬레즈의 방법) 반복이 사라집니다. 육각 스토캐스틱은 삼각 격자 꼭짓점마다 무작위 위치를 읽어 ==세 장을 섞습니다==.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 0, zoom = 4, sharp = 5;
          C.seg({ options: [{ value: 0, label: "그대로 반복" }, { value: 1, label: "매크로 변화" }, { value: 2, label: "칸마다 다른 위치 (2번 읽기)" }, { value: 3, label: "육각 스토캐스틱 (3번 읽기)" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "멀리 보기 (반복 수)", min: 1, max: 10, value: zoom, fmt: x => num(x * 2, 0) + "×" + num(x, 0), onInput: x => { zoom = x; } });
          C.slider({ label: "육각 섞임 날카로움", min: 1, max: 12, value: sharp, onInput: x => { sharp = x; } });
          F.draw = g => {
            g.field(mode === 3 ? 130 : 170, (x, y) => {
              const u = x * zoom, v = y * zoom;
              let c;
              if (mode === 0) c = stones(u, v);
              else if (mode === 1) { const m = vn(u * 0.35, v * 0.35) * 0.6 + vn(u * 0.9 + 4, v * 0.9) * 0.4; c = stones(u, v).map((k, i) => k * lerp(0.65, 1.25, m) * [1, 0.97 + m * 0.06, 0.92 + m * 0.12][i]); }
              else if (mode === 2) {
                // 부드러운 노이즈 값으로 '가상 칸' 번호를 정하고, 인접한 두 번호의 오프셋으로 읽어 섞음
                const k = vn(u * 0.6, v * 0.6) * 8, i = Math.floor(k), f = k - i;
                const a = stones(u + h2(i, 1) * 7, v + h2(i, 2) * 7), b = stones(u + h2(i + 1, 1) * 7, v + h2(i + 1, 2) * 7);
                const t = clamp((f - 0.5) * 6 + 0.5 - 0.6 * ((a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2])), 0, 1);
                c = a.map((x2, q) => lerp(x2, b[q], t));
              } else c = hexTile(u, v, sharp);
              return c.map(k => clamp(k, 0, 1) * 255).concat(255);
            });
            L.set("eq", ["$texture(uv)$   1번 읽기, 반복 격자가 그대로 보임", "$texture(uv) × lerp(어둡게, 밝게, noise(uv · 0.35))$   밝기 얼룩으로 시선 분산", "$lerp(texture(uv + o_i), texture(uv + o_{i+1}), t)$   $i$ = 부드러운 노이즈로 정한 칸 번호", "삼각 격자 꼭짓점 3개의 무작위 오프셋으로 읽고 무게중심$^p$ 로 섞음 (Heitz-Neyret, Mikkelsen)"][mode]);
          };
        }
      } },
      { key: "반복 깨기는 ==텍스처를 더 읽는 비용==입니다(2~3배). 그래서 멀리서만 켜거나, 바닥·지형처럼 넓게 보이는 재질에만 씁니다. 육각 방식은 무늬가 섞이며 흐려질 수 있어 날카로움(지수 $p$)과 높이 기반 섞기(40장)를 함께 씁니다." },

      { h: "트림 시트: 줄마다 다른 무늬 한 장" },
      "왼쪽이 트림 시트입니다. 가로로 끝없이 반복되는 ==줄(행) 여러 개==를 한 장에 쌓았습니다. 오른쪽 건물 정면의 띠 메시를 눌러 보세요. 그 메시의 UV가 ==시트의 다른 줄로 옮겨 갑니다==. $u$ 는 길이만큼 늘어나 반복되고, $v$ 는 줄 높이 안에 갇힙니다. 모델을 새로 칠하지 않고 UV만 옮겨 모양을 바꿉니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["선택한 띠: {strip} → 시트 '{row}' 줄,  v ∈ [{v0}, {v1}]"],
        setup(F, C, L) {
          const SX0 = 0.15, SX1 = 1.45, SY0 = 0.2, SY1 = 1.85;
          const FX0 = 1.75, FX1 = 3.9;
          const strips = [
            { n: "받침", y0: 0.1, y1: 0.32, r: 2 }, { n: "볼트 띠", y0: 0.32, y1: 0.42, r: 0 }, { n: "벽면", y0: 0.42, y1: 1.4, r: 4 },
            { n: "처마 몰딩", y0: 1.4, y1: 1.62, r: 3 }, { n: "꼭대기 판", y0: 1.62, y1: 1.9, r: 1 }
          ];
          let sel = 3;
          F.onTap = (p, sx, sy, moving) => {
            if (moving) return;
            if (p[0] > FX0 && p[0] < FX1) strips.forEach((s, i) => { if (p[1] > s.y0 && p[1] < s.y1) { if (sel === i) s.r = (s.r + 1) % ROWS.length; sel = i; } });
            if (p[0] > SX0 && p[0] < SX1 && p[1] > SY0 && p[1] < SY1) { const v = (SY1 - p[1]) / (SY1 - SY0); ROWS.forEach((r, k) => { if (v >= r.v0 && v < r.v1) strips[sel].r = k; }); }
          };
          F.draw = g => {
            g.field(260, (x, y) => {
              if (x > SX0 && x < SX1 && y > SY0 && y < SY1) { const c = trim((x - SX0) / (SX1 - SX0), (SY1 - y) / (SY1 - SY0)); return c.map(k => k * 255).concat(255); }
              if (x > FX0 && x < FX1) for (const s of strips) if (y > s.y0 && y < s.y1) {
                const R = ROWS[s.r], rh = R.v1 - R.v0, sh = s.y1 - s.y0;
                const v = R.v0 + (s.y1 - y) / sh * rh, u = (x - FX0) / sh * rh * 1.3;
                return trim(u, Math.min(v, R.v1 - 1e-4)).map(k => k * 255).concat(255);
              }
              return null;
            });
            ROWS.forEach(r => g.line([SX0 - 0.03, SY1 - r.v0 * (SY1 - SY0)], [SX0, SY1 - r.v0 * (SY1 - SY0)], "grey", { w: 1 }));
            const S = strips[sel], R = ROWS[S.r];
            const ry0 = SY1 - R.v1 * (SY1 - SY0), ry1 = SY1 - R.v0 * (SY1 - SY0);
            g.poly([[SX0, ry0], [SX1, ry0], [SX1, ry1], [SX0, ry1]], { stroke: "yellow", w: 2 });
            g.poly([[FX0, S.y0], [FX1, S.y0], [FX1, S.y1], [FX0, S.y1]], { stroke: "yellow", w: 2 });
            g.line([SX1, (ry0 + ry1) / 2], [FX0, (S.y0 + S.y1) / 2], "yellow", { w: 1.2, dash: [4, 4] });
            strips.forEach(s => g.line([FX0, s.y0], [FX1, s.y0], "black", { w: 1, alpha: 0.4 }));
            g.text("트림 시트", [(SX0 + SX1) / 2, 0.08], "grey", { size: 11 }); g.text("건물 정면 (띠를 눌러 줄 바꾸기)", [(FX0 + FX1) / 2, 1.96], "grey", { size: 11 });
            L.set("strip", S.n); L.set("row", R.n); L.set("v0", num(R.v0, 2)); L.set("v1", num(R.v1, 2));
          };
        }
      } },
      { key: "트림 시트의 핵심은 ==텍셀 밀도와 줄 높이를 미리 약속==하는 것입니다(38장). 예를 들어 '512픽셀 = 1m, 몰딩 줄 높이 = 20cm'로 정해 두면, 모델러는 그 높이로 띠를 만들고 UV를 줄에 맞춰 쌓기만 합니다. 미드폴리(74장)·엣지 데칼(75장)과 짝을 이룹니다." },

      { use: [
        ["게임", "트림 시트의 대표작", "Star Citizen, 둠(2016), 헤일로·데스티니 계열의 SF 배경이 트림 시트 + 미드폴리 워크플로로 유명합니다. 자연 배경(바닥·바위)은 스토캐스틱 타일링과 매크로 변화로 반복을 감춥니다."],
        ["엔진", "UE·Unity에서", "UE 머티리얼 함수 TextureVariation(스토캐스틱), Unity의 Procedural Stochastic Texturing 예제가 있습니다. 매크로 변화는 큰 노이즈 텍스처 한 장을 월드 좌표로 곱하는 방식이 가장 쌉니다."],
        ["툴", "시트 만들기", "Substance Designer로 줄마다 높이 맵을 그려 굽고, 모델러는 같은 프로필로 띠를 모델링합니다. 'Trim Sheet' 템플릿(줄 높이 표)을 팀이 공유합니다."],
        ["TA", "관리 포인트", "줄 사이 번짐을 막는 패딩(38장), 줄 높이의 2의 거듭제곱 정렬, 밉에서 줄이 섞이지 않는 최소 높이, 반복 깨기 비용 예산을 정합니다."]
      ] },

      { recap: [
        ["texture(uv)를 반복", "넓게 칠하지만 격자가 보임"],
        ["× 매크로 노이즈", "가장 싼 반복 깨기"],
        ["칸·꼭짓점마다 오프셋 + 섞기", "2~3번 읽어 반복 제거"],
        ["UV를 시트의 줄에 맞춤", "트림 시트: 한 장으로 여러 모양"]
      ] }
    ]
  });
})();
