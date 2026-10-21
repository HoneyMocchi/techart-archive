/* 39 노멀 맵 베이킹 */
(() => {
  const f2 = n => num(n, 2);
  // 하이폴리 단면: 완만한 바탕 + 볼트·홈 디테일
  const high = x => 0.25 * Math.sin(x * 0.9) + (Math.abs(x + 1.4) < 0.35 ? 0.28 * Math.cos((x + 1.4) / 0.35 * Math.PI / 2) : 0) - (Math.abs(x - 1.2) < 0.25 ? 0.22 : 0) + 0.05 * Math.sin(x * 9);
  const highN = x => { const e = 0.005, d = (high(x + e) - high(x - e)) / (2 * e); return V.norm([-d, 1]); };

  lesson({
    topic: "baking", title: "노멀 맵 베이킹", desc: "하이폴리 디테일을 로우폴리로", stage: "테크아트 실전",
    sym: { N: "yellow", d: "orange" },
    hook: "수백만 폴리곤 조각의 디테일을 게임용 저폴리 모델에 옮기는 것이 베이킹입니다. 저폴리 표면의 픽셀마다 ==노멀 방향으로 광선을 쏴서 하이폴리 표면을 찾고, 거기의 노멀을 기록==합니다. 광선 거리(케이지) 설정 하나에 결과가 갈립니다.",
    blocks: [
      { h: "광선으로 하이폴리 찾기" },
      "옆에서 본 단면입니다. 흰 선이 하이폴리, 청록 선이 로우폴리입니다. 로우폴리의 각 점에서 ==앞뒤로 정해진 거리만큼== 광선을 쏴서 하이폴리와 만나는 곳의 노멀을 아래 띠(노멀 맵)에 기록합니다. 광선 거리를 줄였다 늘려 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -3.2, x1: 3.2, y0: -1.6, y1: 1.6 },
        eq: ["{msg}"],
        setup(F, C, L) {
          let dist = 0.45, other = true;
          C.slider({ label: "광선 거리 (케이지)", min: 0.05, max: 1.4, value: dist, onInput: x => { dist = x; } });
          C.seg({ options: [{ value: 1, label: "옆에 다른 부품 있음" }, { value: 0, label: "없음" }], value: 1, onChange: x => { other = !!x; } });
          const low = x => 0.25 * Math.sin(x * 0.9);
          F.draw = g => {
            const pts = []; for (let x = -3.2; x <= 3.2; x += 0.01) pts.push([x, high(x)]);
            g.poly(pts, { stroke: "white", w: 2, close: false });
            if (other) g.poly([[-0.4, 0.75], [0.5, 0.75], [0.5, 1.05], [-0.4, 1.05]], { fill: "rgba(177,137,198,0.4)", stroke: "purple", w: 1.5 });
            const lp = []; for (let x = -3.2; x <= 3.2; x += 0.05) lp.push([x, low(x)]);
            g.poly(lp, { stroke: "teal", w: 2.5, close: false });
            g.poly(lp.map(p => [p[0], p[1] + dist]), { stroke: "orange", w: 1, close: false, dash: [4, 4] });
            g.poly(lp.map(p => [p[0], p[1] - dist]), { stroke: "orange", w: 1, close: false, dash: [4, 4] });
            let miss = 0, wrong = 0;
            const strip = [];
            for (let k = 0; k < 64; k++) {
              const x = -3.1 + k * 6.2 / 63, y0 = low(x), n = V.norm([-0.225 * Math.cos(x * 0.9), 1]);
              const start = [x + n[0] * dist, y0 + n[1] * dist];
              let hitN = null, hitP = null;
              for (let t = 0; t <= 2 * dist; t += 0.01) {
                const p = V.sub(start, V.mul(n, t));
                if (other && p[0] > -0.4 && p[0] < 0.5 && p[1] > 0.75 && p[1] < 1.05) { hitP = p; hitN = [0, 1]; wrong++; break; }
                if (p[1] <= high(p[0])) { hitP = p; hitN = highN(p[0]); break; }
              }
              if (!hitN) miss++;
              strip.push(hitN);
              if (k % 3 === 0) g.line(start, hitP || V.sub(start, V.mul(n, 2 * dist)), hitN ? (hitN[1] === 1 && hitN[0] === 0 && other && hitP[1] > 0.7 ? "red" : "yellow") : "red", { w: 1, alpha: 0.7 });
            }
            strip.forEach((n, k) => {
              const x = -3.1 + k * 6.2 / 63, c = n ? [(n[0] * 0.5 + 0.5) * 255, 128, (n[1] * 0.5 + 0.5) * 255] : [255, 0, 255];
              g.poly([[x - 0.05, -1.55], [x + 0.05, -1.55], [x + 0.05, -1.25], [x - 0.05, -1.25]], { fill: `rgb(${c.map(v => Math.round(v)).join(",")})` });
            });
            g.text("구운 노멀 맵 (분홍 = 못 찾음)", [-3.1, -1.25], "grey", { size: 11, align: "left", dy: -8 });
            L.set("msg", miss > 2 ? `거리가 짧아 ${miss}곳에서 하이폴리를 못 찾음 → 구멍(보통 분홍·검정)` : wrong > 0 ? `거리가 길어 옆 부품을 ${wrong}번 찍음 → 엉뚱한 디테일이 섞임` : "모든 점이 자기 하이폴리를 찾음");
          };
        }
      } },
      { key: "광선 거리는 ==하이폴리를 다 덮을 만큼 길되, 이웃 부품에 닿지 않을 만큼 짧게==. 부품끼리 붙어 있으면 따로 떨어뜨려 굽는(분해 베이킹, '익스플로드') 것이 정석입니다." },

      { h: "모서리에서 갈라지는 광선" },
      "로우폴리의 각진 모서리에서 광선을 ==면 노멀==로 쏘면 모서리 바깥에 빈틈이 생기고 안쪽은 겹칩니다. ==평균 노멀(부드러운 케이지)==로 쏘면 광선이 부채꼴로 고르게 퍼집니다. 대신 평균 노멀로 구우면 로우폴리도 같은 부드러운 노멀이어야 결과가 맞습니다.",
      { fig: {
        aspect: 0.5, view: { x0: -3.2, x1: 3.2, y0: -1.6, y1: 1.6 },
        eq: ["{msg}"],
        setup(F, C, L) {
          let avg = false;
          C.seg({ options: [{ value: 0, label: "면 노멀로 쏘기" }, { value: 1, label: "평균 노멀(케이지)" }], value: 0, onChange: x => { avg = !!x; } });
          F.draw = g => {
            const A = [-2.6, -1.2], B = [0, 1.0], Cc = [2.6, -1.2];
            const hp = []; for (let t = 0; t <= 1; t += 0.01) { const a = lerp(Math.PI * 0.9, Math.PI * 0.1, t); hp.push([Math.cos(a) * 2.75, Math.sin(a) * 2.75 - 1.95]); }
            g.poly(hp, { stroke: "white", w: 2, close: false });
            g.poly([A, B, Cc], { stroke: "teal", w: 3, close: false });
            const n1 = V.norm(V.perp(V.sub(A, B))), n2 = V.norm(V.perp(V.sub(B, Cc))), nb = V.norm(V.add(n1, n2));
            let gap = 0;
            const ray = (p, n) => g.arrow(p, V.add(p, V.mul(n, 0.75)), "yellow", { w: 1.5, head: 6, alpha: 0.85 });
            for (let k = 1; k <= 8; k++) {
              const t = k / 9, p1 = V.lerp(A, B, t), p2 = V.lerp(B, Cc, 1 - t);
              const w = avg ? Math.pow(t, 3) : 0;                    // 모서리에 가까울수록 평균 노멀 쪽으로
              ray(p1, V.norm(V.lerp(n1, nb, w))); ray(p2, V.norm(V.lerp(n2, nb, w)));
            }
            if (!avg) { const a = Math.atan2(n1[1], n1[0]), b = Math.atan2(n2[1], n2[0]); g.arc(B, 0.9, b, a, "red", { fill: "rgba(252,98,85,0.25)", w: 1.5 }); gap = 1; }
            else ray(B, nb);
            L.set("msg", gap ? "모서리 바깥 부채꼴(빨강)에는 광선이 하나도 가지 않음 → 노멀 맵에 이음매·빈틈" : "광선이 모서리를 돌아 고르게 퍼짐 → 이음매 없음 (로우폴리도 같은 스무딩이어야 함)");
          };
        }
      } },

      { h: "결과: 로우폴리에 입히기" },
      "구운 노멀 맵을 로우폴리에 입히면 ==모양(실루엣)은 그대로인데 빛을 받는 모습은 하이폴리==처럼 됩니다. 해를 움직여 비교해 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: -3.2, x1: 3.2, y0: -1.35, y1: 1.35 },
        eq: ["밝기 = max(0, N_구운 · L)"],
        setup(F, C, L) {
          let ang = 0.6, mode = 1;
          C.slider({ label: "해 방향", min: -1.4, max: 1.4, value: ang, fmt: x => num(x / DEG, 0) + "°", onInput: x => { ang = x; } });
          C.seg({ options: [{ value: 0, label: "로우폴리만" }, { value: 1, label: "로우폴리 + 노멀 맵" }, { value: 2, label: "하이폴리(정답)" }], value: 1, onChange: x => { mode = x; } });
          F.draw = g => {
            const Ld = [Math.sin(ang), Math.cos(ang)];
            const low = x => 0.25 * Math.sin(x * 0.9);
            g.field(260, (x, y) => {
              const sy = mode === 2 ? high(x) : low(x);
              if (y > sy || y < sy - 1.0) return null;
              const n = mode === 0 ? V.norm([-0.225 * Math.cos(x * 0.9), 1]) : highN(x);
              const d = Math.max(0, V.dot(n, Ld)), depth = clamp((sy - y) * 1.5, 0, 1);
              return [lerp(60, 230, d) * (1 - depth * 0.6), lerp(55, 205, d) * (1 - depth * 0.6), lerp(50, 170, d) * (1 - depth * 0.6), 255];
            });
            g.arrow([Math.sin(ang) * 1.2 + 2.2, Math.cos(ang) * 1.2 - 0.2], [2.2, -0.2], "gold", { w: 2.5 });
          };
        }
      } },

      { use: [
        ["툴", "Marmoset·Substance·xNormal", "베이커의 Max Frontal/Rear Distance, Cage, 'Use Smoothed Normals', 'Match By Mesh Name'이 이 장의 설정 그대로입니다."],
        ["TA", "베이킹 파이프라인", "로우·하이폴리 이름 규칙(_low/_high), 탄젠트 공간 일치(MikkTSpace), 출력 포맷(초록 채널 방향)을 정해 아티스트마다 결과가 다르지 않게 합니다."],
        ["엔진", "UE 임포트 확인", "베이커와 엔진이 같은 탄젠트·스무딩을 쓰는지가 핵심입니다. 어긋나면 하드 엣지마다 줄이 보입니다(12장)."],
        ["아트", "AO·곡률·두께 맵", "같은 광선 방식으로 AO(가려짐), 곡률(모서리 마모 마스크), 두께(서브서피스용)도 구워 재질 마스크로 씁니다."]
      ] },

      { recap: [
        ["로우폴리 점 → 노멀 방향 광선 → 하이폴리 노멀 기록", "베이킹"],
        ["광선 거리: 짧으면 구멍, 길면 엉뚱한 부품", "케이지 조절, 부품 분해 베이킹"],
        ["평균 노멀 케이지", "모서리 빈틈 방지, 로우폴리 스무딩과 일치시킬 것"],
        ["실루엣은 로우, 음영은 하이", "노멀 맵의 효과"]
      ] }
    ]
  });
})();
