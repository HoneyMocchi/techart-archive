/* 24 스켈레탈 애니메이션과 스키닝 */
(() => {
  const f2 = n => num(n, 2);

  lesson({
    topic: "skinning", title: "스켈레탈 애니메이션과 스키닝", desc: "뼈를 움직이면 피부가 따라온다", stage: "움직임과 시뮬레이션",
    sym: { w: "orange", M: "purple", v: "yellow", "θ": "blue", q: "purple" },
    hook: "캐릭터는 수만 개의 정점을 하나하나 움직이지 않습니다. ==뼈 수십 개를 움직이고, 각 정점은 가까운 뼈 몇 개를 가중치만큼 따라가게== 합니다. 4장의 행렬 사슬과 5장의 쿼터니언이 여기서 만납니다.",
    blocks: [
      { h: "뼈의 사슬: FK와 IK" },
      "뼈 셋으로 된 팔입니다. 각 뼈의 위치는 ==부모 뼈의 변환 × 자기 회전==으로 정해집니다(FK). 'IK'로 바꾸면 반대로 손끝(노란 점)을 끌어서 관절 각도를 거꾸로 구합니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["M_손 = M_어깨 · M_팔꿈치 · M_손목", "각도 = ({a0}°, {a1}°, {a2}°)"],
        setup(F, C, L) {
          const len = [1.5, 1.2, 0.7], ang = [0.5, 0.6, 0.3], target = [1.6, 1.0];
          let mode = "fk";
          const sl = [0, 1, 2].map(i => C.slider({ label: ["어깨", "팔꿈치", "손목"][i], min: -3.14, max: 3.14, value: ang[i], fmt: x => num(x / DEG, 0) + "°", onInput: x => { ang[i] = x; mode = "fk"; } }));
          C.seg({ options: [{ value: "fk", label: "FK (각도로)" }, { value: "ik", label: "IK (손끝을 끌어서)" }], value: mode, onChange: x => { mode = x; } });
          F.vec(target, "yellow", { snap: 0.01 });
          F.handles[0].hidden = () => mode !== "ik";
          const chain = () => { const pts = [[-2.4, -0.6]]; let a = 0; for (let i = 0; i < 3; i++) { a += ang[i]; const p = pts[i]; pts.push([p[0] + Math.cos(a) * len[i], p[1] + Math.sin(a) * len[i]]); } return pts; };
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            if (mode === "ik") {
              for (let it = 0; it < 12; it++) for (let j = 2; j >= 0; j--) {      // CCD: 끝에서부터 관절마다 손끝이 목표를 향하게
                const pts = chain(), e = pts[3], p = pts[j];
                const a1 = Math.atan2(e[1] - p[1], e[0] - p[0]), a2 = Math.atan2(target[1] - p[1], target[0] - p[0]);
                let d = a2 - a1; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
                ang[j] += d;
              }
              sl.forEach((s, i) => s.set(((ang[i] + Math.PI) % TAU + TAU) % TAU - Math.PI));
            }
            const pts = chain();
            const cols = ["teal", "pink", "gold"];
            for (let i = 0; i < 3; i++) {
              const a = pts[i], b = pts[i + 1], n = V.mul(V.norm(V.perp(V.sub(b, a))), 0.16);
              const k = V.add(a, V.mul(V.sub(b, a), 0.2));     // 뼈 모양: 마름모
              g.poly([a, V.add(k, n), b, V.sub(k, n)], { fill: hexA(PAL[cols[i]], 0.5), stroke: cols[i], w: 2 });
              const r = V.norm(V.sub(b, a));
              g.arrow(a, V.add(a, V.mul(r, 0.5)), "red", { w: 2, head: 6 }); g.arrow(a, V.add(a, V.mul(V.perp(r), 0.5)), "green", { w: 2, head: 6 });
            }
            pts.forEach((p, i) => g.circle(p, 0.09, "white", { fill: i === 0 ? "#fff" : PAL.bg, w: 2 }));
            if (mode === "ik") g.line(pts[3], target, "yellow", { w: 1, dash: [4, 4] });
            L.set("a0", num(ang[0] / DEG, 0)); L.set("a1", num(ang[1] / DEG, 0)); L.set("a2", num(ang[2] / DEG, 0));
          };
        }
      } },

      { h: "선형 블렌드 스키닝" },
      "팔 모양 메시의 정점마다 ==두 뼈에 대한 가중치==가 있습니다(색: [[teal:위팔]] ↔ [[pink:아래팔]]). 정점은 각 뼈를 따라 움직인 위치를 가중치로 섞은 곳에 놓입니다. 팔꿈치를 많이 굽혀 보고, 가중치가 바뀌는 구간의 폭도 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["v' = Σ w_i · M_i · v = w_1·M_1·v + w_2·M_2·v,   w_1 + w_2 = 1"],
        setup(F, C, L) {
          let bend = 1.6, width = 0.5, showW = true;
          C.slider({ label: "팔꿈치 굽히기", min: 0, max: 2.6, value: bend, fmt: x => num(x / DEG, 0) + "°", onInput: x => { bend = x; } });
          C.slider({ label: "가중치 섞이는 폭", min: 0.02, max: 1.5, value: width, onInput: x => { width = x; } });
          C.seg({ options: [{ value: 1, label: "가중치 색 보기" }, { value: 0, label: "숨기기" }], value: 1, onChange: x => { showW = !!x; } });
          const J = [0, 0], N = 28, rows = [-0.42, -0.21, 0, 0.21, 0.42];
          F.draw = g => {
            const vert = (x, y) => {
              const w2 = clamp((x - J[0]) / width + 0.5, 0, 1), w1 = 1 - w2;
              const p2 = V.add(J, V.rot(V.sub([x, y], J), bend));                // 아래팔 뼈: 팔꿈치 기준 회전
              return { p: V.add(V.mul([x, y], w1), V.mul(p2, w2)), w2 };
            };
            const grid = rows.map(y => Array.from({ length: N + 1 }, (_, i) => vert(-3 + i * 6 / N, y)));
            for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < N; i++) {
              const a = grid[r][i], b = grid[r][i + 1], c = grid[r + 1][i + 1], d = grid[r + 1][i];
              const w = (a.w2 + b.w2 + c.w2 + d.w2) / 4;
              const col = showW ? `rgba(${Math.round(lerp(92, 227, w))},${Math.round(lerp(208, 111, w))},${Math.round(lerp(179, 200, w))},0.55)` : "rgba(177,137,198,0.45)";
              g.poly([a.p, b.p, c.p, d.p], { fill: col, stroke: "rgba(236,239,244,0.25)", w: 1 });
            }
            g.line([-3, 0], J, "teal", { w: 4 }); g.line(J, V.add(J, V.rot([3, 0], bend)), "pink", { w: 4 });
            g.circle(J, 0.1, "white", { fill: PAL.bg, w: 2.5 });
            const inner = grid[rows.length - 1][N / 2].p, outer = grid[0][N / 2].p;
            g.text("팔꿈치 두께 " + f2(V.len(V.sub(inner, outer))) + " (원래 0.84)", [0, -1.85], V.len(V.sub(inner, outer)) < 0.5 ? "red" : "white", { size: 12, bold: true });
          };
        }
      } },
      "많이 굽히면 팔꿈치 안쪽이 ==찌그러지며 얇아집니다==. 두 위치를 직선으로 섞는(평균) 탓에 회전의 중간이 원호가 아니라 지름을 가로지르기 때문입니다.",

      { h: "캔디 래퍼 현상과 듀얼 쿼터니언" },
      "손목을 축 방향으로 비틀어 봅니다. 선형 블렌드는 180° 가까이 비틀면 ==가운데가 사탕 포장지처럼 한 점으로 쪼그라듭니다==. 회전 자체를 섞는 방식(듀얼 쿼터니언 스키닝)은 부피를 지킵니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.35, pitch: 0.35, dist: 9, fov: 34, scale: 1.2 });
          cam.orbit();
          let tw = 2.6, mode = "lbs";
          C.slider({ label: "비틀기", min: 0, max: 3.14, value: tw, fmt: x => num(x / DEG, 0) + "°", onInput: x => { tw = x; } });
          C.seg({ options: [{ value: "lbs", label: "선형 블렌드" }, { value: "dqs", label: "듀얼 쿼터니언" }], value: mode, onChange: x => { mode = x; } });
          F.draw = g => {
            const R = 0.55, NS = 16, NX = 24;
            const P = (x, a) => {
              const w = clamp((x + 0.6) / 1.2, 0, 1), y = Math.cos(a) * R, z = Math.sin(a) * R;
              if (mode === "lbs") { const y2 = Math.cos(a + tw) * R, z2 = Math.sin(a + tw) * R; return [x, lerp(y, y2, w), lerp(z, z2, w)]; }
              const t = tw * w; return [x, Math.cos(a + t) * R, Math.sin(a + t) * R];
            };
            for (let i = 0; i <= NX; i++) {
              const x = -2.4 + i * 4.8 / NX, pts = [];
              for (let k = 0; k <= NS; k++) pts.push(P(x, k / NS * TAU));
              for (let k = 0; k < NS; k++) cam.line(pts[k], pts[k + 1], i % 4 === 0 ? "teal" : "rgba(92,208,179,0.45)", { w: i % 4 === 0 ? 2 : 1 });
            }
            for (let k = 0; k < NS; k += 2) { const pts = []; for (let i = 0; i <= NX; i++) pts.push(P(-2.4 + i * 4.8 / NX, k / NS * TAU)); for (let i = 0; i < NX; i++) cam.line(pts[i], pts[i + 1], k === 0 ? "yellow" : "rgba(236,239,244,0.3)", { w: k === 0 ? 2.5 : 1 }); }
            const mid = P(0, 0), r = Math.hypot(mid[1], mid[2]);
            L.set("eq", mode === "lbs" ? `가운데 반지름 ${f2(r)} / ${R} — 위치를 직선으로 섞어서 쪼그라듦` : `가운데 반지름 ${f2(r)} / ${R} — 회전 각도를 섞어서 부피 유지`);
          };
        }
      } },
      { key: "게임 캐릭터는 정점마다 ==뼈 최대 4~8개와 가중치==를 저장하고, 버텍스 셰이더가 매 프레임 $Σ w_i · M_i · v$ 를 계산합니다. 노멀과 탄젠트(12장)도 같은 행렬로 돌립니다." },

      { use: [
        ["엔진", "스켈레탈 메시", "UE의 스켈레톤·스킨 웨이트·애님 블루프린트가 이 장의 구조입니다. Two Bone IK·FABRIK·Full Body IK 노드가 IK 풀이기입니다."],
        ["아트", "웨이트 페인팅", "리거가 팔꿈치·어깨 가중치를 붓으로 칠하는 이유가 이 장의 찌그러짐입니다. 보조 뼈(twist bone)를 넣어 캔디 래퍼를 막기도 합니다."],
        ["게임", "발 맞추기", "계단·경사에서 발이 땅에 붙는 것은 매 프레임 바닥 높이를 재서 다리에 IK를 거는 '풋 IK'입니다."],
        ["실생활", "로봇 팔과 모션 캡처", "산업용 로봇 팔의 관절 제어가 IK이고, 모션 캡처는 배우의 마커 위치로 뼈 각도를 거꾸로 풉니다."]
      ] },

      { recap: [
        ["M_자식 = M_부모 · M_로컬", "FK: 행렬 사슬"],
        ["손끝 → 각도", "IK: 목표에서 거꾸로 풀기"],
        ["v' = Σ w_i M_i v", "선형 블렌드 스키닝: 굽히면 얇아짐"],
        ["회전을 섞기 (DQS)", "캔디 래퍼 방지, 부피 유지"]
      ] }
    ]
  });
})();
