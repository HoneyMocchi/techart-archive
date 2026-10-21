/* 41 시차 매핑 (Parallax · POM) */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  // 벽돌 높이맵 (1 = 표면, 0 = 가장 깊음) 과 색
  const bh = (u, v) => { const row = Math.floor(v * 4), off = (row % 2) * 0.5, fu = fract(u * 2 + off), fv = fract(v * 4); const m = Math.min(fu, 1 - fu, fv * 0.5, (1 - fv) * 0.5); return clamp(m * 12, 0, 1); };
  const bc = (u, v, h) => { const row = Math.floor(v * 4), id = Math.floor(u * 2 + (row % 2) * 0.5) * 7 + row * 13, t = fract(Math.sin(id) * 43758.5); return h > 0.5 ? [150 + 50 * t, 70 + 20 * t, 55] : [120, 115, 105]; };

  lesson({
    topic: "parallax", title: "시차 매핑", desc: "평평한 면에 가짜 깊이", stage: "테크아트 실전",
    sym: { V: "teal", h: "red", uv: "green", s: "orange" },
    hook: "노멀 맵은 빛만 속이고 모양은 평평합니다. 비스듬히 보면 들통나죠. 시차 매핑은 ==보는 방향에 따라 UV를 밀어서== 높은 곳은 앞으로, 낮은 곳은 뒤로 물러난 것처럼 보이게 합니다. 폴리곤을 하나도 늘리지 않습니다.",
    blocks: [
      { h: "원리: 시선을 따라 높이맵 속으로" },
      "옆에서 본 높이맵입니다(위가 표면). 시선이 표면에 닿은 점에서 그대로 읽으면 틀립니다. ==시선을 높이맵 안으로 연장해 실제로 부딪히는 점==을 찾아 그 UV를 써야 합니다. 단순 시차(한 번에 어림) 와 POM(여러 걸음 탐색)을 비교해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -0.2, x1: 4.2, y0: -1.3, y1: 0.9 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let ang = 0.9, mode = "pom", steps = 8, depth = 1;
          F.handle({ color: "teal", get: () => [2 - Math.sin(ang) * 1.1, Math.cos(ang) * 1.1 * 0.7], set: (x, y) => { ang = clamp(Math.atan2(2 - x, Math.max(0.05, y / 0.7)), 0.1, 1.45); } });
          C.seg({ options: [{ value: "none", label: "없음" }, { value: "simple", label: "단순 시차" }, { value: "pom", label: "POM" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "걸음 수", min: 2, max: 32, step: 1, value: steps, fmt: x => num(x, 0), onInput: x => { steps = x; } });
          const H = x => bh(x / 4, 0.1) * depth;     // 단면 높이 (0 ~ 1)
          const Y = h => (h - 1) * 1.0;              // 표면 y = 0, 바닥 y = −1
          F.draw = g => {
            const pts = []; for (let x = 0; x <= 4; x += 0.01) pts.push([x, Y(H(x))]);
            g.poly(pts.concat([[4, -1.25], [0, -1.25]]), { fill: "rgba(150,90,70,0.45)", stroke: "orange", w: 2, close: true });
            g.line([0, 0], [4, 0], "white", { w: 1.5, dash: [5, 4] });
            const P0 = [2, 0], d = [-Math.sin(ang), -Math.cos(ang)];
            const eye = [2 - Math.sin(ang) * 1.1, Math.cos(ang) * 1.1 * 0.7];
            g.line(eye, P0, "teal", { w: 2.5 });
            let hit = P0, msg = "";
            if (mode === "simple") {
              const h = H(P0[0]), off = (1 - h) * Math.tan(ang);
              hit = [P0[0] - off, Y(H(P0[0] - off))];
              g.line(P0, [P0[0] - off, 0], "orange", { w: 2 }); g.line([P0[0] - off, 0], hit, "orange", { w: 1, dash: [3, 3] });
              msg = "$uv' = uv − V_xy / V_z · (1 − h)$   한 번에 어림 → 경사가 크면 틀림";
            } else if (mode === "pom") {
              let p = P0.slice(), prev = p;
              const stepLen = 1 / steps / Math.cos(ang);
              for (let i = 0; i < steps * 3; i++) {
                const q = V.add(p, V.mul(d, stepLen));
                g.dot(q, "yellow", 3.5);
                if (q[1] <= Y(H(q[0]))) { hit = q; break; }
                prev = q; p = q;
              }
              g.line(P0, hit, "yellow", { w: 2 });
              msg = `$${steps}$ 걸음씩 들어가며 높이맵보다 아래로 내려가는 첫 점을 찾음 (걸음이 적으면 계단이 생김)`;
            } else msg = "표면 점의 UV를 그대로 씀 → 깊이감 없음";
            g.dot(hit, "pink", 6);
            g.line([hit[0], hit[1]], [hit[0], 0.05], "pink", { w: 1, dash: [3, 3] });
            L.set("eq", msg);
          };
        }
      } },

      { h: "결과: 벽돌 벽을 비스듬히 보기" },
      "같은 평면에 같은 텍스처입니다. 기울기를 키워 보세요. ==POM은 벽돌이 실제로 튀어나온 것처럼== 줄눈을 가리지만, 가장자리 실루엣은 여전히 평평합니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["깊이 {d}, 걸음 {n}"],
        setup(F, C, L) {
          let tilt = 1.0, mode = "pom", steps = 16, depth = 0.08;
          C.seg({ options: [{ value: "none", label: "노멀 맵만" }, { value: "simple", label: "단순 시차" }, { value: "pom", label: "POM" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "기울기", min: 0, max: 1.35, value: tilt, fmt: x => num(x / DEG, 0) + "°", onInput: x => { tilt = x; } });
          C.slider({ label: "깊이", min: 0, max: 0.2, value: depth, onInput: x => { depth = x; } });
          C.slider({ label: "걸음 수", min: 2, max: 48, step: 1, value: steps, fmt: x => num(x, 0), onInput: x => { steps = x; } });
          F.draw = g => {
            // 카메라 앞 2만큼에 놓인 평면을 tilt만큼 눕힘. Tu·Tv는 평면 위 축, n은 카메라 쪽을 향한 노멀
            const n = [0, Math.sin(tilt), -Math.cos(tilt)], Tu = [1, 0, 0], Tv = [0, Math.cos(tilt), Math.sin(tilt)], c0 = [0, 0, 2];
            g.field(220, (x, y) => {
              const rd = V3.norm([x * 0.6, y * 0.6, 1]), dn = V3.dot(n, rd);
              if (dn > -1e-3) return [16, 19, 26, 255];
              const t = V3.dot(n, c0) / dn, q = V3.sub(V3.mul(rd, t), c0);
              let u = V3.dot(q, Tu) * 0.5 + 0.5, v = V3.dot(q, Tv) * 0.5 + 0.5;
              if (Math.abs(u - 0.5) > 1.2 || Math.abs(v - 0.5) > 1.6) return [16, 19, 26, 255];
              const Vt = [V3.dot(rd, Tu) / -dn, V3.dot(rd, Tv) / -dn];   // 표면 안으로 1 들어갈 때 UV가 움직이는 양
              if (mode === "simple") { const h = bh(u, v); u += Vt[0] * (1 - h) * depth; v += Vt[1] * (1 - h) * depth; }
              else if (mode === "pom") {
                let lh = 1, cu = u, cv = v; const du = Vt[0] * depth / steps, dv = Vt[1] * depth / steps;
                for (let i = 0; i < steps; i++) { const h = bh(cu, cv); if (h >= lh) break; lh -= 1 / steps; cu += du; cv += dv; }
                u = cu; v = cv;
              }
              const h = bh(u, v), e = 0.003, nx = (bh(u - e, v) - bh(u + e, v)) * 3, ny = (bh(u, v - e) - bh(u, v + e)) * 3;
              const nn = V3.norm([nx, ny, 1]), l = 0.35 + 0.65 * Math.max(0, V3.dot(nn, V3.norm([0.4, 0.5, 0.75])));
              const c = bc(u, v, h), ao = 0.6 + 0.4 * h;
              return [c[0] * l * ao, c[1] * l * ao, c[2] * l * ao, 255];
            });
            L.set("d", f2(depth)); L.set("n", mode === "pom" ? steps : "—");
          };
        }
      } },
      { ponder: "POM으로도 해결되지 않는 것은 무엇일까요?",
        answer: "==실루엣과 그림자==입니다. 픽셀 안의 UV만 바꾸므로 면의 가장자리는 여전히 직선이고, 다른 물체에 드리우는 그림자도 평평한 면 기준입니다. 실루엣까지 필요하면 테셀레이션·나나이트 디스플레이스먼트로 실제 정점을 움직입니다." },

      { use: [
        ["엔진", "BumpOffset·ParallaxOcclusionMapping", "UE 머티리얼의 BumpOffset 노드가 단순 시차, ParallaxOcclusionMapping 함수가 POM입니다. Max/Min Steps가 이 장의 걸음 수입니다."],
        ["게임", "바닥 타일과 벽", "돌길·벽돌 벽·카펫처럼 평평한 큰 면에서 효과가 가장 좋습니다. 정면에서 멀어질수록 걸음 수를 늘리고, 멀리서는 꺼서 비용을 아낍니다."],
        ["TA", "높이맵 품질", "높이맵이 0~1 전체를 쓰도록 정규화하고, 날카로운 단차는 블러를 살짝 줘야 계단 현상이 줄어듭니다."],
        ["실생활", "인테리어 매핑", "창문 안쪽에 방이 있는 것처럼 보이게 하는 '인테리어 매핑'도 시선을 상자 안으로 연장하는 같은 원리입니다."]
      ] },

      { recap: [
        ["uv' = uv − V_xy / V_z · (1 − h) · 깊이", "단순 시차: 한 번에 어림"],
        ["시선을 n걸음 연장해 첫 교차 찾기", "POM: 정확하지만 걸음 수만큼 비쌈"],
        ["실루엣·그림자는 그대로", "필요하면 디스플레이스먼트"],
        ["노멀 맵 + 시차", "빛과 깊이를 함께 속이기"]
      ] }
    ]
  });
})();
