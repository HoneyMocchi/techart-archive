/* 55 모턴(Z-order) 배치와 텍셀 메모리 */
(() => {
  const morton = (x, y) => { let m = 0; for (let b = 0; b < 8; b++) { m |= ((x >> b) & 1) << (2 * b); m |= ((y >> b) & 1) << (2 * b + 1); } return m; };
  const bin = (v, n) => v.toString(2).padStart(n, "0");

  lesson({
    topic: "morton", title: "모턴 순서와 텍셀 배치", desc: "2D를 1D 메모리에 가깝게", stage: "GPU 심화",
    sym: { x: "green", y: "red" },
    hook: "텍스처는 2D지만 메모리는 1D 줄입니다. 한 줄씩 저장하면(행 우선) ==위아래로 이웃한 텍셀이 메모리에서 멀리 떨어집니다==. GPU는 텍셀을 ==Z 모양(모턴 순서)으로 섞어 저장==해서, 화면의 작은 사각형이 읽는 텍셀들이 메모리에서도 가깝게 모이게 합니다.",
    blocks: [
      { h: "모턴 순서: x와 y의 비트를 번갈아 섞기" },
      "16×16 격자를 메모리 순서대로 이은 선입니다. 행 우선은 한 줄을 끝까지 갔다가 돌아오고, 모턴은 ==작은 Z를 그리며 2×2 → 4×4 → 8×8 덩어리를 차례로 채웁니다==. 흰 점을 끌어 그 칸의 번호가 어떻게 만들어지는지 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 34, y0: 0, y1: 17 },
        eq: ["x = {xb},  y = {yb}   →   모턴 = {mb} = {m}   (행 우선 = {r})"],
        setup(F, C, L) {
          let upto = 256;
          const P = [5, 9];
          F.handle({ color: "white", get: () => [0.5 + P[0] + 0.5, 0.5 + (15 - P[1]) + 0.5], set: (x, y) => { P[0] = clamp(Math.floor(x - 0.5), 0, 15); P[1] = clamp(15 - Math.floor(y - 0.5), 0, 15); } });
          C.slider({ label: "그린 순서 수", min: 2, max: 256, step: 1, value: upto, fmt: x => num(x, 0), onInput: x => { upto = x; } });
          const cell = (ox, i, j) => [ox + i + 0.5, 0.5 + (15 - j) + 0.5];
          F.draw = g => {
            [[0.5, "행 우선"], [17.5, "모턴 (Z 순서)"]].forEach(([ox, name], side) => {
              for (let i = 0; i <= 16; i++) { g.line([ox + i, 0.5], [ox + i, 16.5], "rgba(88,196,221,0.12)", { w: 1 }); g.line([ox, 0.5 + i], [ox + 16, 0.5 + i], "rgba(88,196,221,0.12)", { w: 1 }); }
              const order = [];
              for (let k = 0; k < 256; k++) order.push(side === 0 ? [k % 16, Math.floor(k / 16)] : (() => { let x = 0, y = 0; for (let b = 0; b < 4; b++) { x |= ((k >> (2 * b)) & 1) << b; y |= ((k >> (2 * b + 1)) & 1) << b; } return [x, y]; })());
              for (let k = 1; k < upto; k++) { const a = cell(ox, ...order[k - 1]), b = cell(ox, ...order[k]); g.line(a, b, `hsl(${k / 256 * 300},80%,60%)`, { w: 1.6 }); }
              g.text(name, [ox + 8, 16.6], "white", { size: 12, bold: true, base: "bottom" });
            });
            g.circle(cell(0.5, P[0], P[1]), 0.45, "white", { w: 2 }); g.circle(cell(17.5, P[0], P[1]), 0.45, "white", { w: 2 });
            const m = morton(P[0], P[1]);
            L.set("xb", bin(P[0], 4)); L.set("yb", bin(P[1], 4));
            const xb = bin(P[0], 4), yb = bin(P[1], 4); let mb = ""; for (let b = 0; b < 4; b++) mb += yb[b] + xb[b];
            L.set("mb", mb); L.set("m", m); L.set("r", P[1] * 16 + P[0]);
          };
        }
      } },
      { key: "모턴 번호는 ==y와 x의 비트를 한 자리씩 번갈아 끼워 넣은 수==입니다. 계산이 비트 연산뿐이라 하드웨어가 주소 변환을 공짜로 합니다." },

      { h: "캐시 줄이 몇 개나 필요한가" },
      "메모리는 64바이트(텍셀 16개) 단위 ==캐시 줄==로 읽힙니다. 같은 색 칸이 같은 캐시 줄입니다. 노란 사각형(화면의 픽셀 타일이 읽는 텍셀 영역)을 끌어 보세요. 행 우선은 세로로 길수록 줄 수가 늘고, 모턴은 ==어느 방향이든 비슷하게 적습니다==.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 34, y0: 0, y1: 17 },
        eq: ["읽는 텍셀 {n}개   →   캐시 줄: 행 우선 {a}개 · 모턴 {b}개"],
        setup(F, C, L) {
          let shape = "square";
          const P = [4, 5];
          F.handle({ color: "yellow", get: () => [0.5 + P[0], 0.5 + (16 - P[1])], set: (x, y) => { P[0] = clamp(Math.round(x - 0.5), 0, 15); P[1] = clamp(Math.round(16 - (y - 0.5)), 0, 15); } });
          C.seg({ options: [{ value: "square", label: "4×4 정사각형" }, { value: "row", label: "16×1 가로줄" }, { value: "col", label: "1×16 세로줄" }, { value: "diag", label: "2×8 세로 띠" }], value: shape, onChange: x => { shape = x; } });
          F.draw = g => {
            const [w, h] = { square: [4, 4], row: [16, 1], col: [1, 16], diag: [2, 8] }[shape];
            const x0 = clamp(P[0], 0, 16 - w), y0 = clamp(P[1], 0, 16 - h);
            const lineR = (i, j) => Math.floor((j * 16 + i) / 16), lineM = (i, j) => Math.floor(morton(i, j) / 16);
            const setA = new Set(), setB = new Set();
            for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) { setA.add(lineR(i, j)); setB.add(lineM(i, j)); }
            [[0.5, lineR, setA, "행 우선"], [17.5, lineM, setB, "모턴"]].forEach(([ox, fn, set, name]) => {
              for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
                const ln = fn(i, j), hit = set.has(ln);
                g.poly([[ox + i, 0.5 + (15 - j)], [ox + i + 1, 0.5 + (15 - j)], [ox + i + 1, 1.5 + (15 - j)], [ox + i, 1.5 + (15 - j)]], { fill: `hsla(${ln * 47 % 360},60%,${hit ? 55 : 30}%,${hit ? 0.95 : 0.35})`, stroke: "rgba(16,19,26,0.4)", w: 0.5 });
              }
              g.poly([[ox + x0, 0.5 + 16 - y0], [ox + x0 + w, 0.5 + 16 - y0], [ox + x0 + w, 0.5 + 16 - y0 - h], [ox + x0, 0.5 + 16 - y0 - h]], { stroke: "yellow", w: 2.5 });
              g.text(`${name}: ${set.size}줄`, [ox + 8, 16.6], "white", { size: 12, bold: true, base: "bottom" });
            });
            L.set("n", w * h); L.set("a", setA.size); L.set("b", setB.size);
          };
        }
      } },
      "픽셀 셰이더는 화면의 작은 사각형(2×2 쿼드, 8×8 타일) 단위로 실행되므로, 그 픽셀들이 읽는 텍셀도 ==작은 사각형 영역==입니다. 모턴 배치에서는 이 영역이 거의 항상 적은 캐시 줄에 들어갑니다(34장 캐시 그림과 같은 이야기).",

      { h: "텍스처가 아닌 곳의 모턴" },
      "모턴 번호로 점들을 정렬하면 ==2D 공간에서 가까운 점이 배열에서도 가깝게== 모입니다. 그래서 GPU에서 BVH를 빠르게 짓거나(35장), 파티클을 공간 순서로 정렬할 때 씁니다. 정렬된 순서대로 이은 선을 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["이웃한 두 점 사이 평균 거리: 입력 순서 {a}  ·  모턴 정렬 {b}"],
        setup(F, C, L) {
          let n = 120, sorted = true;
          C.slider({ label: "점 개수", min: 20, max: 400, step: 10, value: n, fmt: x => num(x, 0), onInput: x => { n = x; } });
          C.seg({ options: [{ value: 0, label: "입력 순서" }, { value: 1, label: "모턴 순서로 정렬" }], value: 1, onChange: x => { sorted = !!x; } });
          F.draw = g => {
            let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const pts = Array.from({ length: n }, () => [rnd() * 2, rnd()]);
            const key = p => morton(Math.floor(p[0] / 2 * 255), Math.floor(p[1] * 255));
            const ord = sorted ? pts.slice().sort((a, b) => key(a) - key(b)) : pts;
            const avg = arr => arr.slice(1).reduce((s, p, i) => s + V.len(V.sub(p, arr[i])), 0) / (arr.length - 1);
            g.poly(ord, { stroke: sorted ? "teal" : "rgba(252,98,85,0.6)", w: 1.2, close: false });
            ord.forEach((p, i) => g.dot(p, `hsl(${i / n * 300},80%,60%)`, 3.5));
            L.set("a", num(avg(pts), 3)); L.set("b", num(avg(pts.slice().sort((a, b) => key(a) - key(b))), 3));
          };
        }
      } },

      { use: [
        ["엔진", "텍스처 스위즐·타일링", "GPU 드라이버는 텍스처를 업로드할 때 자동으로 모턴·타일 배치로 바꿉니다(콘솔은 이 배치를 직접 다루기도 함). 그래서 CPU에서 텍스처를 직접 읽고 쓰는 것은 느립니다."],
        ["셰이더", "컴퓨트 셰이더 스레드 배치", "컴퓨트에서 스레드 ID를 2D로 바꿀 때 행 대신 모턴·타일 순서로 매핑하면 텍스처 읽기의 캐시 적중률이 올라갑니다."],
        ["엔진", "LBVH·공간 정렬", "GPU 레이트레이싱 가속 구조와 파티클 충돌의 공간 해시는 모턴 코드로 정렬한 뒤 짓습니다."],
        ["실생활", "지도 타일과 데이터베이스", "지도의 쿼드키(Quadkey)와 위치 데이터베이스의 지오해시가 같은 '비트 번갈아 섞기'입니다."]
      ] },

      { recap: [
        ["모턴 = y, x 비트를 번갈아 섞기", "Z 순서 곡선"],
        ["2D 이웃 ≈ 1D 이웃", "작은 사각형 읽기가 적은 캐시 줄에"],
        ["행 우선은 세로 읽기에 약함", "모턴은 방향에 둔감"],
        ["모턴 정렬", "BVH 생성·공간 정렬"]
      ] }
    ]
  });
})();
