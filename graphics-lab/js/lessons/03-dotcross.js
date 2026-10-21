/* 03 내적과 외적 */
(() => {
  const f2 = n => num(n, 2);

  lesson({
    topic: "dotcross", title: "내적과 외적", desc: "같은 쪽인가, 어느 쪽인가", stage: "공간의 언어",
    sym: { a: "yellow", b: "pink", f: "yellow", d: "teal", c: "blue", A: "red", B: "green", C: "blue" },
    hook: "곱셈이 두 가지입니다. ==내적은 '얼마나 같은 쪽인가'==, ==외적은 '어느 쪽으로 돌아가는가'== 를 숫자 하나로 알려 줍니다.",
    blocks: [
      { h: "내적: 그림자의 길이" },
      "분홍 $b$를 노란 $a$ 위로 수직으로 비추면 그림자가 생깁니다. ==내적은 그 그림자 길이 × $|a|$== 입니다. $b$를 돌리며 부호가 어떻게 바뀌는지 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["a·b = a_x b_x + a_y b_y = {s}", "|a| |b| cos θ = {la} × {lb} × {c} = {s}"],
        setup(F, C, L) {
          const a = [2.4, 0.5], b = [0.9, 1.7];
          F.vec(a, "yellow"); F.vec(b, "pink");
          F.draw = g => {
            g.grid(0.5, { minor: false });
            const an = V.norm(a), s = V.dot(a, b), sh = V.dot(an, b), foot = V.mul(an, sh);
            const tone = Math.abs(s) < 0.15 ? "grey" : s > 0 ? "green" : "red";
            g.line(V.mul(an, -9), V.mul(an, 9), "yellow", { alpha: 0.15, w: 1.5 });
            g.line(b, foot, "pink", { dash: [5, 5], w: 1.5, alpha: 0.8 });
            g.line([0, 0], foot, tone, { w: 9, alpha: 0.55 });
            if (V.len(foot) > 0.2 && V.len(V.sub(b, foot)) > 0.2) g.rightAngle(foot, V.mul(an, -Math.sign(sh) || 1), V.sub(b, foot), 0.18);
            const ta = V.ang(a), tb = V.ang(b);
            let d = tb - ta; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
            g.arc([0, 0], 0.45, ta, ta + d, "blue", { w: 2 });
            g.arrow([0, 0], a, "yellow", { label: "a" });
            g.arrow([0, 0], b, "pink", { label: "b" });
            g.text(Math.abs(s) < 0.15 ? "수직: 내적 0" : s > 0 ? "같은 쪽: 내적 +" : "반대쪽: 내적 −", [0, -1.85], tone, { size: 14, bold: true });
            L.set("s", f2(s)); L.set("la", f2(V.len(a))); L.set("lb", f2(V.len(b))); L.set("c", f2(Math.cos(d)));
          };
        }
      } },
      { key: "내적의 ==부호만 봐도== 관계가 보입니다. [[green:양수]]면 같은 쪽, [[grey:0]]이면 수직, [[red:음수]]면 반대쪽. 두 벡터가 단위 벡터라면 내적이 곧 $cos θ$ 입니다." },
      "계산은 성분끼리 곱해서 더하는 것뿐인데, 결과는 각도를 담고 있습니다. 그래서 그래픽스에서 ==각도를 구하지 않고 각도를 비교==할 때 내적을 씁니다.",

      { h: "실전: 시야 안에 있는가?" },
      "가운데 캐릭터가 [[yellow:노란 방향]]을 봅니다. 방향 핸들과 시야각을 바꿔 보세요. 점마다 '나 → 점' 방향 $d̂$와 시선 $f̂$의 내적을 문턱값과 비교할 뿐입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["f̂·d̂ = {dd}   ≥   cos(시야각 / 2) = {th}   →   {res}"],
        setup(F, C, L) {
          const f = [1.2, 0.4], tgt = [2.2, 1.2];
          let fov = 70;
          const pts = [];
          let seed = 7;
          const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          for (let i = 0; i < 70; i++) pts.push([lerp(-4, 4, rnd()), lerp(-2, 2, rnd())]);
          F.vec(f, "yellow", { constrain: q => V.mul(V.norm(q), 1.2), snap: 0.001 });
          F.vec(tgt, "teal");
          C.slider({ label: "시야각", min: 10, max: 180, step: 1, value: fov, fmt: x => x + "°", onInput: x => { fov = x; } });
          F.draw = g => {
            g.grid(0.5, { minor: false, axes: false });
            const fn = V.norm(f), th = Math.cos(fov * DEG / 2), fa = V.ang(fn);
            g.arc([0, 0], 5, fa - fov * DEG / 2, fa + fov * DEG / 2, "yellow", { fill: hexA(PAL.yellow, 0.08), w: 0 });
            g.line([0, 0], V.mul(V.rot(fn, fov * DEG / 2), 6), "yellow", { alpha: 0.4, w: 1.5, dash: [6, 5] });
            g.line([0, 0], V.mul(V.rot(fn, -fov * DEG / 2), 6), "yellow", { alpha: 0.4, w: 1.5, dash: [6, 5] });
            pts.forEach(p => {
              const dd = V.dot(fn, V.norm(p));
              g.dot(p, dd >= th ? "yellow" : dd < 0 ? hexA(PAL.red, 0.45) : hexA(PAL.grey, 0.6), dd >= th ? 5 : 3.5);
            });
            const dd = V.dot(fn, V.norm(tgt));
            g.arrow([0, 0], tgt, "teal", { w: 2.5, label: "d", mid: 1 });
            g.circle([0, 0], 0.22, "white", { fill: PAL.bg, w: 2.5 });
            g.arrow([0, 0], f, "yellow", { w: 4, label: "f" });
            L.set("dd", f2(dd)); L.set("th", f2(th)); L.set("res", dd >= th ? "보임" : "안 보임");
          };
        }
      } },
      "==sqrt도 atan도 없이 곱셈 몇 번==으로 끝납니다. 시야각 판정, 스포트라이트의 원뿔, '등 뒤에서 공격' 판정이 전부 이 한 줄입니다.",

      { h: "외적(2D): 넓이와 좌우" },
      "이번에는 두 벡터가 만드는 평행사변형을 봅니다. $b$가 $a$의 ==왼쪽이면 [[teal:양수]], 오른쪽이면 [[pink:음수]]== — 외적은 넓이에 부호를 붙인 값입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["a × b = a_x b_y − a_y b_x = {cr}", "{side}"],
        setup(F, C, L) {
          const a = [2.2, 0.4], b = [0.6, 1.5];
          F.vec(a, "yellow"); F.vec(b, "pink");
          F.draw = g => {
            g.grid(0.5, { minor: false });
            const cr = V.cross(a, b), tone = cr >= 0 ? "teal" : "pink";
            g.poly([[0, 0], a, V.add(a, b), b], { fill: hexA(PAL[tone], 0.22), stroke: hexA(PAL[tone], 0.7), w: 1.5 });
            const ta = V.ang(a); let d = V.ang(b) - ta; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
            g.arc([0, 0], 0.5, ta, ta + d, tone, { w: 3 });
            g.arrow([0, 0], a, "yellow", { label: "a" });
            g.arrow([0, 0], b, "pink", { label: "b" });
            g.tex(num(Math.abs(cr), 2), V.mul(V.add(a, b), 0.5), tone, { italic: false, size: 20, bold: true });
            L.set("cr", f2(cr)); L.set("side", cr > 0.01 ? "b는 a의 왼쪽 (반시계)" : cr < -0.01 ? "b는 a의 오른쪽 (시계)" : "한 직선 위");
          };
        }
      } },

      { h: "외적(3D): 두 벡터에 수직인 화살표" },
      "3D에서 외적은 숫자가 아니라 ==두 벡터 모두에 수직인 벡터==입니다. 길이는 평행사변형 넓이, 방향은 오른손 법칙. 빈 곳을 끌면 시점이 돕니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.2, y1: 2.2 },
        eq: ["c = a × b = ({cx}, {cy}, {cz})", "|c| = {area} = 평행사변형 넓이"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.7, pitch: 0.42, dist: 10, fov: 38, scale: 1 });
          cam.orbit();
          let ang = 70, lift = 0, flip = false;
          C.slider({ label: "$a$와 $b$ 사이 각", min: 0, max: 180, step: 1, value: ang, fmt: x => x + "°", onInput: x => { ang = x; } });
          C.slider({ label: "$b$ 기울기", min: -60, max: 60, step: 1, value: lift, fmt: x => x + "°", onInput: x => { lift = x; } });
          C.seg({ options: [{ value: 0, label: "$a × b$" }, { value: 1, label: "$b × a$" }], value: 0, onChange: x => { flip = !!x; } });
          F.draw = g => {
            cam.floor(4);
            const a = [1.7, 0, 0];
            const t = ang * DEG, e = lift * DEG;
            const b = [1.3 * Math.cos(t) * Math.cos(e), 1.3 * Math.sin(e), -1.3 * Math.sin(t) * Math.cos(e)];
            const c = flip ? V3.cross(b, a) : V3.cross(a, b);
            cam.poly([[0, 0, 0], a, V3.add(a, b), b], { fill: hexA(PAL.purple, 0.22), stroke: hexA(PAL.purple, 0.7) });
            cam.line([0, 0, 0], [c[0], 0, c[2]], "blue", { dash: [4, 4], alpha: 0.4, w: 1.5 });
            cam.arrow([0, 0, 0], a, "yellow", { label: "a" });
            cam.arrow([0, 0, 0], b, "pink", { label: "b" });
            cam.arrow([0, 0, 0], c, "blue", { w: 4.5, label: flip ? "b × a" : "a × b" });
            g.textS("빈 곳을 끌어 시점 돌리기", F.w - 10, F.h - 10, "rgba(236,239,244,0.45)", { align: "right", base: "bottom", size: 12, halo: false });
            L.set("cx", f2(c[0])); L.set("cy", f2(c[1])); L.set("cz", f2(c[2])); L.set("area", f2(V3.len(c)));
          };
        }
      } },
      "사이 각을 0°나 180°로 만들면 평행사변형이 납작해지며 ==외적이 0으로 사라집니다==. 순서를 바꾸면 방향이 뒤집힙니다($b × a = −a × b$). 삼각형의 **면 노멀**은 두 변의 외적으로 구합니다.",

      { h: "실전: 삼각형의 앞면과 뒷면" },
      "GPU는 화면에 투영된 삼각형의 꼭짓점 순서가 ==반시계면 앞면, 시계면 뒷면==으로 보고 뒷면을 버립니다(백페이스 컬링). 판정은 2D 외적의 부호 하나입니다. 꼭짓점을 끌어 순서를 뒤집어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["(B − A) × (C − A) = {z}   →   {res}"],
        setup(F, C, L) {
          const A = [-1.8, -1.2], B = [1.9, -0.9], Cc = [0.2, 1.5];
          F.vec(A, "red"); F.vec(B, "green"); F.vec(Cc, "blue");
          F.draw = g => {
            g.grid(0.5, { minor: false, axes: false });
            const z = V.cross(V.sub(B, A), V.sub(Cc, A)), front = z > 0;
            g.poly([A, B, Cc], front ? { fill: hexA(PAL.teal, 0.28), stroke: "teal", w: 2.5 } : { stroke: hexA(PAL.red, 0.8), w: 2, dash: [7, 6] });
            const ctr = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3];
            [[A, B], [B, Cc], [Cc, A]].forEach(([p, q]) => {
              const m1 = V.lerp(p, q, 0.38), m2 = V.lerp(p, q, 0.62);
              const inward = V.mul(V.norm(V.sub(ctr, V.lerp(p, q, 0.5))), 0.22);
              g.arrow(V.add(m1, inward), V.add(m2, inward), front ? "teal" : "red", { w: 2.5, head: 10 });
            });
            g.text(front ? "앞면 (그림)" : "뒷면 (버림)", ctr, front ? "white" : "red", { bold: true, size: 15 });
            g.tex("A", A, "red", { dx: -14, dy: 12 }); g.tex("B", B, "green", { dx: 14, dy: 12 }); g.tex("C", Cc, "blue", { dy: -18 });
            L.set("z", f2(z)); L.set("res", front ? "반시계 → 앞면" : "시계 → 뒷면");
          };
        }
      } },
      { ponder: "같은 삼각형을 반대편에서 보면 왜 뒷면이 될까요?",
        answer: "반대편에서 보면 화면에 비친 모양이 ==거울처럼 뒤집혀== A → B → C 순서가 시계 방향으로 보이기 때문입니다. 그래서 '앞면'은 꼭짓점을 저장한 순서(감김 순서)로 정해집니다." },

      { use: [
        ["게임", "시야·등 뒤 판정", "AI가 플레이어를 보는지, 백어택인지를 ==내적 한 번==으로 판정합니다. 스포트라이트 원뿔도 같은 식입니다."],
        ["셰이더", "조명과 림 라이트", "$N·L$ 이 확산광, $1 − N·V$ 가 가장자리 빛(림·프레넬)입니다. 툰 셰이딩의 경계도 내적 값에 문턱을 둔 것입니다."],
        ["엔진", "면 노멀과 컬링", "삼각형 노멀은 두 변의 외적, 백페이스 컬링은 외적의 부호입니다. 탄젠트 공간의 바이노멀도 외적으로 만듭니다."],
        ["실생활", "일과 토크", "물리에서 일 = 힘·이동(내적), 렌치를 돌리는 토크 = 거리 × 힘(외적)입니다."]
      ] },

      { recap: [
        ["a·b = a_x b_x + a_y b_y", "같은 쪽(+) · 수직(0) · 반대쪽(−)"],
        ["a·b = |a| |b| cos θ", "단위 벡터끼리는 곧 cos θ"],
        ["f̂·d̂ ≥ cos(시야각 / 2)", "시야·원뿔 판정"],
        ["a × b = a_x b_y − a_y b_x", "2D: 부호 붙은 넓이, 왼쪽(+)/오른쪽(−)"],
        ["c = a × b", "3D: 둘 다에 수직, 길이 = 넓이"]
      ] }
    ]
  });
})();
