/* 06 곡선과 보간 */
(() => {
  const f2 = n => num(n, 2);
  const EASE = {
    linear: [t => t, "$f(t) = t$   일정한 속도"],
    in: [t => t * t, "$f(t) = t^2$   천천히 출발해 점점 빠르게"],
    out: [t => 1 - (1 - t) * (1 - t), "$f(t) = 1 − (1 − t)^2$   빠르게 출발해 부드럽게 멈춤"],
    smooth: [t => t * t * (3 - 2 * t), "$f(t) = 3t^2 − 2t^3$   smoothstep: 양 끝이 모두 부드러움"],
    back: [t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, "$f(t) = 1 + 2.7(t − 1)^3 + 1.7(t − 1)^2$   살짝 지나쳤다 돌아옴"]
  };

  lesson({
    topic: "curves", title: "곡선과 보간", desc: "lerp를 겹치면 곡선", stage: "공간의 언어",
    sym: { t: "teal", P: "white", f: "yellow", B: "yellow" },
    hook: "두 점 사이를 섞는 $lerp$ 하나로 시작해, 그것을 겹겹이 쌓으면 ==모든 부드러운 곡선==이 나옵니다. 애니메이션의 움직임도 같은 이야기입니다.",
    blocks: [
      { h: "lerp를 세 번 겹치면 베지어 곡선" },
      "네 점을 끌고 $t$를 움직여 보세요. ==이웃한 점끼리 $t$만큼 섞고(청록), 그 결과끼리 또 섞고(분홍), 한 번 더 섞은 점(노랑)== 이 그리는 자취가 3차 베지어 곡선입니다. 이 작도법을 드 카스텔조 알고리즘이라 부릅니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["lerp(A, B, t) = A + (B − A)·t", "B(t) = (1−t)^3 P_0 + 3(1−t)^2 t P_1 + 3(1−t) t^2 P_2 + t^3 P_3 = ({bx}, {by})"],
        setup(F, C, L) {
          const P = [[-3.2, -1.6], [-2, 1.7], [1.6, 1.8], [3.1, -1.4]];
          let t = 0.4, even = false;
          P.forEach(p => F.vec(p, "white", { snap: 0.02 }));
          const ts = C.slider({ label: "$t$", min: 0, max: 1, value: t, onInput: x => { t = x; } });
          C.play();
          C.seg({ options: [{ value: 0, label: "작도 보기" }, { value: 1, label: "같은 t 간격 점 보기" }], value: 0, onChange: x => { even = !!x; } });
          F.loop((dt, tt) => { t = 0.5 - 0.5 * Math.cos(tt * 0.9); ts.set(t); });
          const bez = s => { let q = P.map(p => p.slice()); while (q.length > 1) { const n = []; for (let i = 0; i < q.length - 1; i++) n.push(V.lerp(q[i], q[i + 1], s)); q = n; } return q[0]; };
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            g.poly(P, { stroke: "rgba(236,239,244,0.35)", w: 1.5, close: false, dash: [5, 5] });
            const pts = [];
            for (let i = 0; i <= 80; i++) pts.push(bez(i / 80));
            g.poly(pts, { stroke: hexA(PAL.yellow, 0.3), w: 3, close: false });
            g.poly(pts.slice(0, Math.round(t * 80) + 1).concat([bez(t)]), { stroke: "yellow", w: 4, close: false });
            if (even) {
              for (let i = 0; i <= 20; i++) g.dot(bez(i / 20), "teal", 4.5);
            } else {
              const l1 = [0, 1, 2].map(i => V.lerp(P[i], P[i + 1], t));
              const l2 = [0, 1].map(i => V.lerp(l1[i], l1[i + 1], t));
              g.poly(l1, { stroke: "teal", w: 2, close: false }); l1.forEach(p => g.dot(p, "teal", 5));
              g.line(l2[0], l2[1], "pink", { w: 2.5 }); l2.forEach(p => g.dot(p, "pink", 5.5));
            }
            const b = bez(t);
            g.circle(b, 0.1, "yellow", { fill: "yellow", w: 0 });
            P.forEach((p, i) => g.tex("P" + "₀₁₂₃"[i], p, "white", { dx: 16, dy: -14, size: 16 }));
            L.set("bx", f2(b[0])); L.set("by", f2(b[1]));
          };
        }
      } },
      "'같은 t 간격 점 보기'를 켜면 ==점 간격이 고르지 않습니다==. $t$는 곡선 위의 거리가 아니기 때문입니다. 일정한 속도로 곡선을 따라가려면 길이를 미리 재 두고 거리로 $t$를 찾아야 합니다(호 길이 매개변수화).",
      { key: "베지어 곡선은 ==처음과 끝 점은 지나고, 가운데 두 점은 끌어당기기만== 합니다. 폰트 외곽선, 벡터 그래픽, UE의 커브 에디터가 모두 이 곡선입니다." },

      { h: "시간을 휘게 하면 움직임이 달라진다: 이징" },
      "같은 거리를 같은 시간에 가도 ==시간 $t$를 어떻게 휘느냐==에 따라 느낌이 완전히 다릅니다. 왼쪽은 $f(t)$의 그래프, 오른쪽은 그 함수로 움직이는 공(흐린 공은 일정한 속도)입니다.",
      { fig: {
        aspect: 0.46, view: { x0: -0.3, x1: 9.3, y0: -0.6, y1: 3.8 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = "smooth", t = 0;
          C.seg({ options: [{ value: "linear", label: "일정" }, { value: "in", label: "가속" }, { value: "out", label: "감속" }, { value: "smooth", label: "부드럽게" }, { value: "back", label: "튕김" }], value: mode, onChange: x => { mode = x; } });
          C.play(true);
          F.loop((dt, tt) => { const c = tt % 2.6; t = clamp(c / 2, 0, 1); });
          F.draw = g => {
            const fn = EASE[mode][0];
            const G0 = [0.2, 0], S = 3;
            g.poly([G0, [G0[0] + S, G0[1]], [G0[0] + S, G0[1] + S], [G0[0], G0[1] + S]], { stroke: "rgba(236,239,244,0.25)", w: 1 });
            const pts = [];
            for (let i = 0; i <= 60; i++) { const s = i / 60; pts.push([G0[0] + s * S, G0[1] + fn(s) * S]); }
            g.poly(pts, { stroke: "yellow", w: 3, close: false });
            g.line(G0, [G0[0] + S, G0[1] + S], "grey", { w: 1, dash: [4, 4], alpha: 0.6 });
            g.dot([G0[0] + t * S, G0[1] + fn(t) * S], "yellow", 6);
            g.tex("t", [G0[0] + S, G0[1]], "teal", { dy: 14, size: 15 }); g.tex("f(t)", [G0[0], G0[1] + S], "yellow", { dx: -6, dy: -14, size: 15 });
            const x0 = 4.4, x1 = 8.8;
            g.line([x0, 1.0], [x1, 1.0], "grey", { w: 2, alpha: 0.5 });
            g.line([x0, 2.4], [x1, 2.4], "grey", { w: 2, alpha: 0.5 });
            g.circle([lerp(x0, x1, t), 1.0], 0.22, "grey", { fill: "rgba(138,147,166,0.5)", w: 0 });
            g.circle([lerp(x0, x1, fn(t)), 2.4], 0.26, "yellow", { fill: "yellow", w: 0 });
            g.text("일정한 속도", [x0, 1.0], "grey", { dy: -20, size: 11, align: "left" });
            g.text("이징 적용", [x0, 2.4], "yellow", { dy: -24, size: 11, align: "left" });
            L.set("eq", EASE[mode][1]);
          };
        }
      } },
      "UI가 튀어나오고, 카메라가 멈추고, 캐릭터가 착지할 때의 '손맛'이 대부분 이 곡선 선택입니다. ==4장의 3b1b식 전환 애니메이션도 전부 smoothstep==으로 움직였습니다.",

      { h: "점을 모두 지나는 곡선: 스플라인" },
      "경로의 점을 찍어 두고 그 사이를 부드럽게 잇고 싶을 때가 많습니다(카메라 레일, 도로, 애니메이션 키). **캐트멀-롬** 스플라인은 ==각 점의 기울기를 양옆 이웃으로 정해== 모든 점을 지나갑니다. 점을 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          const P = [[-3.4, -1.2], [-2.1, 0.9], [-0.6, -0.6], [0.8, 1.3], [2.2, -0.4], [3.4, 1.0]];
          let mode = "cr", tan = true;
          P.forEach(p => F.vec(p, "white", { snap: 0.02 }));
          C.seg({ options: [{ value: "cr", label: "캐트멀-롬 (점을 지남)" }, { value: "bs", label: "B-스플라인 (점 근처를 지남)" }], value: mode, onChange: x => { mode = x; } });
          C.seg({ options: [{ value: 1, label: "기울기 보기" }, { value: 0, label: "숨기기" }], value: 1, onChange: x => { tan = !!x; } });
          const cr = (p0, p1, p2, p3, t) => [0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
          const bs = (p0, p1, p2, p3, t) => [0, 1].map(k => ((1 - t) ** 3 * p0[k] + (3 * t ** 3 - 6 * t * t + 4) * p1[k] + (-3 * t ** 3 + 3 * t * t + 3 * t + 1) * p2[k] + t ** 3 * p3[k]) / 6);
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            g.poly(P, { stroke: "rgba(236,239,244,0.25)", w: 1, close: false, dash: [4, 5] });
            const ext = [V.sub(V.mul(P[0], 2), P[1])].concat(P, [V.sub(V.mul(P[P.length - 1], 2), P[P.length - 2])]);
            const pts = [];
            for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s <= 20; s++) pts.push((mode === "cr" ? cr : bs)(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / 20));
            g.poly(pts, { stroke: "yellow", w: 3.5, close: false });
            if (tan && mode === "cr") for (let i = 1; i < ext.length - 1; i++) {
              const d = V.mul(V.sub(ext[i + 1], ext[i - 1]), 0.25);
              g.arrow(V.sub(ext[i], d), V.add(ext[i], d), "teal", { w: 2, head: 8, alpha: 0.85 });
            }
            L.set("eq", mode === "cr" ? "점 $P_i$의 기울기 = $(P_(i+1) − P_(i−1)) / 2$   → 모든 점을 지나감" : "점을 지나지는 않지만 더 매끄러움 (곡률까지 연속)");
          };
        }
      } },
      { ponder: "캐트멀-롬은 점을 지나는데 B-스플라인은 왜 점을 비켜 갈까요?",
        answer: "B-스플라인은 각 위치를 ==주변 네 점의 가중 평균==으로 만들어 가중치가 늘 양수이고 합이 1입니다. 평균이라 점 바로 위로는 가지 않지만, 대신 곡률까지 연속이라 더 매끄럽습니다. 지나는 것과 매끄러운 것 사이의 선택입니다." },

      { use: [
        ["엔진", "커브 에셋과 시퀀서", "UE 커브 에셋, 시퀀서 키프레임 사이 보간이 베지어(에르미트) 곡선입니다. 탄젠트 핸들이 가운데 제어점입니다."],
        ["게임", "스플라인 컴포넌트", "레일 카메라, 도로, 케이블, 순찰 경로를 점 몇 개로 찍고 스플라인으로 잇습니다."],
        ["UI", "모션 디자인", "버튼 반응과 화면 전환의 이징이 체감 품질을 좌우합니다. CSS의 `cubic-bezier()`도 같은 곡선입니다."],
        ["실생활", "폰트와 벡터 그림", "글꼴 외곽선과 일러스트 프로그램의 펜 도구가 베지어 곡선입니다. 확대해도 깨지지 않는 이유입니다."]
      ] },

      { recap: [
        ["lerp(A, B, t) = A + (B − A)·t", "모든 보간의 시작"],
        ["B(t) = lerp를 3번 겹침", "베지어: 양 끝은 지나고 가운데 점은 끌어당김"],
        ["f(t) = 3t^2 − 2t^3", "이징: 시간을 휘어 움직임의 느낌을 바꿈"],
        ["기울기 = (P_(i+1) − P_(i−1)) / 2", "캐트멀-롬: 모든 점을 지나는 스플라인"]
      ] }
    ]
  });
})();
