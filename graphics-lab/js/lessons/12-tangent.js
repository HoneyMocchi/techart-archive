/* 12 탄젠트 공간과 노멀 맵 */
(() => {
  const f2 = n => num(n, 2);
  // 노멀 맵 무늬: 볼록한 원형 돌기(타일)의 기울기
  const bumpN = (u, v, s) => {
    const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5, r2 = (fu * fu + fv * fv) * 6;
    if (r2 > 1) return [0, 0, 1];
    const k = s * (1 - r2) * 2.4;
    return V3.norm([fu * k, fv * k, 1]);
  };

  lesson({
    topic: "tangent", title: "탄젠트 공간과 노멀 맵", desc: "면마다 다른 '위쪽' 기준", stage: "3D에서 화면으로",
    sym: { T: "red", B: "green", N: "blue", n: "yellow", L: "gold", u: "green", v: "red" },
    hook: "노멀 맵의 파란 색은 '위쪽'이라는 뜻인데, 그 '위쪽'은 월드의 위가 아니라 ==그 픽셀이 붙은 면의 위쪽==입니다. 면마다 기준 축 세 개(T, B, N)를 세워 두는 것이 탄젠트 공간입니다.",
    blocks: [
      { h: "면마다 축 세 개: T, B, N" },
      "곡면 위의 점마다 [[red:$T$]](텍스처 $u$가 늘어나는 방향), [[green:$B$]]($v$ 방향), [[blue:$N$]](면 노멀)이 섭니다. 점을 곡면 위에서 끌어 보세요. ==노멀 맵의 값 $(x, y, z)$ 는 이 세 축으로 읽습니다==.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["n_월드 = x·T + y·B + z·N = TBN · n_맵", "n_맵 = ({mx}, {my}, {mz})"],
        setup(F, C, L) {
          let s = 0.3, tilt = [0.35, 0.25];
          const cam = makeCam(F, { yaw: 0.5, pitch: 0.55, dist: 9, fov: 36, scale: 1.25 });
          cam.orbit();
          C.slider({ label: "곡면 위 위치", min: -2.2, max: 2.2, value: s, onInput: x => { s = x; } });
          C.slider({ label: "노멀 맵 x (T 쪽)", min: -0.9, max: 0.9, value: tilt[0], onInput: x => { tilt[0] = x; } });
          C.slider({ label: "노멀 맵 y (B 쪽)", min: -0.9, max: 0.9, value: tilt[1], onInput: x => { tilt[1] = x; } });
          // 원통형 곡면: (x, sin, cos)
          const P = (u, v) => [u, Math.sin(v) * 1.4, Math.cos(v) * 1.4 - 1.4];
          F.draw = g => {
            for (let i = -6; i <= 6; i++) {
              const pts = []; for (let k = 0; k <= 30; k++) pts.push(P(i * 0.4, -1.3 + k / 30 * 2.6));
              for (let k = 0; k < 30; k++) cam.line(pts[k], pts[k + 1], "rgba(88,196,221,0.35)", { w: 1 });
            }
            for (let k = 0; k <= 12; k++) { const v = -1.3 + k / 12 * 2.6; cam.line(P(-2.4, v), P(2.4, v), "rgba(88,196,221,0.35)", { w: 1 }); }
            const u0 = 0.4, v0 = s * 0.5;
            const p = P(u0, v0), T = [1, 0, 0], B = [0, Math.cos(v0), -Math.sin(v0)], N = V3.cross(T, B);
            const nm = V3.norm([tilt[0], tilt[1], 1]);
            const nw = V3.add(V3.add(V3.mul(T, nm[0]), V3.mul(B, nm[1])), V3.mul(N, nm[2]));
            cam.arrow(p, V3.add(p, V3.mul(T, 1)), "red", { w: 3.5, label: "T" });
            cam.arrow(p, V3.add(p, V3.mul(B, 1)), "green", { w: 3.5, label: "B" });
            cam.arrow(p, V3.add(p, V3.mul(N, 1)), "blue", { w: 3.5, label: "N" });
            cam.arrow(p, V3.add(p, V3.mul(nw, 1.4)), "yellow", { w: 4, label: "n" });
            cam.dot(p, "white", 5);
            g.textS("빈 곳을 끌어 시점 돌리기", F.w - 10, F.h - 10, "rgba(236,239,244,0.45)", { align: "right", base: "bottom", size: 12, halo: false });
            L.set("mx", f2(nm[0])); L.set("my", f2(nm[1])); L.set("mz", f2(nm[2]));
          };
        }
      } },
      { key: "탄젠트 공간 노멀 맵은 ==면이 어느 쪽을 보든 '위 = 파랑'==으로 저장됩니다. 그래서 같은 벽돌 노멀 맵을 바닥·벽·휘어진 기둥 어디에나 붙일 수 있고, 모델이 애니메이션으로 휘어도 따라갑니다." },

      { h: "노멀 맵 색 읽기" },
      "왼쪽은 돌기 무늬의 노멀 맵(RGB = $N · 0.5 + 0.5$), 오른쪽은 그것으로 조명한 결과입니다. 해를 움직여 보세요. ==빨강이 진하면 오른쪽($+T$)으로, 초록이 진하면 위쪽($+B$)으로 기울어진== 픽셀입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["색(R, G, B) → n = (R, G, B) · 2 − 1", "{gflip}"],
        setup(F, C, L) {
          let strength = 0.6, flipG = false;
          const sun = [2.6, 1.5];
          F.vec(sun, "gold", { snap: 0.01 });
          C.slider({ label: "세기", min: 0, max: 1.5, value: strength, onInput: x => { strength = x; } });
          C.seg({ options: [{ value: 0, label: "OpenGL (Y+)" }, { value: 1, label: "DirectX (Y−)로 잘못 읽기" }], value: 0, onChange: x => { flipG = !!x; } });
          F.draw = g => {
            const Ld = V3.norm([(sun[0] - 2) * 0.6, (sun[1]) * 0.6, 0.6]);
            g.field(240, (x, y) => {
              const left = x < 0, u = (left ? x + 4 : x) / 1.3, v = (y + 2) / 1.3;
              let n = bumpN(u, v, strength);
              if (left) return [(n[0] * 0.5 + 0.5) * 255, (n[1] * 0.5 + 0.5) * 255, (n[2] * 0.5 + 0.5) * 255, 255];
              if (flipG) n = [n[0], -n[1], n[2]];
              const d = Math.max(0, V3.dot(n, Ld));
              return [60 + 180 * d, 50 + 150 * d, 45 + 110 * d, 255];
            }, { smooth: false });
            g.line([0, -2], [0, 2], "white", { w: 2 });
            g.text("노멀 맵 (RGB)", [-2, 1.85], "white", { size: 12, bold: true }); g.text("조명 결과", [2, 1.85], "white", { size: 12, bold: true });
            g.circle(sun, 0.14, "gold", { fill: "gold", w: 0 });
            L.set("gflip", flipG ? "초록 채널 방향이 반대인 맵을 그대로 읽으면 돌기가 ==움푹 팬 것처럼== 보입니다" : "돌기가 해 쪽은 밝고 반대쪽은 어두운 볼록한 모양");
          };
        }
      } },
      "DirectX 계열(UE)과 OpenGL 계열(Unity·Blender 기본)은 ==초록 채널 방향이 반대==입니다. 다른 툴에서 구운 노멀 맵이 빛을 반대로 받는다면 초록 채널 뒤집기가 답입니다.",

      { h: "탄젠트는 UV에서 나온다" },
      "$T$와 $B$는 아무렇게나 정하는 게 아니라 ==삼각형 위에서 UV가 늘어나는 방향==으로 계산합니다(MikkTSpace 표준). UV를 돌리면 탄젠트도 따라 돕니다. UV 삼각형의 꼭짓점을 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["[T B] = [e_1 e_2] · [[Δu_1, Δu_2; Δv_1, Δv_2]]^(−1)"],
        setup(F, C, L) {
          const P = [[0.6, -1.5], [3.6, -1.1], [1.6, 1.6]];
          const UV = [[-3.6, -1.6], [-1.2, -1.6], [-2.4, 0.6]];
          UV.forEach(q => F.vec(q, "green", { snap: 0.02 }));
          F.draw = g => {
            g.grid(0.4, { minor: false, axes: false, color: "rgba(88,196,221,0.07)" });
            g.poly(UV, { fill: "rgba(131,193,103,0.15)", stroke: "green", w: 2 });
            g.poly(P, { fill: "rgba(88,196,221,0.12)", stroke: "blue", w: 2 });
            g.arrow([-3.8, -1.9], [-3.0, -1.9], "red", { w: 2, head: 7, label: "u" }); g.arrow([-3.8, -1.9], [-3.8, -1.1], "green", { w: 2, head: 7, label: "v" });
            g.text("UV 공간", [-2.4, 1.85], "white", { size: 12, bold: true }); g.text("모델(위치) 공간", [2.1, 1.85], "white", { size: 12, bold: true });
            const e1 = V.sub(P[1], P[0]), e2 = V.sub(P[2], P[0]), d1 = V.sub(UV[1], UV[0]), d2 = V.sub(UV[2], UV[0]);
            const det = d1[0] * d2[1] - d2[0] * d1[1] || 1e-6;
            const T = V.mul(V.sub(V.mul(e1, d2[1]), V.mul(e2, d1[1])), 1 / det), B = V.mul(V.sub(V.mul(e2, d1[0]), V.mul(e1, d2[0])), 1 / det);
            const c = V.mul(V.add(V.add(P[0], P[1]), P[2]), 1 / 3);
            g.arrow(c, V.add(c, V.mul(V.norm(T), 1)), "red", { w: 3.5, label: "T" });
            g.arrow(c, V.add(c, V.mul(V.norm(B), 1)), "green", { w: 3.5, label: "B" });
            // UV 공간의 격자를 모델 공간으로 옮겨 보여 줌
            for (let k = 0; k <= 4; k++) {
              const map = q => { const w = [q[0] - UV[0][0], q[1] - UV[0][1]]; const a = (w[0] * d2[1] - d2[0] * w[1]) / det, b = (d1[0] * w[1] - w[0] * d1[1]) / det; return V.add(P[0], V.add(V.mul(e1, a), V.mul(e2, b))); };
              const cu = V.lerp(UV[0], UV[1], k / 4);
              g.line(map(cu), map(V.add(cu, [0, 0.6])), "red", { w: 1, alpha: 0.45 });
            }
          };
        }
      } },

      { use: [
        ["엔진", "탄젠트 계산과 임포트", "UE는 메시를 가져올 때 MikkTSpace로 탄젠트를 만듭니다. 베이커(Substance·Marmoset)와 같은 방식을 써야 노멀 맵 이음매가 안 생깁니다."],
        ["아트", "초록 채널 뒤집기", "UE 텍스처 설정의 'Flip Green Channel'이 이 장의 OpenGL/DirectX 차이를 바로잡는 체크박스입니다."],
        ["셰이더", "디테일 노멀 섞기", "기본 노멀 맵 위에 작은 디테일 노멀을 얹을 때는 단순 더하기 대신 탄젠트 공간에서 돌려 섞는 방식(RNM·화이트아웃)을 씁니다."],
        ["게임", "캐릭터 피부·갑옷", "캐릭터가 움직여도 노멀 맵이 따라가는 것은 정점마다 탄젠트를 스키닝(24장)과 함께 돌려 주기 때문입니다."]
      ] },

      { recap: [
        ["n_월드 = TBN · n_맵", "탄젠트 공간 → 월드"],
        ["n = RGB · 2 − 1", "노멀 맵 색 읽기"],
        ["T, B = UV가 늘어나는 방향", "탄젠트는 UV에서 계산 (MikkTSpace)"],
        ["초록 채널 방향", "DirectX와 OpenGL이 반대"]
      ] }
    ]
  });
})();
