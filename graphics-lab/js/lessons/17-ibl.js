/* 17 환경광 · 큐브맵 · 구면 조화 */
(() => {
  const f2 = n => num(n, 2);
  const srgb = v => Math.round(255 * Math.pow(clamp(v / (1 + v), 0, 1), 1 / 2.2));
  // 절차적 환경: 하늘·땅·해·빨간 벽. rough가 크면 해와 벽이 넓고 흐리게 퍼짐(프리필터 근사)
  function env(d, sunAz, rough = 0) {
    const up = d[1], sun = V3.norm([Math.cos(sunAz) * 0.8, 0.45, Math.sin(sunAz) * 0.8]);
    let c = up > 0 ? [0.35 + 0.3 * (1 - up), 0.55 + 0.25 * (1 - up), 0.95] : [0.35, 0.27, 0.2];
    const az = Math.atan2(d[2], d[0]), wall = Math.exp(-Math.pow(Math.sin((az - 2.4) / 2) / (0.25 + rough * 0.5), 2)) * clamp(1 - Math.abs(up) * 2, 0, 1);
    c = c.map((v, i) => lerp(v, [1.1, 0.15, 0.1][i], wall * (1 - rough * 0.5)));
    const cs = V3.dot(d, sun), w = 0.0008 + rough * rough * 0.6;
    const s = Math.exp((cs - 1) / w) * 0.0008 / w * 110;   // 퍼져도 전체 에너지는 같게
    return c.map((v, i) => v + s * [1, 0.9, 0.7][i]);
  }
  function ball(g, c, R, shade, cols = 160) {
    g.field(cols, (x, y) => {
      const nx = (x - c[0]) / R, ny = (y - c[1]) / R, r2 = nx * nx + ny * ny;
      if (r2 > 1) return null;
      const col = shade([nx, ny, Math.sqrt(1 - r2)]);
      return [srgb(col[0]), srgb(col[1]), srgb(col[2]), 255 * clamp((1 - r2) * 40, 0, 1)];
    }, { rect: { x0: c[0] - R, x1: c[0] + R, y0: c[1] - R, y1: c[1] + R } });
  }
  // 구면 조화 기저 9개 (L0~L2)
  const SHB = d => { const [x, y, z] = d; return [0.282095, 0.488603 * y, 0.488603 * z, 0.488603 * x, 1.092548 * x * y, 1.092548 * y * z, 0.315392 * (3 * z * z - 1), 1.092548 * x * z, 0.546274 * (x * x - y * y)]; };
  const A = [Math.PI, 2.094395, 2.094395, 2.094395, 0.785398, 0.785398, 0.785398, 0.785398, 0.785398];   // 코사인 컨볼루션 계수
  const DIRS = []; { let s = 0.5; for (let i = 0; i < 600; i++) { const z = 1 - 2 * (i + 0.5) / 600, r = Math.sqrt(1 - z * z), p = i * 2.399963; DIRS.push([r * Math.cos(p), z, r * Math.sin(p)]); void s; } }

  lesson({
    topic: "ibl", title: "환경광과 구면 조화", desc: "주변 전체가 광원", stage: "빛과 색",
    sym: { d: "yellow", R: "pink", L: "gold", N: "yellow", Y: "purple" },
    hook: "현실의 물체는 해만이 아니라 ==하늘·땅·벽 전체에서 오는 빛==을 받습니다. 주변 360°를 사진 한 장(큐브맵)으로 담아 두고 그것을 광원으로 쓰는 것이 이미지 기반 조명(IBL)입니다.",
    blocks: [
      { h: "큐브맵: 방향으로 찾아 읽는 텍스처" },
      "큐브맵은 상자의 여섯 면에 주변을 찍어 둔 것입니다. 읽을 때는 UV 대신 ==방향 벡터 하나==를 줍니다. 가장 큰 성분이 고르는 면, 나머지 두 성분이 그 면 위의 위치가 됩니다. 방향을 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["d = ({dx}, {dy}, {dz})   →   가장 큰 성분 {ax} → {face} 면"],
        setup(F, C, L) {
          let az = 0.6, el = 0.3, sunAz = 0.8;
          C.slider({ label: "방향 수평각", min: -3.14, max: 3.14, value: az, fmt: x => num(x / DEG, 0) + "°", onInput: x => { az = x; } });
          C.slider({ label: "방향 높이", min: -1.5, max: 1.5, value: el, fmt: x => num(x / DEG, 0) + "°", onInput: x => { el = x; } });
          // 펼친 십자형: [면, 칸 x, 칸 y] (칸 크기 0.9)
          const FACES = [["+Y", 1, 2], ["−X", 0, 1], ["+Z", 1, 1], ["+X", 2, 1], ["−Z", 3, 1], ["−Y", 1, 0]];
          const faceDir = (f, a, b) => ({ "+X": [1, b, -a], "−X": [-1, b, a], "+Y": [a, 1, -b], "−Y": [a, -1, b], "+Z": [a, b, 1], "−Z": [-a, b, -1] })[f];
          const S = 0.95, O = [-3.9, -1.45];
          F.draw = g => {
            g.field(260, (x, y) => {
              const cx = Math.floor((x - O[0]) / S), cy = Math.floor((y - O[1]) / S);
              const f = FACES.find(q => q[1] === cx && q[2] === cy);
              if (!f) return null;
              const a = ((x - O[0]) / S - cx) * 2 - 1, b = ((y - O[1]) / S - cy) * 2 - 1;
              const c = env(V3.norm(faceDir(f[0], a, b)), sunAz);
              return [srgb(c[0]), srgb(c[1]), srgb(c[2]), 255];
            }, { smooth: false });
            FACES.forEach(([n, cx, cy]) => { g.poly([[O[0] + cx * S, O[1] + cy * S], [O[0] + (cx + 1) * S, O[1] + cy * S], [O[0] + (cx + 1) * S, O[1] + (cy + 1) * S], [O[0] + cx * S, O[1] + (cy + 1) * S]], { stroke: "rgba(16,19,26,0.8)", w: 1.5 }); g.text(n, [O[0] + (cx + 0.5) * S, O[1] + (cy + 0.85) * S], "white", { size: 11, bold: true }); });
            const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
            const ax = [0, 1, 2].reduce((m, i) => (Math.abs(d[i]) > Math.abs(d[m]) ? i : m), 0);
            const face = (d[ax] > 0 ? "+" : "−") + "XYZ"[ax];
            const f = FACES.find(q => q[0] === face), m = Math.abs(d[ax]);
            const ab = { "+X": [-d[2], d[1]], "−X": [d[2], d[1]], "+Y": [d[0], -d[2]], "−Y": [d[0], d[2]], "+Z": [d[0], d[1]], "−Z": [-d[0], d[1]] }[face].map(v => v / m);
            const P = [O[0] + (f[1] + (ab[0] + 1) / 2) * S, O[1] + (f[2] + (ab[1] + 1) / 2) * S];
            g.circle(P, 0.07, "yellow", { fill: "yellow", w: 2 });
            // 오른쪽: 위에서 본 방향
            const c0 = [2.6, 0];
            g.circle(c0, 1.2, "grey", { w: 1, dash: [4, 4] });
            g.poly([[c0[0] - 0.85, c0[1] - 0.85], [c0[0] + 0.85, c0[1] - 0.85], [c0[0] + 0.85, c0[1] + 0.85], [c0[0] - 0.85, c0[1] + 0.85]], { stroke: "rgba(88,196,221,0.6)", w: 1.5 });
            g.arrow(c0, V.add(c0, [d[0] * 1.2, d[2] * 1.2]), "yellow", { w: 3, label: "d" });
            g.text("위에서 본 방향 (x, z)", [c0[0], -1.55], "grey", { size: 11 });
            L.set("dx", f2(d[0])); L.set("dy", f2(d[1])); L.set("dz", f2(d[2])); L.set("ax", "xyz"[ax]); L.set("face", face);
          };
        }
      } },

      { h: "반사: 거칠수록 흐린 주변" },
      "매끈한 공은 주변이 그대로 비치고, 거친 공은 ==주변이 뿌옇게 번져== 비칩니다. 실시간에서는 거칠기별로 미리 흐린 큐브맵을 밉맵 단계에 저장해 두고(프리필터), 거칠기에 맞는 단계를 읽습니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["R = reflect(−V, N),   색 = 프리필터된 큐브맵(R, 거칠기 → 밉 단계)"],
        setup(F, C, L) {
          let rough = 0.15, sunAz = 0.9;
          C.slider({ label: "거칠기", min: 0, max: 1, value: rough, onInput: x => { rough = x; } });
          C.slider({ label: "해 방향", min: -3.14, max: 3.14, value: sunAz, fmt: x => num(x / DEG, 0) + "°", onInput: x => { sunAz = x; } });
          F.draw = g => {
            g.field(200, (x, y) => { const d = V3.norm([x * 0.45, y * 0.45, 1]); const c = env(d, sunAz); return [srgb(c[0]), srgb(c[1]), srgb(c[2]), 255]; });
            ball(g, [-1.4, -0.1], 1.25, N => { const R = V3.sub(V3.mul(N, 2 * N[2]), [0, 0, 1]); return env(V3.norm([R[0], R[1], -R[2]]), sunAz, rough).map(v => v * 0.9); }, 150);
            ball(g, [1.6, -0.1], 1.25, N => { const R = V3.sub(V3.mul(N, 2 * N[2]), [0, 0, 1]); return env(V3.norm([R[0], R[1], -R[2]]), sunAz, Math.min(1, rough + 0.5)).map((v, i) => v * [0.95, 0.75, 0.4][i]); }, 150);
            g.text("거칠기 " + num(rough, 2), [-1.4, -1.55], "white", { size: 12, bold: true }); g.text("금 · 거칠기 " + num(Math.min(1, rough + 0.5), 2), [1.6, -1.55], "white", { size: 12, bold: true });
          };
        }
      } },

      { h: "확산 환경광: 숫자 9개로 요약하기" },
      "확산광은 주변 전체를 코사인으로 평균 낸 아주 부드러운 값이라, ==자세한 그림이 필요 없습니다==. 그래서 주변을 구면 조화(SH) 계수 9개로 요약해 둡니다. 띠(L0 → L2)를 늘려 가며 정답(직접 적분)과 비교해 보세요. 빨간 벽 쪽 면이 붉게 물드는 것까지 9개 숫자가 담습니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["E(N) ≈ Σ A_l · c_lm · Y_lm(N)   ({k}개 계수)"],
        setup(F, C, L) {
          let band = 2, sunAz = 0.9, cache = null;
          C.seg({ options: [{ value: 0, label: "L0 (1개)" }, { value: 1, label: "L1 (4개)" }, { value: 2, label: "L2 (9개)" }], value: band, onChange: x => { band = x; } });
          C.slider({ label: "해 방향", min: -3.14, max: 3.14, value: sunAz, fmt: x => num(x / DEG, 0) + "°", onInput: x => { sunAz = x; } });
          const project = () => {
            const co = Array.from({ length: 9 }, () => [0, 0, 0]);
            DIRS.forEach(d => { const c = env(d, sunAz, 0.3), b = SHB(d); for (let k = 0; k < 9; k++) for (let i = 0; i < 3; i++) co[k][i] += c[i] * b[k]; });
            return co.map(v => v.map(x => x * 4 * Math.PI / DIRS.length));
          };
          const truth = (N) => { const s = [0, 0, 0]; DIRS.forEach(d => { const k = Math.max(0, V3.dot(N, d)); if (k > 0) { const c = env(d, sunAz, 0.3); for (let i = 0; i < 3; i++) s[i] += c[i] * k; } }); return s.map(v => v * 4 * Math.PI / DIRS.length / Math.PI); };
          F.draw = g => {
            if (!cache || cache.az !== sunAz) cache = { az: sunAz, co: project(), tcache: new Map() };
            const nk = [1, 4, 9][band];
            const shE = N => { const b = SHB(N), s = [0, 0, 0]; for (let k = 0; k < nk; k++) for (let i = 0; i < 3; i++) s[i] += A[k] * cache.co[k][i] * b[k]; return s.map(v => Math.max(0, v / Math.PI)); };
            // 구의 노멀을 그대로 월드 방향으로 사용 (z+ 가 화면 앞쪽)
            ball(g, [-1.6, 0], 1.3, N => shE(N).map(v => v * 1.2), 140);
            ball(g, [1.6, 0], 1.3, N => { const key = Math.round(N[0] * 16) + "," + Math.round(N[1] * 16); let v = cache.tcache.get(key); if (!v) { v = truth(N); cache.tcache.set(key, v); } return v.map(x => x * 1.2); }, 100);
            g.text("SH 근사", [-1.6, -1.55], "white", { size: 12, bold: true }); g.text("정답 (600방향 적분)", [1.6, -1.55], "white", { size: 12, bold: true });
            L.set("k", nk);
          };
        }
      } },
      { key: "실시간 환경광은 ==확산은 SH 몇 개, 반사는 거칠기별로 흐린 큐브맵==으로 나눠 처리합니다. 둘 다 '미리 계산해 두고 싸게 읽기'라는 같은 전략입니다." },

      { use: [
        ["엔진", "Sky Light와 반사 캡처", "UE의 Sky Light가 주변을 큐브맵으로 캡처해 확산(SH)과 반사(프리필터 큐브맵)를 만들고, Reflection Capture 액터가 실내 곳곳의 반사를 담당합니다."],
        ["엔진", "라이트맵·볼륨 라이트맵", "움직이는 물체의 간접광은 공간 곳곳에 SH 계수를 구워 둔 볼륨 라이트맵(프로브)에서 읽습니다."],
        ["아트", "HDRI 조명", "제품·캐릭터 룩뎁에서 HDRI 사진 한 장을 걸면 그 장소의 빛이 그대로 재현되는 것이 IBL입니다."],
        ["실생활", "영화 합성", "실사 촬영장에서 크롬 공·360° 카메라로 주변을 찍어 두고, CG 물체를 같은 빛으로 비춰 합성합니다."]
      ] },

      { recap: [
        ["큐브맵(d)", "방향으로 읽는 텍스처: 가장 큰 성분 = 면"],
        ["프리필터 큐브맵", "거칠기별로 흐린 반사를 밉 단계에 저장"],
        ["E(N) ≈ Σ A_l c_lm Y_lm(N)", "확산 환경광을 SH 9개로"],
        ["IBL", "주변 전체를 광원으로"]
      ] }
    ]
  });
})();
