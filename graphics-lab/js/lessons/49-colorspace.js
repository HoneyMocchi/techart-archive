/* 49 색 공간: YCbCr과 OkLab */
(() => {
  const f2 = n => num(n, 2);
  const toLin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toS = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055);
  const B8 = v => Math.round(clamp(v, 0, 1) * 255);
  // OkLab (선형 sRGB 기준)
  function oklab([r, g, b]) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function fromOklab([L, a, b]) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  const ycc = ([r, g, b]) => { const y = 0.299 * r + 0.587 * g + 0.114 * b; return [y, 0.5 + (b - y) * 0.564, 0.5 + (r - y) * 0.713]; };
  const rgbFromYcc = ([y, cb, cr]) => [y + 1.403 * (cr - 0.5), y - 0.344 * (cb - 0.5) - 0.714 * (cr - 0.5), y + 1.773 * (cb - 0.5)];
  const fract = x => x - Math.floor(x);
  // 사진 대용 이미지 (sRGB 0~1)
  function photo(u, v) {
    const sky = v > 0.6, c = sky ? [0.45 + 0.4 * (1 - v), 0.6 + 0.2 * (1 - v), 0.9] : [0.25 + 0.2 * Math.sin(u * 40) * Math.sin(v * 30), 0.45, 0.2];
    if (Math.hypot(u - 0.3, v - 0.45) < 0.16) return [0.9, 0.25, 0.2];
    if (Math.abs(u - 0.7) < 0.12 && v < 0.6 && v > 0.15) return fract(v * 12) < 0.5 ? [0.95, 0.85, 0.2] : [0.15, 0.15, 0.6];
    return c;
  }

  lesson({
    topic: "colorspace", title: "YCbCr과 OkLab", desc: "눈에 맞춘 색 좌표", stage: "TA 도구 상자",
    sym: { Y: "white", L: "white" },
    hook: "RGB는 화면을 위한 좌표이지 눈을 위한 좌표가 아닙니다. 눈은 ==밝기에 민감하고 색 차이에는 둔합니다==. 이것을 이용해 밝기와 색을 나눈 YCbCr로 영상을 압축하고, 눈이 느끼는 거리대로 색을 배치한 OkLab으로 자연스러운 그라데이션과 색 조작을 합니다.",
    blocks: [
      { h: "YCbCr: 밝기와 색을 나누기" },
      "이미지를 밝기 $Y$와 색 차이 두 장(Cb 파랑 쪽, Cr 빨강 쪽)으로 나눴습니다. '색 해상도 1/4'로 바꿔도 ==거의 차이가 없지만==, 밝기 해상도를 줄이면 바로 흐려집니다. JPEG·동영상이 색을 절반 해상도로 저장(4:2:0)하는 이유입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["Y = 0.299 R + 0.587 G + 0.114 B   ·   {mode}"],
        setup(F, C, L) {
          let mode = "420", view = "rgb";
          C.seg({ options: [{ value: "444", label: "4:4:4 원본" }, { value: "420", label: "색 해상도 1/4 (4:2:0)" }, { value: "yhalf", label: "밝기 해상도 1/4" }], value: mode, onChange: x => { mode = x; } });
          C.seg({ options: [{ value: "rgb", label: "결과" }, { value: "y", label: "Y" }, { value: "cb", label: "Cb" }, { value: "cr", label: "Cr" }], value: view, onChange: x => { view = x; } });
          F.draw = g => {
            const W = 96, H = 48, blk = 4;
            g.field(W * 2, (x, y, i, j) => {
              const u = x / 4, v = y / 2;
              const q = (a, n) => (Math.floor(a * n) + 0.5) / n;          // 블록 중심으로 내림
              const full = ycc(photo(u, v)), low = ycc(photo(q(u, W / blk), q(v, H / blk)));
              let c = mode === "444" ? full : mode === "420" ? [full[0], low[1], low[2]] : [low[0], full[1], full[2]];
              if (view === "y") return [B8(c[0]), B8(c[0]), B8(c[0]), 255];
              if (view === "cb") return [B8(0.5), B8(0.5 - (c[1] - 0.5) * 0.5), B8(c[1]), 255];
              if (view === "cr") return [B8(c[2]), B8(0.5 - (c[2] - 0.5) * 0.5), B8(0.5), 255];
              return rgbFromYcc(c).map(B8).concat(255);
            }, { rows: H * 2, smooth: false });
            L.set("mode", mode === "444" ? "모든 픽셀이 Y·Cb·Cr 모두 가짐 (3바이트)" : mode === "420" ? "Cb·Cr은 4픽셀이 하나를 공유 (평균 1.5바이트, 절반)" : "반대로 밝기를 4픽셀이 공유하면 흐려짐이 바로 보임");
          };
        }
      } },

      { h: "OkLab: 섞을 때 눈에 고르게" },
      "두 색 사이 그라데이션을 세 공간에서 만들었습니다. sRGB 숫자로 섞으면 가운데가 칙칙하고, 선형 RGB로 섞으면 밝은 쪽으로 쏠립니다. ==OkLab은 눈이 느끼는 밝기·색 거리가 고르도록 만든 공간==이라 가운데가 자연스럽습니다. 아래 회색 띠는 각 그라데이션의 지각 밝기($L$)입니다.",
      { fig: {
        aspect: 0.56, view: { x0: 0, x1: 4, y0: 0, y1: 2.24 },
        eq: ["가운데 색의 밝기 L: sRGB {a} · 선형 {b} · OkLab {c}"],
        setup(F, C, L) {
          const pairs = { "파랑 → 노랑": [[0.1, 0.2, 0.9], [1, 0.9, 0.2]], "빨강 → 청록": [[0.9, 0.15, 0.2], [0.1, 0.8, 0.75]], "검정 → 흰색": [[0, 0, 0], [1, 1, 1]], "보라 → 초록": [[0.5, 0.1, 0.8], [0.3, 0.85, 0.2]] };
          let key = "파랑 → 노랑";
          C.seg({ options: Object.keys(pairs).map(k => ({ value: k, label: k })), value: key, onChange: x => { key = x; } });
          const mixes = (A, Bc, t) => {
            const s = A.map((a, i) => lerp(a, Bc[i], t));
            const l = A.map((a, i) => toS(lerp(toLin(a), toLin(Bc[i]), t)));
            const oa = oklab(A.map(toLin)), ob = oklab(Bc.map(toLin)), o = fromOklab(oa.map((v, i) => lerp(v, ob[i], t))).map(toS);
            return [s, l, o];
          };
          F.draw = g => {
            const [A, Bc] = pairs[key];
            g.field(300, (x, y) => {
              const t = clamp((x - 0.1) / 3.8, 0, 1), row = Math.floor((2.2 - y) / 0.36);
              if (x < 0.1 || x > 3.9 || row < 0 || row > 5) return null;
              const m = mixes(A, Bc, t), k = row >> 1;
              if (row % 2 === 0) return m[k].map(B8).concat(255);
              const Lp = oklab(m[k].map(toLin))[0];
              return [B8(Lp), B8(Lp), B8(Lp), 255];
            }, { smooth: false });
            ["sRGB 숫자로", "선형 RGB로", "OkLab으로"].forEach((t, k) => g.text(t, [0.1, 2.2 - k * 0.72], "white", { size: 11, align: "left", dy: 8, bold: true }));
            const m = mixes(A, Bc, 0.5).map(c => oklab(c.map(toLin))[0]);
            L.set("a", f2(m[0])); L.set("b", f2(m[1])); L.set("c", f2(m[2]));
          };
        }
      } },

      { h: "색상만 돌리기: HSV vs OkLCh" },
      "같은 '밝기·채도'로 색상만 한 바퀴 돌렸습니다. HSV는 숫자상 밝기가 같아도 ==노랑은 눈부시고 파랑은 어둡습니다==(아래 회색 띠를 보세요). OkLCh(OkLab의 극좌표)는 ==지각 밝기를 그대로 두고 색상만== 돌립니다. UI 색 팔레트·팀 색 생성에 바로 쓰입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["OkLCh: L = {l}, C = {c}, h = 0° → 360°"],
        setup(F, C, L) {
          let Lv = 0.7, Cv = 0.13;
          C.slider({ label: "밝기 L", min: 0.3, max: 0.9, value: Lv, onInput: x => { Lv = x; } });
          C.slider({ label: "채도 C", min: 0, max: 0.25, value: Cv, onInput: x => { Cv = x; } });
          const hsv = (h, s, v) => { const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; };
          F.draw = g => {
            g.field(300, (x, y) => {
              const h = clamp((x - 0.1) / 3.8, 0, 1), row = Math.floor((2 - y) / 0.45);
              if (x < 0.1 || x > 3.9 || row < 0 || row > 3) return null;
              let c;
              if (row < 2) c = hsv(h, 0.75, 0.9);
              else { const a = h * TAU; c = fromOklab([Lv, Cv * Math.cos(a), Cv * Math.sin(a)]).map(v => toS(clamp(v, 0, 1))); }
              if (row % 2 === 1) { const Lp = oklab(c.map(toLin))[0]; return [B8(Lp), B8(Lp), B8(Lp), 255]; }
              return c.map(B8).concat(255);
            }, { smooth: false });
            g.text("HSV (밝기 V 고정)", [0.1, 2], "white", { size: 11, align: "left", dy: 8, bold: true });
            g.text("OkLCh (지각 밝기 L 고정)", [0.1, 1.1], "white", { size: 11, align: "left", dy: 8, bold: true });
            L.set("l", f2(Lv)); L.set("c", f2(Cv));
          };
        }
      } },

      { use: [
        ["엔진", "텍스처·영상 압축", "동영상(미디어 텍스처), JPEG 임포트, 일부 텍스처 압축 포맷이 YCbCr 4:2:0을 씁니다. 색 경계가 뭉개지는 것은 이 때문입니다."],
        ["TA", "그라데이션 툴", "UI·이펙트용 그라데이션 램프를 OkLab에서 보간해 굽으면 가운데가 칙칙해지는 문제가 사라집니다. CSS도 `oklch()`를 지원합니다."],
        ["게임", "팀 색·피아 식별", "팀 색 8개를 OkLCh에서 색상만 고르게 돌려 만들면 밝기가 같아 어느 색도 튀지 않고, 색맹 검사도 L값으로 쉽게 합니다."],
        ["실생활", "TV 방송과 사진", "아날로그 컬러 TV가 흑백 TV와 호환되도록 밝기(Y)와 색 신호를 나눈 것이 YCbCr의 기원입니다."]
      ] },

      { recap: [
        ["Y = 0.299R + 0.587G + 0.114B", "밝기와 색 차이로 분리"],
        ["4:2:0", "색은 절반 해상도로도 눈치채지 못함"],
        ["OkLab (L, a, b)", "지각적으로 고른 색 공간: 보간·거리"],
        ["OkLCh = 밝기·채도·색상", "밝기를 지키며 색상만 돌리기"]
      ] }
    ]
  });
})();
