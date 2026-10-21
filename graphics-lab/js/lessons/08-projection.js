/* 05 카메라와 투영 */
(() => {
  const f2 = n => num(n, 2);
  // 위에서 내려다본 마을: [x, z, 색, 크기]
  const TOWN = [[-2.2, 2.4, "pink", 0.5], [0.4, 3.4, "teal", 0.6], [2.4, 1.6, "gold", 0.45], [-0.9, 0.9, "green", 0.4], [1.5, 4.4, "purple", 0.55], [-2.8, 4.2, "orange", 0.5], [3.2, 3.6, "blue", 0.4]];

  lesson({
    topic: "projection", title: "카메라와 투영", desc: "3D를 2D 화면으로", stage: "3D에서 화면으로",
    sym: { z: "blue", d: "gold", n: "teal", f: "pink", near: "teal", far: "pink", "y'": "yellow", "x'": "yellow" },
    hook: "멀리 있는 것은 작게 보입니다. 이 당연한 사실을 ==나눗셈 한 번==으로 옮긴 것이 원근 투영입니다.",
    blocks: [
      { h: "1단계 · 세상을 카메라 앞으로" },
      "GPU에는 '카메라'라는 물체가 없습니다. 대신 ==카메라가 원점에서 정면을 보도록 세상 전체를 반대로 옮깁니다==. 카메라(흰 점)와 시선 방향을 끈 뒤 '뷰 공간'을 눌러 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -4.6, x1: 4.6, y0: -0.6, y1: 4.6 },
        eq: ["{mode}"],
        setup(F, C, L) {
          const cam = [1.2, 0.2], aim = [-0.6, 1.4];
          let k = 0;
          F.vec(cam, "white");
          F.vec(aim, "yellow", { base: () => cam, constrain: q => V.mul(V.norm(q), 1.2), snap: 0.001 });
          F.handles.forEach(h => { h.hidden = () => k > 0.01; });
          C.seg({ options: [{ value: 0, label: "월드 공간" }, { value: 1, label: "뷰 공간" }], value: 0, onChange: x => { const a = k; F.tween(1200, e => { k = lerp(a, x, e); }); } });
          F.draw = g => {
            // 뷰 변환: 카메라 위치를 빼고, 시선이 +z(화면 위쪽)가 되도록 회전
            const ang = Math.PI / 2 - V.ang(aim);
            const W = p => V.rot(V.sub(p, V.mul(cam, k)), ang * k);
            g.grid(1, { minor: false, axes: false, color: "rgba(88,196,221,0.10)" });
            const gx = [];
            for (let i = -8; i <= 8; i++) { gx.push([[i, -8], [i, 8]], [[-8, i], [8, i]]); }
            gx.forEach(([a, b]) => g.line(W(a), W(b), "rgba(88,196,221,0.28)", { w: 1 }));
            g.line(W([-8, 0]), W([8, 0]), "rgba(236,239,244,0.5)", { w: 1.5 }); g.line(W([0, -8]), W([0, 8]), "rgba(236,239,244,0.5)", { w: 1.5 });
            TOWN.forEach(([x, z, c, s]) => {
              const pts = [[x - s / 2, z - s / 2], [x + s / 2, z - s / 2], [x + s / 2, z + s / 2], [x - s / 2, z + s / 2]].map(W);
              g.poly(pts, { fill: hexA(PAL[c], 0.75), stroke: c, w: 1.5 });
            });
            const cp = W(cam), dir = V.rot(V.norm(aim), ang * k);
            g.arc(cp, 6, V.ang(dir) - 0.5, V.ang(dir) + 0.5, "yellow", { fill: hexA(PAL.yellow, 0.07), w: 0 });
            g.arrow(cp, V.add(cp, V.mul(dir, 1.2)), "yellow", { w: 3.5 });
            g.circle(cp, 0.16, "white", { fill: PAL.bg, w: 2.5 });
            g.text(k > 0.99 ? "카메라 = 원점, 시선 = +z" : "", [0, -0.35], "white", { size: 13, bold: true });
            L.set("mode", k < 0.5 ? "월드 공간: 카메라가 세상 안을 돌아다님" : "뷰 공간: 세상이 카메라 앞으로 옮겨짐 (카메라 변환의 역행렬)");
          };
        }
      } },
      { key: "뷰 행렬 = ==카메라 트랜스폼의 역행렬==. 카메라를 오른쪽으로 옮기는 것과 세상을 왼쪽으로 옮기는 것은 화면에서 구별되지 않습니다." },

      { h: "2단계 · 원근: 깊이로 나누기" },
      "옆에서 본 모습입니다. 눈(왼쪽 점)에서 물체 끝을 잇는 선이 [[gold:화면]]을 지나는 높이가 화면에 찍히는 높이 $y'$ 입니다. 노란 점을 끌어 거리를 바꿔 보세요. ==두 삼각형은 닮음==이라 비율이 같습니다.",
      { fig: {
        aspect: 0.5, view: { x0: -0.6, x1: 8.6, y0: -2.3, y1: 2.3 },
        eq: ["y' = d · y / z = {d} · {y} / {z} = {yp}"],
        setup(F, C, L) {
          const P = [4.5, 1.6];
          let d = 1.5;
          F.vec(P, "yellow", { constrain: q => [Math.max(d + 0.3, q[0]), q[1]] });
          C.slider({ label: "화면 거리 $d$", min: 0.6, max: 3, value: d, onInput: x => { d = x; P[0] = Math.max(P[0], d + 0.3); } });
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            g.line([-0.6, 0], [8.6, 0], "rgba(236,239,244,0.5)", { w: 1.5 });
            const z = P[0], y = P[1], yp = d * y / z;
            g.poly([[0, 0], [z, 0], [z, y]], { fill: hexA(PAL.yellow, 0.08), stroke: hexA(PAL.yellow, 0.3), w: 1 });
            g.poly([[0, 0], [d, 0], [d, yp]], { fill: hexA(PAL.yellow, 0.3) });
            g.line([d, -2.1], [d, 2.1], "gold", { w: 4, alpha: 0.85 });
            g.text("화면", [d, 2.05], "gold", { dy: -2, size: 12, bold: true });
            const z2 = Math.min(8.2, z * 1.7);
            g.line([z2, 0], [z2, y], "pink", { w: 5, alpha: 0.7 });
            g.line([0, 0], [z2, y], "pink", { w: 1.2, dash: [4, 5], alpha: 0.6 });
            g.line([d, 0], [d, d * y / z2], "pink", { w: 6, alpha: 0.9 });
            g.line([z, 0], P, "yellow", { w: 5 });
            g.line([0, 0], P, "yellow", { w: 1.5, dash: [5, 5] });
            g.line([d, 0], [d, yp], "yellow", { w: 6 });
            g.dot([0, 0], "white", 6);
            g.tex("z", [z / 2, 0], "blue", { dy: 16 }); g.tex("d", [d / 2, 0], "gold", { dy: 16 });
            g.tex("y", [z, y / 2], "white", { dx: 14 }); g.tex("y'", [d, yp / 2], "yellow", { dx: -16 });
            g.text("같은 크기라도 멀리 있으면 작게", [z2, y], "pink", { dy: y > 0 ? -14 : 14, size: 12 });
            L.set("d", f2(d)); L.set("y", f2(y)); L.set("z", f2(z)); L.set("yp", f2(yp));
          };
        }
      } },
      "공식에서 ==$z$로 나누는 것==이 원근의 전부입니다. 거리가 두 배면 크기는 절반. GPU는 이 나눗셈을 버텍스 셰이더 다음에 자동으로 해 주는데, 이것이 '원근 나눗셈(perspective divide)'이고 그때 나누는 값이 $w$ 입니다.",

      { h: "3단계 · 시야각(FOV)" },
      "위에서 본 카메라와 기둥들, 그리고 아래 띠가 실제 화면입니다. ==FOV를 줄이면 화면에 들어오는 영역이 좁아져 확대한 것처럼== 보입니다. 기둥 하나는 끌어서 옮길 수 있습니다.",
      { fig: {
        aspect: 0.62, view: { x0: -4.2, x1: 4.2, y0: -1.5, y1: 5 },
        eq: ["x_화면 = (x / z) / tan(FOV / 2) = ({x} / {z}) / {t} = {sx}"],
        setup(F, C, L) {
          let fov = 70;
          const posts = [[-1.4, 2.2, "pink"], [0.3, 3.6, "teal"], [1.6, 1.8, "gold"], [-2.6, 4.2, "green"], [2.8, 4.4, "purple"]];
          const mine = [0.9, 2.6];
          F.vec(mine, "yellow", { constrain: q => [q[0], Math.max(0.4, q[1])] });
          C.slider({ label: "FOV", min: 20, max: 140, step: 1, value: fov, fmt: x => x + "°", onInput: x => { fov = x; } });
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            const t = Math.tan(fov * DEG / 2);
            const half = fov * DEG / 2;
            g.arc([0, 0], 7, Math.PI / 2 - half, Math.PI / 2 + half, "yellow", { fill: hexA(PAL.yellow, 0.07), w: 0 });
            g.line([0, 0], V.mul([Math.sin(half), Math.cos(half)], 8), "yellow", { alpha: 0.5, w: 1.5, dash: [6, 5] });
            g.line([0, 0], V.mul([-Math.sin(half), Math.cos(half)], 8), "yellow", { alpha: 0.5, w: 1.5, dash: [6, 5] });
            // 화면 띠
            const y0 = -0.9, w = 3.6;
            g.poly([[-w, y0 - 0.32], [w, y0 - 0.32], [w, y0 + 0.32], [-w, y0 + 0.32]], { fill: "#05070B", stroke: "gold", w: 1.5 });
            const all = posts.concat([[mine[0], mine[1], "yellow"]]);
            all.slice().sort((a, b) => b[1] - a[1]).forEach(([x, z, c]) => {
              const sx = (x / z) / t;
              if (Math.abs(sx) <= 1.05) {
                const hgt = clamp(0.5 / (z * t), 0.03, 0.3);
                g.poly([[sx * w - 0.06, y0 - hgt], [sx * w + 0.06, y0 - hgt], [sx * w + 0.06, y0 + hgt], [sx * w - 0.06, y0 + hgt]], { fill: c });
                g.line([x, z], [0, 0], c, { w: 1, alpha: 0.25 });
              }
            });
            posts.forEach(([x, z, c]) => g.circle([x, z], 0.16, c, { fill: c }));
            g.circle([0, 0], 0.14, "white", { fill: PAL.bg, w: 2.5 });
            g.text("화면", [-w, y0], "gold", { dx: -22, size: 12, bold: true });
            const sx = (mine[0] / mine[1]) / t;
            L.set("x", f2(mine[0])); L.set("z", f2(mine[1])); L.set("t", f2(t)); L.set("sx", Math.abs(sx) > 1 ? f2(sx) + " (화면 밖)" : f2(sx));
          };
        }
      } },
      "화면 좌표가 −1 ~ 1 사이면 화면 안입니다. 이렇게 정규화한 좌표를 **NDC**(정규화 장치 좌표)라고 부릅니다. ==FOV는 결국 '나눗셈 뒤에 얼마나 더 나눌지'== 를 정하는 숫자입니다.",

      { h: "원근과 직교, 그리고 돌리 줌" },
      "3D로 확인해 봅니다. 빈 곳을 끌면 돌아가고, '돌리 줌'을 켜면 FOV를 바꾸는 만큼 카메라가 다가가거나 물러나 ==앞의 상자 크기는 그대로인데 배경만 늘어나고 줄어듭니다==. 영화 '현기증' 효과입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.2, y1: 2.2 },
        eq: ["FOV = {fov}°   카메라 거리 = {dist}   직교 섞기 = {o}"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.35, pitch: 0.22, dist: 7, fov: 50, scale: 1.8 });
          cam.orbit();
          let dolly = true;
          const base = 7 * Math.tan(25 * DEG);
          const setFov = x => { cam.fov = x; if (dolly) cam.dist = base / Math.tan(x * DEG / 2); };
          const fs = C.slider({ label: "FOV", min: 8, max: 110, step: 1, value: 50, fmt: x => x + "°", onInput: setFov });
          C.seg({ options: [{ value: 1, label: "돌리 줌" }, { value: 0, label: "FOV만" }], value: 1, onChange: x => { dolly = !!x; if (dolly) setFov(cam.fov); else cam.dist = 7; } });
          C.slider({ label: "원근 → 직교", min: 0, max: 1, value: 0, onInput: x => { cam.ortho = x; } });
          C.play();
          F.loop((dt, t) => { setFov(59 + 50 * Math.sin(t * 0.8)); fs.set(cam.fov); });
          const cube = (c, s, color) => {
            const h = s / 2, P = [];
            for (let i = 0; i < 8; i++) P.push([c[0] + (i & 1 ? h : -h), c[1] + (i & 2 ? h : -h), c[2] + (i & 4 ? h : -h)]);
            [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => cam.line(P[a], P[b], color, { w: 2 }));
          };
          F.draw = g => {
            cam.floor(6);
            for (let i = 1; i <= 6; i++) { cube([-1.6, 0.5, -i * 1.8], 1, "teal"); cube([1.6, 0.5, -i * 1.8], 1, "teal"); }
            cube([0, 0.6, 1.2], 1.2, "yellow");
            L.set("fov", num(cam.fov, 0)); L.set("dist", f2(cam.dist)); L.set("o", f2(cam.ortho));
          };
        }
      } },
      "직교 쪽으로 밀면 ==거리와 상관없이 크기가 같아져== 평행선이 끝까지 평행하게 남습니다. 설계 도면, 2D 게임, 그림자 맵이 직교 투영을 씁니다.",

      { h: "깊이는 고르게 저장되지 않습니다" },
      "투영 후 깊이도 0~1로 눌러 담는데, 원근 나눗셈 때문에 ==가까운 쪽에 정밀도가 몰립니다==. 아래 세로선들은 깊이 버퍼 값을 균등하게 32칸으로 나눈 경계입니다. $near$를 줄여 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: -0.5, x1: 10.5, y0: -0.3, y1: 1.18, stretch: true },
        eq: ["z_ndc = far / (far − near) · (1 − near / z)", "z_ndc = 0.5 가 되는 거리 = {half}   (far = {far} 중에서)"],
        setup(F, C, L) {
          let near = 0.5, far = 100;
          C.slider({ label: "$near$", min: 0.02, max: 3, value: near, onInput: x => { near = x; } });
          C.slider({ label: "$far$", min: 10, max: 1000, step: 1, value: far, fmt: x => num(x, 0), onInput: x => { far = x; } });
          F.draw = g => {
            const X = z => Math.log10(z / 0.01) / Math.log10(far / 0.01) * 10;   // 가로축: 거리(로그)
            const ndc = z => far / (far - near) * (1 - near / z);
            for (let k = 1; k < 32; k++) {
              const v = k / 32, z = near / (1 - v * (far - near) / far);
              g.line([X(z), 0], [X(z), 1], "blue", { w: 1.2, alpha: 0.45 });
            }
            const pts = [];
            for (let i = 0; i <= 300; i++) { const z = near * Math.pow(far / near, i / 300); pts.push([X(z), ndc(z)]); }
            g.poly(pts, { stroke: "yellow", w: 3, close: false });
            g.line([X(near), 0], [X(near), 1.05], "teal", { w: 2.5 });
            g.line([X(far), 0], [X(far), 1.05], "pink", { w: 2.5 });
            g.text("near", [X(near), 1.05], "teal", { dy: -8, size: 12, bold: true });
            g.text("far", [X(far), 1.05], "pink", { dy: -8, size: 12, bold: true });
            g.line([-0.5, 0], [10.5, 0], "grey", { w: 1 });
            [0.1, 1, 10, 100, 1000].forEach(z => { if (z <= far * 1.01) g.text(String(z), [X(z), 0], "grey", { dy: 14, size: 12 }); });
            g.text("거리 (로그 눈금) →", [5, -0.25], "grey", { size: 12 });
            L.set("half", f2(2 * near * far / (far + near))); L.set("far", num(far, 0));
          };
        }
      } },
      { key: "깊이 버퍼의 절반이 ==$near$의 약 두 배 거리 안에서== 다 쓰입니다. 그래서 $near$를 너무 작게 잡으면 먼 곳에서 면이 깜빡이는(Z-파이팅) 문제가 생깁니다. 요즘 엔진은 0과 1을 뒤집은 **Reversed-Z**로 이를 완화합니다." },

      { use: [
        ["게임", "FOV와 화면비", "FPS의 시야각 옵션, 울트라와이드 대응, 저격 스코프 줌이 모두 투영 행렬 조정입니다."],
        ["영상", "렌즈 느낌", "망원·광각 렌즈 느낌과 돌리 줌을 FOV와 카메라 거리로 재현합니다. 시네마틱 카메라의 초점 거리 설정이 이것입니다."],
        ["엔진", "깊이 정밀도", "UE는 Reversed-Z와 무한 원거리 투영으로 Z-파이팅을 줄입니다. 깊이 버퍼 값을 실제 거리로 되돌리는 계산도 자주 씁니다."],
        ["실생활", "원근법과 AR", "원근법 회화, 휴대폰 AR이 가상 물체를 실제 카메라 화면에 맞추는 것이 같은 투영 계산입니다."]
      ] },

      { recap: [
        ["View = (카메라 트랜스폼)^−1", "카메라 대신 세상을 옮김"],
        ["y' = d · y / z", "원근 = 깊이로 나누기 (w 나눗셈)"],
        ["x_화면 = (x / z) / tan(FOV / 2)", "−1 ~ 1이면 화면 안 (NDC)"],
        ["z_ndc ≈ 1 − near / z", "정밀도는 가까운 쪽에 몰림"]
      ] }
    ]
  });
})();
