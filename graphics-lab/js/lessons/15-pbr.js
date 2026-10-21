/* 14 PBR 재질 */
(() => {
  const f2 = n => num(n, 2);
  const lin = c => Math.pow(c / 255, 2.2);
  const out = v => Math.round(255 * Math.pow(clamp(v / (1 + v), 0, 1), 1 / 2.2));   // 간단한 톤매핑 + 감마
  // 쿡-토런스: GGX 분포 + 스미스 그림자 + 슐릭 프레넬
  function brdf(N, Lv, Vv, base, rough, metal) {
    const H = V3.norm(V3.add(Lv, Vv));
    const NoL = Math.max(0, V3.dot(N, Lv)), NoV = Math.max(1e-3, V3.dot(N, Vv)), NoH = Math.max(0, V3.dot(N, H)), VoH = Math.max(0, V3.dot(Vv, H));
    const a = Math.max(0.02, rough * rough), a2 = a * a;
    const dd = NoH * NoH * (a2 - 1) + 1, D = a2 / (Math.PI * dd * dd);
    const k = (rough + 1) * (rough + 1) / 8, G = (NoL / (NoL * (1 - k) + k)) * (NoV / (NoV * (1 - k) + k));
    const F0 = base.map(c => lerp(0.04, c, metal)), fw = Math.pow(1 - VoH, 5);
    const Fr = F0.map(f => f + (1 - f) * fw);
    return base.map((c, i) => {
      const spec = D * G * Fr[i] / Math.max(1e-4, 4 * NoL * NoV);
      const diff = (1 - Fr[i]) * (1 - metal) * c / Math.PI;
      return (diff + spec) * NoL * 3.2 + c * 0.04 * (1 - metal) + F0[i] * 0.06;
    });
  }
  function lightDir(p, c, R) {
    const d = [(p[0] - c[0]) / R, (p[1] - c[1]) / R], r = Math.min(V.len(d), 1.9), az = Math.atan2(d[1], d[0]), a = r * Math.PI / 2;
    return [Math.sin(a) * Math.cos(az), Math.sin(a) * Math.sin(az), Math.cos(a)];
  }
  function ball(g, c, R, shade) {
    g.field(Math.round(R * 70), (x, y) => {
      const nx = (x - c[0]) / R, ny = (y - c[1]) / R, r2 = nx * nx + ny * ny;
      if (r2 > 1) return null;
      const col = shade([nx, ny, Math.sqrt(1 - r2)]);
      return [out(col[0]), out(col[1]), out(col[2]), 255 * clamp((1 - r2) * 40, 0, 1)];
    }, { rect: { x0: c[0] - R, x1: c[0] + R, y0: c[1] - R, y1: c[1] + R } });
  }

  lesson({
    topic: "pbr", title: "PBR 재질", desc: "거칠기·금속성·에너지 보존", stage: "빛과 색",
    sym: { N: "yellow", L: "gold", V: "teal", H: "purple", D: "pink", G: "green", F: "orange", F0: "orange" },
    hook: "물리 기반 렌더링(PBR)은 '그럴듯해 보이는 공식' 대신 ==실제 빛의 규칙(에너지 보존, 미세면, 프레넬)==을 따릅니다. 그래서 아티스트는 숫자 두 개, 거칠기와 금속성만 정하면 됩니다.",
    blocks: [
      { h: "거칠기 = 아주 작은 거울들의 흐트러짐" },
      "확대하면 모든 표면은 ==작은 거울 조각(미세면)==의 모음입니다. 평행한 빛이 들어올 때, 조각들이 고르면 한 방향으로 튕기고 울퉁불퉁하면 사방으로 퍼집니다. 거칠기를 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -1.1, y1: 2.9 },
        eq: ["거칠기 {r}   →   반사 방향의 퍼짐 ±{spread}°"],
        setup(F, C, L) {
          let rough = 0.3, ang = 0.6;
          C.slider({ label: "거칠기", min: 0, max: 1, value: rough, onInput: x => { rough = x; } });
          F.handle({ color: "gold", get: () => [-Math.sin(ang) * 2.5, Math.cos(ang) * 2.5], set: (x, y) => { ang = clamp(Math.atan2(-x, Math.max(0.05, y)), -1.3, 1.3); } });
          F.draw = g => {
            let seed = 11;
            const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
            const pts = [];
            for (let x = -4; x <= 4.01; x += 0.25) pts.push([x, rnd() * rough * 0.5]);
            g.poly(pts.concat([[4, -1.1], [-4, -1.1]]), { fill: "rgba(138,147,166,0.25)", stroke: "grey", w: 2 });
            const Ld = [-Math.sin(ang), Math.cos(ang)];
            let maxDev = 0;
            for (let i = 1; i < pts.length - 2; i += 2) {
              const a = pts[i], b = pts[i + 1], m = V.lerp(a, b, 0.5);
              const n = V.norm(V.perp(V.sub(b, a)));
              const r = V.sub(V.mul(n, 2 * V.dot(n, Ld)), Ld);
              if (V.dot(n, Ld) <= 0) continue;
              g.line(V.add(m, V.mul(Ld, 3)), m, "gold", { w: 1.2, alpha: 0.5 });
              g.arrow(m, V.add(m, V.mul(r, 1.3)), "pink", { w: 2, head: 7, alpha: 0.9 });
              maxDev = Math.max(maxDev, Math.abs(Math.atan2(r[0], r[1]) - Math.atan2(Ld[0] * -1, Ld[1])));
            }
            L.set("r", f2(rough)); L.set("spread", num(maxDev / DEG, 0));
          };
        }
      } },
      "이 퍼짐을 통계로 적은 것이 ==미세면 분포 함수 $D$==(보통 GGX)입니다. 반사광은 $D·G·F / (4 (N·L)(N·V))$ 로 계산하는데, $G$는 조각끼리 가리는 그림자, $F$는 다음 장의 프레넬입니다.",

      { h: "금속과 비금속" },
      "비금속(나무·플라스틱·피부)은 빛의 일부를 ==표면에서 흰색으로 반사==하고 나머지는 안으로 들어갔다가 ==고유색으로 흩어져== 나옵니다. 금속은 안으로 들어간 빛이 바로 흡수되어 확산이 없고, 대신 ==반사광 자체에 색==이 있습니다. 금속성을 움직여 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["F0 = lerp(0.04, 기본색, 금속성) = ({f0r}, {f0g}, {f0b})", "확산 = (1 − F)·(1 − 금속성)·기본색 / π"],
        setup(F, C, L) {
          let metal = 0, rough = 0.3, col = "gold";
          const sun = [-1.6, 1.0];
          F.vec(sun, "gold", { snap: 0.01 });
          C.slider({ label: "금속성", min: 0, max: 1, value: metal, onInput: x => { metal = x; } });
          C.slider({ label: "거칠기", min: 0.03, max: 1, value: rough, onInput: x => { rough = x; } });
          C.seg({ options: [{ value: "gold", label: "금색" }, { value: "red", label: "빨강" }, { value: "white", label: "흰색" }], value: col, onChange: x => { col = x; } });
          F.draw = g => {
            const base = rgb(col).map(lin), c = [0, 0], R = 1.8;
            const Lv = lightDir(sun, c, R);
            ball(g, c, R, N => brdf(N, Lv, [0, 0, 1], base, rough, metal));
            g.circle(sun, 0.15, "gold", { fill: "gold", w: 0 });
            const F0 = base.map(b => lerp(0.04, b, metal));
            L.set("f0r", f2(F0[0])); L.set("f0g", f2(F0[1])); L.set("f0b", f2(F0[2]));
          };
        }
      } },
      { key: "PBR 재질의 핵심 입력은 ==기본색 · 금속성 · 거칠기== 셋입니다. 비금속의 반사율은 거의 모두 4% 근처($F0 ≈ 0.04$)라서 따로 정하지 않아도 됩니다." },

      { h: "재질 표: 거칠기 × 금속성" },
      "가로는 거칠기, 세로는 금속성입니다. 해를 끌어 보세요. 거칠수록 하이라이트가 ==넓고 어두워지는== 것에 주목하세요. 들어온 빛보다 많이 내보낼 수 없으니(에너지 보존), 넓게 퍼지면 한 점의 밝기는 줄어듭니다.",
      { fig: {
        aspect: 0.62, view: { x0: 0, x1: 10, y0: 0, y1: 6.2 },
        eq: ["반사광 = D·G·F / (4 (N·L)(N·V))   ·   확산 = (1 − F)(1 − 금속성)·기본색 / π"],
        setup(F, C, L) {
          const sun = [2.0, 5.6];
          F.vec(sun, "gold", { snap: 0.01 });
          let col = "red";
          C.seg({ options: [{ value: "red", label: "빨강" }, { value: "gold", label: "금색" }, { value: "teal", label: "청록" }], value: col, onChange: x => { col = x; } });
          F.draw = g => {
            const base = rgb(col).map(lin);
            const Lv = V3.norm([(sun[0] - 5) / 4, (sun[1] - 3) / 3, 0.8]);
            for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
              const c = [1.1 + i * 1.95, 1.05 + j * 2.0], R = 0.82;
              ball(g, c, R, N => brdf(N, Lv, [0, 0, 1], base, 0.05 + i * 0.235, j / 2));
            }
            for (let i = 0; i < 5; i++) g.text(num(0.05 + i * 0.235, 2), [1.1 + i * 1.95, 0.05], "grey", { size: 11 });
            ["비금속", "반금속", "금속"].forEach((t, j) => g.text(t, [0.1, 1.05 + j * 2.0], "grey", { size: 11, align: "left" }));
            g.text("거칠기 →", [5, 0.05], "grey", { size: 11, dy: -12 });
            g.circle(sun, 0.13, "gold", { fill: "gold", w: 0 });
          };
        }
      } },

      { use: [
        ["엔진", "머티리얼 핀", "UE 머티리얼의 Base Color · Metallic · Roughness · Specular 핀이 이 장의 입력입니다. Specular 기본값 0.5가 $F0 = 0.04$ 입니다."],
        ["아트", "텍스처 세트", "Substance 등에서 만드는 BaseColor·Normal·ORM(오클루전·러프니스·메탈릭) 텍스처 세트가 PBR 입력 그대로입니다."],
        ["게임", "어떤 조명에서도 맞는 재질", "PBR 이전에는 조명마다 재질을 다시 손봐야 했습니다. 에너지 보존 덕분에 낮·밤·실내 어디서도 재질이 일관되게 보입니다."],
        ["실생활", "제품 렌더와 온라인 쇼핑", "가구·자동차 광고의 3D 렌더, 쇼핑몰의 3D 미리보기가 같은 PBR 재질 모델(glTF 표준)을 씁니다."]
      ] },

      { recap: [
        ["D (GGX)", "미세면 분포: 거칠기가 클수록 넓게 퍼짐"],
        ["F0 = lerp(0.04, 기본색, 금속성)", "비금속은 4% 흰 반사, 금속은 색 있는 반사"],
        ["확산 = (1 − F)(1 − 금속성)·기본색 / π", "금속은 확산이 없음"],
        ["D·G·F / (4 (N·L)(N·V))", "쿡-토런스 반사광, 에너지 보존"]
      ] }
    ]
  });
})();
