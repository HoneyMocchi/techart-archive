/* 12 색 · 감마 · 블렌딩 */
(() => {
  const f2 = n => num(n, 2);
  const toLin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toSrgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  const B = v => Math.round(clamp(v, 0, 1) * 255);

  lesson({
    topic: "color", title: "색 · 감마 · 블렌딩", desc: "숫자와 눈의 밝기는 다르다", stage: "빛과 색",
    sym: { c: "yellow", a: "teal", s: "pink", d: "blue" },
    hook: "모니터의 숫자 0.5는 ==빛의 양 절반이 아닙니다==. 이 어긋남(감마)을 모르면 조명·블렌딩·텍스처 필터링이 모두 조금씩 틀립니다.",
    blocks: [
      { h: "숫자 0.5는 빛의 절반이 아니다" },
      "위 띠는 ==저장된 숫자(sRGB)를 고르게==, 아래 띠는 ==실제 빛의 양(선형)을 고르게== 늘린 것입니다. 눈은 어두운 쪽 변화에 민감해서 sRGB는 어두운 쪽에 숫자를 더 많이 배정합니다. 막대를 움직여 같은 숫자가 두 띠에서 어떻게 다른지 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: 0, y1: 5, stretch: true },
        eq: ["선형 = sRGB^2.2 (대략)   →   sRGB {s} = 선형 {l}"],
        setup(F, C, L) {
          let v = 0.5;
          F.handle({ color: "yellow", get: () => [0.5 + v * 9, 4.6], set: x => { v = clamp((x - 0.5) / 9, 0, 1); } });
          F.draw = g => {
            g.field(300, (x, y) => {
              const u = clamp((x - 0.5) / 9, 0, 1);
              if (x < 0.5 || x > 9.5) return null;
              if (y > 3.1 && y < 4.3) { const c = B(u); return [c, c, c, 255]; }
              if (y > 1.7 && y < 2.9) { const c = B(toSrgb(u)); return [c, c, c, 255]; }
              return null;
            }, { smooth: false });
            g.text("숫자가 고르게 (sRGB 0 → 1)", [0.5, 4.45], "white", { align: "left", size: 12, bold: true, dy: -2 });
            g.text("빛의 양이 고르게 (선형 0 → 1)", [0.5, 1.55], "white", { align: "left", size: 12, bold: true, dy: 8 });
            // 곡선
            const pts = [];
            for (let i = 0; i <= 50; i++) { const u = i / 50; pts.push([0.5 + u * 9, 0.15 + toLin(u) * 1.2]); }
            g.poly(pts, { stroke: "yellow", w: 2.5, close: false });
            g.line([0.5, 0.15], [9.5, 1.35], "grey", { w: 1, dash: [4, 4] });
            const x = 0.5 + v * 9;
            g.line([x, 3.1], [x, 4.3], "yellow", { w: 2 });
            g.line([0.5 + toLin(v) * 9, 1.7], [0.5 + toLin(v) * 9, 2.9], "yellow", { w: 2 });
            g.line([x, 3.1], [0.5 + toLin(v) * 9, 2.9], "yellow", { w: 1.2, dash: [4, 4] });
            g.dot([x, 0.15 + toLin(v) * 1.2], "yellow", 5);
            L.set("s", f2(v)); L.set("l", f2(toLin(v)));
          };
        }
      } },
      { key: "텍스처와 화면은 ==sRGB(감마 적용) 숫자==로 저장되고, 빛의 계산(더하기·곱하기·평균)은 ==선형 공간==에서 해야 맞습니다. 그래서 셰이더는 텍스처를 읽을 때 선형으로 풀고, 화면에 쓸 때 다시 sRGB로 감습니다." },

      { h: "어디서 섞느냐에 따라 색이 다르다" },
      "빨강과 초록을 섞어 보겠습니다. ==sRGB 숫자를 그대로 평균==하면 가운데가 칙칙하게 어두워지고, ==선형으로 풀어서 평균==하면 밝은 노랑이 됩니다. 실제 빛을 섞으면 후자가 맞습니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["가운데 색: sRGB 평균 ({a1}, {a2}, 0)   vs   선형 평균 ({b1}, {b2}, 0)"],
        setup(F, C, L) {
          const pal = { "빨강 → 초록": [[1, 0, 0], [0, 1, 0]], "파랑 → 노랑": [[0, 0, 1], [1, 1, 0]], "검정 → 흰색": [[0, 0, 0], [1, 1, 1]] };
          let key = "빨강 → 초록";
          C.seg({ options: Object.keys(pal).map(k => ({ value: k, label: k })), value: key, onChange: x => { key = x; } });
          F.draw = g => {
            const [A, Bc] = pal[key];
            g.field(300, (x, y) => {
              const u = clamp((x - 0.5) / 9, 0, 1);
              if (x < 0.5 || x > 9.5) return null;
              if (y > 2.3 && y < 3.6) return [...A.map((a, i) => B(lerp(a, Bc[i], u))), 255];
              if (y > 0.5 && y < 1.8) return [...A.map((a, i) => B(toSrgb(lerp(toLin(a), toLin(Bc[i]), u)))), 255];
              return null;
            }, { smooth: false });
            g.text("sRGB 숫자 그대로 섞기", [0.5, 3.6], "white", { align: "left", size: 12, bold: true, dy: -10 });
            g.text("선형으로 풀어서 섞기", [0.5, 1.8], "white", { align: "left", size: 12, bold: true, dy: -10 });
            g.line([5, 0.4], [5, 3.7], "white", { w: 1, dash: [3, 4], alpha: 0.6 });
            const m1 = A.map((a, i) => lerp(a, Bc[i], 0.5)), m2 = A.map((a, i) => toSrgb(lerp(toLin(a), toLin(Bc[i]), 0.5)));
            L.set("a1", f2(m1[0])); L.set("a2", f2(m1[1])); L.set("b1", f2(m2[0])); L.set("b2", f2(m2[1]));
          };
        }
      } },
      "그라데이션, 블러, 밉맵 생성, 텍스처 필터링이 모두 '섞기'입니다. ==sRGB 텍스처 포맷을 지정하면 GPU가 읽을 때 자동으로 선형으로 풀어 줍니다==. 반대로 노멀 맵이나 마스크처럼 '색이 아닌 숫자'는 선형으로 저장해야 합니다.",

      { h: "알파 블렌딩: 순서가 중요하다" },
      "반투명 사각형 두 장을 겹칩니다. 기본 알파 블렌딩은 ==새 색 × α + 기존 색 × (1 − α)== 라서 그리는 순서가 바뀌면 결과도 바뀝니다. 더하기 블렌딩은 순서와 무관합니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = "alpha", order = 0, a = 0.6;
          const A = [-1.9, -0.2], Bp = [0.3, 0.3];
          F.vec(A, "pink", { snap: 0.02 }); F.vec(Bp, "teal", { snap: 0.02 });
          C.seg({ options: [{ value: "alpha", label: "알파" }, { value: "add", label: "더하기" }, { value: "mul", label: "곱하기" }], value: mode, onChange: x => { mode = x; } });
          C.seg({ options: [{ value: 0, label: "분홍 먼저" }, { value: 1, label: "청록 먼저" }], value: 0, onChange: x => { order = x; } });
          C.slider({ label: "불투명도 $a$", min: 0, max: 1, value: a, onInput: x => { a = x; } });
          const P = rgb("pink").map(v => toLin(v / 255)), T = rgb("teal").map(v => toLin(v / 255)), BG = [0.03, 0.035, 0.05];
          F.draw = g => {
            const inA = (x, y) => Math.abs(x - A[0]) < 1.4 && Math.abs(y - A[1]) < 1.1;
            const inB = (x, y) => Math.abs(x - Bp[0]) < 1.4 && Math.abs(y - Bp[1]) < 1.1;
            const blend = (dst, src) => mode === "alpha" ? dst.map((d, i) => src[i] * a + d * (1 - a)) : mode === "add" ? dst.map((d, i) => d + src[i] * a) : dst.map((d, i) => d * lerp(1, src[i], a));
            g.field(240, (x, y) => {
              let c = mode === "mul" ? [0.8, 0.8, 0.8] : BG.slice();
              const layers = order === 0 ? [[inA, P], [inB, T]] : [[inB, T], [inA, P]];
              layers.forEach(([hit, col]) => { if (hit(x, y)) c = blend(c, col); });
              return [...c.map(v => B(toSrgb(v))), 255];
            }, { smooth: false });
            L.set("eq", mode === "alpha" ? "$결과 = 새 색 · a + 기존 색 · (1 − a)$   순서를 바꾸면 겹친 곳 색이 바뀜" : mode === "add" ? "$결과 = 기존 색 + 새 색 · a$   순서와 무관, 밝아지기만 함 (불꽃·빛)" : "$결과 = 기존 색 · 새 색$   순서와 무관, 어두워지기만 함 (그림자·얼룩)");
          };
        }
      } },
      { key: "알파 블렌딩은 순서에 민감하므로 엔진은 ==반투명 물체를 뒤에서 앞으로 정렬해서== 그립니다. 그래도 서로 관통하는 반투명 물체는 정렬로 해결되지 않습니다(OIT가 필요한 이유)." },

      { h: "프리멀티플라이드 알파: 가장자리의 검은 테" },
      "빨간 잎 스프라이트를 확대해 필터링하면, ==투명한 바깥 텍셀의 색(보통 검정)이 섞여 들어와== 가장자리에 검은 테가 생깁니다. 색에 미리 알파를 곱해 두면(premultiplied) 이 문제가 사라집니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["{eq}"],
        setup(F, C, L) {
          let pre = false, zoom = 7;
          C.seg({ options: [{ value: 0, label: "일반 알파 (straight)" }, { value: 1, label: "프리멀티플라이드" }], value: 0, onChange: x => { pre = !!x; } });
          C.slider({ label: "확대", min: 3, max: 12, step: 1, value: zoom, fmt: x => "×" + x, onInput: x => { zoom = x; } });
          // 8×4 텍스처: 가운데만 불투명한 빨강, 바깥 텍셀은 색 (0,0,0), 알파 0
          const tex = (i, j) => { const inside = i >= 2 && i <= 5 && j >= 1 && j <= 2; return inside ? [1, 0.25, 0.2, 1] : [0, 0, 0, 0]; };
          const BG = [0.85, 0.85, 0.75];
          F.draw = g => {
            g.field(260, (x, y) => {
              const u = (x / 10) * 8, v = (y / 4.2) * 4;
              const fx = u - 0.5, fy = v - 0.5, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
              const s = (ii, jj) => { const c = tex(clamp(ii, 0, 7), clamp(jj, 0, 3)); return pre ? [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]] : c; };
              const c00 = s(i, j), c10 = s(i + 1, j), c01 = s(i, j + 1), c11 = s(i + 1, j + 1);
              const c = c00.map((_, k) => lerp(lerp(c00[k], c10[k], tx), lerp(c01[k], c11[k], tx), ty));
              const out = pre ? BG.map((b, k) => c[k] + b * (1 - c[3])) : BG.map((b, k) => c[k] * c[3] + b * (1 - c[3]));
              return [...out.map(B), 255];
            }, { smooth: false });
            void zoom;
            L.set("eq", pre ? "$결과 = 색 + 배경 · (1 − a)$   색에 이미 a가 곱해져 있어 바깥 검정이 섞여도 영향 없음" : "$결과 = 색 · a + 배경 · (1 − a)$   필터링 중 색이 먼저 검정과 섞여 테두리가 어두워짐");
          };
        }
      } },

      { use: [
        ["엔진", "선형 워크플로", "UE는 선형 공간에서 조명을 계산하고 마지막에 sRGB로 바꿉니다. ==마스크·러프니스 텍스처는 sRGB를 꺼야== 값이 정확합니다."],
        ["게임", "반투명 정렬 문제", "파티클·유리·UI가 겹칠 때 깜빡이는 것은 정렬 순서 문제입니다. 순서와 무관한 더하기 블렌딩을 불꽃·빛 효과에 씁니다."],
        ["UI", "아이콘의 검은 테", "아이콘 가장자리의 어두운 테는 대부분 프리멀티플라이드 알파 설정 문제입니다."],
        ["실생활", "사진 노출", "카메라 JPEG도 sRGB로 저장됩니다. 그래서 사진 편집의 '노출 +1스톱(빛 2배)'은 숫자 2배가 아닙니다."]
      ] },

      { recap: [
        ["선형 ≈ sRGB^2.2", "저장은 sRGB, 계산은 선형"],
        ["lerp(toLinear(A), toLinear(B), t)", "섞기는 선형 공간에서"],
        ["새 색 · a + 기존 색 · (1 − a)", "알파 블렌딩: 뒤에서 앞으로 그려야 함"],
        ["색 + 배경 · (1 − a)", "프리멀티플라이드: 필터링해도 테두리가 깨끗"]
      ] }
    ]
  });
})();
