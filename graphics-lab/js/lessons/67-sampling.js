/* 67 샘플링 이론: 나이퀴스트, 재구성 필터, 존 플레이트 */
(() => {
  const f2 = n => num(n, 2);
  const sinc = x => (Math.abs(x) < 1e-6 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  // 미첼-네트라발리 (B, C)
  const mitchell = (x, B, C) => {
    x = Math.abs(x);
    if (x < 1) return ((12 - 9 * B - 6 * C) * x ** 3 + (-18 + 12 * B + 6 * C) * x * x + (6 - 2 * B)) / 6;
    if (x < 2) return ((-B - 6 * C) * x ** 3 + (6 * B + 30 * C) * x * x + (-12 * B - 48 * C) * x + (8 * B + 24 * C)) / 6;
    return 0;
  };
  const KERN = {
    box: { n: "상자", f: x => (Math.abs(x) <= 0.5 ? 1 : 0) },
    tent: { n: "삼각(쌍선형)", f: x => Math.max(0, 1 - Math.abs(x)) },
    gauss: { n: "가우시안", f: x => Math.exp(-x * x / (2 * 0.45 * 0.45)) },
    mitchell: { n: "미첼", f: null },
    lanczos: { n: "란초스-2", f: x => (Math.abs(x) < 2 ? sinc(x) * sinc(x / 2) : 0) }
  };

  lesson({
    topic: "sampling", title: "샘플링 이론과 재구성 필터", desc: "에일리어싱은 왜 생기고 어떻게 막나", stage: "그래픽스 연구 노트",
    sym: { f: "orange", s: "teal", B: "pink", C: "blue" },
    hook: "렌더링은 연속된 장면을 ==픽셀이라는 점들로 샘플링==하는 일이고, 화면에 띄우거나 텍스처를 읽는 일은 그 점들에서 ==연속 신호를 재구성==하는 일입니다. 계단, 지글거림, 무아레가 모두 이 두 단계의 실수입니다. 업스케일러·TAA·밉맵 필터를 고르는 감각이 여기서 나옵니다.",
    blocks: [
      { h: "나이퀴스트: 한 주기에 두 번은 찍어야" },
      "주황 곡선(실제 신호)을 청록 점에서만 샘플링합니다. 신호 주파수 $f$ 가 샘플링 주파수의 절반($f_s / 2$, 나이퀴스트 한계)을 넘으면, 점들을 지나는 ==더 느린 가짜 파동(분홍)==이 똑같이 들어맞습니다. 이것이 에일리어싱입니다. 자동차 바퀴가 거꾸로 도는 것처럼 보이는 것과 같습니다.",
      { fig: {
        aspect: 0.45, view: { x0: 0, x1: 4, y0: -1.3, y1: 1.3, stretch: true },
        eq: ["f = {f}   ·   f_s / 2 = {ny}   ·   보이는 주파수 {fa}  {warn}"],
        setup(F, C, L) {
          let f = 1.6, fs = 4;
          C.slider({ label: "신호 주파수 $f$", min: 0.1, max: 7.5, value: f, onInput: x => { f = x; } });
          C.slider({ label: "샘플링 주파수 $f_s$", min: 1, max: 10, step: 0.5, value: fs, onInput: x => { fs = x; } });
          F.draw = g => {
            const sig = x => Math.sin(TAU * f * x + 0.4);
            const pts = []; for (let k = 0; k <= 600; k++) { const x = k / 150; pts.push([x, sig(x)]); }
            g.poly(pts, { stroke: "orange", w: 2, close: false, alpha: 0.75 });
            // 싱크 재구성: 샘플들로 다시 만든 신호 (실제로 '보이는' 신호)
            const S = []; for (let n = -20; n <= Math.ceil(4 * fs) + 20; n++) S.push([n / fs, sig(n / fs)]);
            const rec = []; for (let k = 0; k <= 400; k++) { const x = k / 100; let v = 0; S.forEach(([sx, sv]) => { v += sv * sinc((x - sx) * fs); }); rec.push([x, clamp(v, -1.25, 1.25)]); }
            g.poly(rec, { stroke: "pink", w: 3, close: false });
            S.forEach(([sx, sv]) => { if (sx >= 0 && sx <= 4) { g.line([sx, 0], [sx, sv], "teal", { w: 1, alpha: 0.5 }); g.dot([sx, sv], "teal", 5); } });
            const fa = Math.abs(f - fs * Math.round(f / fs));
            L.set("f", f2(f)); L.set("ny", f2(fs / 2)); L.set("fa", f2(fa)); L.set("warn", f > fs / 2 ? "← 에일리어싱!" : "");
          };
        }
      } },
      { key: "샘플링 전에 ==나이퀴스트 한계보다 높은 주파수를 먼저 지워야(저역 통과 필터)== 합니다. 밉맵(53장)은 텍스처를 미리 흐려 두는 것이고, 슈퍼샘플링·TAA는 샘플링 주파수를 올리는 것입니다." },

      { h: "재구성 필터: 흐림과 계단 사이" },
      "점에서 연속 신호를 다시 만들 때 쓰는 커널입니다. 왼쪽은 커널 모양, 오른쪽은 주파수 응답입니다. 이상적인 필터는 나이퀴스트(0.5) 아래는 ==1로 통과==, 위는 ==0으로 차단==입니다. 상자는 위를 많이 흘려 계단·에일리어싱이 남고, 가우시안은 아래까지 깎아 흐립니다. 미첼의 $B$, $C$ 를 바꿔 보세요.",
      { fig: {
        aspect: 0.45, view: { x0: 0, x1: 10, y0: -0.45, y1: 1.35, stretch: true },
        eq: ["{eq}"],
        setup(F, C, L) {
          let k = "mitchell", B = 1 / 3, Cc = 1 / 3;
          C.seg({ options: Object.keys(KERN).map(x => ({ value: x, label: KERN[x].n })), value: k, onChange: x => { k = x; } });
          C.slider({ label: "미첼 $B$ (흐림)", min: 0, max: 1, value: B, onInput: x => { B = x; } });
          C.slider({ label: "미첼 $C$ (링잉)", min: 0, max: 1, value: Cc, onInput: x => { Cc = x; } });
          F.draw = g => {
            const fn = k === "mitchell" ? (x => mitchell(x, B, Cc)) : KERN[k].f;
            // 왼쪽: x ∈ [−3, 3] → [0.2, 4.6]
            const kx = x => 2.4 + x * 0.73;
            g.line([0.2, 0], [4.6, 0], "grey", { w: 1 }); g.line([2.4, -0.3], [2.4, 1.2], "grey", { w: 1, alpha: 0.4 });
            const kp = []; for (let i = 0; i <= 300; i++) { const x = -3 + i / 50; kp.push([kx(x), fn(x)]); }
            g.poly(kp, { stroke: "yellow", w: 2.5, close: false });
            g.text("커널 k(x)", [0.3, 1.2], "grey", { size: 11, align: "left" });
            // 오른쪽: 주파수 응답 |H(f)|, f ∈ [0, 1.5] (샘플당 주기)
            const H = f => { let s = 0; for (let i = -300; i <= 300; i++) { const x = i / 100; s += fn(x) * Math.cos(TAU * f * x); } return s / 100; };
            const H0 = H(0) || 1, fx = f => 5.4 + f / 1.5 * 4.4;
            g.line([5.4, 0], [9.8, 0], "grey", { w: 1 });
            g.poly([[fx(0.5), -0.05], [fx(1.5), -0.05], [fx(1.5), 1.2], [fx(0.5), 1.2]], { fill: "rgba(252,98,85,0.10)" });
            g.poly([[fx(0), 1], [fx(0.5), 1], [fx(0.5), 0], [fx(1.5), 0]], { stroke: "white", w: 1, dash: [4, 4], close: false, alpha: 0.6 });
            const hp = []; for (let i = 0; i <= 150; i++) { const f = i / 100; hp.push([fx(f), clamp(H(f) / H0, -0.4, 1.3)]); }
            g.poly(hp, { stroke: "orange", w: 2.5, close: false });
            g.text("나이퀴스트 0.5", [fx(0.5), -0.3], "grey", { size: 10 });
            g.text("이 위는 에일리어싱", [fx(1.05), 1.15], "red", { size: 10 });
            const pass = H(0.25) / H0, leak = Math.abs(H(0.75) / H0);
            L.set("eq", `${KERN[k].n}${k === "mitchell" ? ` (B = ${f2(B)}, C = ${f2(Cc)})` : ""}   ·   통과(0.25): ${num(pass * 100, 0)}%   ·   새는 양(0.75): ${num(leak * 100, 0)}%`);
          };
        }
      } },

      { h: "존 플레이트: 에일리어싱 시험지" },
      "$cos(k · r^2)$ 는 바깥으로 갈수록 주파수가 높아지는 시험 패턴입니다. 픽셀 하나에 샘플 하나만 찍으면 바깥에 ==없던 동심원(무아레)==이 생깁니다. 픽셀 안에서 샘플을 여러 개 평균하면(상자 필터 슈퍼샘플링) 가짜 무늬가 회색으로 사라집니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["픽셀당 {n}샘플   ·   {note}"],
        setup(F, C, L) {
          let n = 1, k = 60;
          C.seg({ options: [{ value: 1, label: "1샘플" }, { value: 4, label: "4샘플 (회전 격자)" }, { value: 16, label: "16샘플" }], value: n, onChange: x => { n = x; } });
          C.slider({ label: "주파수 $k$", min: 10, max: 160, value: k, fmt: x => num(x, 0), onInput: x => { k = x; } });
          const RG = [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]];
          F.draw = g => {
            const cols = 160, rows = 80, px = 4 / cols;
            const off = n === 1 ? [[0.5, 0.5]] : n === 4 ? RG : Array.from({ length: 16 }, (_, i) => [(i % 4 + 0.5) / 4, ((i >> 2) + 0.5) / 4]);
            g.field(cols, (x, y, i, j) => {
              let s = 0;
              for (const o of off) { const X = -2 + (i + o[0]) * px, Y = 1 - (j + o[1]) * px; s += 0.5 + 0.5 * Math.cos(k * (X * X + Y * Y)); }
              const v = s / off.length * 255;
              return [v, v, v, 255];
            }, { rows, smooth: false });
            L.set("n", n); L.set("note", n === 1 ? "가장자리 무아레 = 에일리어싱" : n === 4 ? "SSAA·MSAA 흔한 배치: 비용 4배로 대부분 정리" : "거의 회색으로 수렴 (정답에 가까움)");
          };
        }
      } },

      { use: [
        ["엔진", "업스케일 필터 선택", "UE의 TSR, DLSS·FSR 같은 업스케일러와 TAA 해결 단계는 이 장의 커널(가우시안·미첼·란초스 근사)로 샘플을 모아 최종 픽셀을 만듭니다. 'r.TemporalAA.Upsampling' 계열 설정의 흐림·선명함 차이가 커널 차이입니다."],
        ["툴", "이미지 리사이즈", "Photoshop의 'Bicubic Sharper', ImageMagick의 -filter Lanczos/Mitchell, 텍스처 밉 생성 툴(NVTT의 Kaiser 필터)이 같은 선택지입니다."],
        ["게임", "기와·철망·줄무늬", "멀리 보이는 지붕 기와, 철망, 줄무늬 옷이 지글거리는 것은 나이퀴스트를 넘은 주파수입니다. 밉맵·LOD·셰이더 안티에일리어싱(특정 주파수 이상 페이드)으로 막습니다."],
        ["글", "참고", "Mitchell & Netravali, 'Reconstruction Filters in Computer Graphics'(1988)가 B·C 지도를 처음 제시했고, 지금도 B = C = 1/3 이 기본 추천값입니다."]
      ] },

      { recap: [
        ["f < f_s / 2", "나이퀴스트: 넘으면 가짜 저주파로 보임"],
        ["샘플 전 저역 통과", "밉맵·슈퍼샘플링의 존재 이유"],
        ["상자 → 가우시안", "새는 양 ↓, 흐림 ↑"],
        ["미첼 B = C = 1/3", "흐림과 링잉 사이 균형점"]
      ] }
    ]
  });
})();
