/* 68 블루 노이즈와 인터리브드 그래디언트 노이즈(IGN, 호르헤 히메네스) */
(() => {
  const fract = x => x - Math.floor(x);
  let seed = 7; const rnd = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  const ign = (x, y) => fract(52.9829189 * fract(0.06711056 * x + 0.00583715 * y));
  const BAYER = (() => { const m = [[0]]; let b = m; for (let s = 1; s < 8; s *= 2) { const n = []; for (let y = 0; y < s * 2; y++) { n.push([]); for (let x = 0; x < s * 2; x++) { const v = b[y % s][x % s] * 4; n[y].push(v + [[0, 2], [3, 1]][(y / s) | 0][(x / s) | 0]); } } b = n; } return b; })();
  // 블루 노이즈 64×64: 에너지가 가장 낮은 빈 칸(가장 큰 빈 공간)에 차례로 점을 놓아 순위를 매김 (void-and-cluster의 간단판)
  let BN = null;
  const blue = () => {
    if (BN) return BN;
    const S = 64, E = new Float32Array(S * S), rank = new Float32Array(S * S), used = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) E[i] = rnd() * 1e-3;
    const R = 6, K = []; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) K.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * 1.9 * 1.9))]);
    for (let r = 0; r < S * S; r++) {
      let best = -1, be = 1e9;
      for (let i = 0; i < S * S; i++) if (!used[i] && E[i] < be) { be = E[i]; best = i; }
      used[best] = 1; rank[best] = (r + 0.5) / (S * S);
      const bx = best % S, by = (best / S) | 0;
      for (const [dx, dy, w] of K) E[((by + dy + S) % S) * S + ((bx + dx + S) % S)] += w;
    }
    return (BN = rank);
  };
  const bn = (x, y) => blue()[(y & 63) * 64 + (x & 63)];
  const NOISE = {
    white: { n: "화이트 노이즈", f: (x, y, t) => rnd() },
    bayer: { n: "베이어 8×8", f: (x, y, t) => (BAYER[y & 7][x & 7] + 0.5) / 64 },
    ign: { n: "IGN", f: (x, y, t) => ign(x + 5.588238 * (t % 64), y + 5.588238 * (t % 64)) },
    blue: { n: "블루 노이즈", f: (x, y, t) => fract(bn(x, y) + 0.61803398875 * t) }
  };
  const img = (i, j, W, H) => { const u = i / W, v = j / H, r = Math.hypot(u * 2 - 1.35, (v * 2 - 1) * 0.5); return clamp(r < 0.32 ? 0.85 - r * 1.6 : u * 0.9 + 0.05 * Math.sin(v * 9), 0, 1); };

  lesson({
    topic: "bluenoise", title: "블루 노이즈와 IGN", desc: "좋은 무작위는 고르게 흩어진다", stage: "그래픽스 연구 노트",
    sym: { t: "teal" },
    hook: "디더링, 그림자 샘플 회전, 레이마칭 시작점 흔들기… 실시간 렌더링은 노이즈를 뿌리고 TAA로 지우는 일을 반복합니다. 이때 ==어떤 노이즈냐==가 결과의 질을 정합니다. 뭉침 없이 고르게 흩어진 ==블루 노이즈==, 그리고 호르헤 히메네스가 콜 오브 듀티에서 만든 ==계산 한 줄짜리 IGN==을 비교합니다.",
    blocks: [
      { h: "점 뿌리기와 스펙트럼" },
      "점 256개를 세 가지 방법으로 뿌리고, 오른쪽에 ==주파수 스펙트럼==(어느 크기의 무늬가 많은지)을 그렸습니다. 화이트 노이즈는 뭉치고 빈 곳이 생기며 스펙트럼이 전부 고르게 밝습니다. 블루 노이즈는 ==가운데(저주파)가 비어 있는 고리== 모양입니다. 큰 덩어리 무늬가 없다는 뜻이고, 눈은 남은 고주파를 거의 눈치채지 못합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 2, pts = null, spec = null;
          const gen = () => {
            seed = 99; const N = 256; pts = [];
            if (mode === 0) for (let i = 0; i < N; i++) pts.push([rnd(), rnd()]);
            else if (mode === 1) for (let i = 0; i < N; i++) pts.push([((i % 16) + rnd()) / 16, (((i / 16) | 0) + rnd()) / 16]);
            else for (let i = 0; i < N; i++) {   // 미첼의 최선 후보: 후보 여럿 중 기존 점과 가장 먼 것
              let best = null, bd = -1;
              for (let c = 0; c < 12; c++) { const q = [rnd(), rnd()]; let d = 9; for (const p of pts) { let dx = Math.abs(p[0] - q[0]), dy = Math.abs(p[1] - q[1]); dx = Math.min(dx, 1 - dx); dy = Math.min(dy, 1 - dy); d = Math.min(d, dx * dx + dy * dy); } if (d > bd) { bd = d; best = q; } }
              pts.push(best);
            }
            const M = 48; spec = new Float32Array(M * M);
            for (let ky = 0; ky < M; ky++) for (let kx = 0; kx < M; kx++) {
              const fx = kx - M / 2, fy = ky - M / 2; let re = 0, im = 0;
              for (const p of pts) { const a = TAU * (fx * p[0] + fy * p[1]); re += Math.cos(a); im += Math.sin(a); }
              spec[ky * M + kx] = (re * re + im * im) / pts.length;
            }
            spec[(M / 2) * M + M / 2] = 0;
          };
          C.seg({ options: [{ value: 0, label: "화이트 노이즈" }, { value: 1, label: "격자 + 흔들기" }, { value: 2, label: "블루 노이즈" }], value: mode, onChange: x => { mode = x; pts = null; } });
          F.draw = g => {
            if (!pts) gen();
            g.poly([[0.15, 0.1], [1.95, 0.1], [1.95, 1.9], [0.15, 1.9]], { fill: "rgba(255,255,255,0.04)", stroke: "grey", w: 1 });
            pts.forEach(p => g.dot([0.15 + p[0] * 1.8, 0.1 + p[1] * 1.8], "yellow", 2.6));
            g.field(48, (x, y, i, j) => { const v = clamp(Math.log(1 + spec[j * 48 + i]) / 2.2, 0, 1) * 255; return [v * 0.6, v * 0.85, v, 255]; }, { rect: { x0: 2.1, x1: 3.9, y0: 0.1, y1: 1.9 }, rows: 48, smooth: false });
            g.text("점 분포", [1.05, 1.96], "grey", { size: 11 }); g.text("스펙트럼 (가운데 = 저주파)", [3.0, 1.96], "grey", { size: 11 });
            L.set("eq", ["화이트: 뭉침과 빈틈 → 스펙트럼이 고르게 밝음", "격자 + 흔들기(층화): 뭉침은 줄었지만 저주파가 조금 남음", "블루: 점끼리 최소 거리 → 저주파가 비어 있는 고리 스펙트럼"][mode]);
          };
        }
      } },

      { h: "1비트로 줄여 보기: 디더링" },
      "회색조 그림을 흑백 두 값으로 줄이며 문턱값을 노이즈로 흔듭니다. 화이트 노이즈는 ==지저분한 뭉침==, 베이어는 ==격자 무늬==가 보입니다. 블루 노이즈는 가장 고르고, IGN은 식 한 줄로 그에 가깝습니다. '노이즈만'을 눌러 무늬 자체도 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let m = "ign", raw = 0;
          C.seg({ options: Object.keys(NOISE).map(k => ({ value: k, label: NOISE[k].n })), value: m, onChange: x => { m = x; } });
          C.seg({ options: [{ value: 0, label: "디더링 결과" }, { value: 1, label: "노이즈만" }], value: raw, onChange: x => { raw = x; } });
          F.draw = g => {
            seed = 5; const W = 160, H = 80, fn = NOISE[m].f;
            g.field(W, (x, y, i, j) => { const n = fn(i, j, 0), v = raw ? n : (img(i, j, W, H) > n ? 1 : 0); return [v * 236, v * 239, v * 244, 255]; }, { rows: H, smooth: false });
            L.set("eq", { white: "문턱 = 무작위: 뭉침과 빈틈", bayer: "문턱 = 8×8 순서 행렬: 고르지만 격자가 보임", ign: "$IGN = fract(52.98 · fract(0.0671 · x + 0.0058 · y))$  곱셈 몇 번", blue: "문턱 = 미리 구운 64×64 블루 노이즈 텍스처" }[m]);
          };
        }
      } },

      { h: "시간으로 풀기: TAA와 함께" },
      "실시간 렌더링에서는 노이즈를 ==프레임마다 바꾸고 TAA로 평균==합니다. 매 프레임 1비트로 디더링한 결과를 지수 평균으로 누적해 정답(원래 회색조)에 얼마나 빨리 다가가는지 비교합니다. IGN은 프레임마다 $(5.588, 5.588)$ 픽셀씩 밀어 쓰고, 블루 노이즈는 황금비만큼 값을 돌립니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["프레임 {t}   ·   오차(RMS) {err}"],
        setup(F, C, L) {
          let m = "ign", acc = null, t = 0;
          const W = 120, H = 60;
          const reset = () => { acc = null; t = 0; };
          C.play(true);
          C.seg({ options: Object.keys(NOISE).filter(k => k !== "bayer").map(k => ({ value: k, label: NOISE[k].n })), value: m, onChange: x => { m = x; reset(); } });
          C.button("누적 지우기", reset);
          const step = () => {
            if (!acc) acc = new Float32Array(W * H);
            const fn = NOISE[m].f, a = t === 0 ? 1 : 0.1;
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, v = img(i, j, W, H) > fn(i, j, t) ? 1 : 0; acc[k] = lerp(acc[k], v, a); }
            t++;
          };
          F.loop(() => { if (t < 400) step(); });
          F.draw = g => {
            if (!acc) step();
            let e = 0;
            g.field(W, (x, y, i, j) => { const k = j * W + i, v = acc[k]; e += (v - img(i, j, W, H)) ** 2; return [v * 236, v * 239, v * 244, 255]; }, { rows: H, smooth: false });
            L.set("t", t); L.set("err", num(Math.sqrt(e / (W * H)), 3));
          };
        }
      } },
      { key: "TAA는 지수 평균이라 ==최근 10여 프레임==만 기억합니다. 그 짧은 창 안에서 고르게 퍼진 값을 주는 노이즈가 이깁니다. 블루 노이즈가 공간에서 고르다면, IGN은 3×3 이웃 안에서 고르게 퍼지도록 설계되어 TAA의 이웃 클램프와 잘 맞습니다." },

      { use: [
        ["게임", "콜 오브 듀티와 그 후", "히메네스가 'Next Generation Post Processing in Call of Duty: Advanced Warfare'(SIGGRAPH 2014)에서 IGN을 소개했고, 이후 볼류메트릭 포그·SSAO·그림자 필터의 샘플 회전에 업계 표준처럼 쓰입니다."],
        ["엔진", "UE의 노이즈", "UE의 InterleavedGradientNoise 함수(셰이더 공용 라이브러리)와 블루 노이즈 텍스처(r.BlueNoise…, Substrate·Lumen 샘플링)가 같은 목적입니다. 머티리얼의 DitherTemporalAA 노드도 이 계열입니다."],
        ["글", "더 읽을거리", "Alan Wolfe의 블루 노이즈 시리즈(demofox 블로그), NVIDIA의 시공간 블루 노이즈(STBN) 논문, Ulichney의 void-and-cluster 원논문(1993)이 계보입니다."],
        ["TA", "디더 페이드·투명도", "LOD 전환 디더, 머리카락·풀의 디더 투명도는 패턴 선택에 따라 TAA 후 결과가 크게 다릅니다. 지저분하면 노이즈 종류와 프레임 오프셋부터 확인합니다."]
      ] },

      { recap: [
        ["저주파가 빈 스펙트럼", "블루 노이즈: 뭉침 없이 고르게"],
        ["fract(52.98 · fract(0.0671x + 0.0058y))", "IGN: 텍스처 없이 식 한 줄"],
        ["프레임마다 5.588 픽셀 이동", "IGN의 시간 축 변형"],
        ["fract(b + 0.618 · t)", "블루 노이즈의 시간 축 변형(황금비)"]
      ] }
    ]
  });
})();
