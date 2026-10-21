/* 42 데칼 */
(() => {
  const f2 = n => num(n, 2);
  const srgb = v => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
  // 데칼 무늬: 원형 표지 + 가운데 화살표 (UV 0~1)
  const decalTex = (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5);
    if (r > 0.48) return null;
    if (r > 0.4) return [0.95, 0.75, 0.1, 1];
    const arrow = (Math.abs(u - 0.5) < 0.07 && v > 0.25 && v < 0.62) || (v >= 0.62 && v < 0.78 && Math.abs(u - 0.5) < (0.78 - v) * 1.2);
    return arrow ? [0.95, 0.95, 0.95, 1] : [0.15, 0.35, 0.75, 0.9];
  };

  lesson({
    topic: "decal", title: "데칼", desc: "상자로 투영해 덧칠하기", stage: "테크아트 실전",
    sym: { P: "white", N: "yellow" },
    hook: "총알 자국, 길바닥 표시, 낙서, 물웅덩이. 모델링을 다시 하지 않고 ==보이지 않는 상자를 놓아 그 안에 들어온 표면에 텍스처를 덧칠==하는 것이 데칼입니다. 디퍼드 렌더러(33장)에서는 G버퍼에 직접 덧씁니다.",
    blocks: [
      { h: "투영 상자: 월드 위치 → 데칼 UV" },
      "옆에서 본 울퉁불퉁한 바닥과 데칼 상자입니다. 표면 점의 월드 위치를 ==상자 공간으로 옮기면 그게 곧 데칼 UV==입니다. 상자를 끌고 기울여 보세요. 투영 방향과 나란한 면(벽)에서는 텍스처가 길게 늘어나므로, 면 각도로 서서히 지웁니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["uv = (상자 역행렬 · P).xy + 0.5,   페이드 = smoothstep(각도 한계, 1, N·투영 방향)"],
        setup(F, C, L) {
          const ctr = [0, -0.6];
          let ang = 0, w = 2.4, fade = true;
          F.vec(ctr, "yellow", { snap: 0.01 });
          C.slider({ label: "상자 기울기", min: -1, max: 1, value: ang, fmt: x => num(x / DEG, 0) + "°", onInput: x => { ang = x; } });
          C.slider({ label: "상자 너비", min: 0.8, max: 5, value: w, onInput: x => { w = x; } });
          C.seg({ options: [{ value: 1, label: "각도 페이드 켜기" }, { value: 0, label: "끄기" }], value: 1, onChange: x => { fade = !!x; } });
          const ground = x => -1.2 + 0.25 * Math.sin(x * 1.5) + (x > 1.4 && x < 2.2 ? 1.0 : 0);
          F.draw = g => {
            const ax = [Math.cos(ang), Math.sin(ang)], ay = [-Math.sin(ang), Math.cos(ang)], h = 1.6;
            const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => V.add(ctr, V.add(V.mul(ax, a * w / 2), V.mul(ay, b * h / 2))));
            g.poly(corners, { fill: "rgba(244,211,69,0.06)", stroke: "yellow", w: 1.5, dash: [5, 4] });
            g.arrow(V.add(ctr, V.mul(ay, h / 2)), V.add(ctr, V.mul(ay, -h / 2 + 0.1)), "yellow", { w: 2, head: 8, alpha: 0.6 });
            for (let x = -4; x < 4; x += 0.02) {
              const isStep = x > 1.38 && x < 1.42 || x > 2.18 && x < 2.22;
              const p = [x + 0.01, ground(x + 0.01)];
              const local = V.sub(p, ctr), lu = V.dot(local, ax) / w + 0.5, lv = V.dot(local, ay) / h + 0.5;
              let col = "rgba(138,147,166,0.9)";
              if (lu >= 0 && lu <= 1 && lv >= 0 && lv <= 1) {
                const t = decalTex(lu, 0.5);
                const nrm = isStep ? [1, 0] : V.norm([-0.375 * Math.cos(x * 1.5), 1]);
                const f = fade ? clamp((V.dot(nrm, ay) - 0.3) / 0.4, 0, 1) : 1;
                if (t && f > 0.02) col = `rgba(${srgb(t[0])},${srgb(t[1])},${srgb(t[2])},${f})`;
              }
              g.line([x, ground(x)], [x + 0.02, ground(x + 0.02)], col, { w: 6 });
            }
            g.line([1.4, ground(1.39)], [1.4, ground(1.41)], "grey", { w: 3 }); g.line([2.2, ground(2.19)], [2.2, ground(2.21)], "grey", { w: 3 });
          };
        }
      } },

      { h: "디퍼드 데칼: G버퍼에 덧칠" },
      "위에서 비스듬히 본 바닥·상자·공 위에 데칼을 투영합니다. 픽셀마다 ==깊이로 월드 위치를 복원 → 상자 안이면 데칼 UV로 텍스처를 읽어 G버퍼의 색에 섞습니다==. 상자를 움직이면 공과 상자 옆면에도 감깁니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["데칼 상자 위치 ({x}, {z}),  크기 {s}"],
        setup(F, C, L) {
          let dx = 0.1, dz = 3.4, size = 1.4, fade = true;
          C.slider({ label: "상자 x", min: -1.5, max: 1.5, value: dx, onInput: x => { dx = x; } });
          C.slider({ label: "상자 z", min: 2.4, max: 4.6, value: dz, onInput: x => { dz = x; } });
          C.slider({ label: "크기", min: 0.4, max: 2.4, value: size, onInput: x => { size = x; } });
          C.seg({ options: [{ value: 1, label: "각도 페이드" }, { value: 0, label: "끄기 (옆면 늘어남)" }], value: 1, onChange: x => { fade = !!x; } });
          const ro = [0, 1.4, 0];
          function scene(rd) {
            let best = { t: Infinity };
            const sp = { c: [0.8, -0.35, 3.6], r: 0.45 };
            const oc = V3.sub(ro, sp.c), b = V3.dot(oc, rd), c = V3.dot(oc, oc) - sp.r * sp.r, disc = b * b - c;
            if (disc > 0) { const t = -b - Math.sqrt(disc); if (t > 0) { const p = V3.add(ro, V3.mul(rd, t)); best = { t, p, n: V3.norm(V3.sub(p, sp.c)), col: [0.6, 0.6, 0.65] }; } }
            const bx = [[-1.2, -0.8, 2.9], [-0.4, -0.1, 3.7]];
            let t0 = -Infinity, t1 = Infinity, nAx = 0;
            for (let k = 0; k < 3; k++) { let a = (bx[0][k] - ro[k]) / rd[k], d = (bx[1][k] - ro[k]) / rd[k]; if (a > d) [a, d] = [d, a]; if (a > t0) { t0 = a; nAx = k; } t1 = Math.min(t1, d); }
            if (t0 < t1 && t0 > 0 && t0 < best.t) { const n = [0, 0, 0]; n[nAx] = -Math.sign(rd[nAx]); best = { t: t0, p: V3.add(ro, V3.mul(rd, t0)), n, col: [0.55, 0.45, 0.35] }; }
            if (rd[1] < 0) { const t = (-0.8 - ro[1]) / rd[1]; if (t < best.t) { const p = V3.add(ro, V3.mul(rd, t)); best = { t, p, n: [0, 1, 0], col: (Math.floor(p[0] * 2) + Math.floor(p[2] * 2)) % 2 ? [0.45, 0.46, 0.48] : [0.38, 0.39, 0.42] }; } }
            return best;
          }
          F.draw = g => {
            const Ld = V3.norm([0.4, 0.8, -0.3]);
            g.field(220, (x, y) => {
              const rd = V3.norm([x * 0.55, y * 0.55 - 0.45, 1]);
              const h = scene(rd);
              if (!isFinite(h.t)) return [20, 24, 32, 255];
              let col = h.col.slice();
              const lu = (h.p[0] - dx) / size + 0.5, lv = (h.p[2] - dz) / size + 0.5, ly = h.p[1] + 0.8;
              if (lu >= 0 && lu <= 1 && lv >= 0 && lv <= 1 && ly < 1.2) {
                const t = decalTex(lu, 1 - lv), f = fade ? clamp((h.n[1] - 0.25) / 0.4, 0, 1) : 1;
                if (t) col = col.map((c, i) => lerp(c, t[i], t[3] * f));
              }
              const l = 0.25 + 0.75 * Math.max(0, V3.dot(h.n, Ld));
              return col.map(c => srgb(c * l)).concat(255);
            });
            L.set("x", f2(dx)); L.set("z", f2(dz)); L.set("s", f2(size));
          };
        }
      } },

      { h: "어떤 채널에 덧칠하나" },
      "데칼은 G버퍼의 ==원하는 채널만== 바꿀 수 있습니다. 물웅덩이는 색이 아니라 ==거칠기만 낮추고==, 긁힌 자국은 노멀만 바꿉니다. 해를 움직이며 비교해 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: -2, x1: 2, y0: -0.84, y1: 0.84 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = "rough", sunX = 0.3;
          C.seg({ options: [{ value: "color", label: "색만" }, { value: "rough", label: "거칠기만 (물웅덩이)" }, { value: "normal", label: "노멀만 (긁힘)" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "해 위치", min: -1.5, max: 1.5, value: sunX, onInput: x => { sunX = x; } });
          F.draw = g => {
            const Ld = V3.norm([sunX, 0.35, -1]);
            g.field(240, (x, y) => {
              const rd = V3.norm([x * 0.5, y * 0.5 - 0.5, 1]);
              if (rd[1] >= 0) return [30, 40, 60, 255];
              const t = -1 / rd[1], p = V3.mul(rd, t);
              const inD = Math.hypot((p[0] - 0) / 1.4, (p[2] - 3.2) / 0.9) < 1;
              let base = [0.35, 0.32, 0.28], rough = 0.85, n = [0, 1, 0];
              if (inD && mode === "color") base = [0.6, 0.2, 0.15];
              if (inD && mode === "rough") { rough = 0.05; base = base.map(c => c * 0.7); }
              if (inD && mode === "normal") n = V3.norm([Math.sin(p[0] * 40) * 0.4, 1, 0]);
              const H = V3.norm(V3.add(Ld, V3.mul(rd, -1))), a = rough * rough;
              const NoH = Math.max(0, V3.dot(n, H)), D = a * a / (Math.PI * Math.pow(NoH * NoH * (a * a - 1) + 1, 2));
              const spec = Math.min(8, D * 0.08), dif = Math.max(0, V3.dot(n, Ld));
              const r = V3.sub(rd, V3.mul(n, 2 * V3.dot(rd, n))), sky = [0.35 + 0.3 * r[1], 0.5 + 0.3 * r[1], 0.85];   // 하늘 반사(매끈할수록 또렷)
              const fres = 0.04 + 0.96 * Math.pow(1 - Math.max(0, -V3.dot(rd, n)), 5);
              return base.map((c, i) => srgb(c * (0.15 + 0.85 * dif) + spec + sky[i] * fres * (1 - rough) * 1.2)).concat(255);
            });
            L.set("eq", { color: "기본색 채널만 바꿈 → 칠한 페인트", rough: "거칠기만 낮춤 → 하늘·해가 비치는 물웅덩이", normal: "노멀만 바꿈 → 색은 그대로인데 빛에 따라 긁힌 결이 보임" }[mode]);
          };
        }
      } },

      { use: [
        ["엔진", "Decal Actor와 DBuffer", "UE의 데칼 머티리얼(Deferred Decal), Decal Blend Mode, DBuffer 데칼 옵션이 이 장입니다. Fade Screen Size로 작아지면 꺼서 비용을 줄입니다."],
        ["게임", "총알 자국과 피", "총알 자국은 맞은 점에 작은 데칼 상자를 실시간으로 생성합니다. 개수 상한과 수명으로 성능을 관리합니다."],
        ["레벨 아트", "디테일 덧칠", "길바닥 차선, 벽의 얼룩·낙서·누수 자국을 메시 수정 없이 얹어 반복되는 타일 텍스처를 감춥니다."],
        ["TA", "정렬과 비용", "데칼끼리 겹치면 정렬 순서(Sort Order)가 필요하고, 큰 데칼은 덮는 모든 픽셀에서 계산되므로 크기를 작게 유지합니다."]
      ] },

      { recap: [
        ["uv = (상자⁻¹ · P).xy + 0.5", "월드 위치를 상자 공간으로"],
        ["smoothstep(N·투영 방향)", "옆면 늘어남을 각도로 페이드"],
        ["G버퍼에 덧칠", "깊이로 위치 복원 → 상자 안이면 섞기"],
        ["채널 선택", "색·거칠기·노멀 중 필요한 것만"]
      ] }
    ]
  });
})();
