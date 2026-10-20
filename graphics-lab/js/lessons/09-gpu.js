/* 09 GPU 파이프라인과 메모리 */
(() => {
  const STAGES = [
    { name: "정점 데이터", color: "grey", desc: "메모리에 놓인 꼭짓점 위치·UV·노멀 숫자들" },
    { name: "버텍스 셰이더", color: "green", desc: "꼭짓점마다 한 번: 행렬을 곱해 화면 위치로 (4·5장)" },
    { name: "래스터화", color: "teal", desc: "삼각형이 덮는 픽셀 찾기 + 값 보간 (6장) — 고정 하드웨어" },
    { name: "픽셀 셰이더", color: "yellow", desc: "픽셀마다 한 번: 텍스처를 읽고 조명 계산 (7·8장)" },
    { name: "출력 병합", color: "pink", desc: "깊이 테스트로 가려진 픽셀 버리기 + 블렌딩" }
  ];

  lesson({
    topic: "gpu", title: "GPU 파이프라인과 메모리", desc: "수천 개를 동시에", stage: "빛과 하드웨어",
    sym: {},
    hook: "지금까지 배운 계산을 ==수백만 개 꼭짓점과 픽셀에 동시에== 하는 기계가 GPU입니다. 빠른 이유와 느려지는 이유가 모두 이 '동시에'에서 나옵니다.",
    blocks: [
      { h: "삼각형 하나의 여행" },
      "단계를 하나씩 넘기거나 상자를 눌러 보세요. ==지금까지의 장들이 이 파이프라인의 어느 칸인지== 보입니다.",
      { fig: {
        aspect: 0.56, view: { x0: 0, x1: 10, y0: 0, y1: 5.6 },
        eq: ["{desc}"],
        setup(F, C, L) {
          let st = 0, k = 1;
          const go = s => { st = (s + STAGES.length) % STAGES.length; k = 0; F.tween(900, e => { k = e; }); };
          C.button("◀ 이전", () => go(st - 1));
          C.button("다음 ▶", () => go(st + 1));
          C.play();
          let acc = 0;
          F.loop(dt => { acc += dt; if (acc > 2.2) { acc = 0; go(st + 1); } });
          F.onTap = (p, sx, sy, moving) => { if (moving) return; if (p[1] > 4.3) go(clamp(Math.floor(p[0] / 2), 0, 4)); };
          const tri = [[-1, -0.8], [1.1, -0.5], [-0.1, 1.0]];
          const vc = [rgb("red"), rgb("green"), rgb("blue")];
          F.draw = g => {
            STAGES.forEach((s, i) => {
              const x0 = i * 2 + 0.1, on = i === st;
              g.poly([[x0, 4.4], [x0 + 1.8, 4.4], [x0 + 1.8, 5.4], [x0, 5.4]], { fill: on ? hexA(PAL[s.color] || PAL.grey, 0.3) : "rgba(236,239,244,0.04)", stroke: on ? s.color : "rgba(236,239,244,0.2)", w: on ? 2.5 : 1 });
              g.text(s.name, [x0 + 0.9, 4.9], on ? "white" : "grey", { size: 13, bold: on });
              if (i < 4) g.arrow([x0 + 1.82, 4.9], [x0 + 2.08, 4.9], "grey", { w: 1.5, head: 6 });
            });
            // 아래: 현재 단계의 데이터 모습 (중심 (5, 2), 1단위 = 1.4)
            const O = [5, 2.05], S = 1.35;
            const W = p => [O[0] + p[0] * S, O[1] + p[1] * S];
            const ang = st >= 1 ? 0.35 * (st === 1 ? k : 1) : 0;
            const sc = st >= 1 ? 1 + 0.25 * (st === 1 ? k : 1) : 1;
            const T = tri.map(p => V.mul(V.rot(p, ang), sc));
            const edge = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
            if (st === 0) {
              tri.forEach((p, i) => { g.dot(W(p), "white", 5); g.text(`(${num(p[0], 1)}, ${num(p[1], 1)})`, W(p), "grey", { dy: -14, size: 12 }); });
              g.text("숫자 목록일 뿐, 아직 화면과 무관", [5, 0.25], "grey", { size: 13 });
            } else if (st === 1) {
              g.poly(T.map(W), { stroke: "green", w: 2 });
              T.forEach(p => g.dot(W(p), "green", 5));
              g.text("꼭짓점 3개 → 3번 실행 (동시에)", [5, 0.25], "green", { size: 13 });
            } else {
              const px = 0.22, cov = [];
              for (let i = -12; i <= 12; i++) for (let j = -7; j <= 8; j++) {
                const c = [i * px + px / 2, j * px + px / 2];
                const w = [edge(T[1], T[2], c), edge(T[2], T[0], c), edge(T[0], T[1], c)];
                const area = edge(T[0], T[1], T[2]);
                if (w.every(v => v >= 0)) cov.push([c, w.map(v => v / area)]);
              }
              const shown = st === 2 ? Math.floor(cov.length * k) : cov.length;
              cov.slice(0, shown).forEach(([c, w], n) => {
                let fill = "rgba(92,208,179,0.55)";
                if (st >= 3) {
                  const m = n < cov.length * (st === 3 ? k : 1) ? 1 : 0;
                  const cc = [0, 1, 2].map(ch => w[0] * vc[0][ch] + w[1] * vc[1][ch] + w[2] * vc[2][ch]);
                  fill = m ? `rgb(${cc.map(v => v | 0).join(",")})` : fill;
                }
                const a = W([c[0] - px / 2, c[1] - px / 2]), b = W([c[0] + px / 2, c[1] + px / 2]);
                g.poly([a, [b[0], a[1]], b, [a[0], b[1]]], { fill });
              });
              if (st === 4) {
                const occ = [[0.1, -0.9], [1.6, -0.9], [1.6, 0.6], [0.1, 0.6]];
                g.poly(occ.map(W), { fill: hexA(PAL.pink, 0.35 + 0.5 * k), stroke: "pink", w: 2 });
                g.text("더 가까운 물체 → 뒤쪽 픽셀은 깊이 테스트에서 버려짐", [5, 0.25], "pink", { size: 13 });
              } else g.text(st === 2 ? `덮인 픽셀 ${cov.length}개 찾기` : `픽셀 ${cov.length}개 → ${cov.length}번 실행 (동시에)`, [5, 0.25], st === 2 ? "teal" : "yellow", { size: 13 });
              g.poly(T.map(W), { stroke: "white", w: 1.5, alpha: 0.6 });
            }
            L.set("desc", `${STAGES[st].name}: ${STAGES[st].desc}`);
          };
        }
      } },
      { key: "꼭짓점 수만큼 버텍스 셰이더가, ==덮인 픽셀 수만큼 픽셀 셰이더가== 실행됩니다. 화면이 4K면 픽셀 셰이더는 한 프레임에 800만 번 넘게 돕니다." },

      { h: "한 번에 하나 vs 한꺼번에" },
      "같은 화면을 칠하는 두 방식입니다. CPU 코어는 아주 빠른 일꾼 몇 명, GPU는 ==느긋하지만 수천 명이 같은 일을 동시에== 하는 일꾼입니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 20, y0: 0, y1: 8.4 },
        eq: ["CPU {c} / 288       GPU {g} / 288"],
        setup(F, C, L) {
          let cpu = 0, gpu = 0, lanes = 32;
          C.play(true);
          C.button("↺ 다시", () => { cpu = 0; gpu = 0; });
          C.slider({ label: "GPU 동시 처리 수", min: 4, max: 96, step: 4, value: lanes, fmt: x => num(x, 0), onInput: x => { lanes = x; } });
          let acc = 0;
          F.loop(dt => {
            acc += dt;
            while (acc > 0.05) { acc -= 0.05; cpu = Math.min(288, cpu + 1.5); gpu = Math.min(288, gpu + lanes * 0.2); }
            if (cpu >= 288 && gpu >= 288) { cpu = 0; gpu = 0; }
          });
          F.draw = g => {
            const grid = (ox, n, color, label) => {
              for (let i = 0; i < 288; i++) {
                const x = ox + (i % 24) * 0.37, y = 7.2 - Math.floor(i / 24) * 0.55;
                g.poly([[x, y], [x + 0.32, y], [x + 0.32, y + 0.48], [x, y + 0.48]], { fill: i < n ? color : "rgba(236,239,244,0.07)" });
              }
              g.text(label, [ox + 4.4, 7.95], "white", { size: 13, bold: true });
            };
            grid(0.4, Math.floor(cpu), PAL.blue, "CPU (코어 1개, 한 픽셀씩)");
            grid(10.6, Math.floor(gpu), PAL.yellow, "GPU (여러 개씩 한꺼번에)");
            L.set("c", Math.floor(cpu)); L.set("g", Math.floor(gpu));
          };
        }
      } },

      { h: "워프와 분기: 같이 움직이는 32명" },
      "GPU는 픽셀 32개(또는 64개)를 한 묶음(워프)으로 ==같은 명령을 동시에== 실행합니다. 묶음 안에서 `if`의 결과가 갈리면 두 갈래를 ==차례로 모두== 실행하고, 해당 없는 칸은 놀립니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 20, y0: 0, y1: 8.4 },
        eq: ["실행 시간 = {t} 칸   (모두 같은 길이면 {t0} 칸)   일하는 비율 {eff}%"],
        setup(F, C, L) {
          let k = 12, sorted = true;
          const A = 4, B = 6;
          C.slider({ label: "if가 참인 픽셀 수", min: 0, max: 32, step: 1, value: k, fmt: x => num(x, 0) + " / 32", onInput: x => { k = x; } });
          C.seg({ options: [{ value: 1, label: "참인 픽셀이 한쪽에 모임" }, { value: 0, label: "흩어짐" }], value: 1, onChange: x => { sorted = !!x; } });
          F.draw = g => {
            const isTrue = i => sorted ? i < k : ((i * 13) % 32) < k;
            const anyT = k > 0, anyF = k < 32;
            const t = (anyT ? A : 0) + (anyF ? B : 0), t0 = anyT && !anyF ? A : !anyT ? B : Math.max(A, B);
            const cw = 17.4 / 32, rh = 0.55, top = 7.2;
            for (let i = 0; i < 32; i++) {
              const x = 2.2 + i * cw;
              g.poly([[x, top + 0.2], [x + cw * 0.85, top + 0.2], [x + cw * 0.85, top + 0.75], [x, top + 0.75]], { fill: isTrue(i) ? PAL.teal : PAL.orange });
              let row = 0;
              if (anyT) for (let r = 0; r < A; r++, row++) {
                const y = top - (row + 1) * rh;
                g.poly([[x, y], [x + cw * 0.85, y], [x + cw * 0.85, y + rh * 0.85], [x, y + rh * 0.85]], { fill: isTrue(i) ? hexA(PAL.teal, 0.85) : "rgba(236,239,244,0.06)" });
              }
              if (anyF) for (let r = 0; r < B; r++, row++) {
                const y = top - (row + 1) * rh;
                g.poly([[x, y], [x + cw * 0.85, y], [x + cw * 0.85, y + rh * 0.85], [x, y + rh * 0.85]], { fill: !isTrue(i) ? hexA(PAL.orange, 0.85) : "rgba(236,239,244,0.06)" });
              }
            }
            g.text("픽셀 32개 (한 워프)", [10.9, 8.15], "white", { size: 12, bold: true });
            if (anyT) g.text("if 쪽", [2, top - A * rh / 2], "teal", { size: 12, bold: true, align: "right" });
            if (anyF) g.text("else 쪽", [2, top - (anyT ? A : 0) * rh - B * rh / 2], "orange", { size: 12, bold: true, align: "right" });
            const busy = (anyT ? A * k : 0) + (anyF ? B * (32 - k) : 0);
            L.set("t", t); L.set("t0", t0); L.set("eff", num(busy / (t * 32) * 100, 0));
          };
        }
      } },
      "참·거짓이 ==워프 안에서 섞이면 두 갈래 시간을 다 냅니다==. 그래서 셰이더의 분기는 '화면에서 이웃한 픽셀끼리 같은 쪽으로 가는가'가 중요합니다. 흩어짐으로 바꿔도 시간은 같지만, 실제로는 이웃 픽셀이 같은 워프에 묶이므로 경계가 적을수록 유리합니다.",

      { h: "메모리 대역폭: 숫자로 느껴 보기" },
      "픽셀 셰이더가 빨라도 ==결과를 메모리에 쓰는 양==에 한계가 있습니다. 화면 크기, 같은 픽셀을 몇 번 덮어 그리는지(오버드로), 픽셀당 바이트, 그리고 한 프레임에 화면 전체를 몇 번 그리는지(G버퍼·조명·후처리 패스)를 바꿔 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 20, y0: 0, y1: 8.4 },
        eq: ["{w} × {h} × {od} × {bpp} B × {ps} 패스 × {fps} fps = {gbs} GB/s"],
        setup(F, C, L) {
          let res = [1920, 1080], od = 2.5, bpp = 8, fps = 60, passes = 10;
          C.seg({ options: [{ value: "720", label: "720p" }, { value: "1080", label: "1080p" }, { value: "1440", label: "1440p" }, { value: "2160", label: "4K" }], value: "1080", onChange: x => { res = { 720: [1280, 720], 1080: [1920, 1080], 1440: [2560, 1440], 2160: [3840, 2160] }[x]; } });
          C.slider({ label: "오버드로", min: 1, max: 8, step: 0.1, value: od, fmt: x => "×" + num(x, 1), onInput: x => { od = x; } });
          C.seg({ options: [{ value: 4, label: "RGBA8 (4B)" }, { value: 8, label: "+깊이 (8B)" }, { value: 20, label: "G버퍼 (20B)" }], value: 8, onChange: x => { bpp = x; } });
          C.slider({ label: "fps", min: 30, max: 240, step: 10, value: fps, fmt: x => num(x, 0), onInput: x => { fps = x; } });
          C.slider({ label: "화면 전체 패스 수", min: 1, max: 30, step: 1, value: passes, fmt: x => num(x, 0), onInput: x => { passes = x; } });
          F.draw = g => {
            const gbs = res[0] * res[1] * od * bpp * fps * passes / 1e9;
            // 왼쪽: 겹쳐 그린 층
            const layers = Math.ceil(od);
            for (let i = layers - 1; i >= 0; i--) {
              const a = i === layers - 1 ? od - Math.floor(od) || 1 : 1;
              const x = 0.8 + i * 0.35, y = 1.2 + i * 0.35;
              g.poly([[x, y], [x + 6.4, y], [x + 6.4, y + 3.6], [x, y + 3.6]], { fill: hexA(PAL.yellow, 0.1 + 0.08 * a), stroke: hexA(PAL.yellow, 0.6 * a), w: 1.5 });
            }
            g.text(`같은 픽셀을 ${num(od, 1)}번 덮어 그림`, [4.4, 0.6], "yellow", { size: 12, bold: true });
            // 오른쪽: 대역폭 막대 (참고: 중급 GPU 약 450 GB/s)
            const max = 900, bx = 11, bw = 8, by = 2.2;
            g.poly([[bx, by], [bx + bw, by], [bx + bw, by + 1.4], [bx, by + 1.4]], { stroke: "rgba(236,239,244,0.3)", w: 1 });
            const frac = Math.min(1, gbs / max);
            g.poly([[bx, by], [bx + bw * frac, by], [bx + bw * frac, by + 1.4], [bx, by + 1.4]], { fill: gbs > 450 ? PAL.red : gbs > 225 ? PAL.orange : PAL.green });
            const ref = bx + bw * 450 / max;
            g.line([ref, by - 0.3], [ref, by + 1.7], "white", { w: 2, dash: [4, 4] });
            g.text("중급 GPU 전체 대역폭 ≈ 450 GB/s", [ref, by + 2.1], "white", { size: 12 });
            g.text(num(gbs, 1) + " GB/s (쓰기만, 읽기 제외)", [bx + bw / 2, by - 0.7], "white", { size: 15, bold: true });
            L.set("w", res[0]); L.set("h", res[1]); L.set("od", num(od, 1)); L.set("bpp", bpp); L.set("fps", fps); L.set("ps", passes); L.set("gbs", num(gbs, 1));
          };
        }
      } },
      "여기에 텍스처 읽기까지 더해지면 대역폭은 금방 바닥납니다. ==오버드로 줄이기(앞에서 뒤로 그리기, 깊이 프리패스), 작은 픽셀 포맷, 압축 텍스처==가 최적화의 단골인 이유입니다.",

      { h: "캐시: 이웃끼리 읽으면 빠르다" },
      "텍스처는 ==작은 타일 단위로 캐시에 올라옵니다==. 픽셀들이 이웃한 텍셀을 차례로 읽으면 이미 올라온 타일을 재사용(적중)하고, 무작위로 읽으면 매번 메모리까지 다녀옵니다(실패).",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 20, y0: 0, y1: 8.4 },
        eq: ["캐시 적중률 = {hit}%   (캐시 칸 {n}개)"],
        setup(F, C, L) {
          let pattern = "near", cacheN = 4;
          let step = 0, hits = 0, total = 0, cache = [], recent = [];
          const reset = () => { step = 0; hits = 0; total = 0; cache = []; recent = []; };
          C.play(true);
          C.seg({ options: [{ value: "near", label: "이웃끼리 (일반 UV)" }, { value: "rand", label: "무작위 (노이즈 UV)" }], value: pattern, onChange: x => { pattern = x; reset(); } });
          C.slider({ label: "캐시 칸 수", min: 1, max: 12, step: 1, value: cacheN, fmt: x => num(x, 0), onInput: x => { cacheN = x; reset(); } });
          let seed = 3;
          const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          let acc = 0;
          F.loop(dt => {
            acc += dt;
            while (acc > 0.06) {
              acc -= 0.06;
              let tx, ty;
              if (pattern === "near") { const i = step % 256; ty = Math.floor(i / 16); tx = ty % 2 ? 15 - (i % 16) : i % 16; }
              else { tx = Math.floor(rnd() * 16); ty = Math.floor(rnd() * 16); }
              const tile = Math.floor(tx / 4) + Math.floor(ty / 4) * 4;
              const hit = cache.includes(tile);
              if (hit) { hits++; cache.splice(cache.indexOf(tile), 1); }
              cache.push(tile);
              if (cache.length > cacheN) cache.shift();
              total++; step++;
              recent.push([tx, ty, hit]); if (recent.length > 24) recent.shift();
              if (total > 400) { hits = Math.round(hits / 2); total = Math.round(total / 2); }
            }
          });
          F.draw = g => {
            const cs = 0.46, ox = 1, oy = 0.6;
            for (let tx = 0; tx < 16; tx++) for (let ty = 0; ty < 16; ty++) {
              const tile = Math.floor(tx / 4) + Math.floor(ty / 4) * 4;
              const inC = cache.includes(tile);
              const x = ox + tx * cs, y = oy + (15 - ty) * cs;
              g.poly([[x, y], [x + cs * 0.9, y], [x + cs * 0.9, y + cs * 0.9], [x, y + cs * 0.9]], { fill: inC ? "rgba(92,208,179,0.35)" : ((Math.floor(tx / 4) + Math.floor(ty / 4)) % 2 ? "rgba(236,239,244,0.08)" : "rgba(236,239,244,0.04)") });
            }
            recent.forEach(([tx, ty, hit], i) => {
              const a = (i + 1) / recent.length;
              g.dot([ox + (tx + 0.45) * cs, oy + (15 - ty + 0.45) * cs], hexA(hit ? PAL.green : PAL.red, a), 3 + 3 * a);
            });
            g.text("텍스처 16×16 (4×4 타일)", [ox + 3.7, 8.15], "white", { size: 12, bold: true });
            g.text("● 적중  ● 실패", [ox + 3.7, 0.25], "grey", { size: 12 });
            // 오른쪽: 캐시 칸
            g.text("캐시", [13.5, 8.15], "white", { size: 12, bold: true });
            for (let i = 0; i < cacheN; i++) {
              const x = 10.5 + (i % 6) * 1.5, y = 6.2 - Math.floor(i / 6) * 1.6;
              g.poly([[x, y], [x + 1.2, y], [x + 1.2, y + 1.2], [x, y + 1.2]], { fill: cache[i] !== undefined ? "rgba(92,208,179,0.4)" : "rgba(236,239,244,0.05)", stroke: "rgba(236,239,244,0.3)", w: 1 });
              if (cache[i] !== undefined) g.text("타일 " + cache[i], [x + 0.6, y + 0.6], "white", { size: 11 });
            }
            const rate = total ? hits / total : 0;
            g.poly([[10.5, 1.4], [19.4, 1.4], [19.4, 2.2], [10.5, 2.2]], { stroke: "rgba(236,239,244,0.3)", w: 1 });
            g.poly([[10.5, 1.4], [10.5 + 8.9 * rate, 1.4], [10.5 + 8.9 * rate, 2.2], [10.5, 2.2]], { fill: rate > 0.7 ? PAL.green : rate > 0.3 ? PAL.orange : PAL.red });
            L.set("hit", num(rate * 100, 0)); L.set("n", cacheN);
          };
        }
      } },
      "이웃끼리 읽으면 캐시가 1칸뿐이어도 ==대부분 적중==하지만, 무작위로 읽으면 캐시를 늘려도 잘 맞지 않습니다. 7장의 밉맵이 성능에도 도움이 되는 이유가 이것입니다 — 멀리 있는 픽셀들이 작은 밉맵의 ==가까운 텍셀을 함께== 읽게 되니까요.",

      { recap: [
        ["정점 → VS → 래스터 → PS → 병합", "꼭짓점 수만큼 VS, 덮인 픽셀 수만큼 PS"],
        ["워프 = 32~64개 동시 실행", "분기가 섞이면 두 갈래를 모두 실행"],
        ["픽셀 × 오버드로 × 바이트 × 패스 × fps", "쓰기 대역폭, 오버드로를 줄일 것"],
        ["이웃 텍셀 = 캐시 적중", "무작위 접근은 느림, 밉맵이 도움"]
      ] }
    ]
  });
})();
