/* 37 채널 패킹과 텍스처 압축 */
(() => {
  const fract = x => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = t => t * t * (3 - 2 * t); return lerp(lerp(hash(i, j), hash(i + 1, j), s(fx)), lerp(hash(i, j + 1), hash(i + 1, j + 1), s(fx)), s(fy)); };
  // 같은 바위 재질의 마스크 세 장
  const AO = (u, v) => clamp(0.35 + 0.65 * vnoise(u * 6, v * 6) + 0.2 * vnoise(u * 20, v * 20) - 0.15, 0, 1);
  const RO = (u, v) => clamp(0.4 + 0.5 * vnoise(u * 3 + 7, v * 3) - (Math.hypot(u - 0.6, v - 0.4) < 0.18 ? 0.35 : 0), 0, 1);
  const ME = (u, v) => (Math.abs(u - 0.25) < 0.08 || Math.abs(v - 0.75) < 0.05 ? 1 : 0);
  const MB = n => (n >= 1048576 ? num(n / 1048576, 1) + " MB" : num(n / 1024, 0) + " KB");

  lesson({
    topic: "texpack", title: "채널 패킹과 텍스처 압축", desc: "RGBA 한 장에 마스크 넷", stage: "테크아트 실전",
    sym: {},
    hook: "게임 메모리의 대부분은 텍스처입니다. TA는 ==흑백 마스크를 RGBA 채널에 나눠 담고(패킹), 용도에 맞는 압축 포맷을 고르는== 일로 품질을 지키면서 메모리를 절반 이하로 줄입니다.",
    blocks: [
      { h: "채널 패킹: 흑백 마스크 셋을 한 장에" },
      "AO·거칠기·금속성은 모두 흑백이라 채널 하나면 충분합니다. ==R에 AO, G에 거칠기, B에 금속성==(ORM)을 담으면 텍스처 세 장이 한 장이 되고, 셰이더는 한 번만 읽습니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let view = "packed";
          C.seg({ options: [{ value: "r", label: "R = AO" }, { value: "g", label: "G = 거칠기" }, { value: "b", label: "B = 금속성" }, { value: "packed", label: "합친 ORM" }], value: view, onChange: x => { view = x; } });
          F.draw = g => {
            g.field(260, (x, y) => {
              const tile = Math.floor(x), u = x - tile, v = 1 - y / 2;
              if (y > 2 || tile > 3) return null;
              const a = AO(u, v) * 255, r = RO(u, v) * 255, m = ME(u, v) * 255;
              if (tile === 0) return [a, a, a, 255];
              if (tile === 1) return [r, r, r, 255];
              if (tile === 2) return [m, m, m, 255];
              return view === "packed" ? [a, r, m, 255] : view === "r" ? [a, 0, 0, 255] : view === "g" ? [0, r, 0, 255] : [0, 0, m, 255];
            }, { rect: { x0: 0, x1: 4, y0: 0, y1: 2 }, smooth: false });
            ["AO", "거칠기", "금속성", "ORM (RGB)"].forEach((t, i) => g.text(t, [i + 0.5, 1.92], "white", { size: 12, bold: true }));
            [1, 2, 3].forEach(i => g.line([i, 0], [i, 2], "#10131A", { w: 3 }));
            L.set("eq", view === "packed" ? "흑백 3장(각 1채널) → RGB 1장   ·   샘플링 3번 → 1번" : `$${view.toUpperCase()}$ 채널만 보기`);
          };
        }
      } },
      { key: "패킹할 마스크는 ==sRGB를 꺼야== 합니다(14장). 숫자 그대로의 마스크에 감마가 걸리면 거칠기 0.5가 0.21로 읽힙니다. 그리고 ==압축 후 품질이 좋은 G 채널==에 가장 중요한 마스크를 넣는 것이 관례입니다." },

      { h: "블록 압축(BC1): 4×4 픽셀을 색 두 개로" },
      "GPU 텍스처 압축은 이미지를 ==4×4 블록으로 나누고, 블록마다 끝 색 두 개와 그 사이 4단계 중 하나를 고르는 2비트 번호==만 저장합니다. 블록 안에 색이 셋 이상 섞이면 뭉개집니다. 확대해서 원본과 비교해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["블록 하나: 원본 16픽셀 × 3B = 48B   →   BC1: 끝 색 2개(4B) + 번호 16개 × 2비트(4B) = 8B   (6 : 1)"],
        setup(F, C, L) {
          let showErr = false;
          C.seg({ options: [{ value: 0, label: "원본 | 압축" }, { value: 1, label: "오차 ×4 보기" }], value: 0, onChange: x => { showErr = !!x; } });
          const W = 32, H = 32;
          const src = (i, j) => {
            const u = i / W, v = j / H;
            let c = [lerp(40, 220, u), lerp(60, 120, v), lerp(200, 60, u)];
            if (Math.hypot(u - 0.62, v - 0.45) < 0.2) c = [230, 60, 60];
            if (Math.abs(u - v * 0.7 - 0.08) < 0.03) c = [80, 220, 120];
            if (Math.hypot(u - 0.62, v - 0.45) < 0.08) c = [250, 230, 90];
            return c;
          };
          const comp = [];
          for (let by = 0; by < H / 4; by++) for (let bx = 0; bx < W / 4; bx++) {
            const px = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) px.push(src(bx * 4 + i, by * 4 + j));
            const mn = [0, 1, 2].map(k => Math.min(...px.map(p => p[k]))), mx = [0, 1, 2].map(k => Math.max(...px.map(p => p[k])));
            const pal = [0, 1 / 3, 2 / 3, 1].map(t => mn.map((v, k) => lerp(v, mx[k], t)));
            px.forEach((p, n) => { let best = 0, bd = 1e9; pal.forEach((q, k) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < bd) { bd = d; best = k; } }); comp[(by * 4 + Math.floor(n / 4)) * W + bx * 4 + (n % 4)] = pal[best]; });
          }
          F.draw = g => {
            g.field(256, (x, y) => {
              const right = x >= 2, i = Math.floor((right ? x - 2 : x) / 2 * W), j = Math.floor((2 - y) / 2 * H);
              if (i < 0 || i >= W || j < 0 || j >= H) return null;
              const o = src(i, j), c = comp[j * W + i];
              if (!right) return [...o, 255];
              if (showErr) return [0, 1, 2].map(k => clamp(Math.abs(o[k] - c[k]) * 4, 0, 255)).concat(255);
              return [...c, 255];
            }, { smooth: false });
            for (let k = 0; k <= 8; k++) { g.line([2 + k * 0.25, 0], [2 + k * 0.25, 2], "rgba(16,19,26,0.5)", { w: 1 }); g.line([2, k * 0.25], [4, k * 0.25], "rgba(16,19,26,0.5)", { w: 1 }); }
            g.line([2, 0], [2, 2], "white", { w: 2 });
            g.text("원본", [1, 1.93], "white", { size: 12, bold: true }); g.text(showErr ? "오차 ×4" : "BC1 압축 (4×4 블록)", [3, 1.93], "white", { size: 12, bold: true });
          };
        }
      } },
      "그래서 포맷을 용도별로 고릅니다. ==불투명 색은 BC1, 알파가 필요하면 BC3/BC7, 노멀 맵은 두 채널만 따로 압축하는 BC5==(z는 셰이더에서 $√(1 − x^2 − y^2)$ 로 복원), 흑백 마스크 한 장은 BC4입니다.",

      { h: "밉맵·해상도·포맷이 정하는 메모리" },
      "해상도를 두 배로 올리면 메모리는 ==네 배==, 밉맵 사슬은 거기에 ==1/3을 더합니다==. 포맷을 바꿔 가며 텍스처 한 장의 메모리를 확인해 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["{res}² × {bpp} B × 4/3 (밉) = {mem}"],
        setup(F, C, L) {
          let p = 11, fmt = 0.5;
          C.slider({ label: "해상도", min: 8, max: 13, step: 1, value: p, fmt: x => Math.pow(2, x) + "²", onInput: x => { p = x; } });
          C.seg({ options: [{ value: 4, label: "RGBA8 (4B)" }, { value: 1, label: "BC7·BC3 (1B)" }, { value: 0.5, label: "BC1·BC4 (0.5B)" }], value: fmt, onChange: x => { fmt = +x; } });
          F.draw = g => {
            const res = Math.pow(2, p), base = res * res * fmt, mem = base * 4 / 3;
            let x = 0.3, s = 3.6;
            for (let k = 0; k < 8 && s > 0.03; k++) { g.poly([[x, 0.3], [x + s, 0.3], [x + s, 0.3 + s], [x, 0.3 + s]], { fill: k === 0 ? "rgba(88,196,221,0.35)" : "rgba(244,211,69,0.35)", stroke: k === 0 ? "blue" : "gold", w: 1.5 }); x += s + 0.12; s /= 2; }
            g.text("밉 0", [2.1, 2.1], "white", { size: 12, bold: true }); g.text("밉 1, 2, 3 … 합쳐서 +33%", [5.6, 2.4], "gold", { size: 11 });
            const cap = 8 * 1048576, w = Math.min(1, mem / cap);
            g.poly([[6, 3.4], [9.7, 3.4], [9.7, 3.9], [6, 3.9]], { stroke: "rgba(236,239,244,0.3)", w: 1 });
            g.poly([[6, 3.4], [6 + 3.7 * w, 3.4], [6 + 3.7 * w, 3.9], [6, 3.9]], { fill: mem > 32 * 1048576 ? PAL.red : mem > 8 * 1048576 ? PAL.orange : PAL.green });
            g.text("8 MB 기준", [9.7, 3.4], "grey", { size: 10, align: "right", dy: 10 });
            L.set("res", res); L.set("bpp", fmt); L.set("mem", MB(mem));
          };
        }
      } },

      { use: [
        ["엔진", "압축 설정", "UE 텍스처의 Compression Settings: Default(BC1/3), Masks(sRGB 끔), Normalmap(BC5), Grayscale(BC4), BC7. 마스크에 Default를 쓰면 감마 오류가 납니다."],
        ["엔진", "텍스처 스트리밍", "UE는 카메라 거리에 맞는 밉만 메모리에 올립니다. 'Texture streaming pool over budget' 경고가 뜨면 해상도·밉 바이어스부터 봅니다."],
        ["TA", "패킹 규칙 문서화", "프로젝트마다 ORM·RMA 등 채널 순서가 다릅니다. 셰이더와 아트 파이프라인이 같은 규칙을 쓰도록 TA가 정하고 검증 툴을 만듭니다."],
        ["최적화", "4K는 정말 필요한가", "화면에서 64픽셀로 보이는 소품에 4K 텍스처를 쓰면 밉 0~5는 거의 안 쓰입니다. 텍셀 밀도(38장)로 해상도를 정합니다."]
      ] },

      { recap: [
        ["R = AO, G = 거칠기, B = 금속성", "채널 패킹: 샘플링·메모리 절약, sRGB 끔"],
        ["4×4 블록 = 끝 색 2 + 2비트 번호", "BC1: 6 : 1 압축, 블록 안 색이 많으면 뭉개짐"],
        ["BC5 노멀 + z = √(1 − x^2 − y^2)", "용도별 포맷"],
        ["해상도 2배 = 메모리 4배, 밉 +1/3", "메모리 계산"]
      ] }
    ]
  });
})();
