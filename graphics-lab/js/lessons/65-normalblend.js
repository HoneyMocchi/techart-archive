/* 65 노멀 맵 섞기: 선형 · UDN · 화이트아웃 · RNM */
(() => {
  const fd = n => num(n, 0) + "°";
  const N3 = v => V3.norm(v);
  // 두 노멀을 섞는 방법들 (탄젠트 공간, z가 위)
  const BLEND = {
    lin: (a, b) => N3([a[0] + b[0], a[1] + b[1], a[2] + b[2]]),
    udn: (a, b) => N3([a[0] + b[0], a[1] + b[1], a[2]]),
    wo: (a, b) => N3([a[0] + b[0], a[1] + b[1], a[2] * b[2]]),
    rnm: (a, b) => {   // 기본 노멀이 (0,0,1)을 a로 돌리는 회전을 b에 적용 (Barré-Brisebois & Hill)
      const t = [a[0], a[1], a[2] + 1], u = [-b[0], -b[1], b[2]], k = V3.dot(t, u) / t[2];
      return N3([t[0] * k - u[0], t[1] * k - u[1], t[2] * k - u[2]]);
    }
  };
  const NAMES = { lin: "평균(더하고 정규화)", udn: "UDN", wo: "화이트아웃", rnm: "RNM" };
  const COLS = { lin: "grey", udn: "blue", wo: "teal", rnm: "orange" };

  lesson({
    topic: "normalblend", title: "노멀 맵 섞기", desc: "더하면 안 되는 이유와 RNM", stage: "그래픽스 연구 노트",
    sym: { n: "yellow", d: "teal", r: "orange" },
    hook: "큰 굴곡 노멀 맵 위에 잔주름 디테일 노멀 맵을 얹는 일은 매일 합니다. 그런데 두 노멀을 ==그냥 더해 정규화하면 디테일이 납작해집니다==. 노멀은 색이 아니라 방향이라서, 올바른 합성은 ==한 노멀만큼 다른 노멀을 돌리는 것==입니다. 콜랭 바레브리즈부아와 스티븐 힐의 'Blending in Detail'이 정리한 방법들을 비교합니다.",
    blocks: [
      { h: "각도로 보면 바로 보인다" },
      "단면(옆에서 본 표면)에서 기본 노멀 $n_1$ 과 디테일 노멀 $n_2$ 의 기울기를 조절해 보세요. 정답은 ==기울기가 더해지는 것==($θ_1 + θ_2$)입니다. 평균은 대략 절반, UDN·화이트아웃은 큰 각도에서 모자랍니다. RNM만 정확히 합이 됩니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -0.4, y1: 1.6 },
        eq: ["θ₁ = {a1}, θ₂ = {a2}  →  정답 {sum}   ·   평균 {lin}  ·  UDN {udn}  ·  화이트아웃 {wo}  ·  RNM {rnm}"],
        setup(F, C, L) {
          let a1 = 35, a2 = 30;
          C.slider({ label: "기본 노멀 기울기 $θ_1$", min: -80, max: 80, step: 1, value: a1, fmt: fd, onInput: x => { a1 = x; } });
          C.slider({ label: "디테일 노멀 기울기 $θ_2$", min: -80, max: 80, step: 1, value: a2, fmt: fd, onInput: x => { a2 = x; } });
          F.draw = g => {
            const n1 = [Math.sin(a1 * DEG), 0, Math.cos(a1 * DEG)], n2 = [Math.sin(a2 * DEG), 0, Math.cos(a2 * DEG)];
            const O = [0, 0];
            g.line([-1.9, 0], [1.9, 0], "grey", { w: 2 });
            g.arc(O, 1.4, 0, Math.PI, "white", { w: 1, alpha: 0.2 });
            g.arrow(O, [n1[0] * 0.9, n1[2] * 0.9], "yellow", { label: "n₁", w: 2.5 });
            g.arrow(O, [n2[0] * 0.6, n2[2] * 0.6], "teal", { label: "n₂", w: 2 });
            g.line(O, [Math.sin((a1 + a2) * DEG) * 1.5, Math.cos((a1 + a2) * DEG) * 1.5], "white", { w: 1.5, dash: [5, 5] });
            Object.keys(BLEND).forEach(k => {
              const r = BLEND[k](n1, n2), ang = Math.atan2(r[0], r[2]) / DEG;
              g.arrow(O, [r[0] * 1.35, r[2] * 1.35], COLS[k], { w: k === "rnm" ? 3 : 2, alpha: 0.9 });
              L.set(k, fd(ang));
            });
            g.text("점선 = 정답(θ₁ + θ₂)", [1.9, -0.25], "grey", { size: 11, align: "right" });
            L.set("a1", fd(a1)); L.set("a2", fd(a2)); L.set("sum", fd(a1 + a2));
          };
        }
      } },

      { h: "표면에 얹어 보기" },
      "큰 물결(기본) 위에 잔물결(디테일)을 얹은 표면을 비스듬한 빛으로 비췄습니다. 방법을 바꿔 보면 평균은 ==디테일과 굴곡이 모두 약해지고==, RNM은 큰 굴곡의 경사면에서도 잔물결이 살아 있습니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let m = "rnm", det = 1, sun = 2.4;
          C.seg({ options: Object.keys(NAMES).map(k => ({ value: k, label: NAMES[k] })), value: m, onChange: x => { m = x; } });
          C.slider({ label: "디테일 세기", min: 0, max: 2, value: det, onInput: x => { det = x; } });
          C.slider({ label: "빛 방향", min: 0, max: 6.28, value: sun, fmt: x => num(x / DEG, 0) + "°", onInput: x => { sun = x; } });
          F.draw = g => {
            const Ld = V3.norm([Math.cos(sun), Math.sin(sun), 0.45]);
            g.field(200, (x, y) => {
              // 기본: 큰 물결의 기울기,  디테일: 잔물결의 기울기 (높이장의 해석적 미분)
              const bx = 1.6 * Math.cos(x * 4.5) * Math.cos(y * 3), by = -1.2 * Math.sin(x * 4.5) * Math.sin(y * 3);
              const dx = det * 0.5 * Math.cos(x * 40 + y * 12), dy = det * 0.5 * Math.cos(y * 38 - x * 10);
              const n1 = N3([-bx, -by, 1]), n2 = N3([-dx, -dy, 1]), n = BLEND[m](n1, n2);
              const d = Math.max(0, V3.dot(n, Ld)), v = 0.08 + 0.92 * d;
              return [v * 225, v * 200, v * 170, 255];
            });
            L.set("eq", { lin: "$normalize(n_1 + n_2)$   두 방향의 중간 → 굴곡도 디테일도 절반쯤", udn: "$normalize(n_1.xy + n_2.xy, n_1.z)$   싸지만 가파른 곳에서 디테일이 약해짐", wo: "$normalize(n_1.xy + n_2.xy, n_1.z · n_2.z)$   UDN보다 조금 더 정확", rnm: "$n_2$ 를 '(0,0,1) → $n_1$' 회전으로 돌림   기울기가 정확히 더해짐" }[m]);
          };
        }
      } },
      { key: "노멀 맵의 RGB는 ==방향을 0~1로 옮겨 담은 것==이지 색이 아닙니다. 포토샵의 오버레이나 머티리얼의 Lerp로 섞으면 길이가 줄고 방향이 엉킵니다. UE의 BlendAngleCorrectedNormals 노드가 RNM입니다." },

      { use: [
        ["엔진", "UE·Unity 노드", "UE 머티리얼 함수 BlendAngleCorrectedNormals(RNM), Unity Shader Graph의 Normal Blend 노드(Reoriented 모드)가 이 장의 식입니다."],
        ["TA", "디테일 노멀과 트라이플래너", "캐릭터 피부의 모공 디테일 맵, 바위의 타일링 디테일 맵을 얹을 때 RNM을 씁니다. 11장 트라이플래너의 축별 노멀을 섞을 때도 같은 문제가 생깁니다(벤 골루스 'Normal Mapping for a Triplanar Shader')."],
        ["툴", "Substance·Photoshop", "Substance Designer의 Normal Blend(디테일 모드)와 Photoshop 액션 'Normal Map Combine'도 같은 원리로 섞어야 결과가 맞습니다."],
        ["글", "원문", "Barré-Brisebois & Hill, 'Blending in Detail'(2012) 블로그 글에 각 방법의 식과 비교 그림이 있습니다."]
      ] },

      { recap: [
        ["normalize(n₁ + n₂)", "평균: 디테일이 납작해짐"],
        ["(n₁.xy + n₂.xy, n₁.z)", "UDN: 싸지만 근사"],
        ["(n₁.xy + n₂.xy, n₁.z · n₂.z)", "화이트아웃: 조금 더 정확"],
        ["n₂를 n₁만큼 회전", "RNM: 기울기가 정확히 더해짐"]
      ] }
    ]
  });
})();
