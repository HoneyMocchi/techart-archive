/* 69 GPU 해시: sin 해시를 버려야 하는 이유 (네이선 리드, Jarzynski & Olano) */
(() => {
  const fr = Math.fround, U = 4294967296;
  const fract32 = x => fr(x - Math.floor(x));
  // 모두 32비트 부호 없는 정수 → 32비트 정수
  const lcg = v => (Math.imul(v, 1664525) + 1013904223) >>> 0;
  const wang = v => { v = (v ^ 61 ^ (v >>> 16)) >>> 0; v = Math.imul(v, 9) >>> 0; v = (v ^ (v >>> 4)) >>> 0; v = Math.imul(v, 0x27d4eb2d) >>> 0; return (v ^ (v >>> 15)) >>> 0; };
  const pcg = v => { const s = (Math.imul(v, 747796405) + 2891336453) >>> 0; const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0; return ((w >>> 22) ^ w) >>> 0; };
  const fmix = v => { v ^= v >>> 16; v = Math.imul(v, 0x85ebca6b); v ^= v >>> 13; v = Math.imul(v, 0xc2b2ae35); v ^= v >>> 16; return v >>> 0; };
  // sin 해시를 32비트 float로 흉내: 인자가 커지면 정밀도가 떨어짐
  const sinh1 = x => Math.floor(fract32(fr(fr(Math.sin(fr(x))) * fr(43758.5453))) * U) >>> 0;
  const H2 = {
    sin: { n: "fract(sin(…) · 43758)", f: (x, y) => fract32(fr(fr(Math.sin(fr(fr(fr(x) * fr(12.9898)) + fr(fr(y) * fr(78.233))))) * fr(43758.5453))) * U },
    lcg: { n: "LCG", f: (x, y) => lcg((x + y * 4096) >>> 0) },
    wang: { n: "Wang", f: (x, y) => wang((wang(y >>> 0) + x) >>> 0) },
    pcg: { n: "PCG", f: (x, y) => pcg((pcg(y >>> 0) + x) >>> 0) }
  };
  const H1 = { sin: sinh1, lcg, wang, pcg, fmix };
  const N1 = { sin: "sin 해시", lcg: "LCG", wang: "Wang", pcg: "PCG", fmix: "Murmur3 fmix" };

  lesson({
    topic: "gpuhash", title: "GPU 해시 함수", desc: "좋은 난수를 셰이더에서 싸게", stage: "그래픽스 연구 노트",
    sym: { v: "yellow" },
    hook: "셰이더에는 Random() 함수가 없습니다. 픽셀 좌표나 프레임 번호를 ==해시 함수==에 넣어 난수처럼 보이는 값을 만듭니다. 인터넷에 흔한 $fract(sin(x) · 43758.5453)$ 는 편하지만 GPU마다 결과가 다르고 큰 좌표에서 무늬가 생깁니다. 네이선 리드의 글과 Jarzynski·Olano의 비교 논문(2020)이 추천하는 ==정수 해시(PCG)==를 직접 시험합니다.",
    blocks: [
      { h: "눈으로 보는 품질" },
      "같은 화면 좌표를 각 해시에 넣었습니다. 좌표에 큰 값을 더해 보세요(월드 좌표나 긴 프레임 번호라고 생각하면 됩니다). sin 해시는 32비트 float의 정밀도가 모자라 ==줄무늬와 덩어리==가 생깁니다. 순차 입력의 LCG는 처음부터 줄무늬입니다. '최하위 비트'로 바꾸면 LCG의 약점이 더 드러납니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}   ·   좌표 + {off}"],
        setup(F, C, L) {
          let m = "sin", lg = 4, bit = 0;
          C.seg({ options: Object.keys(H2).map(k => ({ value: k, label: H2[k].n })), value: m, onChange: x => { m = x; } });
          C.slider({ label: "좌표에 더하는 값 (10의 거듭제곱)", min: 0, max: 6, step: 0.5, value: lg, fmt: x => "10^" + num(x, 1), onInput: x => { lg = x; } });
          C.seg({ options: [{ value: 0, label: "상위 비트(값)" }, { value: 1, label: "최하위 비트" }], value: bit, onChange: x => { bit = x; } });
          F.draw = g => {
            const off = Math.floor(lg ? 10 ** lg : 0), fn = H2[m].f;
            g.field(160, (x, y, i, j) => { const h = fn(i + off, j + off) >>> 0, v = bit ? (h & 1) * 255 : h / U * 255; return [v, v, v, 255]; }, { rows: 80, smooth: false });
            L.set("eq", { sin: "$fract(sin(dot(p, (12.99, 78.23))) · 43758.5)$  (32비트 float로 계산)", lcg: "$v · 1664525 + 1013904223$  (입력이 순서대로면 출력도 순서가 보임)", wang: "Wang 해시: xor·시프트·곱셈 5단계", pcg: "PCG: LCG 한 번 + 상태 의존 시프트 + 곱셈" }[m]);
            L.set("off", num(off, 0));
          };
        }
      } },

      { h: "눈사태 시험: 비트 하나가 얼마나 퍼지나" },
      "좋은 해시는 입력 ==비트 하나만 바꿔도 출력 비트가 각각 반반 확률로 뒤집혀야== 합니다(눈사태 효과). 가로는 입력 비트, 세로는 출력 비트입니다. 회색은 이상적(50%), ==빨강은 한쪽으로 치우침==(뒤집히지 않거나 항상 뒤집힘)입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["{n}   ·   평균 치우침 {bias}  (0이 이상적)"],
        setup(F, C, L) {
          let m = "pcg", cache = {};
          C.seg({ options: Object.keys(H1).map(k => ({ value: k, label: N1[k] })), value: m, onChange: x => { m = x; } });
          const test = k => {
            if (cache[k]) return cache[k];
            const fn = H1[k], P = new Float32Array(32 * 32); let s = 12345;
            for (let t = 0; t < 600; t++) {
              s = (Math.imul(s, 1103515245) + 12345) >>> 0; const v = (s ^ (s >>> 7) ^ Math.imul(t, 2654435761)) >>> 0, h = fn(v);
              for (let i = 0; i < 32; i++) { const d = (h ^ fn((v ^ (1 << i)) >>> 0)) >>> 0; for (let j = 0; j < 32; j++) P[j * 32 + i] += (d >>> j) & 1; }
            }
            let b = 0; for (let i = 0; i < 1024; i++) { P[i] /= 600; b += Math.abs(P[i] - 0.5) * 2; }
            return (cache[k] = { P, bias: b / 1024 });
          };
          F.draw = g => {
            const r = test(m);
            g.field(32, (x, y, i, j) => { const e = Math.abs(r.P[(31 - j) * 32 + i] - 0.5) * 2; return [lerp(90, 252, e), lerp(96, 98, e), lerp(110, 85, e), 255]; }, { rect: { x0: 1.1, x1: 2.9, y0: 0.1, y1: 1.9 }, rows: 32, smooth: false });
            g.text("입력 비트 0 → 31", [2, 0.04], "grey", { size: 10 });
            g.text("출력 비트", [1.0, 1.0], "grey", { size: 10, align: "right" });
            L.set("n", N1[m]); L.set("bias", num(r.bias, 3));
          };
        }
      } },
      { key: "실무 추천은 단순합니다. ==좌표·프레임 번호를 uint로 바꿔 PCG 같은 정수 해시에 넣고==, 마지막에 $float(h) / 2^32$ 로 0~1을 얻습니다. 정수 연산이라 GPU 제조사와 정밀도에 상관없이 결과가 같고, 비용도 곱셈 몇 번입니다." },

      { use: [
        ["글", "네이선 리드의 글", "'Quick And Easy GPU Random Numbers In D3D11'(2013)이 sin 해시 대신 Wang 해시와 LCG/xorshift 조합을 권하며 이 주제를 대중화했습니다."],
        ["논문", "Jarzynski & Olano 2020", "'Hash Functions for GPU Rendering'(JCGT)이 수십 개 해시의 품질(TestU01)과 속도를 측정했고, 결론으로 PCG(1D)·pcg3d·pcg4d를 추천합니다."],
        ["엔진", "UE의 셰이더 난수", "UE의 Random.ush에는 PCG 계열(Rand3DPCG16/32), MurmurMix32 같은 정수 해시가 있고, 패스 트레이서·Lumen 샘플링이 이를 씁니다."],
        ["TA", "머티리얼에서", "머티리얼 노이즈가 넓은 월드에서 줄무늬가 생기거나 모바일에서만 이상하다면 sin 해시의 float 정밀도 문제일 가능성이 큽니다. 월드 좌표를 작게 유지하거나 정수 해시로 바꿉니다."]
      ] },

      { recap: [
        ["fract(sin(x) · 43758)", "편하지만 정밀도·기기 차이로 무늬"],
        ["순차 입력 LCG", "줄무늬, 하위 비트 주기 짧음"],
        ["입력 1비트 → 출력 50% 뒤집힘", "눈사태 효과: 좋은 해시의 조건"],
        ["uint → PCG → / 2³²", "실무 추천 GPU 난수"]
      ] }
    ]
  });
})();
