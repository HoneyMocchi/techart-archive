/* 02 삼각함수와 회전 */
(() => {
  const deg = r => num(r / DEG, 0);

  lesson({
    topic: "trig", title: "삼각함수와 회전", desc: "원 위의 점 = (cos, sin)", stage: "공간의 언어",
    sym: { v: "yellow", "v'": "orange", r: "gold", A: "gold", "ω": "teal", "φ": "pink", t: "grey", i: "grey", c: "green", s: "red", cos: "green", sin: "red" },
    hook: "sin과 cos은 공식이 아니라 ==원 위를 도는 점의 그림자==입니다. 회전, 물결, 깜빡임이 전부 여기서 나옵니다.",
    blocks: [
      "점이 원을 따라 돕니다. [[green:가로 그림자]]가 $cos θ$, [[red:세로 그림자]]가 $sin θ$ 입니다. 오른쪽 그래프는 그 [[red:세로 그림자]]를 시간 순서대로 펼친 것 — 이것이 사인파입니다. 점을 직접 끌어 돌려 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: -2.4, x1: 7.6, y0: -1.45, y1: 1.45 },
        eq: ["θ = {deg}° = {rad} rad", "(cos θ, sin θ) = ({c}, {s})"],
        setup(F, C, L) {
          let th = 0.9, showCos = false;
          const R = 1.05, gx0 = 1.8, gk = 5.4 / TAU;   // 그래프: θ 0~2π → x 1.8~7.2
          F.handle({ color: "yellow", get: () => [Math.cos(th) * R, Math.sin(th) * R], set: (x, y) => { th = (Math.atan2(y, x) + TAU) % TAU; } });
          C.play(true);
          C.seg({ options: [{ value: 0, label: "sin 곡선" }, { value: 1, label: "sin + cos 곡선" }], value: 0, onChange: x => { showCos = !!x; } });
          F.loop(dt => { th = (th + dt * 0.9) % TAU; });
          F.draw = g => {
            g.grid(0.5, { axes: false, minor: false });
            g.line([-2.4, 0], [7.6, 0], "rgba(236,239,244,0.5)", { w: 1.2 });
            g.line([0, -1.45], [0, 1.45], "rgba(236,239,244,0.5)", { w: 1.2 });
            g.line([gx0, -1.3], [gx0, 1.3], "rgba(236,239,244,0.35)", { w: 1 });
            [["π/2", TAU / 4], ["π", Math.PI], ["3π/2", TAU * 0.75], ["2π", TAU]].forEach(([s, a]) => {
              g.line([gx0 + a * gk, -0.05], [gx0 + a * gk, 0.05], "grey", { w: 1.5 });
              g.tex(s, [gx0 + a * gk, 0], "grey", { dy: 16, size: 14, italic: false });
            });
            g.circle([0, 0], R, "blue", { w: 2 });
            const c = Math.cos(th), s = Math.sin(th), P = [c * R, s * R];
            // 펼친 곡선
            const curve = (fn, color, upto) => {
              const pts = [];
              for (let a = 0; a <= upto + 1e-6; a += 0.03) pts.push([gx0 + a * gk, fn(a) * R]);
              pts.push([gx0 + upto * gk, fn(upto) * R]);
              g.poly(pts, { stroke: color, w: 3, close: false });
            };
            curve(Math.sin, hexA(PAL.red, 0.25), TAU);
            curve(Math.sin, "red", th);
            if (showCos) { curve(Math.cos, hexA(PAL.green, 0.25), TAU); curve(Math.cos, "green", th); g.dot([gx0 + th * gk, c * R], "green", 5); }
            g.line(P, [gx0 + th * gk, s * R], "red", { w: 1.5, dash: [4, 4], alpha: 0.7 });
            g.dot([gx0 + th * gk, s * R], "red", 5);
            g.arc([0, 0], 0.32, 0, th, "blue", { w: 2.5 });
            g.tex("θ", [Math.cos(th / 2) * 0.5, Math.sin(th / 2) * 0.5], "blue", { size: 17 });
            g.line([0, 0], P, "white", { w: 2, alpha: 0.6 });
            g.line([0, 0], [c * R, 0], "green", { w: 4 });
            g.line([c * R, 0], P, "red", { w: 4 });
            g.tex("cos θ", [c * R / 2, 0], "green", { dy: s >= 0 ? 16 : -16, size: 15 });
            g.tex("sin θ", [c * R, s * R / 2], "red", { dx: c >= 0 ? 32 : -32, size: 15 });
            L.set("deg", deg(th)); L.set("rad", num(th, 2)); L.set("c", num(c, 2)); L.set("s", num(s, 2));
          };
        }
      } },
      { key: "단위원 위의 점은 ==언제나 $(cos θ, sin θ)$== 입니다. 반지름이 $r$이면 $(r·cos θ, r·sin θ)$." },
      { ponder: "sin 곡선과 cos 곡선은 모양이 똑같고 옆으로 밀려 있을 뿐입니다. 얼마나 밀려 있을까요?",
        answer: "정확히 4분의 1바퀴, $π/2$ 입니다. $cos θ = sin(θ + π/2)$ — 같은 점을 ==90° 앞서서 본 그림자==이기 때문입니다. '곡선 둘 다' 버튼으로 확인해 보세요." },

      { h: "라디안: 반지름으로 잰 각도" },
      "각도를 360등분 대신 ==반지름의 길이로 재면== 공식이 훨씬 단순해집니다. 버튼을 눌러 반지름 하나를 둘레에 감아 보세요. 감긴 만큼의 각이 **1 라디안**입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -3.4, x1: 3.4, y0: -1.7, y1: 1.7 },
        eq: ["θ = 호의 길이 / r = {arc} / {r} = {rad} rad", "{deg}° = {rad} rad"],
        setup(F, C, L) {
          let th = 2.2, wrap = 0, r = 1.4;
          F.handle({ color: "blue", get: () => [Math.cos(th) * r, Math.sin(th) * r], set: (x, y) => { th = (Math.atan2(y, x) + TAU) % TAU || 0.01; } });
          C.slider({ label: "$r$", min: 0.6, max: 1.55, step: 0.01, value: r, onInput: x => { r = x; } });
          C.button("반지름 감기", () => { wrap = 0; F.tween(1600, e => { wrap = e; }); });
          F.draw = g => {
            g.grid(0.5, { minor: false });
            g.circle([0, 0], r, "grey", { w: 1.5, alpha: 0.6 });
            g.arc([0, 0], r, 0, th, "blue", { w: 6 });
            g.arc([0, 0], r * 0.28, 0, th, "blue", { w: 2 });
            g.line([0, 0], [r, 0], "gold", { w: 3 });
            g.line([0, 0], [Math.cos(th) * r, Math.sin(th) * r], "white", { w: 2 });
            g.tex("r", [r / 2, 0], "gold", { dy: 16 });
            for (let k = 1; k <= Math.floor(th); k++) {
              const a = k, p = [Math.cos(a) * r, Math.sin(a) * r], q = [Math.cos(a) * (r + 0.14), Math.sin(a) * (r + 0.14)];
              g.line(p, q, "gold", { w: 2.5 });
              g.tex(String(k), [Math.cos(a) * (r + 0.32), Math.sin(a) * (r + 0.32)], "gold", { italic: false, size: 15 });
            }
            if (wrap > 0) {
              const pts = [];
              for (let s = 0; s <= r + 1e-6; s += r / 40) pts.push(V.lerp([r, s], [Math.cos(s / r) * r, Math.sin(s / r) * r], wrap));
              g.poly(pts, { stroke: "gold", w: 6, close: false });
            }
            L.set("arc", num(th * r, 2)); L.set("r", num(r, 2)); L.set("rad", num(th, 2)); L.set("deg", deg(th));
          };
        }
      } },
      "반지름 $r$을 바꿔도 각도(라디안)는 그대로이고 호의 길이만 비례해서 변합니다. 한 바퀴는 반지름 $2π ≈ 6.28$개 분량이라 ==$360° = 2π$, $180° = π$== 입니다. 셰이더와 수학 라이브러리의 `sin`·`cos`은 모두 라디안을 받습니다.",

      { h: "회전 공식은 외우지 않아도 됩니다" },
      "1장에서 본 것처럼 $v = x·î + y·ĵ$ 입니다. 그렇다면 ==$î$와 $ĵ$만 돌리면 $v$도 같이 돕니다==. 돌아간 [[green:$î$]]는 $(cos θ, sin θ)$, 돌아간 [[red:$ĵ$]]는 그보다 90° 앞선 $(−sin θ, cos θ)$ 입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -3.6, x1: 3.6, y0: -1.8, y1: 1.8 },
        eq: ["x' = x·cos θ − y·sin θ = {xp}", "y' = x·sin θ + y·cos θ = {yp}"],
        setup(F, C, L) {
          const v = [1.4, 0.6];
          let th = 0.8;
          F.vec(v, "yellow");
          const sl = C.slider({ label: "$θ$", min: -3.14, max: 3.14, step: 0.01, value: th, fmt: x => deg(x) + "°", onInput: x => { th = x; } });
          C.play();
          F.loop(dt => { th += dt * 0.8; if (th > Math.PI) th -= TAU; sl.set(th); });
          F.draw = g => {
            const c = Math.cos(th), s = Math.sin(th);
            g.grid(0.5, { minor: false });
            g.gridM([c, -s, s, c], 6, { color: "rgba(88,196,221,0.22)" });
            const i2 = [c, s], j2 = [-s, c];
            const vp = V.add(V.mul(i2, v[0]), V.mul(j2, v[1]));
            g.arrow([0, 0], v, "yellow", { alpha: 0.35, label: "v" });
            g.arrow([0, 0], V.mul(i2, v[0]), "green", { w: 3, alpha: 0.8 });
            g.arrow(V.mul(i2, v[0]), vp, "red", { w: 3, alpha: 0.8 });
            g.arrow([0, 0], i2, "green", { w: 5, label: "î'" });
            g.arrow([0, 0], j2, "red", { w: 5, label: "ĵ'" });
            g.arc([0, 0], V.len(v) * 0.55, V.ang(v), V.ang(v) + th, "blue", { w: 2 });
            g.arrow([0, 0], vp, "orange", { w: 4, label: "v'" });
            L.set("xp", num(vp[0], 2)); L.set("yp", num(vp[1], 2));
          };
        }
      } },
      "공식의 [[green:첫 열]]은 돌아간 $î$, [[red:둘째 열]]은 돌아간 $ĵ$ 에서 그대로 나옵니다. 배경 격자 전체가 함께 도는 것을 보세요 — ==회전은 점 하나가 아니라 공간 전체를 돌리는 것==이고, 이것이 다음다음 장 '행렬'의 첫 번째 예입니다.",

      { h: "atan2: 방향에서 각도로" },
      "반대로 방향 $(x, y)$가 있을 때 각도를 알고 싶다면? 점을 네 사분면 모두로 끌어 보세요. 나눗셈 $y / x$로 구한 [[purple:atan]]은 왼쪽 절반에서 ==엉뚱한 방향==을 가리킵니다.",
      { fig: {
        aspect: 0.5, view: { x0: -3.2, x1: 3.2, y0: -1.6, y1: 1.6 },
        eq: ["atan2(y, x) = {a2}°", "atan(y / x) = {a1}°"],
        setup(F, C, L) {
          const p = [-1.6, 0.9];
          F.vec(p, "yellow", { snap: 0.05 });
          F.draw = g => {
            g.grid(0.5, { minor: false });
            const a2 = Math.atan2(p[1], p[0]), a1 = Math.atan(p[1] / p[0]);
            const r = V.len(p);
            g.arc([0, 0], 0.5, 0, a2, "blue", { w: 3, fill: hexA(PAL.blue, 0.12) });
            g.arc([0, 0], 0.8, 0, a1, "purple", { w: 2, dash: [5, 4] });
            g.arrow([0, 0], [Math.cos(a1) * r, Math.sin(a1) * r], "purple", { w: 2, dash: [6, 5], alpha: 0.8, label: "atan" });
            g.line([0, 0], [p[0], 0], "green", { w: 2, dash: [5, 4] });
            g.line([p[0], 0], p, "red", { w: 2, dash: [5, 4] });
            g.arrow([0, 0], p, "yellow", { label: "atan2", lsize: 16, mid: 1 });
            g.text(p[0] < 0 ? "x < 0 : y/x만으로는 반대쪽과 구별할 수 없습니다" : "x > 0 : 둘이 일치합니다", [0, -1.42], p[0] < 0 ? "purple" : "grey", { size: 13 });
            L.set("a2", deg(a2)); L.set("a1", deg(a1));
          };
        }
      } },
      { key: "방향 → 각도는 언제나 ==$atan2(y, x)$==. 부호 두 개를 따로 받기 때문에 네 사분면을 모두 구별합니다." },

      { h: "sin으로 만드는 움직임" },
      "사인파는 ==0을 중심으로 부드럽게 오가는 값==이 필요할 때마다 등장합니다. 점마다 위상을 조금씩 밀면 물결이 됩니다. 셰이더에서 깃발이 펄럭이고 풀잎이 흔들리는 원리가 이것입니다.",
      { fig: {
        aspect: 0.36, view: { x0: -0.6, x1: 12.6, y0: -2.2, y1: 2.2 },
        eq: ["y_i = A · sin(ω·t + φ·i) = {A} · sin({w}·t + {p}·i)"],
        setup(F, C, L) {
          let A = 1.2, w = 2.4, ph = 0.5;
          C.play(true);
          C.slider({ label: "진폭 $A$", min: 0, max: 2, value: A, onInput: x => { A = x; } });
          C.slider({ label: "속도 $ω$", min: 0, max: 6, value: w, onInput: x => { w = x; } });
          C.slider({ label: "위상차 $φ$", min: 0, max: 1.6, value: ph, onInput: x => { ph = x; } });
          F.loop(() => {});
          F.draw = g => {
            g.line([-0.6, 0], [12.6, 0], "rgba(236,239,244,0.3)", { w: 1 });
            const pts = [];
            for (let x = 0; x <= 12; x += 0.1) pts.push([x, A * Math.sin(w * F.t + ph * x)]);
            g.poly(pts, { stroke: hexA(PAL.teal, 0.35), w: 2, close: false });
            for (let i = 0; i <= 12; i++) {
              const y = A * Math.sin(w * F.t + ph * i);
              g.line([i, 0], [i, y], "gold", { w: 2, alpha: 0.5 });
              g.dot([i, y], i === 0 ? "yellow" : "gold", i === 0 ? 7 : 5.5);
            }
            g.tex("i = 0", [0, -1.9], "grey", { size: 14 });
            g.tex("i = 12", [12, -1.9], "grey", { size: 14 });
            L.set("A", num(A, 2)); L.set("w", num(w, 2)); L.set("p", num(ph, 2));
          };
        }
      } },
      "$φ = 0$이면 모두 함께 오르내리고, $φ$를 키울수록 ==물결의 간격이 촘촘해집니다==. $A$는 높이, $ω$는 빠르기입니다.",

      { use: [
        ["셰이더", "흔들림과 깜빡임", "`sin(Time)` 하나로 풀·깃발·물결을 흔들고, 경고등을 깜빡이고, UI를 숨 쉬듯 키웠다 줄입니다."],
        ["게임", "원형 배치와 궤도", "적을 원 위에 고르게 세우거나 위성을 돌릴 때 $(r·cos θ, r·sin θ)$ 를 씁니다. 탄막 게임의 방사형 총알도 같습니다."],
        ["엔진", "방향 → 각도", "미니맵 화살표·포탑 회전 각도는 `atan2`로 구합니다. UE의 `FMath::Atan2`, 머티리얼의 Atan2 노드."],
        ["실생활", "교류 전기와 소리", "콘센트 전압과 소리가 사인파입니다. 이퀄라이저는 소리를 여러 사인파의 합으로 나눠 보여 주는 장치입니다."]
      ] },

      { recap: [
        ["(cos θ, sin θ)", "단위원 위의 점 — 가로·세로 그림자"],
        ["θ = 호의 길이 / r", "라디안: 반지름 단위로 잰 각, 360° = 2π"],
        ["x' = x·cos θ − y·sin θ", "회전: 돌아간 î, ĵ 의 조합"],
        ["y' = x·sin θ + y·cos θ", ""],
        ["atan2(y, x)", "방향 → 각도, 네 사분면 모두"],
        ["A · sin(ω·t + φ·i)", "흔들림·물결"]
      ] }
    ]
  });
})();
