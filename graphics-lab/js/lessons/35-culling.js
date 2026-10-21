/* 27 컬링과 공간 분할 */
(() => {
  const f0 = n => num(n, 0);
  let seed0 = 3;
  const rnd0 = () => (seed0 = (seed0 * 16807) % 2147483647) / 2147483647;
  const OBJS = [];
  for (let i = 0; i < 70; i++) OBJS.push([lerp(-4, 4, rnd0()), lerp(-2.1, 2.1, rnd0()), lerp(0.08, 0.22, rnd0())]);

  lesson({
    topic: "culling", title: "컬링과 공간 분할", desc: "안 보이는 건 그리지 않기", stage: "하드웨어와 성능",
    sym: { n: "teal", d: "yellow", r: "gold" },
    hook: "가장 빠른 그리기는 ==안 그리는 것==입니다. 화면 밖, 다른 물체 뒤, 너무 작은 것을 빨리 걸러내는 기술과, 수많은 물체 중 필요한 것만 빨리 찾는 자료구조를 봅니다.",
    blocks: [
      { h: "프러스텀 컬링: 시야 밖은 버린다" },
      "위에서 본 카메라 시야(사다리꼴)입니다. 물체마다 감싸는 원(바운딩 스피어)이 ==시야의 네 평면 중 하나라도 완전히 바깥==이면 그리지 않습니다. 카메라와 시선을 움직여 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["바깥쪽 노멀 n에 대해 n·c + d > r 이면 밖   →   그림 {draw}개 / 버림 {cull}개"],
        setup(F, C, L) {
          const cam = [-3.2, -1.4], aim = [1, 0.5];
          let fov = 60, far = 5;
          F.vec(cam, "white", { snap: 0.01 });
          F.vec(aim, "yellow", { base: () => cam, constrain: q => V.mul(V.norm(q), 0.8), snap: 0.001 });
          C.slider({ label: "FOV", min: 20, max: 120, step: 1, value: fov, fmt: x => x + "°", onInput: x => { fov = x; } });
          C.slider({ label: "먼 평면", min: 1.5, max: 8, value: far, onInput: x => { far = x; } });
          F.draw = g => {
            const f = V.norm(aim), h = fov * DEG / 2, near = 0.3;
            const lN = V.rot(f, h + Math.PI / 2), rN = V.rot(f, -h - Math.PI / 2);          // 바깥쪽 노멀
            const planes = [[V.mul(f, -1), near], [f, -far], [lN, 0], [rN, 0]];            // [n, 원점(카메라) 기준 거리]
            const corner = (s, dist) => V.add(cam, V.mul(V.rot(f, s * h), dist / Math.cos(h)));
            g.poly([corner(1, near), corner(1, far), corner(-1, far), corner(-1, near)], { fill: "rgba(244,211,69,0.08)", stroke: "rgba(244,211,69,0.6)", w: 1.5 });
            let draw = 0, cull = 0;
            OBJS.forEach(([x, y, r]) => {
              const c = V.sub([x, y], cam);
              const out = planes.some(([n, d]) => V.dot(n, c) + d > r);
              if (out) cull++; else draw++;
              g.circle([x, y], r, out ? "grey" : "teal", { fill: out ? "rgba(138,147,166,0.15)" : "rgba(92,208,179,0.65)", w: 1.5, alpha: out ? 0.6 : 1 });
            });
            g.circle(cam, 0.13, "white", { fill: PAL.bg, w: 2.5 });
            L.set("draw", draw); L.set("cull", cull);
          };
        }
      } },
      "검사는 물체 하나당 내적 몇 번이라 매우 쌉니다. 그래도 물체가 수십만 개면 하나씩 검사하는 것조차 부담이라, 다음처럼 ==공간을 묶어서 한 번에 버립니다==.",

      { h: "BVH: 묶어서 한꺼번에 버리기" },
      "물체들을 상자로 감싸고, 상자를 둘로 나누고, 또 나눈 나무(BVH)입니다. 광선(노란 화살표)을 끌어 보세요. ==상자에 안 맞으면 그 안의 물체는 검사조차 안 합니다==. 방문한 상자만 밝게 보입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["검사한 상자 {nb}개 + 물체 {no}개   vs   하나씩: 물체 {all}개"],
        setup(F, C, L) {
          const O = [-4, 1.6], aim = [1, -0.35];
          let depthShow = 3;
          F.vec(O, "white", { snap: 0.01 });
          F.vec(aim, "yellow", { base: () => O, constrain: q => V.mul(V.norm(q), 1), snap: 0.001 });
          C.slider({ label: "보여 줄 깊이", min: 0, max: 7, step: 1, value: depthShow, fmt: f0, onInput: x => { depthShow = x; } });
          const items = OBJS.map(([x, y, r], i) => ({ i, c: [x, y], r }));
          const bound = list => { const b = [[Infinity, Infinity], [-Infinity, -Infinity]]; list.forEach(o => { b[0][0] = Math.min(b[0][0], o.c[0] - o.r); b[0][1] = Math.min(b[0][1], o.c[1] - o.r); b[1][0] = Math.max(b[1][0], o.c[0] + o.r); b[1][1] = Math.max(b[1][1], o.c[1] + o.r); }); return b; };
          function build(list, depth) {
            const b = bound(list);
            if (list.length <= 2) return { b, list, depth };
            const ax = (b[1][0] - b[0][0]) > (b[1][1] - b[0][1]) ? 0 : 1;
            const s = list.slice().sort((p, q) => p.c[ax] - q.c[ax]), m = s.length >> 1;
            return { b, depth, kids: [build(s.slice(0, m), depth + 1), build(s.slice(m), depth + 1)] };
          }
          const root = build(items, 0);
          const rayBox = (o, d, b) => { let t0 = 0, t1 = 99; for (let k = 0; k < 2; k++) { if (Math.abs(d[k]) < 1e-9) { if (o[k] < b[0][k] || o[k] > b[1][k]) return false; continue; } let a = (b[0][k] - o[k]) / d[k], c = (b[1][k] - o[k]) / d[k]; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return false; } return true; };
          const rayCirc = (o, d, c, r) => { const oc = V.sub(o, c), b = V.dot(oc, d), cc = V.dot(oc, oc) - r * r, disc = b * b - cc; return disc >= 0 && -b + Math.sqrt(disc) > 0; };
          F.draw = g => {
            const d = V.norm(aim);
            let nb = 0, no = 0; const visited = new Set(), hits = new Set();
            (function walk(n) {
              nb++; if (!rayBox(O, d, n.b)) return; visited.add(n);
              if (n.list) n.list.forEach(o => { no++; if (rayCirc(O, d, o.c, o.r)) hits.add(o.i); });
              else n.kids.forEach(walk);
            })(root);
            (function drawNode(n) {
              if (n.depth <= depthShow) {
                const on = visited.has(n), b = n.b;
                g.poly([b[0], [b[1][0], b[0][1]], b[1], [b[0][0], b[1][1]]], { stroke: on ? "orange" : "rgba(236,239,244,0.18)", w: on ? 2 : 1, fill: on ? "rgba(255,134,47,0.05)" : null });
              }
              if (n.kids) n.kids.forEach(drawNode);
            })(root);
            items.forEach(o => g.circle(o.c, o.r, hits.has(o.i) ? "pink" : "teal", { fill: hits.has(o.i) ? "rgba(227,111,200,0.8)" : "rgba(92,208,179,0.4)", w: 1.2 }));
            g.arrow(O, V.add(O, V.mul(d, 9)), "yellow", { w: 2.5 });
            L.set("nb", nb); L.set("no", no); L.set("all", items.length);
          };
        }
      } },
      { key: "나무 구조 덕분에 검사 횟수가 ==물체 수 $N$에서 대략 $log N$== 수준으로 줄어듭니다. 레이 트레이싱 하드웨어는 바로 이 BVH 순회를 전용 회로로 합니다." },

      { h: "LOD: 작게 보이면 대충 그린다" },
      "멀리 있는 물체는 화면에서 몇 픽셀밖에 안 됩니다. ==화면에 차지하는 크기에 맞춰 폴리곤 수를 줄인 모델==(LOD)로 바꿔 그립니다. 거리를 바꿔 보세요. 오른쪽은 실제로 화면에 보이는 크기입니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["화면 크기 ≈ 반지름 / 거리 = {sz}   →   LOD {lod}: 삼각형 {tri}개"],
        setup(F, C, L) {
          let dist = 3;
          C.slider({ label: "거리", min: 1, max: 40, value: dist, fmt: x => num(x, 1), onInput: x => { dist = x; } });
          C.play();
          F.loop((dt, t) => { dist = 20.5 - 19.5 * Math.cos(t * 0.5); });
          const LODS = [64, 32, 16, 8, 5];
          F.draw = g => {
            const sz = 1 / dist, lod = sz > 0.4 ? 0 : sz > 0.18 ? 1 : sz > 0.08 ? 2 : sz > 0.04 ? 3 : 4, seg = LODS[lod];
            const ring = (cx, cy, R, segs, color, scaleX) => { const pts = []; for (let i = 0; i < segs; i++) { const a = i / segs * TAU; pts.push([cx + Math.cos(a) * R * scaleX, cy + Math.sin(a) * R]); } g.poly(pts, { stroke: color, w: 1.5, fill: "rgba(92,208,179,0.15)" }); pts.forEach(p => g.line([cx, cy], p, color, { w: 0.6, alpha: 0.5 })); };
            ring(2.3, 2.15, 1.6, seg, ["teal", "green", "yellow", "orange", "red"][lod], 1);
            g.text("LOD " + lod + " 모델", [2.3, 0.25], "white", { size: 12, bold: true });
            const R = 1.6 * Math.min(1, 1 / dist * 2.5);
            ring(7.2, 2.1, Math.max(0.03, R), seg, ["teal", "green", "yellow", "orange", "red"][lod], 1);
            g.text("화면에 보이는 크기", [7.2, 0.25], "grey", { size: 12 });
            L.set("sz", num(sz, 3)); L.set("lod", lod); L.set("tri", seg);
          };
        }
      } },
      "작게 보이는 물체에 촘촘한 삼각형을 쓰면 9장의 ==2×2 쿼드 낭비==도 커집니다. UE5의 나나이트는 이 LOD 선택을 클러스터 단위로 자동·연속적으로 합니다.",

      { use: [
        ["엔진", "가시성 컬링", "UE는 프러스텀 컬링 후 하드웨어 오클루전 쿼리·HZB(계층 깊이 버퍼)로 가려진 물체까지 걸러냅니다. `stat initviews`로 걸러진 수를 볼 수 있습니다."],
        ["엔진", "HLOD와 나나이트", "멀리 있는 건물 묶음은 HLOD로 합쳐 하나로 그리고, 나나이트는 화면 픽셀 크기에 맞춰 클러스터 LOD를 고릅니다."],
        ["게임", "물리·충돌 검색", "총알 판정, 근처 적 찾기도 BVH·격자·옥트리 같은 공간 분할로 후보를 좁힌 뒤 정밀 검사합니다."],
        ["실생활", "지도 검색과 데이터베이스", "'내 주변 맛집' 검색은 공간 인덱스(R-트리·쿼드트리)로 지도 전체를 뒤지지 않고 근처만 봅니다."]
      ] },

      { recap: [
        ["n·c + d > r", "구가 평면 바깥이면 버림 (프러스텀 컬링)"],
        ["BVH", "상자로 묶어 한꺼번에 버림, 검사 ≈ log N"],
        ["화면 크기 ≈ 반지름 / 거리", "LOD 선택 기준"],
        ["안 그리기 > 빨리 그리기", "최적화의 첫 질문"]
      ] }
    ]
  });
})();
