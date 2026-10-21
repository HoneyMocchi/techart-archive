/* 60 볼륨 텍스처와 볼류메트릭 */
(() => {
  const f2 = n => num(n, 2);
  const MB = b => (b >= 1048576 ? num(b / 1048576, 1) + " MB" : num(b / 1024, 0) + " KB");
  const fract = x => x - Math.floor(x);
  const hash3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
  // 16³ 볼륨: 3D 값 노이즈를 구워 둠 (반복 가능)
  const N = 16, VOL = new Float32Array(N * N * N);
  for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const v = (a, b, c, s) => { const P = 16 / s; const x = a / s, y = b / s, z = c / s, xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi, sm = t => t * t * (3 - 2 * t), H = (p, q, r) => hash3(((p % P) + P) % P, ((q % P) + P) % P, ((r % P) + P) % P);
      const l = (a1, a2, t) => a1 + (a2 - a1) * sm(t);
      return l(l(l(H(xi, yi, zi), H(xi + 1, yi, zi), fx), l(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), fx), fy), l(l(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), fx), l(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), fx), fy), fz); };
    VOL[(k * N + j) * N + i] = 0.6 * v(i, j, k, 4) + 0.4 * v(i, j, k, 2);
  }
  const at = (i, j, k) => VOL[((((k % N) + N) % N) * N + (((j % N) + N) % N)) * N + (((i % N) + N) % N)];
  function sample3(x, y, z, tri = true) {            // 좌표: 텍셀 단위, 반복
    if (!tri) return at(Math.floor(x), Math.floor(y), Math.floor(z));
    const xi = Math.floor(x - 0.5), yi = Math.floor(y - 0.5), zi = Math.floor(z - 0.5), fx = x - 0.5 - xi, fy = y - 0.5 - yi, fz = z - 0.5 - zi;
    const l = lerp;
    return l(l(l(at(xi, yi, zi), at(xi + 1, yi, zi), fx), l(at(xi, yi + 1, zi), at(xi + 1, yi + 1, zi), fx), fy), l(l(at(xi, yi, zi + 1), at(xi + 1, yi, zi + 1), fx), l(at(xi, yi + 1, zi + 1), at(xi + 1, yi + 1, zi + 1), fx), fy), fz);
  }

  lesson({
    topic: "volume", title: "볼륨 텍스처와 볼류메트릭", desc: "3D 텍스처로 구름·안개 그리기", stage: "고급 효과 제작",
    sym: { "σ": "teal", T: "blue", u: "green", v: "red", w: "blue" },
    hook: "2D 텍스처가 $(u, v)$로 읽는 그림이라면, 볼륨 텍스처는 ==$(u, v, w)$로 읽는 덩어리==입니다. 구름·연기·안개의 밀도, 3D LUT(45장), 거리장(23장)이 모두 볼륨 텍스처이고, 광선을 따라 여러 번 읽어 쌓으면 볼류메트릭 렌더링이 됩니다.",
    blocks: [
      { h: "볼륨 = 슬라이스의 묶음" },
      "16×16×16 노이즈 볼륨을 펼쳐 16장의 슬라이스로 보여 줍니다(2D 아틀라스로 저장하는 '의사 볼륨'과 같은 배치). 깊이 $w$를 움직이면 오른쪽 단면이 바뀝니다. ==w 방향 보간을 끄면 슬라이스가 바뀔 때마다 뚝뚝 튑니다==.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["w = {w} → 슬라이스 {a} 와 {b} 를 {t} : {t2} 로 섞음"],
        setup(F, C, L) {
          let w = 5.3, tri = true;
          C.play();
          const ws = C.slider({ label: "깊이 w (슬라이스)", min: 0, max: 15.99, value: w, onInput: x => { w = x; } });
          C.seg({ options: [{ value: 1, label: "3선형 (w도 보간)" }, { value: 0, label: "슬라이스만 (w 보간 없음)" }], value: 1, onChange: x => { tri = !!x; } });
          F.loop(dt => { w = (w + dt * 2) % 16; ws.set(w); });
          F.draw = g => {
            g.field(256, (x, y) => {
              if (x < 2) {   // 4×4 아틀라스
                const cx = Math.floor(x / 0.5), cy = Math.floor((2 - y) / 0.5), k = cy * 4 + cx;
                const i = Math.floor((x % 0.5) / 0.5 * N), j = Math.floor(((2 - y) % 0.5) / 0.5 * N), v = at(i, j, k);
                return [v * 230, v * 235, v * 245, 255];
              }
              const u = (x - 2) / 2 * N, vv = (2 - y) / 2 * N;
              const v = tri ? sample3(u, vv, w) : sample3(u, vv, Math.floor(w) + 0.5, true);
              return [v * 230, v * 235, v * 245, 255];
            }, { smooth: false });
            for (let k = 0; k <= 4; k++) { g.line([k * 0.5, 0], [k * 0.5, 2], "rgba(16,19,26,0.8)", { w: 1 }); g.line([0, k * 0.5], [2, k * 0.5], "rgba(16,19,26,0.8)", { w: 1 }); }
            const a = Math.floor(w), cx = a % 4, cy = Math.floor(a / 4);
            g.poly([[cx * 0.5, 2 - cy * 0.5], [cx * 0.5 + 0.5, 2 - cy * 0.5], [cx * 0.5 + 0.5, 1.5 - cy * 0.5], [cx * 0.5, 1.5 - cy * 0.5]], { stroke: "yellow", w: 2.5 });
            g.line([2, 0], [2, 2], "white", { w: 2 });
            const t = w - Math.floor(w);
            L.set("w", f2(w)); L.set("a", a); L.set("b", (a + 1) % 16); L.set("t", f2(tri ? 1 - t : 1)); L.set("t2", f2(tri ? t : 0));
          };
        }
      } },

      { h: "광선을 따라 쌓기: 구름 레이마칭" },
      "상자 안을 볼륨 노이즈로 채운 구름입니다. 픽셀마다 광선을 쏘아 ==일정 간격으로 밀도를 읽고, 투과율을 줄여 가며 빛을 쌓습니다==(19장 안개의 일반판). 각 걸음에서 해 쪽으로 몇 번 더 읽어 그림자도 넣었습니다. 걸음 수를 줄이면 줄무늬가 생깁니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["T ← T · e^(−σ · 밀도 · Δs),   색 += T · 밀도 · 빛   (걸음 {n}번)"],
        setup(F, C, L) {
          let steps = 16, cover = 0.45, dens = 3, sunA = 0.6;
          C.slider({ label: "걸음 수", min: 4, max: 64, step: 1, value: steps, fmt: x => num(x, 0), onInput: x => { steps = x; } });
          C.slider({ label: "구름 양", min: 0.2, max: 0.8, value: cover, onInput: x => { cover = x; } });
          C.slider({ label: "밀도 σ", min: 0.5, max: 8, value: dens, onInput: x => { dens = x; } });
          C.slider({ label: "해 방향", min: -1.4, max: 1.4, value: sunA, onInput: x => { sunA = x; } });
          C.play();
          let drift = 0;
          F.loop(dt => { drift += dt * 0.6; });
          F.draw = g => {
            const Ld = V3.norm([Math.sin(sunA), 0.6, Math.cos(sunA) * 0.4]);
            const dAt = p => { if (Math.abs(p[0]) > 1.6 || Math.abs(p[1]) > 0.7 || Math.abs(p[2]) > 1.6) return 0; const v = sample3((p[0] + drift) * 4, (p[1]) * 4 + 8, p[2] * 4); const edge = clamp((0.7 - Math.abs(p[1])) * 3, 0, 1); return Math.max(0, (v - (1 - cover)) * 2.5) * edge; };
            g.field(F.playing ? 90 : 130, (x, y) => {
              const ro = [0, 0.2, -3.2], rd = V3.norm([x * 0.55, y * 0.55, 1]);
              const t0 = (-1.6 - ro[2]) / rd[2], t1 = (1.6 - ro[2]) / rd[2], ds = (t1 - t0) / steps;
              let T = 1, col = 0;
              for (let s = 0; s < steps; s++) {
                const p = V3.add(ro, V3.mul(rd, t0 + (s + 0.5) * ds)), d = dAt(p);
                if (d <= 0) continue;
                let ld = 0; for (let k = 1; k <= 2; k++) ld += dAt(V3.add(p, V3.mul(Ld, k * 0.25)));
                const light = Math.exp(-dens * ld * 0.25) * 1.1 + 0.15;
                const a = 1 - Math.exp(-dens * d * ds);
                col += T * a * light; T *= 1 - a;
                if (T < 0.02) break;
              }
              const sky = [0.32 + 0.25 * (1 - y), 0.5 + 0.2 * (1 - y), 0.85];
              return sky.map((c, i) => clamp((c * T + col * [1, 0.97, 0.92][i]) * 255, 0, 255)).concat(255);
            });
            L.set("n", steps);
          };
        }
      } },
      "광선마다 수십 번 × 그림자 몇 번씩 읽으므로 비쌉니다. 실시간에서는 ==낮은 해상도로 그리고, 걸음 시작점을 픽셀마다 흔든 뒤(지터) TAA로 누적==(30장)해서 적은 걸음으로 줄무늬 없이 그립니다.",

      { h: "볼륨 텍스처의 메모리" },
      "해상도가 두 배면 메모리는 ==여덟 배==입니다. 볼륨은 금방 커지므로 해상도·포맷을 신중히 고릅니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["{r}³ × {b} B = {mem}   (같은 메모리의 2D 텍스처 ≈ {eq2}²)"],
        setup(F, C, L) {
          let p = 6, b = 1;
          C.slider({ label: "해상도", min: 4, max: 9, step: 1, value: p, fmt: x => Math.pow(2, x) + "³", onInput: x => { p = x; } });
          C.seg({ options: [{ value: 1, label: "R8 (1B)" }, { value: 2, label: "R16F (2B)" }, { value: 4, label: "RGBA8 (4B)" }, { value: 8, label: "RGBA16F (8B)" }], value: 1, onChange: x => { b = +x; } });
          F.draw = g => {
            const r = Math.pow(2, p), mem = r * r * r * b;
            const s = clamp(Math.log2(r) / 9, 0.1, 1) * 2.6, o = [1.3, 0.6], d = s * 0.45;
            g.poly([o, [o[0] + s, o[1]], [o[0] + s, o[1] + s], [o[0], o[1] + s]], { fill: "rgba(88,196,221,0.25)", stroke: "blue", w: 1.5 });
            g.poly([[o[0], o[1] + s], [o[0] + d, o[1] + s + d * 0.6], [o[0] + s + d, o[1] + s + d * 0.6], [o[0] + s, o[1] + s]], { fill: "rgba(88,196,221,0.4)", stroke: "blue", w: 1.5 });
            g.poly([[o[0] + s, o[1]], [o[0] + s + d, o[1] + d * 0.6], [o[0] + s + d, o[1] + s + d * 0.6], [o[0] + s, o[1] + s]], { fill: "rgba(88,196,221,0.15)", stroke: "blue", w: 1.5 });
            const w = clamp(Math.log2(mem) / 31, 0, 1) * 4.5;
            g.poly([[5.2, 1.6], [5.2 + w, 1.6], [5.2 + w, 2.4], [5.2, 2.4]], { fill: mem > 64 * 1048576 ? PAL.red : mem > 8 * 1048576 ? PAL.orange : PAL.green });
            g.text(MB(mem), [5.3 + w, 2.0], "white", { size: 13, bold: true, align: "left" });
            L.set("r", r); L.set("b", b); L.set("mem", MB(mem)); L.set("eq2", num(Math.sqrt(r * r * r), 0));
          };
        }
      } },
      { key: "그래서 볼륨은 ==작게(32³~128³) 만들어 반복해서 쓰고==, 큰 형태는 2D 맵이나 수식으로, 세부는 작은 반복 볼륨 노이즈로 나눕니다. 실시간 구름이 '날씨 맵(2D) + 작은 3D 노이즈 두 장' 구조인 이유입니다." },

      { use: [
        ["엔진", "볼륨 텍스처 에셋", "UE에서 2D 아틀라스(슬라이스 격자)를 Volume Texture 에셋으로 바꾸고 머티리얼의 Texture Sample(3D UVW)로 읽습니다. 볼류메트릭 클라우드·Heterogeneous Volume이 이를 씁니다."],
        ["엔진", "볼류메트릭 클라우드·포그", "UE Volumetric Cloud는 날씨 맵 + 3D 노이즈를 레이마칭하고, Volumetric Fog는 화면을 3D 격자(froxel)로 나눠 칸마다 산란을 계산합니다."],
        ["TA", "의사 볼륨(플립북) 활용", "3D 텍스처를 지원하지 않는 환경에서는 2D 아틀라스에 슬라이스를 펼쳐 두 슬라이스를 직접 읽어 섞습니다(이 장 첫 그림의 방식)."],
        ["실생활", "CT·MRI", "의료 CT·MRI 영상은 볼륨 데이터이고, 3D 뷰어는 같은 레이마칭으로 뼈·장기를 반투명하게 보여 줍니다."]
      ] },

      { recap: [
        ["텍스처(u, v, w)", "볼륨 = 슬라이스 묶음, 3선형 보간"],
        ["T ← T · e^(−σ·밀도·Δs)", "레이마칭으로 밀도 쌓기"],
        ["해 쪽으로 몇 번 더 읽기", "볼륨 그림자"],
        ["해상도 2배 = 메모리 8배", "작은 반복 볼륨 + 2D 맵"]
      ] }
    ]
  });
})();
