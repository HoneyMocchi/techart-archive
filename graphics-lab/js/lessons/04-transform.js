/* 04 행렬 변환 */
(() => {
  const f2 = n => num(n, 2);
  // 좌우가 다른 'F' 모양: 뒤집힘(행렬식 < 0)이 바로 보입니다
  const FSHAPE = [[0, 0], [0.28, 0], [0.28, 0.48], [0.68, 0.48], [0.68, 0.7], [0.28, 0.7], [0.28, 0.86], [0.85, 0.86], [0.85, 1.08], [0, 1.08]]
    .map(p => [p[0] * 1.1 + 0.35, p[1] * 1.1 + 0.25]);
  const apply = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
  const mmul = (A, B) => [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
  const mlerp = (A, B, t) => A.map((a, i) => lerp(a, B[i], t));
  const I = [1, 0, 0, 1];

  // 변형된 공간 한 장: 원래 격자(희미) + 변형 격자 + 단위 정사각형 + F + î, ĵ
  function drawSpace(g, m, o = {}) {
    g.grid(1, { minor: false, color: "rgba(88,196,221,0.10)", axes: false });
    g.gridM(m, 10);
    const det = m[0] * m[3] - m[1] * m[2];
    g.poly([[0, 0], [m[0], m[2]], [m[0] + m[1], m[2] + m[3]], [m[1], m[3]]], { fill: hexA(det >= 0 ? PAL.yellow : PAL.orange, 0.22), stroke: hexA(PAL.yellow, 0.6), w: 1.5 });
    if (o.shape !== false) g.poly(FSHAPE.map(p => apply(m, p)), { fill: hexA(PAL.pink, 0.55), stroke: "pink", w: 2 });
    g.arrow([0, 0], [m[0], m[2]], "green", { w: 4.5, label: "î'" });
    g.arrow([0, 0], [m[1], m[3]], "red", { w: 4.5, label: "ĵ'" });
    return det;
  }

  lesson({
    topic: "transform", title: "행렬 변환", desc: "î와 ĵ가 가는 곳", stage: "공간의 언어",
    sym: { M: "purple", R: "teal", S: "orange", T: "teal", v: "yellow", s: "gold", t: "teal" },
    hook: "행렬은 숫자 표가 아니라 ==공간을 움직이는 지시서==입니다. 그리고 그 지시서는 화살표 두 개로 다 적힙니다.",
    blocks: [
      "1장에서 $v = x·î + y·ĵ$ 라고 했습니다. 그렇다면 [[green:$î$]]와 [[red:$ĵ$]]가 어디로 가는지만 정하면, ==나머지 모든 점이 어디로 갈지 저절로 정해집니다==. 두 화살표 끝을 끌어 보세요. 격자 전체와 분홍 F가 따라 움직입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["M = [[{a}, {b}; {c}, {d}]]"],
        setup(F, C, L) {
          const i2 = [1.4, 0.4], j2 = [-0.5, 1.1];
          let k = 1;
          F.vec(i2, "green"); F.vec(j2, "red");
          C.button("↺ 원래대로", () => { const a = i2.slice(), b = j2.slice(); F.tween(900, e => { i2[0] = lerp(a[0], 1, e); i2[1] = lerp(a[1], 0, e); j2[0] = lerp(b[0], 0, e); j2[1] = lerp(b[1], 1, e); }); });
          C.button("▶ 변형 다시 보기", () => F.tween(1400, e => { k = e; }));
          F.draw = g => {
            const m = mlerp(I, [i2[0], j2[0], i2[1], j2[1]], k);
            drawSpace(g, m);
            L.set("a", f2(i2[0])); L.set("c", f2(i2[1])); L.set("b", f2(j2[0])); L.set("d", f2(j2[1]));
          };
          F.intro(() => F.tween(1400, e => { k = e; }));
        }
      } },
      { key: "행렬의 [[green:첫째 열 = $î$가 도착한 곳]], [[red:둘째 열 = $ĵ$가 도착한 곳]]. 이것만 기억하면 행렬을 읽을 수 있습니다." },
      "변형된 격자를 잘 보면 ==직선은 직선으로, 평행선은 평행선으로, 원점은 제자리==에 남습니다. 이런 변환을 **선형 변환**이라 하고, 2×2 행렬이 표현할 수 있는 것은 정확히 이것들입니다.",

      { h: "행렬 × 벡터 = 기저의 조합" },
      "노란 $v$를 끌어 보세요. $Mv$ 를 계산하는 방법은 단 하나 — ==$x$만큼 [[green:$î'$]]를 가고, $y$만큼 [[red:$ĵ'$]]를 간다==. 행렬 곱셈 규칙은 이 그림을 숫자로 적은 것입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["[[{a}, {b}; {c}, {d}]] [[{x}; {y}]] = {x}·[[green: {a}; {c}]] + {y}·[[red: {b}; {d}]] = [[yellow: {rx}; {ry}]]"],
        setup(F, C, L) {
          const v = [1, 1];
          let m = [1, 0.6, 0.3, 1], before = false;
          F.vec(v, "yellow", { base: () => [0, 0], constrain: q => {
            // 화면 위치(변형 후)를 끌면 원래 좌표를 역산합니다
            if (before) return q;
            const det = m[0] * m[3] - m[1] * m[2] || 1e-6;
            return [(m[3] * q[0] - m[1] * q[1]) / det, (-m[2] * q[0] + m[0] * q[1]) / det];
          } });
          F.handles[0].get = () => (before ? v : apply(m, v));
          C.seg({ options: [
            { value: "shear", label: "기울이기" }, { value: "rot", label: "회전" }, { value: "scale", label: "늘이기" }, { value: "mix", label: "섞기" }
          ], value: "shear", onChange: x => {
            const target = { shear: [1, 0.6, 0.3, 1], rot: [0.71, -0.71, 0.71, 0.71], scale: [1.6, 0, 0, 0.6], mix: [1.2, -0.8, 0.5, 0.9] }[x];
            const from = m.slice();
            F.tween(800, e => { m = mlerp(from, target, e); });
          } });
          C.seg({ options: [{ value: 0, label: "변형 후" }, { value: 1, label: "변형 전" }], value: 0, onChange: x => {
            const from = before ? 0 : 1; before = !!x;
            const to = before ? 0 : 1;
            F._k = from;
            F.tween(700, e => { F._k = lerp(from, to, e); });
          } });
          F._k = 1;
          F.draw = g => {
            const mm = mlerp(I, m, F._k ?? 1);
            drawSpace(g, mm, { shape: false });
            const iv = [mm[0] * v[0], mm[2] * v[0]], r = apply(mm, v);
            g.arrow([0, 0], iv, "green", { w: 3, alpha: 0.9 });
            g.arrow(iv, r, "red", { w: 3, alpha: 0.9 });
            g.arrow([0, 0], r, "yellow", { w: 4, label: "Mv" });
            const R = apply(m, v);
            L.set("a", f2(m[0])); L.set("b", f2(m[1])); L.set("c", f2(m[2])); L.set("d", f2(m[3]));
            L.set("x", num(v[0], 1)); L.set("y", num(v[1], 1)); L.set("rx", f2(R[0])); L.set("ry", f2(R[1]));
          };
        }
      } },
      "'변형 전'으로 돌려 보면 $v$는 원래 격자에서 $(x, y)$ 칸에 있었고, 변형 후에도 ==같은 칸 수만큼 떨어진 곳==에 있습니다. 칸의 모양이 바뀌었을 뿐입니다.",

      { h: "행렬식 = 넓이가 몇 배가 되는가" },
      "[[yellow:노란 정사각형]]은 원래 넓이 1인 칸입니다. 변환 후 그 넓이가 바로 **행렬식** $det M$ 입니다. 버튼을 눌러 대표적인 변환들을 차례로 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["det M = ad − bc = {det}", "{msg}"],
        setup(F, C, L) {
          let m = [1, 0, 0, 1];
          const go = t => { const from = m.slice(); F.tween(1000, e => { m = mlerp(from, t, e); }); };
          C.button("확대 ×1.5", () => go([1.5, 0, 0, 1.5]));
          C.button("가로로 늘이기", () => go([2, 0, 0, 0.7]));
          C.button("기울이기", () => go([1, 1, 0, 1]));
          C.button("회전 60°", () => go([0.5, -0.866, 0.866, 0.5]));
          C.button("좌우 뒤집기", () => go([-1, 0, 0, 1]));
          C.button("납작하게", () => go([1, 0.5, 0.6, 0.3]));
          C.button("↺", () => go([1, 0, 0, 1]));
          F.draw = g => {
            const det = drawSpace(g, m);
            const ctr = apply(m, [0.5, 0.5]);
            g.tex(f2(det), ctr, det >= 0 ? "yellow" : "orange", { italic: false, bold: true, size: 18 });
            L.set("det", f2(det));
            L.set("msg", Math.abs(det) < 0.03 ? "넓이 0: 공간이 직선으로 짓눌림 (되돌릴 수 없음)" : det < 0 ? "음수: 공간이 뒤집힘 (F가 거울상)" : "넓이가 " + f2(det) + "배");
          };
        }
      } },
      "회전은 넓이를 바꾸지 않으니 행렬식이 1, 뒤집기는 −1 입니다. 행렬식이 0이면 공간이 납작해져 ==정보가 사라지므로 역행렬이 없습니다==. 노멀을 변환할 때나 뒷면 판정이 뒤집히는 버그를 잡을 때 이 부호가 등장합니다.",

      { h: "순서가 중요합니다" },
      "[[teal:회전 $R$]]과 [[orange:늘이기 $S$]]를 연달아 적용합니다. 순서만 바꿔 재생해 보세요. 결과가 다릅니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["{order}", "[[{m0}, {m1}; {m2}, {m3}]]"],
        setup(F, C, L) {
          const R = [0, -1, 1, 0], S = [2, 0, 0, 0.6];
          let first = "R", step = 2, k = 1;
          const run = () => { step = 0; k = 0; F.tween(1000, e => { k = e; }).then(() => { step = 1; k = 0; return F.tween(1000, e => { k = e; }); }).then(() => { step = 2; }); };
          C.seg({ options: [{ value: "R", label: "$R$ 먼저 → $S$  ($S·R$)" }, { value: "S", label: "$S$ 먼저 → $R$  ($R·S$)" }], value: "R", onChange: x => { first = x; run(); } });
          C.button("▶ 재생", run);
          F.draw = g => {
            const A = first === "R" ? R : S, B = first === "R" ? S : R;
            let m;
            if (step === 0) m = mlerp(I, A, k);
            else if (step === 1) m = mmul(mlerp(I, B, k), A);
            else m = mmul(B, A);
            drawSpace(g, m);
            const fin = mmul(B, A);
            g.text(step === 0 ? (first === "R" ? "1단계: 회전" : "1단계: 늘이기") : step === 1 ? (first === "R" ? "2단계: 늘이기" : "2단계: 회전") : "", [0, -2.1], "white", { size: 14, bold: true });
            L.set("order", first === "R" ? "S·R : 오른쪽부터 적용 (R 먼저)" : "R·S : 오른쪽부터 적용 (S 먼저)");
            L.set("m0", f2(fin[0])); L.set("m1", f2(fin[1])); L.set("m2", f2(fin[2])); L.set("m3", f2(fin[3]));
          };
        }
      } },
      { key: "행렬 곱 $B·A$ 는 ==오른쪽($A$)부터 적용==됩니다. 그리고 일반적으로 $B·A ≠ A·B$ 입니다." },

      { h: "이동은 왜 3×3인가: TRS" },
      "2×2 행렬은 원점을 움직일 수 없습니다(0에 무엇을 곱해도 0). 그래서 좌표에 ==숫자 1을 하나 더 붙여== $(x, y, 1)$로 쓰고, 3×3 행렬의 [[teal:셋째 열]]에 이동량을 적습니다. 게임 엔진의 트랜스폼은 대부분 **크기 S → 회전 R → 이동 T** 순서입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["T·R·S = [[{a}, {b}, {tx}; {c}, {d}, {ty}; 0, 0, 1]]"],
        setup(F, C, L) {
          let s = 0.9, th = 0.5, order = "TRS";
          const t = [1.4, -0.4];
          F.vec(t, "teal");
          C.slider({ label: "크기 $s$", min: 0.3, max: 1.8, value: s, onInput: x => { s = x; } });
          C.slider({ label: "회전 $θ$", min: -3.14, max: 3.14, value: th, fmt: x => num(x / DEG, 0) + "°", onInput: x => { th = x; } });
          C.seg({ options: [{ value: "TRS", label: "T·R·S (제자리 회전)" }, { value: "RTS", label: "R·T·S (원점 기준 공전)" }], value: "TRS", onChange: x => { order = x; } });
          F.draw = g => {
            g.grid(1, { minor: false });
            const c = Math.cos(th), sn = Math.sin(th);
            const lin = [s * c, -s * sn, s * sn, s * c];
            const off = order === "TRS" ? t : apply([c, -sn, sn, c], t);
            const P = p => V.add(apply(lin, p), off);
            if (order === "RTS") {
              g.circle([0, 0], V.len(t), "teal", { dash: [5, 6], w: 1.2, alpha: 0.5 });
              g.arrow([0, 0], off, "teal", { w: 2, dash: [6, 5], alpha: 0.7 });
            }
            g.poly(FSHAPE, { stroke: hexA(PAL.pink, 0.35), w: 1.5, dash: [5, 5] });
            g.poly(FSHAPE.map(P), { fill: hexA(PAL.pink, 0.55), stroke: "pink", w: 2 });
            g.arrow(off, P([1, 0]), "green", { w: 3.5 }); g.arrow(off, P([0, 1]), "red", { w: 3.5 });
            g.arrow([0, 0], t, "teal", { w: 2.5, label: "t", alpha: order === "TRS" ? 1 : 0.45 });
            L.set("a", f2(lin[0])); L.set("b", f2(lin[1])); L.set("c", f2(lin[2])); L.set("d", f2(lin[3]));
            L.set("tx", f2(off[0])); L.set("ty", f2(off[1]));
          };
        }
      } },
      "T·R·S에서는 F가 [[teal:$t$]] 자리에서 ==제자리로 돕니다==. 순서를 R·T·S로 바꾸면 먼저 옮긴 뒤 원점 기준으로 돌리므로 F가 원을 그리며 ==공전==합니다. 자식 오브젝트가 부모를 따라 도는 원리가 이것입니다.",
      { ponder: "3D 트랜스폼 행렬은 왜 4×4일까요?",
        answer: "같은 이유입니다. 3D 선형 변환(회전·크기)은 3×3이면 충분하지만, ==이동을 넣으려고 1을 하나 더 붙여== $(x, y, z, 1)$ 을 쓰기 때문입니다. 다음 장의 투영에서는 이 넷째 칸이 한 번 더 활약합니다." },

      { recap: [
        ["M = [[a, b; c, d]]", "첫째 열 = î, 둘째 열 = ĵ가 도착한 곳"],
        ["Mv = x·î' + y·ĵ'", "행렬 × 벡터 = 기저의 조합"],
        ["det M = ad − bc", "넓이 배율 · 음수면 뒤집힘 · 0이면 납작"],
        ["B·A", "오른쪽(A)부터 적용, 순서 바꾸면 결과도 바뀜"],
        ["T·R·S", "크기 → 회전 → 이동, (x, y, 1)로 이동까지 한 행렬에"]
      ] }
    ]
  });
})();
