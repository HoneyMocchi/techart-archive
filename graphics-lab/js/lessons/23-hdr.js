/* 23 HDR · 톤매핑 · 블룸 */
(() => {
  const f2 = n => num(n, 2);
  const srgb = v => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
  const ACES = x => clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1);
  const TM = {
    clamp: [x => Math.min(1, x), "$출력 = min(1, 값)$   1을 넘으면 잘려 하얗게 날아감"],
    reinhard: [x => x / (1 + x), "$출력 = 값 / (1 + 값)$   라인하르트: 무한대도 1 안으로"],
    aces: [ACES, "ACES 근사: 어두운 쪽은 대비를 살리고 밝은 쪽은 부드럽게 눌러 줌 (영화·UE 기본)"]
  };
  // HDR 장면(가로 140 × 세로 70): 하늘, 해, 램프, 그림자 바닥 — 값은 1을 훌쩍 넘습니다
  const W = 140, H = 70, HDR = new Float32Array(W * H * 3);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = i / W * 2, y = 1 - j / H;
    let c = y > 0.35 ? [0.5 + y * 0.6, 0.7 + y * 0.6, 1.2 + y * 0.9] : [0.06, 0.05, 0.045];
    if (Math.hypot(x - 1.55, y - 0.78) < 0.07) c = [60, 50, 35];                       // 해
    if (y < 0.35 && Math.abs(x - 0.5) < 0.1 && y > 0.1) c = [0.3, 0.2, 0.15];           // 기둥
    if (Math.hypot(x - 0.5, y - 0.4) < 0.045) c = [24, 9, 2];                           // 램프
    if (y < 0.1) c = [0.12, 0.1, 0.09];
    if (Math.abs(x - 1.1) < 0.18 && y > 0.12 && y < 0.3) c = [0.9, 0.3, 0.25];            // 빨간 상자(햇빛)
    HDR.set(c, (j * W + i) * 3);
  }
  const gauss = (r, s) => { const w = []; let t = 0; for (let k = -r; k <= r; k++) { const v = Math.exp(-k * k / (2 * s * s)); w.push(v); t += v; } return w.map(v => v / t); };
  function blur(src, sigma) {
    const r = Math.ceil(sigma * 2.5), w = gauss(r, sigma);
    const pass = (s, dx, dy) => { const o = new Float32Array(s.length); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let a = 0, b = 0, c = 0; for (let k = -r; k <= r; k++) { const ii = clamp(i + k * dx, 0, W - 1), jj = clamp(j + k * dy, 0, H - 1), q = (jj * W + ii) * 3, wk = w[k + r]; a += s[q] * wk; b += s[q + 1] * wk; c += s[q + 2] * wk; } const q = (j * W + i) * 3; o[q] = a; o[q + 1] = b; o[q + 2] = c; } return o; };
    return pass(pass(src, 1, 0), 0, 1);
  }
  const at = (img, x, y, R) => { const i = clamp(Math.floor((x - R.x0) / (R.x1 - R.x0) * W), 0, W - 1), j = clamp(Math.floor((R.y1 - y) / (R.y1 - R.y0) * H), 0, H - 1), q = (j * W + i) * 3; return [img[q], img[q + 1], img[q + 2]]; };

  lesson({
    topic: "hdr", title: "HDR · 톤매핑 · 블룸", desc: "1을 넘는 밝기 다루기", stage: "화면 후처리",
    sym: { e: "gold", L: "yellow" },
    hook: "실제 세상의 밝기 차이는 엄청납니다. 해는 그늘보다 ==수만 배== 밝습니다. 그래서 계산은 1을 넘는 값(HDR)으로 하고, 마지막에 화면이 낼 수 있는 0~1로 ==부드럽게 눌러 담습니다==(톤매핑).",
    blocks: [
      { h: "톤매핑: 무한대를 0~1로" },
      "아래 장면의 해와 램프는 값이 20~60입니다. 노출을 바꾸고 톤매핑 곡선을 골라 보세요. 그냥 자르면(clamp) ==밝은 곳이 하얗게 날아가고 색이 노랗게 변합니다==.",
      { fig: {
        aspect: 0.62, view: { x0: 0, x1: 2, y0: -0.45, y1: 1 },
        eq: ["{eq}", "노출 e = {e}"],
        setup(F, C, L) {
          let op = "aces", ev = 0;
          C.seg({ options: [{ value: "clamp", label: "자르기" }, { value: "reinhard", label: "라인하르트" }, { value: "aces", label: "ACES" }], value: op, onChange: x => { op = x; } });
          C.slider({ label: "노출 (EV)", min: -4, max: 4, step: 0.1, value: ev, fmt: x => (x >= 0 ? "+" : "") + num(x, 1), onInput: x => { ev = x; } });
          F.draw = g => {
            const fn = TM[op][0], e = Math.pow(2, ev), R = { x0: 0, x1: 2, y0: 0, y1: 1 };
            g.field(W, (x, y) => { if (y < 0) return null; const c = at(HDR, x, y, R); return [srgb(fn(c[0] * e)), srgb(fn(c[1] * e)), srgb(fn(c[2] * e)), 255]; }, { rect: R, rows: H, smooth: false });
            // 아래: 톤 곡선 (가로: 입력 log, 세로: 출력)
            const G0 = [0.1, -0.42], GW = 1.8, GH = 0.36;
            g.poly([G0, [G0[0] + GW, G0[1]], [G0[0] + GW, G0[1] + GH], [G0[0], G0[1] + GH]], { stroke: "rgba(236,239,244,0.2)", w: 1 });
            const pts = [];
            for (let i = 0; i <= 120; i++) { const lv = -3 + i / 120 * 5, v = Math.pow(10, lv) * e; pts.push([G0[0] + i / 120 * GW, G0[1] + fn(v) * GH]); }
            g.poly(pts, { stroke: "yellow", w: 2.5, close: false });
            ["0.001", "0.01", "0.1", "1", "10", "100"].forEach((s, k) => g.text(s, [G0[0] + k / 5 * GW, G0[1]], "grey", { dy: 9, size: 9 }));
            L.set("eq", TM[op][1]); L.set("e", "×" + num(e, 2));
          };
        }
      } },
      { key: "조명·반사·안개는 모두 ==선형 HDR 값으로 계산==하고, 톤매핑과 감마(13장)는 화면에 내보내기 직전 마지막에 딱 한 번 합니다. 순서가 바뀌면 색이 틀어집니다." },

      { h: "블룸: 밝은 빛이 번지는 효과" },
      "카메라와 눈은 아주 밝은 빛 주변이 뿌옇게 번져 보입니다. 이것을 ==밝은 부분만 골라 → 크게 흐리고 → 원래 화면에 더하는== 세 단계로 흉내 냅니다. 단계를 하나씩 눌러 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["블룸 = blur(max(0, 색 − 문턱)) · 세기   →   결과 = 색 + 블룸"],
        setup(F, C, L) {
          let stage = 3, thr = 1, amt = 0.6, sig = 4, cache = null;
          C.seg({ options: [{ value: 0, label: "원본" }, { value: 1, label: "밝은 부분" }, { value: 2, label: "흐리기" }, { value: 3, label: "더하기(결과)" }], value: stage, onChange: x => { stage = x; } });
          C.slider({ label: "문턱", min: 0.2, max: 8, value: thr, onInput: x => { thr = x; } });
          C.slider({ label: "번짐 반경", min: 1, max: 10, value: sig, onInput: x => { sig = x; } });
          C.slider({ label: "세기", min: 0, max: 2, value: amt, onInput: x => { amt = x; } });
          F.draw = g => {
            const key = thr.toFixed(2) + "/" + sig.toFixed(2);
            if (!cache || cache.key !== key) {
              const br = new Float32Array(HDR.length);
              for (let k = 0; k < HDR.length; k++) br[k] = Math.max(0, HDR[k] - thr);
              cache = { key, br, bl: blur(br, sig) };
            }
            const R = { x0: 0, x1: 2, y0: 0, y1: 1 };
            g.field(W, (x, y) => {
              const o = at(HDR, x, y, R), b = at(cache.br, x, y, R), bl = at(cache.bl, x, y, R);
              const c = stage === 0 ? o : stage === 1 ? b : stage === 2 ? bl.map(v => v * amt * 4) : o.map((v, i) => v + bl[i] * amt * 4);
              return [srgb(ACES(c[0])), srgb(ACES(c[1])), srgb(ACES(c[2])), 255];
            }, { rows: H, smooth: true });
          };
        }
      } },

      { h: "자동 노출: 눈의 적응" },
      "어두운 터널에서 밝은 바깥으로 나가면 잠시 눈이 부시다가 적응합니다. 엔진도 ==화면의 평균 밝기를 재서 노출을 천천히 따라가게== 합니다. 재생해서 장면 밝기가 바뀔 때 노출이 늦게 따라오는 것을 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["목표 노출 = 0.18 / 평균 밝기,   노출 ← lerp(노출, 목표, 1 − e^(−속도·dt))"],
        setup(F, C, L) {
          let speed = 1.5, hist = [], expo = 1, t = 0;
          C.play(true);
          C.slider({ label: "적응 속도", min: 0.2, max: 6, value: speed, onInput: x => { speed = x; } });
          const sceneLum = tt => { const p = (tt % 12) / 12; return p < 0.4 ? 0.02 : p < 0.8 ? 3 : 0.3; };
          F.loop(dt => {
            t += dt;
            const target = 0.18 / sceneLum(t);
            expo = lerp(expo, target, 1 - Math.exp(-speed * dt));
            hist.push([sceneLum(t), expo]); if (hist.length > 300) hist.shift();
          });
          F.draw = g => {
            const lum = sceneLum(t), shown = ACES(lum * expo);
            g.poly([[0.3, 2.2], [3.3, 2.2], [3.3, 4], [0.3, 4]], { fill: `rgb(${srgb(shown)},${srgb(shown * 0.95)},${srgb(shown * 0.85)})`, stroke: "grey", w: 1 });
            g.text(lum < 0.1 ? "터널 안" : lum > 1 ? "밝은 바깥" : "그늘", [1.8, 3.1], shown > 0.5 ? "#10131A" : "white", { size: 14, bold: true, halo: false });
            g.text("화면에 보이는 밝기", [1.8, 2.2], "grey", { size: 11, dy: 10 });
            const X = k => 4 + k / 300 * 5.8, Y = v => 0.3 + clamp((Math.log10(v) + 2) / 4, 0, 1) * 3.6;
            const p1 = hist.map((h, k) => [X(k), Y(h[0])]), p2 = hist.map((h, k) => [X(k), Y(0.18 / h[1])]);
            if (p1.length > 1) { g.poly(p1, { stroke: "yellow", w: 2, close: false }); g.poly(p2, { stroke: "teal", w: 2.5, close: false }); }
            g.text("장면 평균 밝기", [4, 4], "yellow", { size: 11, align: "left" }); g.text("눈(노출)이 맞춰 둔 밝기", [6.6, 4], "teal", { size: 11, align: "left" });
          };
        }
      } },

      { use: [
        ["엔진", "포스트 프로세스 볼륨", "UE 포스트 프로세스의 Exposure(자동 노출 최소·최대·속도), Bloom(문턱·세기), 톤매퍼 설정이 이 장 그대로입니다."],
        ["게임", "HDR 디스플레이", "HDR 모니터 출력은 톤매핑 범위를 1이 아니라 디스플레이 최대 밝기(1000니트 등)로 넓혀 같은 원리로 매핑합니다."],
        ["아트", "라이트 단위", "UE의 물리 라이트 단위(룩스·칸델라)를 쓰면 해와 전구의 실제 밝기 차이를 그대로 넣고 노출로 맞춥니다."],
        ["실생활", "휴대폰 HDR 사진", "휴대폰 HDR 모드는 노출이 다른 사진 여러 장을 합쳐 넓은 밝기 범위를 얻고, 이 장의 톤매핑으로 한 장에 눌러 담습니다."]
      ] },

      { recap: [
        ["값 > 1", "HDR: 실제 밝기 그대로 계산"],
        ["값 / (1 + 값) · ACES", "톤매핑: 화면 범위로 부드럽게 압축"],
        ["blur(max(0, 색 − 문턱)) 더하기", "블룸"],
        ["노출 = 0.18 / 평균 밝기", "자동 노출, 천천히 따라감"]
      ] }
    ]
  });
})();
