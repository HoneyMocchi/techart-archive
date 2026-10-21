/* 26 물리 적분과 스프링 */
(() => {
  const f2 = n => num(n, 2);

  lesson({
    topic: "physics", title: "물리 적분과 스프링", desc: "한 프레임씩 앞으로", stage: "움직임과 시뮬레이션",
    sym: { x: "green", v: "yellow", a: "pink", k: "orange", c: "teal", dt: "blue" },
    hook: "게임 물리는 미분 방정식을 정확히 풀지 않습니다. ==지금의 속도와 힘으로 아주 짧은 시간($dt$) 뒤를 어림하는 일==을 매 프레임 반복할 뿐입니다. 어림하는 순서 하나에 시뮬레이션이 폭발하기도, 안정되기도 합니다.",
    blocks: [
      { h: "오일러 적분: 순서 하나의 차이" },
      "가운데로 끌어당기는 힘을 받는 행성입니다. 정답은 같은 원을 영원히 도는 것입니다. ==위치를 먼저 옮기고 속도를 바꾸는 오일러==는 매 바퀴 조금씩 바깥으로 튕겨 나가고, ==속도를 먼저 바꾸고 새 속도로 옮기는 반암시적 오일러==는 궤도를 지킵니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["오일러: x += v·dt, v += a·dt   ·   반암시적: v += a·dt, x += v·dt", "dt = {dt}   에너지 변화: 오일러 {e1}%, 반암시적 {e2}%"],
        setup(F, C, L) {
          let dt = 0.08, A, B, trA, trB, E0;
          const reset = () => { A = { x: [1.6, 0], v: [0, 1.2] }; B = { x: [1.6, 0], v: [0, 1.2] }; trA = []; trB = []; E0 = energy(A); };
          const acc = x => { const r = V.len(x); return V.mul(x, -2.3 / (r * r * r)); };
          const energy = s => 0.5 * V.dot(s.v, s.v) - 2.3 / V.len(s.x);
          reset();
          C.play(true);
          C.slider({ label: "$dt$", min: 0.01, max: 0.2, value: dt, onInput: x => { dt = x; reset(); } });
          C.button("↺ 다시", reset);
          let accT = 0;
          F.loop(d => {
            accT += d;
            while (accT > 0.03) {
              accT -= 0.03;
              const a1 = acc(A.x); A.x = V.add(A.x, V.mul(A.v, dt)); A.v = V.add(A.v, V.mul(a1, dt));
              B.v = V.add(B.v, V.mul(acc(B.x), dt)); B.x = V.add(B.x, V.mul(B.v, dt));
              trA.push(A.x); trB.push(B.x); if (trA.length > 400) { trA.shift(); trB.shift(); }
              if (V.len(A.x) > 9) reset();
            }
          });
          F.draw = g => {
            g.circle([0, 0], 1.6, "grey", { w: 1, dash: [4, 5], alpha: 0.5 });
            if (trA.length > 1) { g.poly(trA, { stroke: "orange", w: 1.5, close: false, alpha: 0.8 }); g.poly(trB, { stroke: "teal", w: 2, close: false }); }
            g.circle([0, 0], 0.2, "gold", { fill: "gold", w: 0 });
            g.dot(A.x, "orange", 6); g.dot(B.x, "teal", 6);
            g.text("오일러", [-3.6, 1.7], "orange", { size: 12, bold: true, align: "left" }); g.text("반암시적 오일러", [-3.6, 1.4], "teal", { size: 12, bold: true, align: "left" });
            L.set("dt", f2(dt)); L.set("e1", num((energy(A) - E0) / Math.abs(E0) * 100, 0)); L.set("e2", num((energy(B) - E0) / Math.abs(E0) * 100, 0));
          };
        }
      } },
      { key: "게임 물리는 대부분 ==반암시적(심플렉틱) 오일러나 베를레==를 씁니다. 계산량은 같은데 에너지가 쌓여 폭발하는 일이 훨씬 적습니다. 그리고 $dt$는 프레임과 무관하게 ==고정 간격==으로 돌립니다." },

      { h: "스프링과 댐퍼: 부드럽게 따라가기" },
      "목표(노란 점)를 스프링으로 따라가는 공입니다. 감쇠를 바꿔 보세요. 감쇠가 작으면 출렁이고, 크면 굼뜨고, ==딱 그 사이(임계 감쇠)==에서는 가장 빠르게, 넘치지 않고 도착합니다. 카메라·UI가 부드럽게 따라오는 것이 이것입니다.",
      { fig: {
        aspect: 0.45, view: { x0: 0, x1: 10, y0: -0.2, y1: 4.3, stretch: true },
        eq: ["a = −k·(x − 목표) − c·v,   임계 감쇠 c = 2√k = {crit}"],
        setup(F, C, L) {
          let k = 30, c = 6, x = 2, v = 0, target = 7, hist = [];
          C.play(true);
          C.slider({ label: "강성 $k$", min: 5, max: 120, value: k, fmt: x => num(x, 0), onInput: q => { k = q; } });
          const cs = C.slider({ label: "감쇠 $c$", min: 0, max: 30, value: c, fmt: x => num(x, 1), onInput: q => { c = q; } });
          C.button("임계 감쇠로", () => { c = 2 * Math.sqrt(k); cs.set(c); });
          F.handle({ color: "yellow", get: () => [target, 3.6], set: (px) => { target = clamp(px, 0.5, 9.5); } });
          let flip = 0;
          F.loop(dt => {
            flip += dt; if (flip > 2.5) { flip = 0; target = target > 5 ? 2.2 : 7.8; }
            const steps = 4, h = dt / steps;
            for (let i = 0; i < steps; i++) { v += (-k * (x - target) - c * v) * h; x += v * h; }
            hist.push([x, target]); if (hist.length > 240) hist.shift();
          });
          F.draw = g => {
            g.line([0.3, 3.6], [9.7, 3.6], "grey", { w: 1, alpha: 0.5 });
            const coils = 14, pts = [];
            for (let i = 0; i <= coils * 2; i++) { const t = i / (coils * 2); pts.push([lerp(target, x, t), 3.6 + (i % 2 ? 0.12 : -0.12) * (i > 0 && i < coils * 2 ? 1 : 0)]); }
            g.poly(pts, { stroke: "orange", w: 1.5, close: false });
            g.circle([x, 3.6], 0.18, "teal", { fill: "teal", w: 0 });
            const X = i => 0.3 + i / 240 * 9.4, Y = v2 => 0.1 + (v2 / 10) * 2.8;
            if (hist.length > 1) { g.poly(hist.map((h, i) => [X(i), Y(h[1])]), { stroke: "yellow", w: 1.5, close: false, dash: [4, 4] }); g.poly(hist.map((h, i) => [X(i), Y(h[0])]), { stroke: "teal", w: 2.5, close: false }); }
            g.text("시간 →", [9.7, 0.1], "grey", { size: 10, align: "right", dy: -8 });
            L.set("crit", f2(2 * Math.sqrt(k)));
          };
        }
      } },

      { h: "베를레 적분과 제약: 밧줄" },
      "점 여러 개를 거리 제약으로 이은 밧줄입니다. 끝점을 끌어 보세요. 매 프레임 ==관성으로 점을 옮긴 뒤, 이웃과의 거리를 원래 길이로 되돌리는 보정==을 여러 번 반복합니다. 반복 횟수가 적으면 고무줄처럼 늘어납니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["x_새 = x + (x − x_이전) + a·dt^2,   그리고 거리 제약을 {it}번 반복   (늘어난 비율 {stretch}%)"],
        setup(F, C, L) {
          const N = 18, seg = 0.22, anchor = [-1.8, 1.7];
          let it = 8;
          const P = Array.from({ length: N }, (_, i) => [anchor[0] + i * seg, anchor[1]]), Pp = P.map(p => p.slice());
          let grab = false;
          F.handle({ color: "pink", get: () => P[N - 1], set: (x, y) => { grab = true; P[N - 1][0] = x; P[N - 1][1] = y; Pp[N - 1][0] = x; Pp[N - 1][1] = y; } });
          C.play(true);
          C.slider({ label: "제약 반복", min: 1, max: 40, step: 1, value: it, fmt: x => num(x, 0), onInput: x => { it = x; } });
          F.canvas.addEventListener("pointerup", () => { grab = false; });
          F.loop(dt => {
            const h = Math.min(dt, 1 / 30);
            for (let i = 1; i < N; i++) {
              if (grab && i === N - 1) continue;
              const v = V.sub(P[i], Pp[i]);
              Pp[i] = P[i].slice();
              P[i] = V.add(V.add(P[i], V.mul(v, 0.99)), [0, -9.8 * h * h]);
            }
            for (let k = 0; k < it; k++) {
              P[0] = anchor.slice();
              for (let i = 0; i < N - 1; i++) {
                const d = V.sub(P[i + 1], P[i]), l = V.len(d) || 1e-6, diff = (l - seg) / l;
                const w0 = i === 0 ? 0 : 0.5, w1 = grab && i + 1 === N - 1 ? 0 : 0.5, s = w0 + w1 || 1;
                P[i] = V.add(P[i], V.mul(d, diff * w0 / s)); P[i + 1] = V.sub(P[i + 1], V.mul(d, diff * w1 / s));
              }
            }
          });
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            let total = 0;
            for (let i = 0; i < N - 1; i++) { total += V.len(V.sub(P[i + 1], P[i])); g.line(P[i], P[i + 1], "yellow", { w: 3 }); }
            P.forEach((p, i) => g.dot(p, i === 0 ? "white" : "gold", i === 0 ? 6 : 3.5));
            g.poly([[anchor[0] - 0.3, anchor[1] + 0.08], [anchor[0] + 0.3, anchor[1] + 0.08], [anchor[0] + 0.3, anchor[1] + 0.2], [anchor[0] - 0.3, anchor[1] + 0.2]], { fill: "grey" });
            L.set("it", it); L.set("stretch", num((total / ((N - 1) * seg) - 1) * 100, 0));
          };
        }
      } },
      "천은 이 밧줄을 그물처럼 엮은 것이고, 머리카락·덩굴·사슬도 같은 방식입니다. ==반복 횟수 = 품질과 비용의 손잡이==입니다.",

      { use: [
        ["엔진", "Chaos 물리와 고정 틱", "UE의 Chaos 물리는 고정 간격 서브스텝으로 적분합니다. 프레임이 떨어져도 시뮬레이션이 폭발하지 않게 하는 장치입니다."],
        ["게임", "카메라·UI 따라가기", "스프링 암의 Camera Lag, UI 숫자 애니메이션, 조준 보정에 임계 감쇠 스프링(SmoothDamp)이 쓰입니다."],
        ["엔진", "천·머리카락", "Chaos Cloth, 그룸 물리, 케이블 컴포넌트가 이 장의 베를레 + 거리 제약(PBD) 방식입니다."],
        ["실생활", "자동차 서스펜션", "자동차 서스펜션은 스프링과 댐퍼의 조합입니다. 승차감은 감쇠비를 어디에 두느냐의 문제입니다."]
      ] },

      { recap: [
        ["v += a·dt, x += v·dt", "반암시적 오일러: 같은 비용, 훨씬 안정"],
        ["고정 dt", "프레임과 무관한 물리 틱"],
        ["a = −k(x − 목표) − c·v,  c = 2√k", "임계 감쇠 스프링: 빠르고 넘치지 않음"],
        ["x_새 = 2x − x_이전 + a·dt^2 + 제약 반복", "베를레 + 거리 제약: 밧줄·천"]
      ] }
    ]
  });
})();
