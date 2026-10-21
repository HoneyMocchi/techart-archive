/* 59 코스틱 */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  // 수면 높이(1D·2D)와 기울기
  const h1 = (x, t, A) => A * (Math.sin(x * 2.1 + t * 1.3) * 0.6 + Math.sin(x * 4.7 - t * 1.9) * 0.3 + Math.sin(x * 9.3 + t * 2.7) * 0.1);
  const h2 = (x, z, t, A) => A * (Math.sin(x * 2.2 + t * 1.2) * 0.4 + Math.sin(z * 2.7 - t * 1.5) * 0.35 + Math.sin((x + z) * 4.1 + t * 2.1) * 0.15 + Math.sin((x - z * 0.7) * 6.3 - t * 2.6) * 0.1);
  function refractDown(n, eta) {               // 위에서 수직으로 내려오는 빛 (0, −1) 을 노멀 n 으로 굴절
    const d = [0, -1, 0], c = -V3.dot(n, d), k = 1 - eta * eta * (1 - c * c);
    return V3.add(V3.mul(d, eta), V3.mul(n, eta * c - Math.sqrt(Math.max(0, k))));
  }

  lesson({
    topic: "caustic", title: "코스틱", desc: "굴절된 빛이 모이는 무늬", stage: "고급 효과 제작",
    sym: { A: "gold", J: "purple", d: "blue" },
    hook: "수영장 바닥에서 일렁이는 빛 그물이 코스틱입니다. 물결 진 수면이 ==렌즈 수천 개처럼 빛을 굴절시켜(16장) 어떤 곳엔 모으고 어떤 곳엔 흩어서== 생깁니다. 밝기는 '빛 다발이 얼마나 좁아졌는가'로 계산됩니다.",
    blocks: [
      { h: "빛 다발이 모이는 곳이 밝다" },
      "옆에서 본 물입니다. 위에서 고르게 내려온 빛줄기가 물결에 굴절되어 바닥에 닿습니다. ==줄기가 몰린 곳은 밝고 벌어진 곳은 어둡습니다==. 아래 막대는 바닥 위치별로 도착한 줄기 수입니다. 재생해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: -2.6, y1: 2.4 },
        eq: ["물결 세기 {a},  물 깊이 {d}  →  가장 밝은 곳은 평균의 {mx}배"],
        setup(F, C, L) {
          let A = 0.12, depth = 2, rays = 90;
          C.play(true);
          C.slider({ label: "물결 세기", min: 0, max: 0.3, value: A, onInput: x => { A = x; } });
          C.slider({ label: "물 깊이", min: 0.5, max: 3, value: depth, onInput: x => { depth = x; } });
          C.slider({ label: "빛줄기 수", min: 20, max: 300, step: 10, value: rays, fmt: x => num(x, 0), onInput: x => { rays = x; } });
          F.loop(() => {});
          F.draw = g => {
            const t = F.t, top = 1.2, bottom = top - depth;
            const surf = []; for (let x = 0; x <= 10; x += 0.05) surf.push([x, top + h1(x, t, A)]);
            g.poly(surf.concat([[10, bottom], [0, bottom]]), { fill: "rgba(88,196,221,0.18)" });
            g.poly(surf, { stroke: "blue", w: 2, close: false });
            g.line([0, bottom], [10, bottom], "grey", { w: 2 });
            const bins = new Array(50).fill(0);
            for (let k = 0; k < rays; k++) {
              const x = (k + 0.5) / rays * 10, y = top + h1(x, t, A), e = 0.01, dh = (h1(x + e, t, A) - h1(x - e, t, A)) / (2 * e);
              const n = V3.norm([-dh, 1, 0]), d = refractDown(n, 1 / 1.33);
              const s = (bottom - y) / d[1], hx = x + d[0] * s;
              g.line([x, 2.4], [x, y], "gold", { w: 1, alpha: 0.35 });
              g.line([x, y], [hx, bottom], "gold", { w: 1, alpha: 0.55 });
              if (hx >= 0 && hx < 10) bins[Math.floor(hx / 10 * 50)]++;
            }
            const avg = rays / 50, mx = Math.max(...bins);
            bins.forEach((b, i) => { const v = b / avg; g.poly([[i * 0.2, bottom - 0.05], [i * 0.2 + 0.2, bottom - 0.05], [i * 0.2 + 0.2, bottom - 0.05 - v * 0.25], [i * 0.2, bottom - 0.05 - v * 0.25]], { fill: `rgba(244,211,69,${clamp(0.3 + v * 0.25, 0, 1)})` }); });
            L.set("a", f2(A)); L.set("d", f2(depth)); L.set("mx", num(mx / avg, 1));
          };
        }
      } },
      { key: "바닥의 밝기 = ==수면의 작은 면적 ÷ 그 면적이 바닥에 도착한 넓이==입니다. 빛 다발이 한 점으로 모이는 곳(넓이 → 0)은 이론상 무한히 밝아지는데, 이 밝은 선들이 코스틱의 그물 무늬입니다." },

      { h: "면적 변화로 계산하기 (위에서 본 바닥)" },
      "수면을 작은 칸으로 나눠 ==각 칸의 네 모서리를 굴절시켜 바닥에 떨어뜨리고, 바닥에서의 넓이로 원래 넓이를 나누면== 그 칸이 바닥에 주는 밝기입니다. 오프라인 없이도 실시간으로 계산할 수 있습니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["밝기 ∝ 수면 칸 넓이 / 바닥 넓이   ·   칸 {n}×{m}"],
        setup(F, C, L) {
          let A = 0.012, depth = 0.6, res = 150;
          C.play(true);
          C.slider({ label: "물결 세기", min: 0, max: 0.04, step: 0.001, value: A, onInput: x => { A = x; } });
          C.slider({ label: "물 깊이", min: 0.1, max: 1.5, value: depth, onInput: x => { depth = x; } });
          C.slider({ label: "칸 해상도", min: 60, max: 220, step: 10, value: res, fmt: x => num(x, 0), onInput: x => { res = x; } });
          F.loop(() => {});
          F.draw = g => {
            const t = F.t * 0.8, Wd = 96, Hd = 48, acc = new Float32Array(Wd * Hd);
            const nx = res, nz = Math.round(res / 2), cw = 2 / nx, ch = 1 / nz;
            const H = (x, z) => h2(x * 4, z * 4, t, A);   // 칸 안에 물결이 여러 번 들어가도록 촘촘하게
            const land = (x, z) => { const e = 0.002, hx = (H(x + e, z) - H(x - e, z)) / (2 * e), hz = (H(x, z + e) - H(x, z - e)) / (2 * e); const n = V3.norm([-hx * 3, 1, -hz * 3]), d = refractDown(n, 1 / 1.33), s = depth / -d[1]; return [x + d[0] * s, z + d[2] * s]; };
            const P = [];
            for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) P.push(land(i * cw, j * ch));
            for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
              const a = P[j * (nx + 1) + i], b = P[j * (nx + 1) + i + 1], c = P[(j + 1) * (nx + 1) + i + 1], d = P[(j + 1) * (nx + 1) + i];
              const area = Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1])) + 1e-6, I = cw * ch / area;
              // 칸 중심이 떨어진 곳 주변 네 픽셀에 바이리니어로 나눠 쌓기
              const cx = (((a[0] + c[0]) / 2 % 2) + 2) % 2 / 2 * Wd - 0.5, cz = (((a[1] + c[1]) / 2 % 1) + 1) % 1 * Hd - 0.5;
              const ix = Math.floor(cx), iz = Math.floor(cz), fx = cx - ix, fz = cz - iz, val = Math.min(I, 30) * (Wd * Hd) / (nx * nz);
              [[0, 0, (1 - fx) * (1 - fz)], [1, 0, fx * (1 - fz)], [0, 1, (1 - fx) * fz], [1, 1, fx * fz]].forEach(([di, dj, w]) => { acc[(((iz + dj) % Hd + Hd) % Hd) * Wd + ((ix + di) % Wd + Wd) % Wd] += val * w; });
            }
            g.field(Wd, (x, y, i, j) => {
              const v = acc[(Hd - 1 - j) * Wd + i] * 0.25;
              return [clamp(30 + v * 200, 0, 255), clamp(70 + v * 210, 0, 255), clamp(90 + v * 190, 0, 255), 255];
            }, { rows: Hd, smooth: true });
            L.set("n", nx); L.set("m", nz);
          };
        }
      } },
      "물이 얕으면 빛이 모이기 전에 바닥에 닿아 무늬가 흐리고, ==적당히 깊을 때 가장 날카로운 그물==이 생깁니다. 더 깊으면 다시 흐려집니다. 물결 세기와 깊이를 함께 움직여 보세요.",

      { h: "게임의 코스틱: 움직이는 텍스처 두 장" },
      "실시간 게임은 대부분 ==미리 만든 코스틱 텍스처 두 장을 다른 방향으로 흘리고, 두 값의 최솟값(또는 곱)==을 바닥에 투영합니다. 같은 무늬가 반복되지 않고 일렁입니다. 색 번짐(RGB를 조금씩 어긋나게)을 켜면 더 그럴듯합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["코스틱 = min(T(uv · s + t·v1), T(uv · s · 1.3 + t·v2)) · 세기"],
        setup(F, C, L) {
          let chroma = true, scale = 4;
          C.play(true);
          C.seg({ options: [{ value: 1, label: "색 번짐 켜기" }, { value: 0, label: "끄기" }], value: 1, onChange: x => { chroma = !!x; } });
          C.slider({ label: "무늬 크기", min: 2, max: 8, value: scale, onInput: x => { scale = x; } });
          F.loop(() => {});
          // 보로노이 경계 기반 코스틱 텍스처 근사 (칸 번호를 4로 감아 이음매 없이 반복)
          const vor = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), w = q => ((q % 4) + 4) % 4; let d1 = 9, d2 = 9; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const h = fract(Math.sin(w(ix + i) * 127.1 + w(iy + j) * 311.7) * 43758.5), h2b = fract(Math.sin(w(ix + i) * 269.5 + w(iy + j) * 183.3) * 43758.5); const d = Math.hypot(ix + i + h - x, iy + j + h2b - y); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return Math.pow(clamp(1 - (d2 - d1) * 3, 0, 1), 3); };
          // 코스틱 텍스처를 한 번만 구워 두고(실제 게임처럼) 바이리니어·반복으로 읽습니다
          const TN = 64, TEX = new Float32Array(TN * TN);
          for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) { const x = i / TN * 4, y = j / TN * 4; TEX[j * TN + i] = vor(x, y); }
          const samp = (u, v) => { const x = (((u % 1) + 1) % 1) * TN, y = (((v % 1) + 1) % 1) * TN, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, A = (a, b) => TEX[(b % TN) * TN + (a % TN)]; return lerp(lerp(A(i, j), A(i + 1, j), fx), lerp(A(i, j + 1), A(i + 1, j + 1), fx), fy); };
          F.draw = g => {
            const t = F.t;
            g.field(F.playing ? 130 : 200, (x, y) => {
              const tex = o => Math.min(samp(x * scale / 4 + t * 0.07 + o, y * scale / 4 + t * 0.05), samp(x * scale * 1.3 / 4 - t * 0.06 + o, y * scale * 1.3 / 4 + t * 0.04 + 0.37));
              const c = chroma ? [tex(0.02), tex(0), tex(-0.02)] : [tex(0), tex(0), tex(0)];
              const floor = [0.25, 0.42, 0.5];
              return floor.map((b, i) => clamp((b + c[i] * 1.4) * 255, 0, 255)).concat(255);
            });
          };
        }
      } },

      { use: [
        ["엔진", "라이트 함수·데칼", "UE에서는 디렉셔널 라이트의 Light Function이나 데칼(42장)에 코스틱 텍스처를 흘려 수영장·해저 바닥을 비춥니다. Water 플러그인에는 수면 노멀로 계산하는 코스틱 옵션도 있습니다."],
        ["게임", "수중 연출", "물속 장면은 코스틱 + 볼륨 안개(19장) + 빛줄기(갓 레이) 조합이 표준입니다. 깊이에 따라 코스틱 세기를 줄입니다."],
        ["영상", "유리와 보석", "오프라인 렌더러는 포톤 매핑·경로 추적(32장)으로 유리잔 그림자 속의 밝은 코스틱까지 계산합니다."],
        ["실생활", "유리컵 그림자", "햇빛 아래 물컵 그림자 속 밝은 곡선, 반지의 반사광 무늬도 같은 원리의 코스틱입니다."]
      ] },

      { recap: [
        ["굴절로 빛 다발이 모임", "코스틱의 원리"],
        ["밝기 ∝ 원래 넓이 / 바닥 넓이", "면적 변화(야코비안)로 계산"],
        ["깊이가 적당할 때 가장 날카로움", "초점 거리와 같은 이야기"],
        ["min(흐르는 텍스처 두 장)", "게임의 값싼 코스틱"]
      ] }
    ]
  });
})();
