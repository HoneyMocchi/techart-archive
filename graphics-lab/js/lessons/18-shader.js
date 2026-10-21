/* 18 셰이더로 무늬 만들기 */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const SNIP = {
    grad: ["c = uv.x", (u, v, a, t) => u],
    step: ["c = step(a, uv.x)", (u, v, a) => (u >= a ? 1 : 0)],
    smooth: ["c = smoothstep(a − 0.1, a + 0.1, uv.x)", (u, v, a) => sstep(a - 0.1, a + 0.1, u)],
    dist: ["c = length(uv − 0.5)", (u, v) => Math.hypot(u - 0.5, v - 0.5)],
    circle: ["c = step(length(uv − 0.5), a)", (u, v, a) => (Math.hypot(u - 0.5, v - 0.5) <= a ? 1 : 0)],
    rep: ["c = fract(uv.x · 6)", u => fract(u * 6)],
    wave: ["c = sin(uv.x · 20 + t) · 0.5 + 0.5", (u, v, a, t) => Math.sin(u * 20 + t) * 0.5 + 0.5]
  };

  lesson({
    topic: "shader", title: "셰이더로 무늬 만들기", desc: "픽셀마다 같은 함수 한 줄", stage: "셰이더로 그리기",
    sym: { uv: "green", c: "yellow", a: "orange", t: "teal", n: "gold", r: "pink", "θ": "blue", p: "white", k: "orange" },
    hook: "픽셀 셰이더는 ==모든 픽셀에서 동시에 실행되는 함수 하나==입니다. 입력은 자기 위치 $uv$, 출력은 색 하나. 이 제약 안에서 무늬를 만드는 사고법을 익혀 봅니다.",
    blocks: [
      { h: "한 줄 = 한 그림" },
      "코드 한 줄을 고르고 $a$를 움직여 보세요. 아래 띠는 ==가로 한 줄을 따라 잰 값의 그래프==입니다. 셰이더를 짤 때는 항상 이 그래프를 머릿속에 그립니다. 노란 선을 끌어 그래프를 볼 줄을 바꿀 수 있습니다.",
      { fig: {
        aspect: 0.56, view: { x0: 0, x1: 1.78, y0: -0.42, y1: 1, stretch: false },
        eq: ["{code}"],
        setup(F, C, L) {
          let key = "smooth", a = 0.5, probe = 0.5;
          C.seg({ options: Object.keys(SNIP).map(k => ({ value: k, label: { grad: "기울기", step: "step", smooth: "smoothstep", dist: "거리", circle: "원", rep: "반복", wave: "물결" }[k] })), value: key, onChange: x => { key = x; } });
          C.slider({ label: "$a$", min: 0, max: 1, value: a, onInput: x => { a = x; } });
          C.play();
          F.loop(() => {});
          F.handle({ color: "yellow", get: () => [1.72, probe], set: (x, y) => { probe = clamp(y, 0, 1); } });
          F.draw = g => {
            const fn = SNIP[key][1], t = F.t * 2;
            const W = 1.68;   // 그림 영역: x 0~1.68 → uv.x 0~1 (정사각형이 아니므로 uv.y는 0~1)
            g.field(240, (x, y) => {
              if (y < 0 || x > W) return null;
              const u = x / W, v = y, c = clamp(fn(u, v, a, t), 0, 1) * 255;
              return [c, c, c, 255];
            }, { rect: { x0: 0, x1: W, y0: 0, y1: 1 }, smooth: false });
            g.line([0, probe], [W, probe], "yellow", { w: 1.5, dash: [4, 4] });
            g.poly([[0, -0.4], [W, -0.4], [W, -0.04], [0, -0.04]], { fill: "rgba(236,239,244,0.04)" });
            const pts = [];
            for (let i = 0; i <= 200; i++) { const u = i / 200; pts.push([u * W, -0.38 + clamp(fn(u, probe, a, t), 0, 1) * 0.32]); }
            g.poly(pts, { stroke: "yellow", w: 2.5, close: false });
            g.text("0", [0, -0.38], "grey", { size: 10, dx: 8 }); g.text("1", [0, -0.06], "grey", { size: 10, dx: 8 });
            L.set("code", "$" + SNIP[key][0] + "$");
          };
        }
      } },
      { key: "셰이더 무늬의 기본 부품은 ==기울기(uv), 문턱(step), 부드러운 문턱(smoothstep), 거리(length), 반복(fract), 물결(sin)== 여섯 개입니다. 이것들을 곱하고 더하고 넣으면 거의 모든 절차적 무늬가 나옵니다." },

      { h: "칸 나누기: floor와 fract" },
      "$uv$에 $n$을 곱하고 ==정수 부분($floor$)은 칸 번호, 소수 부분($fract$)은 칸 안의 위치==로 씁니다. 칸 번호로 난수를 만들면 칸마다 다른 크기·색이 나옵니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["id = floor(uv · n),   f = fract(uv · n),   r = hash(id)", "c = step(length(f − 0.5), 0.15 + 0.3·r)"],
        setup(F, C, L) {
          let n = 6, show = false, pulse = true;
          C.slider({ label: "$n$", min: 1, max: 16, step: 1, value: n, fmt: x => num(x, 0), onInput: x => { n = x; } });
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "칸 번호·위치 보기" }], value: 0, onChange: x => { show = !!x; } });
          C.play(true);
          F.loop(() => {});
          F.draw = g => {
            const t = F.t;
            g.field(260, (x, y) => {
              const u = x * n, v = y * n, ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy, r = hash(ix, iy);
              if (show) return [fx * 255, fy * 255, r * 120, 255];
              const rad = 0.15 + 0.3 * r * (pulse ? 0.75 + 0.25 * Math.sin(t * 2 + r * 6) : 1);
              const d = Math.hypot(fx - 0.5, fy - 0.5);
              const m = sstep(rad + 0.03, rad - 0.03, d);
              const col = [lerp(88, 244, r), lerp(196, 211, r), lerp(221, 69, r)];
              return [lerp(16, col[0], m), lerp(19, col[1], m), lerp(26, col[2], m), 255];
            }, { smooth: false });
            if (show && n <= 8) for (let i = 0; i < n * 2; i++) for (let j = 0; j < n; j++) g.text(`${i},${j}`, [(i + 0.5) / n, (j + 0.5) / n], "white", { size: 10 });
          };
        }
      } },

      { h: "극좌표: 원과 꽃과 나선" },
      "가운데를 기준으로 ==거리 $r$와 각도 $θ$== 로 바꾸면 원형 무늬가 쉬워집니다. 반지름을 각도에 따라 흔들면 꽃잎이 생깁니다.",
      { fig: {
        aspect: 0.5, view: { x0: -1, x1: 1, y0: -0.5, y1: 0.5 },
        eq: ["r = length(p),   θ = atan2(p.y, p.x)", "{eq}"],
        setup(F, C, L) {
          let k = 5, amp = 0.08, mode = 0;
          C.seg({ options: [{ value: 0, label: "꽃" }, { value: 1, label: "나선" }], value: 0, onChange: x => { mode = x; } });
          C.slider({ label: "꽃잎 $k$", min: 1, max: 12, step: 1, value: k, fmt: x => num(x, 0), onInput: x => { k = x; } });
          C.slider({ label: "흔들림", min: 0, max: 0.2, value: amp, onInput: x => { amp = x; } });
          C.play(true);
          F.loop(() => {});
          F.draw = g => {
            const t = F.t;
            g.field(280, (x, y) => {
              const r = Math.hypot(x, y), th = Math.atan2(y, x);
              let m;
              if (mode === 0) { const R = 0.28 + amp * Math.cos(k * th + t); m = sstep(R + 0.008, R - 0.008, r); }
              else m = sstep(0.45, 0.55, fract(th / TAU * k + r * 6 - t * 0.5));
              const hue = [lerp(227, 92, r * 2), lerp(111, 208, r * 2), lerp(200, 179, r * 2)];
              return [lerp(16, hue[0], m), lerp(19, hue[1], m), lerp(26, hue[2], m), 255];
            });
            L.set("eq", mode === 0 ? "$c = step(r, 0.28 + 흔들림 · cos(k·θ + t))$" : "$c = step(0.5, fract(θ / 2π · k + r · 6 − t))$");
          };
        }
      } },

      { h: "분기 대신 섞기" },
      "두 무늬 중 하나를 고를 때 `if` 대신 ==마스크로 섞으면($lerp$)== GPU의 분기 비용(26장)이 없고 경계도 부드럽습니다. 마스크의 부드러움을 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -1, x1: 1, y0: -0.5, y1: 0.5 },
        eq: ["m = smoothstep(0.3 + s, 0.3 − s, length(p − 마우스))", "c = lerp(무늬A, 무늬B, m)"],
        setup(F, C, L) {
          let s = 0.06;
          const P = [0.2, 0];
          F.vec(P, "white", { snap: 0.005 });
          C.slider({ label: "부드러움 s", min: 0.002, max: 0.3, value: s, onInput: x => { s = x; } });
          F.draw = g => {
            g.field(260, (x, y) => {
              const A = (Math.floor(x * 10) + Math.floor(y * 10)) % 2 ? [70, 90, 130] : [40, 52, 80];
              const B = [lerp(244, 255, 0.5 + 0.5 * Math.sin(x * 30)), lerp(211, 134, 0.5 + 0.5 * Math.sin(y * 30)), 69];
              const m = sstep(0.3 + s, 0.3 - s, Math.hypot(x - P[0], y - P[1]));
              return [lerp(A[0], B[0], m), lerp(A[1], B[1], m), lerp(A[2], B[2], m), 255];
            });
          };
        }
      } },

      { use: [
        ["엔진", "머티리얼 그래프", "UE 머티리얼의 TexCoord·Frac·Floor·Step·SmoothStep·Distance·Sine 노드가 이 장의 부품입니다. 노드 그래프는 이 '한 줄 함수'를 그림으로 이은 것입니다."],
        ["게임", "UI·이펙트", "체력 바의 채움, 원형 쿨다운, 스캔 라인, 방어막의 육각 격자, 마법진이 텍스처 없이 셰이더 수식으로 만들어집니다."],
        ["아트", "절차적 텍스처", "타일·벽돌·물방울 무늬를 해상도 제한 없이 만들고, 칸마다 난수로 변화를 줘 반복 티를 없앱니다."],
        ["실생활", "Shadertoy와 데모씬", "Shadertoy의 놀라운 장면들은 거의 전부 이 장의 부품을 수백 줄 조합한 픽셀 셰이더 하나입니다."]
      ] },

      { recap: [
        ["step · smoothstep", "문턱: 딱딱하게 / 부드럽게"],
        ["length(uv − c)", "거리 → 원, 링, 빛무리"],
        ["floor(uv·n) · fract(uv·n)", "칸 번호와 칸 안의 위치 → 타일"],
        ["r, θ = length, atan2", "극좌표 → 꽃, 나선, 방사형"],
        ["lerp(A, B, mask)", "분기 대신 섞기"]
      ] }
    ]
  });
})();
