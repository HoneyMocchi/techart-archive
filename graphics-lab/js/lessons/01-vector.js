/* 01 벡터와 좌표 */
(() => {
  const f1 = n => num(n, 1);

  lesson({
    topic: "vector", title: "벡터와 좌표", desc: "숫자 두 개 = 화살표 하나", stage: "공간의 언어",
    sym: { v: "yellow", u: "pink", w: "teal", k: "gold", P: "white", Q: "white" },
    hook: "화살표 하나가 숫자 두 개입니다. 이 한 문장이 그래픽스 수학 전체의 출발점입니다.",
    blocks: [
      "노란 화살표의 끝을 끌어 보세요. [[green:가로로 얼마]], [[red:세로로 얼마]] — 숫자 두 개만 있으면 화살표 하나가 정해집니다.",
      { fig: {
        aspect: 0.5, view: { x0: -5, x1: 5, y0: -2.6, y1: 2.6 },
        eq: ["v = ({v.x}, {v.y})"],
        setup(F, C, L) {
          const v = [3, 2];
          let grow = 1;
          F.vec(v, "yellow");
          F.draw = g => {
            g.grid();
            const t = V.mul(v, grow);
            g.line([0, 0], [t[0], 0], "green", { w: 3, dash: [6, 5] });
            g.line([t[0], 0], t, "red", { w: 3, dash: [6, 5] });
            g.tex(f1(v[0]), [t[0] / 2, 0], "green", { dy: t[1] >= 0 ? 16 : -16, italic: false, size: 17 });
            g.tex(f1(v[1]), [t[0], t[1] / 2], "red", { dx: t[0] >= 0 ? 22 : -22, italic: false, size: 17 });
            g.arrow([0, 0], t, "yellow", { label: "v" });
            L.set("v.x", f1(v[0])); L.set("v.y", f1(v[1]));
          };
          F.intro(() => F.tween(900, e => { grow = e; }));
        }
      } },
      { key: "==벡터는 '어디'가 아니라 '어느 쪽으로 얼마나'== 를 나타냅니다. 위치가 없는 화살표입니다." },

      { h: "점과 벡터는 다릅니다" },
      "흰 점 $P$와 노란 화살표 끝을 각각 끌어 보세요. 희미한 화살표들은 ==모두 같은 벡터 $v$== 입니다 — 출발점만 다를 뿐.",
      { fig: {
        aspect: 0.5, view: { x0: -5, x1: 5, y0: -2.6, y1: 2.6 },
        eq: ["P + v = Q", "({P.x}, {P.y}) + ({v.x}, {v.y}) = ({Q.x}, {Q.y})"],
        setup(F, C, L) {
          const P = [-2.5, -1], v = [3.2, 1.8];
          F.vec(P, "white");
          F.vec(v, "yellow", { base: () => P });
          F.draw = g => {
            g.grid();
            for (let gx = -4; gx <= 4; gx += 2) for (let gy = -2; gy <= 2; gy += 2) {
              g.arrow([gx, gy], V.add([gx, gy], v), "yellow", { alpha: 0.22, w: 2, head: 9 });
            }
            const Q = V.add(P, v);
            g.arrow(P, Q, "yellow", { label: "v", mid: 1 });
            g.dot(P, "white", 5).tex("P", P, "white", { dx: -14, dy: 14 });
            g.dot(Q, "white", 5).tex("Q", Q, "white", { dx: 16, dy: -12 });
            L.set("P.x", f1(P[0])); L.set("P.y", f1(P[1]));
            L.set("v.x", f1(v[0])); L.set("v.y", f1(v[1]));
            L.set("Q.x", f1(Q[0])); L.set("Q.y", f1(Q[1]));
          };
        }
      } },
      "거꾸로 읽으면 $Q − P = v$, 즉 ==뺄셈은 'P에서 Q로 가는 화살표'== 입니다. 카메라 → 물체 방향, 총알의 진행 방향, 캐릭터가 목표를 바라보는 방향이 전부 이 뺄셈 한 번입니다.",

      { h: "덧셈 = 이어 붙이기" },
      { fig: {
        aspect: 0.5, view: { x0: -5, x1: 5, y0: -2.6, y1: 2.6 },
        eq: ["u + w = ({u.x} + {w.x}, {u.y} + {w.y}) = ({s.x}, {s.y})"],
        setup(F, C, L) {
          const u = [2.4, 0.6], w = [-0.8, 1.6];
          let order = 0;
          F.vec(u, "pink");
          F.vec(w, "teal", { base: () => (order ? [0, 0] : u) });
          C.seg({ options: [{ value: 0, label: "$u$ 다음 $w$" }, { value: 1, label: "$w$ 다음 $u$" }], value: 0, onChange: x => { order = x; } });
          F.draw = g => {
            g.grid();
            const s = V.add(u, w);
            g.poly([[0, 0], u, s, w], { fill: hexA(PAL.yellow, 0.06) });
            if (order === 0) {
              g.arrow([0, 0], w, "teal", { alpha: 0.2, w: 2 }); g.arrow(w, s, "pink", { alpha: 0.2, w: 2 });
              g.arrow([0, 0], u, "pink", { label: "u" }); g.arrow(u, s, "teal", { label: "w" });
            } else {
              g.arrow([0, 0], u, "pink", { alpha: 0.2, w: 2 }); g.arrow(u, s, "teal", { alpha: 0.2, w: 2 });
              g.arrow([0, 0], w, "teal", { label: "w" }); g.arrow(w, s, "pink", { label: "u" });
            }
            g.arrow([0, 0], s, "yellow", { w: 4, label: "u + w", lsize: 17, mid: V.cross(u, w) > 0 ? 1 : -1 });
            L.set("u.x", f1(u[0])); L.set("u.y", f1(u[1])); L.set("w.x", f1(w[0])); L.set("w.y", f1(w[1]));
            L.set("s.x", f1(s[0])); L.set("s.y", f1(s[1]));
          };
        }
      } },
      "한 화살표의 끝에 다른 화살표를 이어 붙이면 합이 됩니다. ==성분끼리 더한 값과 그림이 정확히 일치==합니다. 순서를 바꿔도 같은 곳에 도착하는 것을 버튼으로 확인해 보세요 — 평행사변형의 두 변을 따라가는 두 길입니다.",

      { h: "스칼라 곱 = 늘이고 뒤집기" },
      { fig: {
        aspect: 0.5, view: { x0: -5, x1: 5, y0: -2.6, y1: 2.6 },
        eq: ["k·v = {k} · ({v.x}, {v.y}) = ({kv.x}, {kv.y})"],
        setup(F, C, L) {
          const v = [1.6, 0.8];
          let k = 1.5;
          F.vec(v, "yellow");
          const s = C.slider({ label: "$k$", min: -2, max: 2.5, step: 0.05, value: k, onInput: x => { k = x; } });
          C.play();
          F.loop((dt, t) => { k = 0.25 + 2 * Math.sin(t * 1.2); s.set(k); });
          F.draw = g => {
            g.grid();
            const d = V.norm(v);
            g.line(V.mul(d, -20), V.mul(d, 20), "yellow", { alpha: 0.18, w: 1.5, dash: [4, 6] });
            const kv = V.mul(v, k);
            g.arrow([0, 0], kv, k < 0 ? "orange" : "gold", { w: 6, alpha: 0.9, label: "k·v", lsize: 17 });
            g.arrow([0, 0], v, "yellow", { w: 3, label: "v" });
            L.set("k", num(k, 2)); L.set("v.x", f1(v[0])); L.set("v.y", f1(v[1]));
            L.set("kv.x", f1(kv[0])); L.set("kv.y", f1(kv[1]));
          };
        }
      } },
      "숫자 $k$를 곱하면 ==방향은 그대로, 길이만 $k$배==. $k$가 음수면 [[orange:반대 방향으로 뒤집힙니다]]. 아무리 $k$를 바꿔도 점선(같은 직선) 위를 벗어나지 못하는 것도 눈여겨보세요.",

      { h: "길이와 정규화" },
      { fig: {
        aspect: 0.56, view: { x0: -4.6, x1: 4.6, y0: -2.2, y1: 3.2 },
        eq: ["|v| = √(x^2 + y^2) = √({x2} + {y2}) = {len}", "v̂ = v / |v| = ({n.x}, {n.y})"],
        setup(F, C, L) {
          const v = [1.6, 1.2];
          let sq = true;
          F.vec(v, "yellow");
          C.seg({ options: [{ value: 1, label: "제곱 넓이 보기" }, { value: 0, label: "숨기기" }], value: 1, onChange: x => { sq = !!x; } });
          F.draw = g => {
            g.grid({ axes: true });
            const x = v[0], y = v[1], len = V.len(v), n = V.norm(v);
            if (sq) {
              const sx = Math.sign(y) || 1, sy = Math.sign(x) || 1;
              g.poly([[0, 0], [x, 0], [x, -sx * Math.abs(x)], [0, -sx * Math.abs(x)]], { fill: hexA(PAL.green, 0.16), stroke: hexA(PAL.green, 0.5), w: 1 });
              g.poly([[x, 0], [x, y], [x + sy * Math.abs(y), y], [x + sy * Math.abs(y), 0]], { fill: hexA(PAL.red, 0.16), stroke: hexA(PAL.red, 0.5), w: 1 });
              const p = V.perp(n);
              const side = Math.sign(x * y) || 1;   // 삼각형 반대쪽에 정사각형
              const o = V.mul(p, len * side);
              g.poly([[0, 0], v, V.add(v, o), o], { fill: hexA(PAL.yellow, 0.12), stroke: hexA(PAL.yellow, 0.45), w: 1 });
            }
            g.circle([0, 0], 1, "blue", { dash: [5, 5], w: 1.5 });
            g.line([0, 0], [x, 0], "green", { w: 3 }); g.line([x, 0], v, "red", { w: 3 });
            g.arrow([0, 0], v, "yellow", { label: "v" });
            g.arrow([0, 0], n, "blue", { w: 4, label: "v̂", ldx: -4 });
            L.set("x2", num(x * x, 2)); L.set("y2", num(y * y, 2)); L.set("len", num(len, 2));
            L.set("n.x", num(n[0], 2)); L.set("n.y", num(n[1], 2));
          };
        }
      } },
      "길이는 피타고라스 정리 그대로입니다 — [[green:초록 정사각형]] + [[red:빨강 정사각형]] = [[yellow:노랑 정사각형]]. 그리고 ==길이로 나누면 길이가 정확히 1인, 방향만 남은 벡터 $v̂$== 가 됩니다. 이것이 **정규화(normalize)** 입니다. 조명·반사처럼 방향만 필요한 계산은 거의 항상 정규화된 벡터를 씁니다.",
      { ponder: "$v$를 어디로 끌어도 파란 $v̂$는 점선 원을 벗어나지 않습니다. 왜일까요?",
        answer: "$|v̂| = |v| / |v| = 1$ 이니까요. 길이가 1인 벡터의 끝은 모두 ==반지름 1인 원(단위원)== 위에 있습니다. 다음 장의 주인공이 바로 이 원입니다." },

      { h: "좌표는 기저 벡터의 조합" },
      { fig: {
        aspect: 0.5, view: { x0: -5, x1: 5, y0: -2.6, y1: 2.6 },
        eq: ["v = x·î + y·ĵ = {v.x}·î + {v.y}·ĵ"],
        setup(F, C, L) {
          const v = [3, 2];
          let a = 1, b = 1;
          F.vec(v, "yellow");
          C.play(true);
          F.loop((dt, t) => {
            const ph = (t % 4) / 4;
            a = ease(clamp(ph / 0.35, 0, 1));
            b = ease(clamp((ph - 0.4) / 0.35, 0, 1));
          });
          F.draw = g => {
            g.grid();
            const px = [v[0] * a, 0], py = [v[0], v[1] * b];
            g.arrow([0, 0], px, "green", { w: 4 });
            if (b > 0.01) g.arrow([v[0], 0], py, "red", { w: 4 });
            g.arrow([0, 0], v, "yellow", { alpha: 0.35 + 0.65 * b, label: "v" });
            g.arrow([0, 0], [1, 0], "green", { w: 5, head: 12 }); g.tex("î", [0.5, 0], "green", { dy: 16 });
            g.arrow([0, 0], [0, 1], "red", { w: 5, head: 12 }); g.tex("ĵ", [0, 0.5], "red", { dx: -14 });
            g.tex(f1(v[0]) + " î", [v[0] * a / 2, 0], "green", { dy: v[1] >= 0 ? 18 : -18, size: 17 });
            if (b > 0.01) g.tex(f1(v[1]) + " ĵ", [v[0], v[1] * b / 2], "red", { dx: v[0] >= 0 ? 30 : -30, size: 17 });
            L.set("v.x", f1(v[0])); L.set("v.y", f1(v[1]));
          };
        }
      } },
      "$(3, 2)$라는 표기는 사실 '[[green:$î$]]를 3번, [[red:$ĵ$]]를 2번 가라'는 ==지시서==입니다. 그렇다면 $î$와 $ĵ$ 자체를 바꾸면 어떻게 될까요? 같은 숫자 $(3, 2)$가 전혀 다른 화살표를 가리키게 됩니다 — 이것이 4장 **행렬 변환**의 핵심 아이디어입니다.",

      { recap: [
        ["v = (x, y)", "숫자 두 개 = 화살표 하나"],
        ["Q − P", "P에서 Q로 가는 벡터"],
        ["u + w", "이어 붙이기 (성분끼리 덧셈)"],
        ["k·v", "늘이기, 음수면 뒤집기"],
        ["|v| = √(x^2 + y^2)", "길이 (피타고라스)"],
        ["v̂ = v / |v|", "정규화: 방향만 남기기"]
      ] }
    ]
  });
})();
