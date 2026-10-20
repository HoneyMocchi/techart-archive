/* 08 노멀과 조명 */
(() => {
  const f2 = n => num(n, 2);
  // 구 렌더: 화면의 원 안 픽셀마다 노멀 N = (x, y, √(1 − x² − y²))
  function sphere(g, c, R, shade, cols = 200) {
    g.field(cols, (x, y) => {
      const nx = (x - c[0]) / R, ny = (y - c[1]) / R, r2 = nx * nx + ny * ny;
      if (r2 > 1) return null;
      const col = shade([nx, ny, Math.sqrt(1 - r2)]);
      const edge = clamp((1 - r2) * 40, 0, 1);   // 가장자리 부드럽게
      return [col[0], col[1], col[2], 255 * edge];
    }, { rect: { x0: c[0] - R * 1.02, x1: c[0] + R * 1.02, y0: c[1] - R * 1.02, y1: c[1] + R * 1.02 } });
  }
  // 원판 위 핸들 위치 → 3D 빛 방향 (가운데=정면, 테두리=옆, 그 밖=뒤쪽)
  function lightFrom(p, c, R) {
    const d = [(p[0] - c[0]) / R, (p[1] - c[1]) / R], r = Math.min(V.len(d), 1.9), az = Math.atan2(d[1], d[0]), a = r * Math.PI / 2;
    return [Math.sin(a) * Math.cos(az), Math.sin(a) * Math.sin(az), Math.cos(a)];
  }
  const BASE = rgb("blue"), WARM = rgb("gold");
  const tint = (k, col = BASE) => col.map(v => clamp(v * k, 0, 255));

  lesson({
    topic: "lighting", title: "노멀과 조명", desc: "N·L 하나로 시작하는 빛", stage: "빛과 하드웨어",
    sym: { N: "yellow", L: "gold", V: "teal", H: "purple", R: "pink", p: "orange", w: "blue", "θ": "blue" },
    hook: "면이 빛을 얼마나 받는지는 ==면이 향한 방향($N$)과 빛이 오는 방향($L$)의 내적== 하나로 정해집니다. 3장에서 배운 그 내적입니다.",
    blocks: [
      { h: "비스듬한 빛은 넓게 퍼진다" },
      "옆에서 본 바닥과 손전등 빛줄기입니다. 해(노란 점)를 끌어 빛의 각도를 바꿔 보세요. 같은 양의 빛이 ==더 넓은 바닥에 퍼지면 한 점이 받는 빛은 줄어듭니다==.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -1.3, y1: 2.9 },
        eq: ["밝기 = cos θ = N·L = {d}", "비춘 길이 = w / cos θ = {w} / {d} = {len}"],
        setup(F, C, L) {
          let th = 0.6;
          const W = 1.2, Rr = 2.3;
          F.handle({ color: "gold", get: () => [Math.sin(th) * Rr, Math.cos(th) * Rr], set: (x, y) => { th = clamp(Math.atan2(x, Math.max(y, 0.01)), -1.45, 1.45); } });
          F.draw = g => {
            const d = Math.cos(th), Ld = [Math.sin(th), Math.cos(th)], perp = [Ld[1], -Ld[0]];
            const len = W / d, br = d;
            g.arc([0, 0], Rr, 0.1, Math.PI - 0.1, "grey", { w: 1, dash: [3, 6], alpha: 0.5 });
            for (let i = 0; i <= 8; i++) {
              const s = (i / 8 - 0.5) * W, start = V.add(V.mul(Ld, Rr * 1.4), V.mul(perp, s));
              const hit = [start[0] - Ld[0] * start[1] / Ld[1], 0];
              g.arrow(start, hit, "gold", { w: 1.5, head: 7, alpha: 0.65 });
            }
            g.line([-4.2, 0], [4.2, 0], "grey", { w: 3 });
            g.line([-len / 2, 0], [len / 2, 0], `rgb(${tint(br, WARM).join(",")})`, { w: 9 });
            g.arrow([0, 0], [0, 1.1], "yellow", { w: 3.5, label: "N" });
            g.arrow([0, 0], V.mul(Ld, 1.1), "gold", { w: 3.5, label: "L" });
            g.arc([0, 0], 0.55, Math.PI / 2, Math.PI / 2 - th, "blue", { w: 2 });
            g.tex("θ", V.mul([Math.sin(th / 2), Math.cos(th / 2)], 0.75), "blue", { size: 16 });
            g.text("비춘 길이", [0, 0], "grey", { dy: 20, size: 12 });
            L.set("d", f2(d)); L.set("w", f2(W)); L.set("len", f2(len));
          };
        }
      } },
      { key: "확산광(디퓨즈)의 밝기 = ==$max(0, N·L)$==. 정면이면 1, 비스듬할수록 줄고, 등 뒤면 0. 이것을 **램버트(Lambert)** 조명이라 합니다." },

      { h: "구에 칠해 보기" },
      "구의 각 픽셀마다 노멀이 다르니 $N·L$도 다릅니다. 해를 구 위로 끌어 보세요(구 밖으로 끌면 뒤에서 비춥니다). 그리고 ==$N·L$을 밝기로 바꾸는 규칙==을 바꿔 보세요 — 툰 셰이딩은 이 규칙을 계단으로 바꾼 것입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["{rule}"],
        setup(F, C, L) {
          const c = [-1.4, 0], R = 1.75, sun = [-2.3, 0.9];
          let mode = "lambert";
          F.vec(sun, "gold", { snap: 0.01 });
          const RULE = {
            lambert: [k => Math.max(0, k), "$밝기 = max(0, N·L)$"],
            half: [k => Math.pow(k * 0.5 + 0.5, 2), "$밝기 = (N·L · 0.5 + 0.5)^2$   하프 램버트: 뒤쪽도 살짝 밝게"],
            toon: [k => (k > 0.55 ? 1 : k > 0.05 ? 0.55 : 0.18), "$밝기 = 계단(N·L)$   툰: 경계를 또렷하게"]
          };
          C.seg({ options: [{ value: "lambert", label: "램버트" }, { value: "half", label: "하프 램버트" }, { value: "toon", label: "툰(계단)" }], value: mode, onChange: x => { mode = x; } });
          F.draw = g => {
            const Lv = lightFrom(sun, c, R), fn = RULE[mode][0];
            sphere(g, c, R, N => tint(0.12 + 0.88 * fn(V3.dot(N, Lv))));
            g.circle(c, R, "grey", { w: 1, alpha: 0.4 });
            // 오른쪽: N·L → 밝기 그래프
            const G0 = [1.1, -1.5], GW = 2.8, GH = 2.9;
            const P = (k, b) => [G0[0] + (k + 1) / 2 * GW, G0[1] + b * GH];
            g.poly([P(-1, 0), P(1, 0), P(1, 1), P(-1, 1)], { stroke: "rgba(236,239,244,0.25)", w: 1 });
            const pts = [];
            for (let k = -1; k <= 1.0001; k += 0.01) pts.push(P(k, fn(k)));
            g.poly(pts, { stroke: "yellow", w: 3, close: false });
            g.line(P(0, 0), P(0, 1), "grey", { w: 1, dash: [3, 4] });
            g.text("N·L = −1", P(-1, 0), "grey", { dy: 14, size: 11 }); g.text("0", P(0, 0), "grey", { dy: 14, size: 11 }); g.text("1", P(1, 0), "grey", { dy: 14, size: 11 });
            g.text("밝기", P(-1, 1), "grey", { dx: -18, size: 11 });
            // 구 위의 한 점(해 쪽)의 값 표시
            const nl = Lv[2];
            g.dot(P(nl, fn(nl)), "gold", 6);
            g.circle(sun, 0.16, "gold", { fill: "gold", w: 0 });
            L.set("rule", RULE[mode][1]);
          };
        }
      } },

      { h: "반사광: 거울 방향 근처만 반짝" },
      "매끈한 면은 빛을 ==거울처럼 한 방향 $R$로== 튕깁니다. 눈($V$)이 그 방향 근처에 있을 때만 하이라이트가 보입니다. 분홍 꽃잎 모양이 반사의 세기 분포이고, $p$가 클수록 좁고 날카로워집니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -1.2, y1: 3 },
        eq: ["R = 2(N·L)N − L", "반짝임 = max(0, R·V)^p = {s}"],
        setup(F, C, L) {
          let la = 0.75, va = -0.55, p = 24;
          const r = 2.4;
          F.handle({ color: "gold", get: () => [Math.sin(la) * r, Math.cos(la) * r], set: (x, y) => { la = clamp(Math.atan2(x, Math.max(y, 0.01)), -1.5, 1.5); } });
          F.handle({ color: "teal", get: () => [Math.sin(va) * r, Math.cos(va) * r], set: (x, y) => { va = clamp(Math.atan2(x, Math.max(y, 0.01)), -1.5, 1.5); } });
          C.slider({ label: "날카로움 $p$", min: 1, max: 120, step: 1, value: p, fmt: x => num(x, 0), onInput: x => { p = x; } });
          F.draw = g => {
            const N = [0, 1], Lv = [Math.sin(la), Math.cos(la)], Vv = [Math.sin(va), Math.cos(va)];
            const Rv = V.sub(V.mul(N, 2 * V.dot(N, Lv)), Lv);
            const pts = [];
            for (let a = -Math.PI / 2; a <= Math.PI / 2 + 1e-6; a += 0.01) {
              const d = [Math.sin(a), Math.cos(a)], k = Math.pow(Math.max(0, V.dot(Rv, d)), p);
              pts.push(V.mul(d, k * 2.3));
            }
            g.poly([[0, 0]].concat(pts), { fill: hexA(PAL.pink, 0.25), stroke: hexA(PAL.pink, 0.8), w: 1.5 });
            g.line([-4.2, 0], [4.2, 0], "grey", { w: 3 });
            g.arrow([0, 0], [0, 1.2], "yellow", { w: 3, label: "N" });
            g.line(V.mul(Lv, r), [0, 0], "gold", { w: 2, dash: [6, 5] });
            g.arrow([0, 0], V.mul(Lv, 1.3), "gold", { w: 3.5, label: "L" });
            g.arrow([0, 0], V.mul(Rv, 1.3), "pink", { w: 3.5, label: "R" });
            g.arrow([0, 0], V.mul(Vv, 1.3), "teal", { w: 3.5, label: "V" });
            g.text("눈", V.mul(Vv, r), "teal", { dy: -18, size: 12, bold: true });
            g.text("해", V.mul(Lv, r), "gold", { dy: -18, size: 12, bold: true });
            const s = Math.pow(Math.max(0, V.dot(Rv, Vv)), p);
            L.set("s", f2(s));
          };
        }
      } },
      "실제로는 $R$ 대신 ==$L$과 $V$의 중간 방향 $H$==를 구해 $N·H$를 쓰는 **블린-퐁** 방식이 더 흔합니다. 계산이 싸고 결과도 자연스럽습니다.",

      { h: "합치면: 블린-퐁 구" },
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["색 = 주변광 + 확산 · max(0, N·L) + 반사 · max(0, N·H)^p"],
        setup(F, C, L) {
          const c = [0, 0], R = 1.85, sun = [-1.1, 1.0];
          let amb = 0.08, kd = 0.85, ks = 0.7, p = 40;
          F.vec(sun, "gold", { snap: 0.01 });
          C.slider({ label: "주변광", min: 0, max: 0.5, value: amb, onInput: x => { amb = x; } });
          C.slider({ label: "반사", min: 0, max: 1.5, value: ks, onInput: x => { ks = x; } });
          C.slider({ label: "날카로움 $p$", min: 2, max: 200, step: 1, value: p, fmt: x => num(x, 0), onInput: x => { p = x; } });
          C.play();
          let t = 0;
          F.loop(dt => { t += dt * 0.8; sun[0] = Math.cos(t) * 1.4; sun[1] = Math.sin(t) * 1.1 + 0.2; });
          F.draw = g => {
            const Lv = lightFrom(sun, c, R), Vv = [0, 0, 1], H = V3.norm(V3.add(Lv, Vv));
            sphere(g, c, R, N => {
              const d = Math.max(0, V3.dot(N, Lv)), s = d > 0 ? Math.pow(Math.max(0, V3.dot(N, H)), p) * ks : 0;
              return BASE.map(v => clamp(v * (amb + kd * d) + 255 * s, 0, 255));
            }, 240);
            g.circle(sun, 0.16, "gold", { fill: "gold", w: 0 });
          };
        }
      } },
      "주변광은 그림자 쪽이 완전히 까맣게 되지 않도록 더하는 상수, 확산은 램버트, 반사는 블린-퐁. ==물리 기반 렌더링(PBR)도 뼈대는 같고==, 각 항을 에너지 보존과 거칠기 분포로 더 정확하게 바꾼 것입니다.",

      { h: "노멀 맵: 평평한 면에 가짜 굴곡" },
      "아래 면은 ==실제로는 완전히 평평합니다==. 픽셀마다 노멀만 살짝 기울여 저장해 두면($N$을 RGB로) 빛이 움직일 때 울퉁불퉁해 보입니다. 꺼 보면 차이가 확실합니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 1;
          C.play(true);
          C.seg({ options: [{ value: 1, label: "노멀 맵 켜기" }, { value: 0, label: "끄기" }, { value: 2, label: "노멀 맵(RGB) 보기" }], value: 1, onChange: x => { mode = x; } });
          F.loop(() => {});
          // 높이 함수: 둥근 돌기 몇 개 + 잔물결
          const bumps = [[-2.4, 0.6, 0.7], [-0.6, -0.8, 0.9], [1.4, 0.7, 0.8], [2.9, -0.9, 0.6], [0.4, 1.4, 0.5]];
          const hgt = (x, y) => {
            let h = 0.05 * Math.sin(x * 6) * Math.sin(y * 6);
            bumps.forEach(([bx, by, r]) => { const d2 = ((x - bx) ** 2 + (y - by) ** 2) / (r * r); if (d2 < 1) h += 0.45 * Math.pow(1 - d2, 2); });
            return h;
          };
          let nCache = null;
          F.draw = g => {
            const a = F.t * 0.9, Lv = V3.norm([Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.55]);
            const cols = 260, key = F.w + "x" + F.h;
            if (!nCache || nCache.key !== key) nCache = { key, n: [] };   // 노멀은 변하지 않으니 한 번만 계산
            g.field(cols, (x, y, i, j) => {
              let N = [0, 0, 1];
              if (mode !== 0) {
                const k = j * cols + i;
                if (!nCache.n[k]) {
                  const e = 0.02, dx = (hgt(x + e, y) - hgt(x - e, y)) / (2 * e), dy = (hgt(x, y + e) - hgt(x, y - e)) / (2 * e);
                  nCache.n[k] = V3.norm([-dx, -dy, 1]);
                }
                N = nCache.n[k];
              }
              if (mode === 2) return [(N[0] * 0.5 + 0.5) * 255, (N[1] * 0.5 + 0.5) * 255, (N[2] * 0.5 + 0.5) * 255, 255];
              const d = Math.max(0, V3.dot(N, Lv)), H = V3.norm(V3.add(Lv, [0, 0, 1])), s = Math.pow(Math.max(0, V3.dot(N, H)), 60) * 0.5;
              return [200 * (0.1 + 0.9 * d) + 255 * s, 170 * (0.1 + 0.9 * d) + 255 * s, 140 * (0.1 + 0.9 * d) + 255 * s, 255];
            });
            const sp = [Math.cos(a) * 3.6, Math.sin(a) * 1.7];
            g.circle(sp, 0.15, "gold", { fill: "gold", w: 0 });
            L.set("eq", mode === 2 ? "$RGB = N · 0.5 + 0.5$   평평한 곳은 $(0.5, 0.5, 1)$ = 보랏빛 파랑" : mode === 1 ? "$N = normalize(−∂h/∂x, −∂h/∂y, 1)$   픽셀마다 다른 노멀" : "$N = (0, 0, 1)$   빛이 움직여도 전부 같은 밝기");
          };
        }
      } },
      { ponder: "노멀 맵 텍스처는 왜 대부분 보랏빛 파란색일까요?",
        answer: "대부분의 픽셀이 '거의 정면' 노멀 $(0, 0, 1)$ 이고, 이것을 $N · 0.5 + 0.5$ 로 색에 담으면 $(0.5, 0.5, 1)$ — ==R·G는 중간, B는 최대==인 보랏빛 파랑이 되기 때문입니다." },

      { recap: [
        ["max(0, N·L)", "램버트 확산: 비스듬할수록 어두움"],
        ["(N·L · 0.5 + 0.5)^2", "하프 램버트, 계단으로 바꾸면 툰"],
        ["R = 2(N·L)N − L", "거울 반사 방향"],
        ["max(0, N·H)^p", "블린-퐁 하이라이트, H = normalize(L + V)"],
        ["RGB = N · 0.5 + 0.5", "노멀 맵 저장 방식"]
      ] }
    ]
  });
})();
