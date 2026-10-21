/* 72 GTAO: 지평선 기반 앰비언트 오클루전 (호르헤 히메네스 외, 2016) */
(() => {
  const f2 = n => num(n, 2);
  const hgt = x => 0.55 + 0.28 * Math.sin(2.1 * x) + 0.16 * Math.sin(5.3 * x + 1) + 0.5 * Math.exp(-((x - 2.6) ** 2) / 0.02) + 0.04 * Math.sin(13 * x);
  const slope = x => (hgt(x + 1e-3) - hgt(x - 1e-3)) / 2e-3;
  // 위쪽(시선 방향)에서 잰 각도, 오른쪽이 +
  function horizons(x, R) {
    const y = hgt(x), n = Math.atan(slope(x)), STEPS = 48;
    let h1 = -Math.PI, h2 = Math.PI;   // 가로막는 것이 없으면 아래끝
    for (let s = 1; s <= STEPS; s++) {
      const d = s / STEPS * R;
      const yr = hgt(x + d) - y, yl = hgt(x - d) - y;
      h2 = Math.min(h2, Math.atan2(d, yr)); h1 = Math.max(h1, -Math.atan2(d, yl));
    }
    // 법선 반구로 자르기
    h1 = n + Math.max(h1 - n, -Math.PI / 2); h2 = n + Math.min(h2 - n, Math.PI / 2);
    return { n, h1, h2 };
  }
  // 코사인 가중 가시성의 닫힌 식 (슬라이스 하나)
  const arcInt = (h, n) => 0.25 * (-Math.cos(2 * h - n) + Math.cos(n) + 2 * h * Math.sin(n));
  // 가린 것이 없을 때의 값(cos n + n·sin n)으로 나눠 0~1로 맞춤
  const gtao = (x, R) => { const H = horizons(x, R); return (arcInt(H.h1, H.n) + arcInt(H.h2, H.n)) / (Math.cos(H.n) + H.n * Math.sin(H.n)); };
  // 정답: 방향마다 광선을 쏴서 가려지는지 직접 확인 (3D 반구를 단면으로 나눈 가중치 cos(θ − n)·|sin θ|)
  function truth(x, R) {
    const y = hgt(x), n = Math.atan(slope(x)); let vis = 0, tot = 0;
    for (let k = 0; k < 120; k++) {
      const th = n - Math.PI / 2 + (k + 0.5) / 120 * Math.PI, w = Math.cos(th - n) * Math.abs(Math.sin(th)), dx = Math.sin(th), dy = Math.cos(th);
      let blocked = false;
      for (let s = 1; s <= 40 && !blocked; s++) { const t = s / 40 * R; if (y + dy * t < hgt(x + dx * t) - 1e-4) blocked = true; }
      tot += w; if (!blocked) vis += w;
    }
    return vis / tot;
  }
  // 고전 SSAO: 법선 반구 안 무작위 점이 땅속에 있는 비율
  function ssao(x, R, N, seed) {
    const y = hgt(x), n = Math.atan(slope(x)); let s = seed * 9301 + 49297, occ = 0;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < N; i++) {
      const th = n + (rnd() - 0.5) * Math.PI, r = R * Math.sqrt(rnd());
      const px = x + Math.sin(th) * r, py = y + Math.cos(th) * r;
      if (py < hgt(px)) occ++;
    }
    return 1 - occ / N;
  }
  const multi = (v, a) => { const A = 2.0404 * a - 0.3324, B = -4.7951 * a + 0.6417, C = 2.7552 * a + 0.6903; return Math.max(v, ((v * A + B) * v + C) * v); };

  lesson({
    topic: "gtao", title: "GTAO: 지평선으로 재는 AO", desc: "각도 두 개로 정확한 차폐", stage: "그래픽스 연구 노트",
    sym: { h: "orange", n: "yellow", R: "teal" },
    hook: "29장의 SSAO는 주변에 점을 뿌려 '땅속에 묻힌 점의 비율'을 셉니다. 빠르지만 노이즈가 많고 값이 물리적으로 맞지 않습니다. 히메네스 팀의 ==GTAO(Ground Truth AO)==는 방향을 몇 개의 단면(슬라이스)으로 나누고, 단면마다 ==좌우 지평선 각도 두 개==만 찾아 닫힌 식으로 정확한 코사인 가중 가시성을 계산합니다.",
    blocks: [
      { h: "단면 하나에서 일어나는 일" },
      "흰 점을 지형 위로 끌어 보세요. 점에서 좌우로 반경 $R$ 안을 훑어 ==가장 높이 솟은 쪽의 각도(지평선 $h_1$, $h_2$)==를 찾습니다. 두 지평선 사이(청록 부채꼴)가 하늘이 보이는 방향입니다. 그 범위의 $cos$ 가중 적분은 식 하나로 끝납니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["가시성: GTAO {g}   ·   정답(광선 120개) {t}   ·   SSAO(점 {N}개) {s}"],
        setup(F, C, L) {
          const P = [1.55, hgt(1.55)];
          let R = 0.5, N = 12;
          F.vec(P, "white", { snap: 0.005, constrain: q => [clamp(q[0], 0.2, 3.8), hgt(clamp(q[0], 0.2, 3.8))] });
          C.slider({ label: "반경 $R$", min: 0.2, max: 1.5, value: R, onInput: x => { R = x; } });
          C.slider({ label: "SSAO 점 개수", min: 4, max: 64, step: 1, value: N, fmt: x => x, onInput: x => { N = x; } });
          F.draw = g => {
            const ter = [[0, 0]]; for (let i = 0; i <= 400; i++) { const x = i / 100; ter.push([x, hgt(x)]); } ter.push([4, 0]);
            const H = horizons(P[0], R), dir = a => [Math.sin(a), Math.cos(a)];
            // 보이는 부채꼴
            const fan = [P]; for (let k = 0; k <= 40; k++) { const a = lerp(H.h1, H.h2, k / 40); fan.push(V.add(P, V.mul(dir(a), R))); }
            g.poly(fan, { fill: "rgba(92,208,179,0.22)", stroke: "teal", w: 1 });
            g.poly(ter, { fill: "#2A3242", stroke: "grey", w: 1.5 });
            g.circle(P, R, "teal", { w: 1, dash: [4, 4], alpha: 0.6 });
            g.line(P, V.add(P, V.mul(dir(H.h1), R * 1.1)), "orange", { w: 2.5 });
            g.line(P, V.add(P, V.mul(dir(H.h2), R * 1.1)), "orange", { w: 2.5 });
            g.arrow(P, V.add(P, V.mul(dir(H.n), 0.45)), "yellow", { w: 2.5, label: "n" });
            g.tex("h₁", V.add(P, V.mul(dir(H.h1), R * 1.2)), "orange", { size: 16 }); g.tex("h₂", V.add(P, V.mul(dir(H.h2), R * 1.2)), "orange", { size: 16 });
            L.set("g", f2(gtao(P[0], R))); L.set("t", f2(truth(P[0], R))); L.set("s", f2(ssao(P[0], R, N, Math.floor(P[0] * 97)))); L.set("N", N);
          };
        }
      } },
      { key: "슬라이스 하나의 가시성은 $¼ (−cos(2h − n) + cos n + 2h · sin n)$ 을 양쪽 지평선에 대해 더한 값입니다(3D 반구를 단면으로 쪼갰기 때문에 $cos$ 에 $|sin θ|$ 가중이 함께 들어간 적분입니다). 높이장(화면 깊이)에서는 지평선 아래가 모두 가려지므로 이 식이 ==그 단면에서는 정확합니다==. 실제 GTAO는 픽셀마다 단면 방향을 회전시키며(68장 노이즈) 몇 개만 쓰고 TAA로 모읍니다." },

      { h: "지형 전체를 따라 비교" },
      "점마다 AO를 계산해 지형을 칠하고 아래에 곡선으로 그렸습니다. ==GTAO(주황)는 정답(흰 점선)과 거의 겹치고==, SSAO(분홍)는 점 개수가 적으면 들쭉날쭉하고, 개수를 늘려도 정답과 어긋납니다. ==가려진 방향이 아니라 땅속에 든 부피==를 세기 때문입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: -0.9, y1: 1.6 },
        eq: ["주황 = GTAO   ·   흰 점선 = 정답   ·   분홍 = SSAO (점 {N}개)"],
        setup(F, C, L) {
          let R = 0.5, N = 12, ck = "", D = null;
          C.slider({ label: "반경 $R$", min: 0.2, max: 1.5, value: R, onInput: x => { R = x; } });
          C.slider({ label: "SSAO 점 개수", min: 4, max: 64, step: 1, value: N, fmt: x => x, onInput: x => { N = x; } });
          F.draw = g => {
            const key = R + "," + N;
            if (key !== ck) { ck = key; D = []; for (let i = 0; i <= 200; i++) { const x = 0.05 + i / 200 * 3.9; D.push([x, gtao(x, R), truth(x, R), ssao(x, R, N, i)]); } }
            // 지형은 한 덩어리로 칠하고, 표면 띠의 밝기로 AO를 보여 줌
            const ter = [[0.05, 0]].concat(D.map(d => [d[0], hgt(d[0])]), [[3.95, 0]]);
            g.poly(ter, { fill: "#2A3242" });
            for (let i = 0; i < D.length - 1; i++) { const c = Math.round(30 + D[i][1] * 225); g.line([D[i][0], hgt(D[i][0])], [D[i + 1][0], hgt(D[i + 1][0])], `rgb(${c},${Math.round(c * 0.93)},${Math.round(c * 0.8)})`, { w: 7 }); }
            const yv = v => -0.85 + v * 0.75;
            g.line([0.05, yv(1)], [3.95, yv(1)], "grey", { w: 1, alpha: 0.4 }); g.line([0.05, yv(0)], [3.95, yv(0)], "grey", { w: 1, alpha: 0.4 });
            g.poly(D.map(d => [d[0], yv(d[3])]), { stroke: "pink", w: 1.5, close: false, alpha: 0.85 });
            g.poly(D.map(d => [d[0], yv(d[2])]), { stroke: "white", w: 2, close: false, dash: [5, 4] });
            g.poly(D.map(d => [d[0], yv(d[1])]), { stroke: "orange", w: 2.5, close: false });
            g.text("1", [0.02, yv(1)], "grey", { size: 10, align: "left" }); g.text("0", [0.02, yv(0)], "grey", { size: 10, align: "left" });
            L.set("N", N);
          };
        }
      } },

      { h: "다중 반사: AO가 너무 어두운 이유" },
      "AO는 '가려진 방향의 빛은 0'이라고 가정합니다. 하지만 밝은 재질이라면 가린 벽에서 ==튕겨 들어오는 빛==이 있습니다. GTAO 논문은 수많은 장면을 패스 트레이싱한 결과에 맞춘 ==3차 다항식 하나==로, 알베도에 따라 AO를 밝혀 줍니다. 흰 벽의 구석은 생각보다 어둡지 않습니다.",
      { fig: {
        aspect: 0.45, view: { x0: 0, x1: 4.4, y0: 0, y1: 2, stretch: true },
        eq: ["알베도 {a}:  AO 0.5 → {m}   ·   max(v, ((v·a′ + b′)·v + c′)·v)"],
        setup(F, C, L) {
          let alb = 0.8;
          C.slider({ label: "알베도", min: 0, max: 1, value: alb, onInput: x => { alb = x; } });
          F.draw = g => {
            const gx = v => 0.3 + v * 1.9, gy = v => 0.15 + v * 1.7;
            g.line([gx(0), gy(0)], [gx(1), gy(0)], "grey", { w: 1 }); g.line([gx(0), gy(0)], [gx(0), gy(1)], "grey", { w: 1 });
            g.line([gx(0), gy(0)], [gx(1), gy(1)], "grey", { w: 1, dash: [4, 4] });
            [0.2, 0.5, 0.8].forEach(a => { const pts = []; for (let i = 0; i <= 60; i++) { const v = i / 60; pts.push([gx(v), gy(multi(v, a))]); } g.poly(pts, { stroke: "grey", w: 1, close: false, alpha: 0.5 }); });
            const pts = []; for (let i = 0; i <= 60; i++) { const v = i / 60; pts.push([gx(v), gy(multi(v, alb))]); }
            g.poly(pts, { stroke: "orange", w: 3, close: false });
            g.text("AO 가시성 →", [gx(1), 0.05], "grey", { size: 10, align: "right" });
            // 오른쪽: 구석 색 비교
            const sw = (x, v, label) => { const c = Math.round(Math.pow(alb * v, 1 / 2.2) * 255); g.poly([[x, 0.5], [x + 0.8, 0.5], [x + 0.8, 1.6], [x, 1.6]], { fill: `rgb(${c},${c},${c})` }); g.text(label, [x + 0.4, 0.35], "grey", { size: 10 }); };
            sw(2.6, 0.5, "AO 그대로"); sw(3.5, multi(0.5, alb), "다중 반사 보정");
            L.set("a", f2(alb)); L.set("m", f2(multi(0.5, alb)));
          };
        }
      } },

      { use: [
        ["엔진", "UE·Unity의 GTAO", "UE는 r.AmbientOcclusion.Method 계열에서 GTAO를 고를 수 있고(5.x), Unity HDRP의 Screen Space Ambient Occlusion도 GTAO 기반입니다. 다중 반사 보정 옵션도 이 다항식입니다."],
        ["논문", "원문", "Jimenez, Wu, Pesce, Jarabo, 'Practical Real-Time Strategies for Accurate Indirect Occlusion'(SIGGRAPH 2016 코스). 지평선 기반 AO의 계보는 HBAO(NVIDIA, 2008)입니다."],
        ["게임", "콜 오브 듀티", "액티비전의 콜 오브 듀티 시리즈에서 개발되어 쓰였고, 같은 논문의 '스페큘러 오클루전(GTSO)'은 반사광 차폐에 씁니다."],
        ["TA", "AO 튜닝", "AO가 얇은 물체 뒤에서 후광처럼 번지면 반경, 너무 어둡게 뭉치면 다중 반사·세기, 지글거리면 슬라이스 수와 노이즈·TAA를 봅니다."]
      ] },

      { recap: [
        ["지평선 h₁, h₂", "단면마다 각도 두 개만 찾기"],
        ["¼(−cos(2h − n) + cos n + 2h sin n)", "코사인 가중 가시성의 닫힌 식"],
        ["슬라이스 회전 + TAA", "적은 비용으로 반구 전체"],
        ["max(v, 3차식(v, 알베도))", "다중 반사 보정"]
      ] }
    ]
  });
})();
