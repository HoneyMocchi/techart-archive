/* 66 점프 플러딩(JFA): 넓은 외곽선과 거리장 (벤 골루스 기법) */
(() => {
  // 점프 플러딩 한 패스: 칸마다 k만큼 떨어진 9곳의 '가장 가까운 씨앗'을 보고 더 가까운 것을 고름
  function jfaPass(src, W, H, k) {
    const dst = new Int32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let best = -1, bd = 1e9;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const qx = x + i * k, qy = y + j * k;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const s = src[qy * W + qx];
        if (s < 0) continue;
        const sx = s % W, sy = (s / W) | 0, d = (sx - x) ** 2 + (sy - y) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      dst[y * W + x] = best;
    }
    return dst;
  }
  const seedsOf = (mask, W, H) => { const a = new Int32Array(W * H); for (let i = 0; i < W * H; i++) a[i] = mask[i] ? i : -1; return a; };
  const hue = s => { const h = (Math.imul(s + 1, 2654435761) >>> 0) / 4294967296; return [0, 1, 2].map(k => 0.5 + 0.4 * Math.cos(TAU * (h + k / 3))); };

  lesson({
    topic: "jfa", title: "점프 플러딩과 넓은 외곽선", desc: "log₂ 번 만에 퍼지는 거리장", stage: "그래픽스 연구 노트",
    sym: { k: "orange", w: "teal" },
    hook: "선택한 물체에 ==두께 50픽셀짜리 외곽선==을 그리려면, 픽셀마다 반경 50 안을 다 뒤져야 할까요? 그러면 픽셀당 수천 번 샘플입니다. ==점프 플러딩==은 '가장 가까운 씨앗 좌표'를 간격 $k$ 로 이웃에게 전하고, $k$ 를 절반씩 줄이며 몇 번만 반복해 화면 전체의 거리장을 만듭니다. 벤 골루스가 'The Quest for Very Wide Outlines'에서 비교한 방법 중 가장 빠른 것입니다.",
    blocks: [
      { h: "한 패스씩 퍼뜨리기" },
      "칸을 눌러 씨앗(흰색)을 찍고 '다음 패스'를 눌러 보세요. 패스마다 각 칸은 ==자기와 $k$ 칸 떨어진 8곳 + 자기 자리==가 아는 씨앗 중 가장 가까운 것을 가져옵니다. $k$ = 16 → 8 → 4 → 2 → 1, 다섯 번 만에 모든 칸이 가장 가까운 씨앗(색 = 씨앗별 보로노이 영역)을 압니다. 주황 점은 조사 칸의 9개 표본 위치입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 32, y0: 0, y1: 16 }, captureTouch: true,
        eq: ["{eq}"],
        setup(F, C, L) {
          const W = 32, H = 16, mask = new Uint8Array(W * H);
          [[6, 4], [7, 4], [8, 5], [20, 11], [26, 3], [13, 12], [14, 12]].forEach(([x, y]) => { mask[y * W + x] = 1; });
          let buf, pass, probe = [16.5, 8.5];
          const steps = [16, 8, 4, 2, 1];
          const reset = () => { buf = seedsOf(mask, W, H); pass = 0; };
          reset();
          C.button("다음 패스", () => { if (pass < steps.length) { buf = jfaPass(buf, W, H, steps[pass]); pass++; } });
          C.button("끝까지", () => { while (pass < steps.length) { buf = jfaPass(buf, W, H, steps[pass]); pass++; } });
          C.button("처음부터", reset);
          C.button("씨앗 지우기", () => { mask.fill(0); reset(); });
          F.vec(probe, "orange", { snap: 0.5, constrain: q => [Math.floor(clamp(q[0], 0, W - 1)) + 0.5, Math.floor(clamp(q[1], 0, H - 1)) + 0.5] });
          let lastPaint = -1;
          F.onTap = (p, sx, sy, moving) => {
            const x = Math.floor(p[0]), y = Math.floor(16 - p[1]);
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            const id = y * W + x;
            if (moving && id === lastPaint) return;
            lastPaint = id; mask[id] = moving ? 1 : 1 - mask[id]; reset();
          };
          F.draw = g => {
            g.field(W, (x, y, i, j) => {
              const id = j * W + i, s = buf[id];
              if (mask[id]) return [236, 239, 244, 255];
              if (s < 0) return [24, 28, 38, 255];
              const c = hue(s), d = Math.hypot(s % W - i, ((s / W) | 0) - j), b = 0.75 + 0.25 * Math.cos(d * 1.6);
              return [c[0] * 200 * b, c[1] * 200 * b, c[2] * 200 * b, 255];
            }, { rows: H, smooth: false });
            for (let x = 0; x <= W; x++) g.line([x, 0], [x, 16], "black", { w: 1, alpha: 0.25 });
            for (let y = 0; y <= H; y++) g.line([0, y], [32, y], "black", { w: 1, alpha: 0.25 });
            const k = steps[Math.min(pass, steps.length - 1)];
            if (pass < steps.length) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) g.dot([probe[0] + i * k, probe[1] + j * k], "orange", 4);
            const ps = buf[Math.floor(16 - probe[1]) * W + Math.floor(probe[0])];
            if (ps >= 0) g.line(probe, [ps % W + 0.5, 16 - ((ps / W) | 0) - 0.5], "white", { w: 2 });
            L.set("eq", pass < steps.length ? `패스 ${pass + 1} / 5 준비: $k = ${k}$  (9곳을 보고 가장 가까운 씨앗을 고름)` : "완료: 5패스 × 9샘플 = 칸마다 45번 읽기로 전체 거리장");
          };
        }
      } },

      { h: "외곽선 두께와 비용" },
      "JFA로 만든 거리장에서 '거리 < $w$' 인 곳을 칠하면 외곽선입니다. 두께를 키워 보세요. ==무식하게 반경 안을 다 뒤지는 방법은 $w^2$ 에 비례==하고, JFA는 $log_2 w$ 에 비례합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["두께 {w}px   ·   다 뒤지기: 픽셀당 약 {brute}번   ·   JFA: {passes}패스 × 9 = {jfa}번"],
        setup(F, C, L) {
          const W = 128, H = 64, mask = new Uint8Array(W * H);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const u = (x - 46) / 14, v = (y - 32) / 14, a = Math.atan2(v, u), r = Math.hypot(u, v);
            const star = r < 0.65 + 0.3 * Math.cos(5 * a), box = Math.abs(x - 90) < 10 && Math.abs(y - 30) < 16;
            mask[y * W + x] = star || box ? 1 : 0;
          }
          // 경계 칸만 씨앗으로 → 바깥 거리장
          const edge = new Uint8Array(W * H);
          for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (mask[i] && (!mask[i - 1] || !mask[i + 1] || !mask[i - W] || !mask[i + W])) edge[i] = 1; }
          let buf = seedsOf(edge, W, H);
          [64, 32, 16, 8, 4, 2, 1].forEach(k => { buf = jfaPass(buf, W, H, k); });
          let w = 12, look = 0;
          C.slider({ label: "두께 $w$ (px)", min: 1, max: 48, step: 1, value: w, fmt: x => x + "px", onInput: x => { w = x; } });
          C.seg({ options: [{ value: 0, label: "외곽선" }, { value: 1, label: "거리장" }, { value: 2, label: "빛남" }], value: look, onChange: x => { look = x; } });
          F.draw = g => {
            g.field(256, (x, y) => {
              const px = x / 2 * W, py = (1 - y) * H, cx = Math.min(W - 1, px | 0), cy = Math.min(H - 1, py | 0);
              if (mask[cy * W + cx]) return [92, 208, 179, 255];
              const s = buf[cy * W + cx]; if (s < 0) return [16, 19, 26, 255];
              const d = Math.hypot(s % W + 0.5 - px, ((s / W) | 0) + 0.5 - py);   // 거리장 버퍼(128×64)의 픽셀 단위
              if (look === 1) { const v = clamp(1 - d / 50, 0, 1) * (0.8 + 0.2 * Math.cos(d * 1.2)); return [v * 255, v * 170, v * 80, 255]; }
              if (look === 2) { const v = Math.exp(-d / (w * 0.6)); return [16 + v * 239, 19 + v * 160, 26 + v * 40, 255]; }
              const a = clamp((w - d) * 2 + 0.5, 0, 1);
              return [lerp(16, 255, a), lerp(19, 134, a), lerp(26, 47, a), 255];
            });
            const passes = Math.ceil(Math.log2(Math.max(2, w))) + 1;
            L.set("w", w); L.set("brute", num(Math.round(Math.PI * w * w), 0)); L.set("passes", passes); L.set("jfa", passes * 9);
          };
        }
      } },
      { key: "JFA는 ==좌표를 전한다==는 점이 핵심입니다. 거리 값만 전하면 오차가 쌓이지만, 씨앗 좌표를 들고 다니면 마지막에 정확한 유클리드 거리를 계산할 수 있습니다. 렌더 타깃은 RG16 정도면 충분합니다." },

      { use: [
        ["게임", "선택 외곽선과 포커스", "선택한 유닛·아이템의 두꺼운 외곽선, 스텔스 게임의 '벽 너머 보기' 실루엣, 툰 렌더링의 굵은 윤곽선이 JFA나 그 변형으로 만들어집니다."],
        ["엔진", "거리장 생성", "UE의 Jump Flood 기반 거리장 생성(머티리얼 그래프에서 렌더 타깃 핑퐁)과 Unity URP 커스텀 패스 예제가 널리 쓰입니다. 글꼴·아이콘용 SDF 텍스처 생성에도 씁니다."],
        ["글", "벤 골루스의 비교", "'The Quest for Very Wide Outlines'에서 브루트포스, 분리형 가우시안, 스텐실, JFA를 같은 장면에서 시간까지 재어 비교합니다."],
        ["TA", "보로노이·확산 효과", "JFA의 부산물인 보로노이 영역은 균열·셀 무늬·영역 퍼짐(페인트가 번지는 효과) 텍스처를 실시간으로 만드는 데도 쓰입니다."]
      ] },

      { recap: [
        ["k = N/2, N/4, …, 1", "간격을 절반씩 줄이며 9곳 확인"],
        ["log₂ N 패스", "해상도와 두께에 거의 무관한 비용"],
        ["씨앗 좌표를 전달", "마지막에 정확한 거리 계산"],
        ["거리 < w", "원하는 두께의 외곽선·빛남"]
      ] }
    ]
  });
})();
