/* 29 화면 공간 기법: SSAO와 SSR */
(() => {
  const f2 = n => num(n, 2);
  // 옆에서 본 장면의 높이(깊이 버퍼처럼 쓰는 지형): 바닥 + 상자 + 벽
  const hgt = x => { let h = 0; if (x > -1.4 && x < -0.4) h = 1.1; if (x > 0.6 && x < 1.0) h = 0.5; if (x > 2.6) h = 2.2; return h - 1.6; };

  lesson({
    topic: "ssao", title: "SSAO와 SSR", desc: "깊이 버퍼만으로 어림하기", stage: "화면 후처리",
    sym: { r: "gold", N: "yellow", P: "white", R: "pink" },
    hook: "디퍼드 렌더러(33장)는 화면의 모든 픽셀에 대해 ==깊이와 노멀==을 이미 들고 있습니다. 이것만으로 구석의 어두움(AO)과 바닥의 반사(SSR)를 싸게 어림하는 것이 화면 공간 기법입니다. 대신 화면에 없는 것은 모릅니다.",
    blocks: [
      { h: "SSAO: 주변이 얼마나 막혔나" },
      "옆에서 본 깊이 버퍼입니다. 점 $P$ 주변 반구 안에 무작위 점을 뿌리고, ==깊이 버퍼보다 안쪽(물체 속)에 들어간 점의 비율==만큼 어둡게 합니다. $P$를 구석으로 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["AO = 1 − (가려진 샘플 수 / {n}) = {ao}"],
        setup(F, C, L) {
          let r = 0.7, n = 24, px = 0.2;
          F.handle({ color: "white", get: () => [px, hgt(px)], set: x => { px = clamp(x, -3.9, 3.9); } });
          C.slider({ label: "반경 $r$", min: 0.2, max: 1.6, value: r, onInput: x => { r = x; } });
          C.slider({ label: "샘플 수", min: 4, max: 64, step: 1, value: n, fmt: x => num(x, 0), onInput: x => { n = x; } });
          F.draw = g => {
            const pts = [];
            for (let x = -4; x <= 4.001; x += 0.02) pts.push([x, hgt(x)]);
            g.poly(pts.concat([[4, -2], [-4, -2]]), { fill: "rgba(138,147,166,0.3)", stroke: "grey", w: 2 });
            const P = [px, hgt(px)];
            let seed = 3, occ = 0;
            const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            g.arc(P, r, 0, Math.PI, "gold", { w: 1, dash: [3, 4], alpha: 0.6 });
            for (let i = 0; i < n; i++) {
              const a = rnd() * Math.PI, d = Math.sqrt(rnd()) * r, s = [P[0] + Math.cos(a) * d, P[1] + 0.02 + Math.sin(a) * d];
              const hidden = s[1] < hgt(s[0]);
              if (hidden) occ++;
              g.dot(s, hidden ? "red" : "teal", 3.5);
            }
            g.circle(P, 0.08, "white", { fill: "white", w: 0 });
            L.set("n", n); L.set("ao", f2(1 - occ / n));
          };
        }
      } },
      "샘플이 적으면 얼룩덜룩하므로, 실제로는 ==픽셀마다 샘플 방향을 살짝 돌리고(노이즈) 나중에 블러==로 펴 줍니다. 22장 노이즈, 27장 블러가 여기서 합쳐집니다.",

      { h: "SSAO를 화면 전체에" },
      "위에서 내려다본 상자들의 높이 맵을 깊이 버퍼로 보고, 픽셀마다 같은 계산을 합니다. ==상자 아래 모서리와 틈새==가 어두워지는 것을 'AO만 보기'로 확인하세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["색 = 조명 · AO"],
        setup(F, C, L) {
          let r = 0.5, view = 0, cache = null;
          C.seg({ options: [{ value: 0, label: "조명 × AO" }, { value: 1, label: "AO만 보기" }, { value: 2, label: "AO 없이" }], value: 0, onChange: x => { view = x; } });
          C.slider({ label: "반경", min: 0.1, max: 1.2, value: r, onInput: x => { r = x; cache = null; } });
          const boxes = [[-2.6, -0.8, 1.2, 1.2, 0.8], [-0.6, 0.3, 0.9, 1.5, 1.2], [1.4, -1.2, 1.6, 0.8, 0.5], [2.4, 0.6, 0.6, 0.6, 1.4], [0.2, -1.3, 0.5, 0.5, 0.3]];
          const H = (x, y) => { let h = 0; boxes.forEach(([bx, by, w, d, hh]) => { if (x > bx && x < bx + w && y > by && y < by + d) h = Math.max(h, hh); }); return h; };
          F.draw = g => {
            const Ld = V3.norm([0.4, 0.6, 0.7]);
            if (!cache) {
              const offs = []; let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
              for (let i = 0; i < 16; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r; offs.push([Math.cos(a) * d, Math.sin(a) * d, rnd() * r * 0.8]); }
              cache = { offs };
            }
            g.field(220, (x, y) => {
              const h = H(x, y), e = 0.03;
              const n = V3.norm([(H(x - e, y) - H(x + e, y)) / (2 * e) * 0.05, (H(x, y - e) - H(x, y + e)) / (2 * e) * 0.05, 1]);
              let occ = 0;
              cache.offs.forEach(([ox, oy, oz]) => { if (H(x + ox, y + oy) > h + oz) occ++; });
              const ao = 1 - occ / cache.offs.length;
              const lit = 0.25 + 0.75 * Math.max(0, V3.dot(n, Ld));
              const base = h > 0 ? [0.85, 0.8, 0.72] : [0.6, 0.65, 0.72];
              const k = view === 1 ? ao : view === 2 ? lit : lit * ao;
              return (view === 1 ? [1, 1, 1] : base).map(c => Math.pow(clamp(c * k, 0, 1), 1 / 2.2) * 255).concat(255);
            });
          };
        }
      } },

      { h: "SSR: 깊이 버퍼 위를 걸으며 반사 찾기" },
      "매끈한 바닥의 반사를 찾기 위해 반사 광선을 ==화면(깊이 버퍼) 위에서 한 칸씩 전진==시키다가 깊이 버퍼보다 뒤로 들어가면 그 픽셀 색을 가져옵니다. 눈을 움직여 반사 광선이 ==화면 밖으로 나가는 경우==를 만들어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{res}"],
        setup(F, C, L) {
          const eye = [-3.4, 1.4], hitP = [-0.8, -1.6];
          F.vec(eye, "teal", { snap: 0.01 });
          F.vec(hitP, "white", { constrain: q => [clamp(q[0], -3.5, 2.4), -1.6], snap: 0.01 });
          const scene = x => { if (x > 0.9 && x < 1.7) return 0.6; if (x > 2.6 && x < 3.4) return 1.6; return -1.6; };
          F.draw = g => {
            g.poly([[-4, -2], [4, -2], [4, -1.6], [-4, -1.6]], { fill: "rgba(88,196,221,0.25)" });
            [[0.9, 1.7, 0.6, "pink"], [2.6, 3.4, 1.6, "gold"]].forEach(([a, b, h, c]) => g.poly([[a, -1.6], [b, -1.6], [b, h], [a, h]], { fill: hexA(PAL[c], 0.6), stroke: c, w: 2 }));
            g.poly([[-4, -2], [3.8, -2], [3.8, 2], [-4, 2]], { stroke: "white", w: 1, dash: [6, 5], alpha: 0.5 });
            g.text("화면 범위", [3.8, 2], "grey", { size: 11, align: "right", dy: 10 });
            const d = V.norm(V.sub(hitP, eye)), r = [d[0], -d[1]];
            g.line(eye, hitP, "teal", { w: 2.5 });
            let p = hitP.slice(), found = null, steps = 0;
            for (; steps < 40; steps++) {
              p = V.add(p, V.mul(r, 0.18));
              if (p[0] > 3.8 || p[1] > 2) break;
              g.dot(p, "yellow", 3);
              if (p[1] < scene(p[0])) { found = p; break; }
            }
            g.line(hitP, p, "yellow", { w: 2, alpha: 0.7 });
            g.circle(eye, 0.12, "white", { fill: PAL.bg, w: 2.5 });
            L.set("res", found ? `${steps + 1}걸음 만에 깊이 버퍼 뒤로 → 그 픽셀 색을 반사로 사용` : "화면 밖으로 나감 → 반사할 정보 없음 (큐브맵·레이트레이싱으로 대체)");
          };
        }
      } },
      { key: "화면 공간 기법은 ==싸고 그럴듯하지만, 화면에 보이지 않는 것은 모릅니다==. 화면 가장자리에서 반사가 끊기고, 물체 뒤쪽의 AO가 사라지는 이유입니다. 레이 트레이싱(31장)이 이 한계를 메웁니다." },

      { use: [
        ["엔진", "포스트 프로세스 설정", "UE의 Ambient Occlusion(SSAO·GTAO), Screen Space Reflections 품질 설정이 이 장의 샘플 수·반경·걸음 수입니다. Lumen 이전 세대의 표준이었습니다."],
        ["게임", "반사가 끊기는 순간", "물웅덩이 반사가 카메라를 숙이면 사라지는 것이 SSR의 '화면 밖' 한계입니다. 보통 큐브맵 반사로 부드럽게 넘어갑니다."],
        ["아트", "AO 맵과 SSAO", "에셋에 구운 AO 맵은 물체 내부의 작은 틈을, SSAO는 물체끼리 맞닿은 곳을 담당해 둘을 함께 씁니다."],
        ["실생활", "구석은 왜 어두운가", "방 구석이 어두운 것은 그 점에서 하늘(빛)이 보이는 각도가 좁기 때문입니다. AO는 그 '열린 정도'를 잰 것입니다."]
      ] },

      { recap: [
        ["AO = 1 − 가려진 샘플 / 전체", "주변 반구가 얼마나 막혔나"],
        ["노이즈 회전 + 블러", "적은 샘플로 부드러운 AO"],
        ["깊이 버퍼 위 레이마칭", "SSR: 화면 안에서만 반사"],
        ["화면 밖 = 정보 없음", "큐브맵·레이트레이싱으로 보완"]
      ] }
    ]
  });
})();
