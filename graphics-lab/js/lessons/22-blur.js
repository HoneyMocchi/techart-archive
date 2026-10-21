/* 22 이미지 필터와 가우시안 블러 */
(() => {
  const f2 = n => num(n, 2);
  const gauss = (r, sigma) => { const w = []; let s = 0; for (let k = -r; k <= r; k++) { const v = Math.exp(-(k * k) / (2 * sigma * sigma)); w.push(v); s += v; } return w.map(v => v / s); };
  const boxK = r => Array(2 * r + 1).fill(1 / (2 * r + 1));
  // 원본 이미지(흑백 + 색 점): 160×80
  const IW = 160, IH = 80, SRC = new Float32Array(IW * IH * 3);
  for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) {
    const x = i / IW * 2, y = j / IH;
    let c = [0.08, 0.09, 0.12];
    if ((Math.floor(i / 10) + Math.floor(j / 10)) % 2 && i < 50) c = [0.85, 0.87, 0.9];
    if (Math.hypot(x - 0.95, y - 0.5) < 0.22) c = [0.96, 0.72, 0.3];
    if (Math.abs(y - 0.25 - (x - 1.3) * 0.5) < 0.02 && x > 1.3) c = [0.35, 0.77, 0.87];
    if (i % 23 === 0 && j % 17 === 0) c = [1, 1, 1];
    SRC.set(c, (j * IW + i) * 3);
  }
  function blurPass(src, w, dx, dy) {
    const out = new Float32Array(src.length), r = (w.length - 1) / 2;
    for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) {
      let a = 0, b = 0, c = 0;
      for (let k = -r; k <= r; k++) {
        const ii = clamp(i + k * dx, 0, IW - 1), jj = clamp(j + k * dy, 0, IH - 1), o = (jj * IW + ii) * 3, wk = w[k + r];
        a += src[o] * wk; b += src[o + 1] * wk; c += src[o + 2] * wk;
      }
      const o = (j * IW + i) * 3; out[o] = a; out[o + 1] = b; out[o + 2] = c;
    }
    return out;
  }
  const show = (img, x, y, rect) => {
    const i = clamp(Math.floor((x - rect.x0) / (rect.x1 - rect.x0) * IW), 0, IW - 1), j = clamp(Math.floor((rect.y1 - y) / (rect.y1 - rect.y0) * IH), 0, IH - 1), o = (j * IW + i) * 3;
    return [Math.pow(img[o], 1 / 2.2) * 255, Math.pow(img[o + 1], 1 / 2.2) * 255, Math.pow(img[o + 2], 1 / 2.2) * 255, 255];
  };

  lesson({
    topic: "blur", title: "이미지 필터와 블러", desc: "주변을 가중 평균하기", stage: "화면 후처리",
    sym: { w: "orange", "σ": "teal", N: "gold" },
    hook: "다 그린 화면에도 수학을 한 번 더 씁니다. 가장 기본은 ==각 픽셀을 주변 픽셀의 가중 평균으로 바꾸는 것==(컨볼루션)입니다. 블러·샤픈·엣지 검출·블룸이 모두 여기서 나옵니다.",
    blocks: [
      { h: "컨볼루션: 커널을 밀면서 가중 평균" },
      "아래쪽 막대가 원래 신호, 주황 막대가 커널(가중치)입니다. 커널을 좌우로 끌어 보세요. ==커널 아래 값들을 가중치대로 곱해 더한 것==이 위쪽 출력 한 칸이 됩니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 40, y0: -0.2, y1: 2.6, stretch: true },
        eq: ["출력[i] = Σ w_k · 입력[i + k],   Σ w_k = 1   (탭 {n}개)"],
        setup(F, C, L) {
          let mode = "gauss", r = 3, sig = 1.5, pos = 15;
          const sig1 = []; for (let i = 0; i < 40; i++) sig1.push((i > 8 && i < 18 ? 0.9 : 0.15) + (i === 27 ? 0.9 : 0) + (i > 31 ? 0.5 : 0) + 0.1 * Math.sin(i * 2.7));
          C.seg({ options: [{ value: "box", label: "박스 (균등)" }, { value: "gauss", label: "가우시안" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "반경", min: 1, max: 8, step: 1, value: r, fmt: x => num(x, 0), onInput: x => { r = x; sig = x / 2; } });
          F.handle({ color: "orange", get: () => [pos + 0.5, 1.05], set: x => { pos = clamp(Math.round(x - 0.5), 0, 39); } });
          F.draw = g => {
            const w = mode === "box" ? boxK(r) : gauss(r, Math.max(0.5, sig));
            const out = sig1.map((_, i) => w.reduce((s, wk, k) => s + wk * sig1[clamp(i + k - r, 0, 39)], 0));
            for (let i = 0; i < 40; i++) {
              const under = Math.abs(i - pos) <= r;
              g.poly([[i + 0.1, 0], [i + 0.9, 0], [i + 0.9, sig1[i] * 0.8], [i + 0.1, sig1[i] * 0.8]], { fill: under ? "rgba(88,196,221,0.9)" : "rgba(88,196,221,0.4)" });
              g.poly([[i + 0.1, 1.6], [i + 0.9, 1.6], [i + 0.9, 1.6 + out[i] * 0.8], [i + 0.1, 1.6 + out[i] * 0.8]], { fill: i === pos ? "yellow" : "rgba(244,211,69,0.45)" });
            }
            w.forEach((wk, k) => { const i = pos + k - r; if (i < 0 || i > 39) return; g.poly([[i + 0.25, 0.95], [i + 0.75, 0.95], [i + 0.75, 0.95 + wk * 2], [i + 0.25, 0.95 + wk * 2]], { fill: "orange" }); });
            g.arrow([pos + 0.5, 1.35], [pos + 0.5, 1.58], "yellow", { w: 2, head: 6 });
            g.text("입력", [0, 0.8], "blue", { size: 11, align: "left", dy: -8 }); g.text("출력", [0, 2.45], "yellow", { size: 11, align: "left" });
            L.set("n", 2 * r + 1);
          };
        }
      } },
      "박스는 경계가 각지고 '뭉개진' 느낌이, 가우시안은 ==가운데가 무겁고 멀수록 가벼워 자연스럽게== 흐려집니다. 렌즈의 초점이 흐려지는 모습이 가우시안에 가깝습니다.",

      { h: "2D 가우시안은 가로 한 번 + 세로 한 번" },
      "2D 가우시안 커널은 ==가로 1D 가우시안 × 세로 1D 가우시안==으로 나뉩니다(분리 가능). 그래서 $N×N$ 번 읽는 대신 가로로 $N$번, 그 결과를 세로로 $N$번 읽으면 똑같은 결과가 나옵니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["2D 한 번에: {n}² = {nn} 번 읽기   vs   분리: {n} + {n} = {n2} 번 읽기"],
        setup(F, C, L) {
          let sig = 2.5, stage = 2, cache = {};
          C.slider({ label: "$σ$", min: 0.5, max: 8, value: sig, onInput: x => { sig = x; } });
          C.seg({ options: [{ value: 0, label: "원본" }, { value: 1, label: "가로만" }, { value: 2, label: "가로 → 세로" }], value: stage, onChange: x => { stage = x; } });
          F.draw = g => {
            const r = Math.ceil(sig * 2.5), key = sig.toFixed(2);
            if (!cache[key]) { const w = gauss(r, sig); const h = blurPass(SRC, w, 1, 0); cache = { [key]: { h, hv: blurPass(h, w, 0, 1) } }; }
            const img = stage === 0 ? SRC : stage === 1 ? cache[key].h : cache[key].hv;
            const rect = { x0: 0, x1: 2, y0: 0, y1: 1 };
            g.field(IW, (x, y) => show(img, x, y, rect), { rows: IH, smooth: true });
            const n = 2 * r + 1;
            L.set("n", n); L.set("nn", n * n); L.set("n2", 2 * n);
          };
        }
      } },
      { key: "분리 덕분에 블러 비용이 ==$N^2$에서 $2N$으로== 줄어듭니다. 반경 10이면 441번이 42번이 됩니다. 실시간 블러는 거의 항상 이렇게 두 패스로 나눠 그립니다." },

      { h: "한 번 더 절반으로: 바이리니어 트릭" },
      "GPU 텍스처 읽기는 두 텍셀 사이를 읽으면 ==바이리니어로 둘을 섞어 줍니다==(10장). 그렇다면 이웃한 탭 두 개를, 가중치 비율만큼 사이 위치에서 한 번 읽으면 됩니다. 탭 수가 또 절반이 됩니다.",
      { fig: {
        aspect: 0.42, view: { x0: -10, x1: 10, y0: -0.25, y1: 1.1, stretch: true },
        eq: ["위치 = (w_1·1 + w_2·2) / (w_1 + w_2),   가중치 = w_1 + w_2   →   탭 {a}개 → {b}개"],
        setup(F, C, L) {
          let r = 6;
          C.slider({ label: "반경", min: 2, max: 9, step: 1, value: r, fmt: x => num(x, 0), onInput: x => { r = x; } });
          F.draw = g => {
            const w = gauss(r, r / 2.5), mx = Math.max(...w);
            g.line([-10, 0], [10, 0], "grey", { w: 1 });
            w.forEach((wk, k) => { const x = k - r; g.poly([[x - 0.3, 0], [x + 0.3, 0], [x + 0.3, wk / mx * 0.8], [x - 0.3, wk / mx * 0.8]], { fill: "rgba(88,196,221,0.55)" }); });
            const taps = [[0, w[r]]];
            for (let k = 1; k <= r; k += 2) {
              const w1 = w[r + k], w2 = k + 1 <= r ? w[r + k + 1] : 0, s = w1 + w2, off = (w1 * k + w2 * (k + 1)) / s;
              taps.push([off, s], [-off, s]);
            }
            taps.forEach(([o, s]) => { g.line([o, 0], [o, 0.95], "orange", { w: 2.5 }); g.dot([o, 0.95], "orange", 5); g.text(num(s, 2), [o, 0.95], "orange", { dy: -12, size: 10 }); });
            L.set("a", 2 * r + 1); L.set("b", taps.length);
          };
        }
      } },
      "실무의 큰 블러는 여기서 더 나아가 ==화면을 1/2, 1/4, 1/8로 줄여 가며 흐리고 다시 키우는== 다운샘플 피라미드(듀얼 카와세 등)를 씁니다. 작은 이미지에서 흐리면 같은 반경이 훨씬 싸기 때문입니다.",

      { use: [
        ["엔진", "후처리 블러와 DOF", "피사계 심도(초점 밖 흐림), 모션 블러, 블룸, UI 뒤 배경 흐림(Background Blur 위젯)이 모두 이 장의 필터입니다."],
        ["게임", "UI 글래스 효과", "메뉴 뒤 게임 화면을 흐리게 깔아 집중시키는 효과는 다운샘플 + 분리 가우시안으로 싸게 만듭니다."],
        ["셰이더", "엣지 검출·샤픈", "가중치에 음수를 섞으면 샤픈, 이웃과의 차이를 보면 엣지 검출(소벨)이 됩니다. 툰 외곽선 후처리가 깊이·노멀에 소벨을 씁니다."],
        ["실생활", "사진 앱과 화상회의", "인물 사진 모드의 배경 흐림, 화상회의 배경 블러, 휴대폰 노이즈 제거가 같은 컨볼루션입니다."]
      ] },

      { recap: [
        ["출력 = Σ w_k · 입력[i + k]", "컨볼루션: 커널을 밀며 가중 평균"],
        ["G(x, y) = G(x) · G(y)", "가우시안은 분리 가능: N² → 2N"],
        ["바이리니어로 두 탭을 한 번에", "탭 수 또 절반"],
        ["다운샘플 피라미드", "큰 반경 블러를 싸게"]
      ] }
    ]
  });
})();
