/* 15 프레넬과 굴절 */
(() => {
  const f2 = n => num(n, 2);
  // 비편광 유전체의 정확한 프레넬 반사율
  function fresnel(cosi, n1, n2) {
    const sint = n1 / n2 * Math.sqrt(Math.max(0, 1 - cosi * cosi));
    if (sint >= 1) return 1;                               // 전반사
    const cost = Math.sqrt(1 - sint * sint);
    const rs = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost), rp = (n1 * cost - n2 * cosi) / (n1 * cost + n2 * cosi);
    return (rs * rs + rp * rp) / 2;
  }
  const schlick = (cosi, n1, n2) => { const r0 = ((n1 - n2) / (n1 + n2)) ** 2; return r0 + (1 - r0) * Math.pow(1 - cosi, 5); };
  // 굴절: d(진행 방향), n(입사 쪽을 향한 노멀)
  function refract(d, n, eta) {
    const c = -V.dot(n, d), k = 1 - eta * eta * (1 - c * c);
    if (k < 0) return null;
    return V.add(V.mul(d, eta), V.mul(n, eta * c - Math.sqrt(k)));
  }
  const reflect = (d, n) => V.sub(d, V.mul(n, 2 * V.dot(d, n)));

  lesson({
    topic: "fresnel", title: "프레넬과 굴절", desc: "비스듬할수록 거울이 된다", stage: "빛과 색",
    sym: { n: "teal", n_1: "teal", n_2: "pink", "θ": "blue", F: "orange", N: "yellow", V: "teal" },
    hook: "호수를 발밑으로 보면 물속이 보이고, 멀리 보면 하늘이 비칩니다. ==보는 각도가 비스듬할수록 반사가 강해지는 것==, 이것이 프레넬입니다. 그리고 반사되지 않은 빛은 꺾여서 들어갑니다(굴절).",
    blocks: [
      { h: "프레넬: 각도에 따라 반사율이 바뀐다" },
      "수면을 옆에서 본 그림입니다. 눈(청록 점)을 끌어 보는 각도를 바꿔 보세요. [[orange:반사되는 빛]]과 [[blue:물속으로 들어가는 빛]]의 굵기가 ==비율 그대로== 입니다. 오른쪽 그래프는 각도별 반사율입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["F(θ) = {F}   (Schlick 근사 {S})   →   들어가는 빛 = 1 − F = {T}"],
        setup(F, C, L) {
          let th = 1.1, n2 = 1.33;
          F.handle({ color: "teal", get: () => [-Math.sin(th) * 2.2 - 1.6, Math.cos(th) * 2.2], set: (x, y) => { th = clamp(Math.atan2(-(x + 1.6), Math.max(0.02, y)), 0, 1.55); } });
          C.seg({ options: [{ value: 1.33, label: "물 1.33" }, { value: 1.5, label: "유리 1.5" }, { value: 2.42, label: "다이아몬드 2.42" }], value: 1.33, onChange: x => { n2 = x; } });
          F.draw = g => {
            const o = [-1.6, 0];
            g.poly([[-4.2, 0], [0.4, 0], [0.4, -2.1], [-4.2, -2.1]], { fill: "rgba(88,196,221,0.12)" });
            g.line([-4.2, 0], [0.4, 0], "blue", { w: 2 });
            const Fv = fresnel(Math.cos(th), 1, n2), S = schlick(Math.cos(th), 1, n2);
            const inDir = [Math.sin(th), -Math.cos(th)];
            const rDir = [Math.sin(th), Math.cos(th)];
            const tDir = refract(inDir, [0, 1], 1 / n2);
            g.line(V.sub(o, V.mul(inDir, 2.2)), o, "teal", { w: 3, dash: [6, 5] });
            g.arrow(o, V.add(o, V.mul(rDir, 2.0)), "orange", { w: 1 + 12 * Fv });
            if (tDir) g.arrow(o, V.add(o, V.mul(tDir, 1.8)), "blue", { w: 1 + 12 * (1 - Fv) });
            g.line([o[0], -1.6], [o[0], 1.6], "yellow", { w: 1, dash: [3, 4], alpha: 0.6 });
            g.arc(o, 0.6, Math.PI / 2, Math.PI / 2 + th, "teal", { w: 2 });
            g.tex("θ", V.add(o, [-Math.sin(th / 2) * 0.85, Math.cos(th / 2) * 0.85]), "teal", { size: 16 });
            // 그래프
            const G0 = [1.1, -1.7], GW = 2.8, GH = 3.4;
            g.poly([G0, [G0[0] + GW, G0[1]], [G0[0] + GW, G0[1] + GH], [G0[0], G0[1] + GH]], { stroke: "rgba(236,239,244,0.25)", w: 1 });
            const p1 = [], p2 = [];
            for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI / 2; p1.push([G0[0] + a / (Math.PI / 2) * GW, G0[1] + fresnel(Math.cos(a), 1, n2) * GH]); p2.push([G0[0] + a / (Math.PI / 2) * GW, G0[1] + schlick(Math.cos(a), 1, n2) * GH]); }
            g.poly(p2, { stroke: "grey", w: 1.5, close: false, dash: [4, 4] });
            g.poly(p1, { stroke: "orange", w: 3, close: false });
            g.dot([G0[0] + th / (Math.PI / 2) * GW, G0[1] + Fv * GH], "orange", 6);
            g.text("0°", G0, "grey", { dy: 12, size: 11 }); g.text("90°", [G0[0] + GW, G0[1]], "grey", { dy: 12, size: 11 });
            g.text("반사율", [G0[0], G0[1] + GH], "grey", { dy: -10, size: 11, align: "left" });
            L.set("F", f2(Fv)); L.set("S", f2(S)); L.set("T", f2(1 - Fv));
          };
        }
      } },
      { key: "정면($θ = 0$)에서 물의 반사율은 ==겨우 2%==지만, 수면과 거의 나란히 보면 ==100%에 가까워집니다==. 게임에서는 $F ≈ F0 + (1 − F0)(1 − N·V)^5$ (슐릭 근사)를 씁니다." },

      { h: "굴절: 스넬의 법칙" },
      "빛은 매질이 바뀌면 속도가 달라져 꺾입니다. ==느린 매질(굴절률이 큰 쪽)로 들어가면 노멀 쪽으로 꺾입니다==. 빛을 끌고, 물에서 공기로 나가는 경우도 바꿔 보세요. 어느 각도를 넘으면 빛이 ==전혀 나가지 못하고 모두 반사==됩니다(전반사).",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["n_1 · sin θ_1 = n_2 · sin θ_2   →   {n1} · {s1} = {n2} · {s2}", "{msg}"],
        setup(F, C, L) {
          let th = 0.7, dir = 0;
          const pairs = [[1, 1.33], [1.33, 1], [1, 1.5], [1.5, 1]];
          F.handle({ color: "gold", get: () => [-Math.sin(th) * 2, Math.cos(th) * 2], set: (x, y) => { th = clamp(Math.atan2(-x, Math.max(0.02, y)), 0, 1.55); } });
          C.seg({ options: [{ value: 0, label: "공기 → 물" }, { value: 1, label: "물 → 공기" }, { value: 2, label: "공기 → 유리" }, { value: 3, label: "유리 → 공기" }], value: 0, onChange: x => { dir = x; } });
          F.draw = g => {
            const [n1, n2] = pairs[dir];
            g.poly([[-4.2, 0], [4.2, 0], [4.2, -2.1], [-4.2, -2.1]], { fill: n2 > n1 ? "rgba(88,196,221,0.14)" : "rgba(0,0,0,0)" });
            g.poly([[-4.2, 0], [4.2, 0], [4.2, 2.1], [-4.2, 2.1]], { fill: n1 > n2 ? "rgba(88,196,221,0.14)" : "rgba(0,0,0,0)" });
            g.line([-4.2, 0], [4.2, 0], "grey", { w: 2 });
            g.line([0, -2], [0, 2], "yellow", { w: 1, dash: [3, 4], alpha: 0.6 });
            const d = [Math.sin(th), -Math.cos(th)];
            const t = refract(d, [0, 1], n1 / n2), Fv = fresnel(Math.cos(th), n1, n2);
            g.line([-Math.sin(th) * 2, Math.cos(th) * 2], [0, 0], "gold", { w: 3 });
            g.arrow([0, 0], V.mul(reflect(d, [0, 1]), 1.8), "orange", { w: 1 + 10 * Fv, alpha: 0.9 });
            if (t) {
              g.arrow([0, 0], V.mul(t, 2), "blue", { w: 1 + 10 * (1 - Fv) });
              g.arc([0, 0], 0.7, -Math.PI / 2, -Math.PI / 2 + Math.asin(clamp(t[0], -1, 1)), "blue", { w: 2 });
            }
            g.arc([0, 0], 0.7, Math.PI / 2, Math.PI / 2 + th, "gold", { w: 2 });
            g.text(`n = ${n1}`, [-3.4, 1.7], "white", { size: 13, bold: true }); g.text(`n = ${n2}`, [-3.4, -1.7], "white", { size: 13, bold: true });
            const crit = n1 > n2 ? Math.asin(n2 / n1) : null;
            L.set("n1", n1); L.set("n2", n2); L.set("s1", f2(Math.sin(th))); L.set("s2", t ? f2(Math.abs(t[0])) : "—");
            L.set("msg", !t ? `전반사! 임계각 ${num(crit / DEG, 1)}°를 넘어 빛이 모두 반사됩니다` : crit ? `임계각 ${num(crit / DEG, 1)}° — 이보다 비스듬하면 전반사` : "느린 매질로 들어가 노멀 쪽으로 꺾임");
          };
        }
      } },

      { h: "둥근 유리 = 렌즈" },
      "평행한 빛이 유리 공을 지나갑니다. 들어갈 때 한 번, 나올 때 한 번 꺾여서 ==한 점 근처로 모입니다==. 굴절률을 바꿔 초점이 어떻게 움직이는지 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["굴절률 {n}   →   초점까지 거리 ≈ {f}"],
        setup(F, C, L) {
          let n = 1.5, rays = 13;
          C.slider({ label: "굴절률", min: 1, max: 2.4, value: n, onInput: x => { n = x; } });
          C.slider({ label: "광선 수", min: 3, max: 25, step: 2, value: rays, fmt: x => num(x, 0), onInput: x => { rays = x; } });
          F.draw = g => {
            const c = [-0.8, 0], R = 1.3;
            g.circle(c, R, "teal", { fill: "rgba(92,208,179,0.12)", w: 2 });
            const hitCircle = (o, d, inside) => {
              const oc = V.sub(o, c), b = V.dot(oc, d), cc = V.dot(oc, oc) - R * R, disc = b * b - cc;
              if (disc < 0) return null;
              const t = inside ? -b + Math.sqrt(disc) : -b - Math.sqrt(disc);
              return t > 1e-4 ? V.add(o, V.mul(d, t)) : null;
            };
            for (let k = 0; k < rays; k++) {
              const y = (k / (rays - 1) - 0.5) * 2 * R * 0.92;
              let o = [-4.2, y], d = [1, 0];
              const p1 = hitCircle(o, d, false);
              if (!p1) { g.line(o, [4.2, y], "yellow", { w: 1.5, alpha: 0.5 }); continue; }
              g.line(o, p1, "yellow", { w: 1.8 });
              let n1 = V.norm(V.sub(p1, c));
              let t1 = refract(d, n1, 1 / n);
              if (!t1) continue;
              const p2 = hitCircle(p1, t1, true);
              g.line(p1, p2, "yellow", { w: 1.8, alpha: 0.85 });
              const n2 = V.mul(V.norm(V.sub(p2, c)), -1);
              const t2 = refract(t1, n2, n);
              if (t2) g.line(p2, V.add(p2, V.mul(t2, 6)), "yellow", { w: 1.8 });
              else g.line(p2, V.add(p2, V.mul(reflect(t1, n2), 1)), "orange", { w: 1.8 });
            }
            // 근축 초점 거리(공 렌즈): f = n R / (2 (n − 1)), 중심에서
            const f = n > 1.001 ? n * R / (2 * (n - 1)) : Infinity;
            if (isFinite(f) && c[0] + f < 4.2) { g.dot([c[0] + f, 0], "pink", 6); g.text("초점", [c[0] + f, 0], "pink", { dy: 16, size: 12, bold: true }); }
            L.set("n", f2(n)); L.set("f", isFinite(f) ? f2(f) + " (반지름 " + R + " 기준)" : "∞");
          };
        }
      } },
      "가장자리를 지나는 빛은 초점보다 더 앞에서 모입니다(구면 수차). 굴절률이 2에 가까워지면 ==초점이 공의 뒷면 바로 위==로 옵니다 — 고양이 눈과 자전거 반사판이 빛을 되돌려 보내는 원리입니다.",

      { h: "게임의 굴절: 화면을 살짝 비틀기" },
      "실시간 게임은 광선을 따라가는 대신 ==이미 그려진 화면을 노멀만큼 밀어서 읽는== 싸구려(하지만 효과적인) 굴절을 씁니다. 물결 세기를 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["uv' = uv + N_xy · 세기   (그려진 화면을 밀어서 읽기)"],
        setup(F, C, L) {
          let str = 0.18;
          C.play(true);
          C.slider({ label: "굴절 세기", min: 0, max: 0.5, value: str, onInput: x => { str = x; } });
          F.loop(() => {});
          // 배경: 체크무늬 + 줄무늬
          const bg = (x, y) => { const c = (Math.floor(x * 2) + Math.floor(y * 2)) % 2 ? 1 : 0; const s = Math.sin(x * 3 + y) > 0.6; return s ? [240, 172, 95] : c ? [70, 90, 130] : [40, 52, 80]; };
          F.draw = g => {
            const t = F.t;
            g.field(260, (x, y) => {
              const inWater = Math.abs(x) < 2.4 && Math.abs(y) < 1.5;
              if (!inWater) return [...bg(x, y), 255];
              const nx = Math.sin(x * 3.1 + t * 2.1) * 0.6 + Math.sin(y * 5.3 - t * 1.7) * 0.4, ny = Math.cos(y * 3.7 + t * 1.6) * 0.6 + Math.cos(x * 4.1 - t * 2.3) * 0.4;
              const c = bg(x + nx * str, y + ny * str);
              return [c[0] * 0.8 + 20, c[1] * 0.85 + 30, c[2] * 0.9 + 45, 255];
            });
            g.poly([[-2.4, -1.5], [2.4, -1.5], [2.4, 1.5], [-2.4, 1.5]], { stroke: "teal", w: 2 });
          };
        }
      } },

      { use: [
        ["셰이더", "림 라이트와 프레넬 노드", "UE 머티리얼의 Fresnel 노드가 $(1 − N·V)^지수$ 입니다. 캐릭터 외곽선 빛, 방어막·홀로그램 가장자리 강조에 씁니다."],
        ["게임", "물 표현", "물은 가까이는 투명(굴절)하고 멀리는 하늘을 비추는(반사) 것을 프레넬로 섞습니다. 굴절은 화면을 밀어 읽는 방식으로 처리합니다."],
        ["엔진", "유리·굴절 머티리얼", "UE의 반투명 머티리얼 Refraction 입력, Pixel Normal Offset 모드가 이 장의 화면 비틀기입니다. 레이트레이싱 반투명은 실제 스넬 법칙을 씁니다."],
        ["실생활", "안경·카메라·광섬유", "안경과 카메라 렌즈는 굴절로 초점을 맞추고, 광섬유는 전반사로 빛을 가둬 수 km를 보냅니다."]
      ] },

      { recap: [
        ["F ≈ F0 + (1 − F0)(1 − N·V)^5", "슐릭 프레넬: 비스듬할수록 반사가 강함"],
        ["n_1 sin θ_1 = n_2 sin θ_2", "스넬의 법칙: 느린 매질로 가면 노멀 쪽으로"],
        ["sin θ_c = n_2 / n_1", "임계각을 넘으면 전반사"],
        ["uv' = uv + N_xy · 세기", "게임의 화면 공간 굴절"]
      ] }
    ]
  });
})();
