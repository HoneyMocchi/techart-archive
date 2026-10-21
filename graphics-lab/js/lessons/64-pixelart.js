/* 64 픽셀 아트 필터링: 흐리지도 깨지지도 않게 */
(() => {
  // 16×16 버섯 스프라이트 (팔레트 번호)
  const SPR = [
    "................",
    ".....111111.....",
    "...1122222211...",
    "..122332222221..",
    ".12233332222221.",
    ".12223322223321.",
    "1222222222333321",
    "1233222222333321",
    "1233322222233221",
    "1222222222222221",
    ".11114444441111.",
    "....14444441....",
    "....14454541....",
    "....14444441....",
    ".....144441.....",
    "......1111......"
  ];
  const PALC = { ".": [40, 46, 60], 1: [30, 20, 28], 2: [214, 64, 64], 3: [245, 240, 230], 4: [235, 210, 170], 5: [60, 40, 40] };
  const T = SPR.map(r => [...r].map(ch => PALC[ch]));
  const tex = (i, j) => T[clamp(j, 0, 15)][clamp(i, 0, 15)];
  const bil = (u, v) => {   // 텍셀 좌표에서 쌍선형
    const x = u - 0.5, y = v - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const a = tex(i, j), b = tex(i + 1, j), c = tex(i, j + 1), d = tex(i + 1, j + 1);
    return [0, 1, 2].map(k => lerp(lerp(a[k], b[k], fx), lerp(c[k], d[k], fx), fy));
  };
  // 픽셀 아트 AA: 텍셀 경계 근처 화면 픽셀 하나 폭에서만 보간
  const paa = (t, fw) => Math.floor(t) + 0.5 + clamp((t - Math.floor(t) - 0.5) / fw, -0.5, 0.5);

  lesson({
    topic: "pixelart", title: "픽셀 아트 필터링", desc: "흐리지도 깨지지도 않는 확대", stage: "그래픽스 연구 노트",
    sym: { t: "teal", w: "orange" },
    hook: "픽셀 아트를 정수배가 아닌 크기로 늘리거나 돌리면 고민이 생깁니다. ==포인트 필터==는 픽셀 크기가 들쭉날쭉하고 움직일 때 지글거립니다. ==쌍선형==은 전부 뿌옇습니다. 정답은 그 사이, ==텍셀 경계에서 화면 픽셀 하나 폭만 섞는== 필터입니다. 벤 골루스와 여러 인디 개발자가 다듬은 셰이더 기법입니다.",
    blocks: [
      { h: "돌리고 늘려 보기" },
      "화면 픽셀이 보이도록 일부러 거칠게 그렸습니다. 재생을 눌러 천천히 돌려 보면 포인트 필터는 ==가장자리 픽셀이 튀고==, 쌍선형은 ==전체가 흐리고==, 픽셀 아트 AA는 또렷하면서 매끈합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 2, scale = 3.3, ang = 0.12;
          C.play();
          C.seg({ options: [{ value: 0, label: "포인트" }, { value: 1, label: "쌍선형" }, { value: 2, label: "픽셀 아트 AA" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "배율 (화면 픽셀 / 텍셀)", min: 1, max: 6, value: scale, fmt: x => "×" + num(x, 2), onInput: x => { scale = x; } });
          F.loop(dt => { ang += dt * 0.25; });
          F.draw = g => {
            const cols = 120, rows = 60, c = Math.cos(ang), s = Math.sin(ang);
            g.field(cols, (x, y, i, j) => {
              const px = i + 0.5 - cols / 2, py = j + 0.5 - rows / 2;
              const u = (c * px + s * py) / scale + 8, v = (-s * px + c * py) / scale + 8;
              if (u < -0.5 || v < -0.5 || u > 16.5 || v > 16.5) return [16, 19, 26, 255];
              let col;
              if (mode === 0) col = tex(Math.floor(u), Math.floor(v));
              else if (mode === 1) col = bil(u, v);
              else { const fw = (Math.abs(c) + Math.abs(s)) / scale; col = bil(paa(u, fw), paa(v, fw)); }
              return [col[0], col[1], col[2], 255];
            }, { rows, smooth: false });
            L.set("eq", ["$t$ 를 내림해 한 텍셀만 읽음 → 화면 픽셀 1개 또는 2개로 들쭉날쭉", "주변 4텍셀을 섞음 → 확대할수록 뿌옇게", "$t' = ⌊t⌋ + 0.5 + clamp((fract(t) − 0.5) / w, −0.5, 0.5)$  (w = fwidth(t))"][mode]);
          };
        }
      } },

      { h: "필터를 옆에서 보면" },
      "텍셀 두 칸(어두움 → 밝음)을 가로로 지나며 읽은 값을 그래프로 그렸습니다. 포인트는 계단, 쌍선형은 텍셀 하나 길이의 경사, 픽셀 아트 AA는 ==경계 근처 화면 픽셀 $w$ 폭에서만 짧은 경사==입니다. 배율을 바꿔도 경사 폭이 화면 기준으로 일정합니다.",
      { fig: {
        aspect: 0.45, view: { x0: -0.2, x1: 4.2, y0: -0.25, y1: 1.6, stretch: true },
        eq: ["화면 픽셀 / 텍셀 = {s}   ·   w = {w} 텍셀"],
        setup(F, C, L) {
          let s = 4;
          C.slider({ label: "배율", min: 1, max: 12, value: s, fmt: x => "×" + num(x, 1), onInput: x => { s = x; } });
          F.draw = g => {
            const w = 1 / s, step = t => (Math.floor(t) % 2 ? 1 : 0.15);
            const lin = t => { const x = t - 0.5, i = Math.floor(x), f = x - i; return lerp(i % 2 ? 1 : 0.15, (i + 1) % 2 ? 1 : 0.15, f); };
            for (let k = 0; k <= 4; k++) g.line([k, -0.1], [k, 1.25], "white", { w: 1, alpha: 0.15 });
            for (let k = 0; k < 4 * s; k++) g.line([k / s, -0.18], [k / s, -0.1], "grey", { w: 1 });
            const curve = (fn, color, off) => { const pts = []; for (let k = 0; k <= 400; k++) { const t = 0.01 + k / 400 * 3.98; pts.push([t, fn(t) + off]); } g.poly(pts, { stroke: color, w: 2.5, close: false }); };
            curve(step, "grey", 0);
            curve(lin, "blue", 0.02);
            curve(t => lin(paa(t, w)), "orange", 0.04);
            [["포인트", "grey"], ["쌍선형", "blue"], ["픽셀 아트 AA", "orange"]].forEach(([n, c], i) => g.text(n, [0.1 + i * 1.3, 1.45], c, { size: 12, bold: true, align: "left" }));
            g.text("아래 눈금 = 화면 픽셀", [4.1, -0.14], "grey", { size: 10, align: "right" });
            L.set("s", num(s, 1)); L.set("w", num(w, 2));
          };
        }
      } },
      { key: "핵심은 ==텍스처 좌표를 고친 뒤 쌍선형 필터에 맡긴다==는 점입니다. 샘플은 한 번이고, 밉맵·회전·비정수 배율에서 모두 작동합니다. 단, 축소될 때(배율 < 1)는 일반 밉맵으로 넘겨야 합니다." },

      { use: [
        ["게임", "현대 픽셀 아트 게임", "회전·확대·서브픽셀 카메라 이동이 많은 'Celeste'류 2D 게임과 3D 픽셀 아트 게임(예: 'A Short Hike')이 이런 필터나 정수배 렌더 타깃을 씁니다."],
        ["엔진", "Unity·UE에서", "텍스처는 쌍선형 + 밉 없음으로 두고, 머티리얼에서 UV를 이 식으로 고친 뒤 샘플합니다. UE에서는 Custom 노드 또는 DDX/DDY 노드로 fwidth를 만듭니다."],
        ["글", "참고 글", "벤 골루스의 'Pixel Art Filtering'과 cyanilux·d7samurai의 셰이더 글이 같은 결론(경계에서 화면 픽셀 하나만 섞기)에 이릅니다."],
        ["TA", "UI 아이콘에도", "작은 아이콘을 비정수 배율 UI에 놓을 때 흐림과 지글거림 사이에서 고민한다면 같은 방법이 그대로 통합니다."]
      ] },

      { recap: [
        ["포인트", "또렷하지만 픽셀 크기가 들쭉날쭉"],
        ["쌍선형", "매끈하지만 흐림"],
        ["⌊t⌋ + 0.5 + clamp((fract(t) − 0.5) / w)", "경계에서만 화면 픽셀 하나 폭 보간"],
        ["w = fwidth(t)", "화면 픽셀 하나가 몇 텍셀인지"]
      ] }
    ]
  });
})();
