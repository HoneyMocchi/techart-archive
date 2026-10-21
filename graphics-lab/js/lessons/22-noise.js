/* 20 노이즈 */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const h1 = i => fract(Math.sin(i * 127.1) * 43758.5453);
  const h2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);               // 펄린의 5차 곡선
  const smooth = t => t * t * (3 - 2 * t);
  function value2(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
    return lerp(lerp(h2(i, j), h2(i + 1, j), fx), lerp(h2(i, j + 1), h2(i + 1, j + 1), fx), fy);
  }
  const grad = (i, j) => { const a = h2(i, j) * TAU; return [Math.cos(a), Math.sin(a)]; };
  function perlin2(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const d = (gi, gj) => { const g = grad(gi, gj); return g[0] * (x - gi) + g[1] * (y - gj); };
    const u = fade(fx), v = fade(fy);
    return lerp(lerp(d(i, j), d(i + 1, j), u), lerp(d(i, j + 1), d(i + 1, j + 1), u), v) * 0.7 + 0.5;
  }
  function fbm(x, y, oct, lac, gain) {
    let s = 0, a = 0.5, f = 1, norm = 0;
    for (let o = 0; o < oct; o++) { s += a * perlin2(x * f + o * 17.3, y * f - o * 9.1); norm += a; a *= gain; f *= lac; }
    return s / norm;
  }

  lesson({
    topic: "noise", title: "노이즈", desc: "부드러운 무작위", stage: "셰이더로 그리기",
    sym: { n: "yellow", f: "gold", t: "teal", i: "grey" },
    hook: "그냥 난수는 지글거리는 TV 잡음이고, 자연은 그렇게 생기지 않았습니다. ==격자 점에만 난수를 두고 그 사이를 부드럽게 이으면== 구름·돌·물결 같은 자연스러운 무작위가 됩니다.",
    blocks: [
      { h: "1D로 먼저: 점에만 난수, 사이는 보간" },
      "흰 점이 정수 위치의 난수입니다. 그 사이를 ==직선으로 이으면 꺾이고, smoothstep으로 이으면 부드럽습니다==. '그냥 난수'와 비교해 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 12, y0: -0.2, y1: 1.2, stretch: true },
        eq: ["n(x) = lerp(h(i), h(i+1), {interp}),   i = floor(x)"],
        setup(F, C, L) {
          let mode = "smooth", freq = 1, off = 0;
          C.seg({ options: [{ value: "white", label: "그냥 난수" }, { value: "lin", label: "직선 보간" }, { value: "smooth", label: "smoothstep 보간" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "주파수", min: 0.5, max: 4, value: freq, onInput: x => { freq = x; } });
          C.play();
          F.loop(dt => { off += dt * 1.2; });
          F.draw = g => {
            g.line([0, 0], [12, 0], "grey", { w: 1 });
            const pts = [];
            for (let k = 0; k <= 600; k++) {
              const x = k / 50, X = x * freq + off, i = Math.floor(X), t = X - i;
              let v;
              if (mode === "white") v = h1(Math.floor(X * 20) + 0.5);
              else v = lerp(h1(i), h1(i + 1), mode === "lin" ? t : smooth(t));
              pts.push([x, v]);
            }
            g.poly(pts, { stroke: "yellow", w: 2.5, close: false });
            if (mode !== "white") for (let i = Math.ceil(off); i <= off + 12 * freq; i++) g.dot([(i - off) / freq, h1(i)], "white", 4.5);
            L.set("interp", mode === "smooth" ? "$smoothstep(x − i)$" : mode === "lin" ? "$x − i$" : "— (보간 없음)");
          };
        }
      } },

      { h: "2D: 값 노이즈와 그레디언트(펄린) 노이즈" },
      "격자 꼭짓점마다 ==값을 두면 값 노이즈, 기울기(화살표)를 두면 그레디언트 노이즈==입니다. 값 노이즈는 격자 모양이 비쳐 보이고, 펄린 노이즈는 덩어리가 더 고르게 퍼집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 8, y0: 0, y1: 4 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = "perlin", grid = true, scale = 1;
          C.seg({ options: [{ value: "value", label: "값 노이즈" }, { value: "perlin", label: "그레디언트(펄린)" }], value: mode, onChange: x => { mode = x; } });
          C.seg({ options: [{ value: 1, label: "격자 보기" }, { value: 0, label: "숨기기" }], value: 1, onChange: x => { grid = !!x; } });
          C.slider({ label: "크기", min: 0.5, max: 3, value: scale, onInput: x => { scale = x; } });
          F.draw = g => {
            g.field(220, (x, y) => {
              const v = mode === "value" ? value2(x * scale, y * scale) : clamp(perlin2(x * scale, y * scale), 0, 1);
              const c = v * 255;
              return [c * 0.85, c * 0.92, c, 255];
            });
            if (grid) for (let i = 0; i <= 8 * scale; i++) for (let j = 0; j <= 4 * scale; j++) {
              const p = [i / scale, j / scale];
              g.line([p[0], 0], [p[0], 4], "rgba(244,211,69,0.25)", { w: 1 }); g.line([0, p[1]], [8, p[1]], "rgba(244,211,69,0.25)", { w: 1 });
              if (mode === "perlin") { const gr = grad(i, j); g.arrow(p, V.add(p, V.mul(gr, 0.35 / scale)), "orange", { w: 2, head: 7 }); }
              else g.dot(p, h2(i, j) > 0.5 ? "white" : "#222", 4);
            }
            L.set("eq", mode === "value" ? "꼭짓점의 난수 값 4개를 smoothstep으로 섞음 → 격자 결이 남음" : "꼭짓점의 기울기와 (위치 − 꼭짓점)의 내적 4개를 섞음 → 고른 덩어리");
          };
        }
      } },

      { h: "fBm: 크기만 다른 노이즈를 겹치기" },
      "노이즈 하나는 너무 매끈합니다. ==주파수를 두 배씩 올리고 세기를 절반씩 줄인 노이즈를 여러 겹 더하면==(옥타브) 산맥처럼 큰 굴곡 위에 잔디테일이 얹힙니다. 높이에 따라 물·모래·풀·바위·눈으로 칠했습니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 8, y0: 0, y1: 4 },
        eq: ["fBm(p) = Σ (gain^i) · noise(p · lacunarity^i),   i = 0 … {oct}"],
        setup(F, C, L) {
          let oct = 5, lac = 2, gain = 0.5, sea = 0.45, probe = 2;
          C.slider({ label: "옥타브", min: 1, max: 8, step: 1, value: oct, fmt: x => num(x, 0), onInput: x => { oct = x; } });
          C.slider({ label: "lacunarity", min: 1.4, max: 3, value: lac, onInput: x => { lac = x; } });
          C.slider({ label: "gain", min: 0.2, max: 0.8, value: gain, onInput: x => { gain = x; } });
          C.slider({ label: "해수면", min: 0.2, max: 0.7, value: sea, onInput: x => { sea = x; } });
          F.handle({ color: "white", get: () => [7.85, probe], set: (x, y) => { probe = clamp(y, 0.95, 3.95); } });
          const col = h => h < sea - 0.04 ? [30, 70, 140] : h < sea ? [60, 120, 180] : h < sea + 0.03 ? [215, 200, 140] : h < 0.62 ? [80, 140, 70] : h < 0.72 ? [110, 100, 85] : [240, 242, 245];
          F.draw = g => {
            g.field(200, (x, y) => {
              if (y < 0.9 && y > 0) return null;
              const h = fbm(x * 0.6, y * 0.6, oct, lac, gain);
              const c = col(h), sh = 0.85 + 0.3 * (fbm(x * 0.6 + 0.02, y * 0.6, oct, lac, gain) - h) * 20;
              return [c[0] * sh, c[1] * sh, c[2] * sh, 255];
            }, { rect: { x0: 0, x1: 8, y0: 0.9, y1: 4 } });
            // 아래: 노란 줄을 따라 자른 단면
            g.poly([[0, 0], [8, 0], [8, 0.85], [0, 0.85]], { fill: "rgba(236,239,244,0.04)" });
            const pts = [];
            for (let i = 0; i <= 200; i++) { const x = i / 25; pts.push([x, fbm(x * 0.6, probe * 0.6, oct, lac, gain) * 0.8]); }
            g.poly(pts.concat([[8, 0], [0, 0]]), { fill: "rgba(131,193,103,0.35)", stroke: "green", w: 2 });
            g.line([0, sea * 0.8], [8, sea * 0.8], "blue", { w: 1.5, dash: [4, 4] });
            g.line([0, probe], [8, probe], "yellow", { w: 1.5, dash: [4, 4] });
            L.set("oct", oct - 1);
          };
        }
      } },
      { key: "노이즈는 ==같은 입력에 늘 같은 값==을 주는 결정적 함수입니다. 그래서 텍스처를 저장하지 않고도 무한히 넓은 지형·구름을 셰이더에서 그 자리에서 계산할 수 있습니다." },

      { use: [
        ["엔진", "노이즈 노드와 텍스처", "UE 머티리얼 Noise 노드(펄린·그레디언트·보로노이), 그리고 미리 구운 타일링 노이즈 텍스처가 구름·물·디졸브 효과의 재료입니다."],
        ["게임", "지형과 월드 생성", "마인크래프트·노 맨즈 스카이의 무한 지형이 fBm 노이즈입니다. 시드 하나로 같은 세계가 다시 만들어집니다."],
        ["이펙트", "디졸브·불꽃·연기", "노이즈 값에 문턱을 두고 시간에 따라 올리면 타서 사라지는 디졸브, 흐르게 하면 불꽃·연기가 됩니다."],
        ["실생활", "영화 CG의 시작", "펄린 노이즈는 영화 '트론'(1982) 작업에서 나와 아카데미 기술상을 받았습니다. 지금도 거의 모든 CG 툴에 들어 있습니다."]
      ] },

      { recap: [
        ["lerp(h(i), h(i+1), smoothstep(x − i))", "값 노이즈: 격자 점 난수를 부드럽게 이음"],
        ["dot(기울기, p − 꼭짓점)", "그레디언트(펄린) 노이즈: 더 고른 덩어리"],
        ["Σ gain^i · noise(p · lacunarity^i)", "fBm: 옥타브를 겹쳐 디테일"],
        ["같은 입력 → 같은 값", "저장 없이 무한한 패턴"]
      ] }
    ]
  });
})();
