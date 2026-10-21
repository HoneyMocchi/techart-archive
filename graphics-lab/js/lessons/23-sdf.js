/* 21 SDF와 레이마칭 */
(() => {
  const f2 = n => num(n, 2);
  const sdCircle = (p, c, r) => Math.hypot(p[0] - c[0], p[1] - c[1]) - r;
  const sdBox = (p, c, b) => { const dx = Math.abs(p[0] - c[0]) - b[0], dy = Math.abs(p[1] - c[1]) - b[1]; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0); };
  const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
  // iq 스타일 거리장 색: 바깥 주황, 안쪽 파랑, 등고선 줄무늬, 경계 흰 선
  function sdfColor(d) {
    const out = d > 0 ? [0.9, 0.6, 0.3] : [0.4, 0.7, 0.85];
    const k = (1 - Math.exp(-4 * Math.abs(d))) * (0.8 + 0.2 * Math.cos(60 * d));
    let c = out.map(v => v * k);
    const e = clamp(1 - Math.abs(d) / 0.015, 0, 1);
    c = c.map(v => lerp(v, 1, e));
    return [c[0] * 255, c[1] * 255, c[2] * 255, 255];
  }

  lesson({
    topic: "sdf", title: "SDF와 레이마칭", desc: "모양 = 거리 함수", stage: "셰이더로 그리기",
    sym: { d: "yellow", k: "orange", p: "white", t: "teal" },
    hook: "모양을 삼각형으로 적는 대신 =='이 점에서 표면까지 얼마나 머냐'를 돌려주는 함수==로 적을 수 있습니다(부호 있는 거리장, SDF). 그러면 합치기·깎기·부드럽게 녹이기가 $min$, $max$ 한 줄이 됩니다.",
    blocks: [
      { h: "거리장: 안은 음수, 밖은 양수" },
      "원과 상자의 SDF를 그렸습니다. 줄무늬가 ==같은 거리의 등고선==, 흰 선이 $d = 0$ 인 표면입니다. 흰 점을 끌면 그 점에서의 거리가 원으로 보입니다. 합치는 방식을 바꿔 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["{op}", "d(p) = {d}"],
        setup(F, C, L) {
          const cc = [-0.45, 0.05], bc = [0.45, -0.1], P = [0.9, 0.7];
          let op = "union", k = 0.25;
          F.vec(cc, "teal", { snap: 0.01 }); F.vec(bc, "pink", { snap: 0.01 }); F.vec(P, "white", { snap: 0.01 });
          C.seg({ options: [{ value: "union", label: "합치기 min" }, { value: "inter", label: "교집합 max" }, { value: "sub", label: "깎기" }, { value: "smooth", label: "부드럽게 녹이기" }], value: op, onChange: x => { op = x; } });
          C.slider({ label: "녹임 $k$", min: 0, max: 0.6, value: k, onInput: x => { k = x; } });
          const scene = p => {
            const a = sdCircle(p, cc, 0.45), b = sdBox(p, bc, [0.4, 0.3]);
            return op === "union" ? Math.min(a, b) : op === "inter" ? Math.max(a, b) : op === "sub" ? Math.max(a, -b) : smin(a, b, k);
          };
          F.draw = g => {
            g.field(240, (x, y) => sdfColor(scene([x, y])));
            const d = scene(P);
            g.circle(P, Math.abs(d), "white", { w: 1.5, dash: [4, 4] });
            L.set("d", f2(d));
            L.set("op", { union: "$d = min(d_원, d_상자)$", inter: "$d = max(d_원, d_상자)$", sub: "$d = max(d_원, −d_상자)$", smooth: "$d = smin(d_원, d_상자, k)$   경계를 k 만큼 부드럽게 녹임" }[op]);
          };
        }
      } },
      { key: "SDF끼리 ==$min$은 합집합, $max$는 교집합, $max(a, −b)$는 빼기==입니다. 삼각형 메시로는 어려운 부드러운 융합(smooth min)도 식 한 줄입니다." },

      { h: "레이마칭: 거리만큼 안심하고 전진" },
      "SDF가 있으면 광선을 쏘아 표면을 찾기 쉽습니다. 현재 위치의 거리 $d$만큼은 ==아무것도 없다는 보장==이 있으니 그만큼 한 번에 전진하면 됩니다(구 추적). 원이 각 걸음의 안전 반경입니다. 광선 방향을 끌어 보세요.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["p ← p + d(p) · 방향   ({n}걸음, {res})"],
        setup(F, C, L) {
          const O = [-1.8, -0.7], aim = [-0.9, -0.2];
          F.vec(O, "white", { snap: 0.01 });
          F.vec(aim, "yellow", { base: () => O, constrain: q => V.mul(V.norm(q), 0.6), snap: 0.001 });
          const scene = p => Math.min(sdCircle(p, [0.5, 0.35], 0.4), sdBox(p, [0.9, -0.55], [0.35, 0.25]), sdCircle(p, [-0.4, 0.75], 0.25), p[1] + 1.05);
          F.draw = g => {
            g.field(200, (x, y) => { const d = scene([x, y]); const c = sdfColor(d); return [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 255]; });
            const dir = V.norm(aim);
            let p = O.slice(), n = 0, hit = false;
            for (; n < 64; n++) {
              const d = scene(p);
              if (d < 0.004) { hit = true; break; }
              if (V.len(p) > 4) break;
              g.circle(p, d, "yellow", { w: 1.2, alpha: 0.6 });
              const q = V.add(p, V.mul(dir, d));
              g.line(p, q, "yellow", { w: 2 });
              g.dot(p, "yellow", 3);
              p = q;
            }
            if (hit) g.dot(p, "pink", 6);
            L.set("n", n); L.set("res", hit ? "표면에 닿음" : "놓침");
          };
        }
      } },
      "표면을 스치듯 지나가면 걸음 수가 늘어납니다. ==걸음 수 자체를 어둡기로 쓰면== 틈새가 어두워지는 값싼 앰비언트 오클루전이 되기도 합니다.",

      { h: "3D 레이마칭 렌더" },
      "같은 방법을 픽셀마다 3D로 하면 메시 없이 장면이 그려집니다. 구와 상자를 $smin$으로 녹였고, ==노멀은 거리장의 기울기==(옆으로 조금씩 움직여 잰 차이)로 구합니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["N = normalize(∇d) ≈ normalize(d(p + ε) − d(p − ε))", "녹임 k = {k}"],
        setup(F, C, L) {
          let k = 0.35, rot = 0.4;
          C.slider({ label: "녹임 $k$", min: 0, max: 0.8, value: k, onInput: x => { k = x; } });
          C.play();
          F.loop(dt => { rot += dt * 0.6; });
          C.slider({ label: "돌리기", min: -3.14, max: 3.14, value: rot, fmt: x => num(x / DEG, 0) + "°", onInput: x => { rot = x; } });
          const Ld = V3.norm([0.6, 0.8, -0.4]);
          F.draw = g => {
            const by = 0.15 + 0.35 * Math.sin(rot * 1.3), cr = Math.cos(rot), sr = Math.sin(rot);
            // 물체만의 거리(바닥은 평면이라 따로 식으로 맞힘)
            const so = (x, y, z) => {
              const qx = x * cr - z * sr, qz = x * sr + z * cr;
              const s = Math.sqrt((qx - 0.35) ** 2 + (y - by) ** 2 + qz * qz) - 0.42;
              const dx = Math.abs(qx + 0.35) - 0.3, dy = Math.abs(y) - 0.3, dz = Math.abs(qz) - 0.3;
              const mx = Math.max(dx, 0), my = Math.max(dy, 0), mz = Math.max(dz, 0);
              return smin(s, Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(dx, dy, dz), 0) - 0.04, k);
            };
            const ro = [0, 0.35, -2.6], BC = [0, 0.1, 0], BR = 1.25;
            g.field(F.playing ? 100 : 150, (x, y) => {        // 재생 중엔 해상도를 낮춰 부드럽게
              const rd = V3.norm([x * 0.55, y * 0.55 - 0.12, 1]);
              // 바닥(y = −0.5)까지의 거리는 식으로 바로
              const tf = rd[1] < 0 ? (ro[1] + 0.5) / -rd[1] : 1e9;
              // 물체를 감싼 구에 닿는 광선만 행진 (나머지 픽셀은 건너뜀)
              const oc = V3.sub(ro, BC), bb = V3.dot(oc, rd), cc = V3.dot(oc, oc) - BR * BR, disc = bb * bb - cc;
              let t = 1e9, steps = 0;
              if (disc > 0) {
                let tt = Math.max(0, -bb - Math.sqrt(disc)); const t1 = Math.min(-bb + Math.sqrt(disc), tf);
                for (; steps < 48 && tt < t1; steps++) { const d = so(ro[0] + rd[0] * tt, ro[1] + rd[1] * tt, ro[2] + rd[2] * tt); if (d < 0.002) { t = tt; break; } tt += d; }
              }
              const onFloor = t > tf;
              if (onFloor) t = tf;
              if (t > 8) return [16 + y * 20, 19 + y * 25, 30 + y * 40, 255];
              const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t], e = 0.002;
              let n = [0, 1, 0];
              if (!onFloor) {
                // 사면체 네 점으로 기울기 추정 (6번 대신 4번 계산)
                const a = so(p[0] + e, p[1] - e, p[2] - e), b = so(p[0] - e, p[1] - e, p[2] + e), c = so(p[0] - e, p[1] + e, p[2] - e), d = so(p[0] + e, p[1] + e, p[2] + e);
                n = V3.norm([a - b - c + d, -a - b + c + d, -a + b - c + d]);
              }
              let sh = 1, st = 0.02;
              for (let i = 0; i < 16 && st < 3; i++) { const h = so(p[0] + Ld[0] * st, p[1] + Ld[1] * st, p[2] + Ld[2] * st); if (h < 0.001) { sh = 0; break; } sh = Math.min(sh, 8 * h / st); st += h; }
              // 바닥은 물체와의 거리로, 물체는 걸음 수로 AO 근사
              const ao = onFloor ? clamp(0.55 + so(p[0], p[1], p[2]) * 1.2, 0.55, 1) : 1 - steps / 70;
              const dif = Math.max(0, V3.dot(n, Ld)) * sh;
              const base = onFloor ? ((Math.floor(p[0] * 2) + Math.floor(p[2] * 2)) & 1 ? [0.5, 0.52, 0.55] : [0.38, 0.4, 0.44]) : [0.95, 0.55, 0.35];
              return base.map(c => Math.pow(clamp(c * (0.12 + 0.95 * dif) * ao, 0, 1), 1 / 2.2) * 255).concat(255);
            });
            L.set("k", f2(k));
          };
        }
      } },

      { use: [
        ["엔진", "거리장(Distance Field)", "UE의 메시 거리장은 각 메시의 SDF를 미리 구워 둔 것으로, 부드러운 그림자·AO·Lumen의 소프트웨어 레이트레이싱에 씁니다."],
        ["셰이더", "SDF 폰트와 UI", "글자를 SDF 텍스처로 저장하면 아주 작은 텍스처로 어떤 크기에서도 선명한 글자와 외곽선·그림자를 그립니다."],
        ["게임", "부드러운 모델링", "Dreams(PS4), Claybook은 장면 전체를 SDF로 만들어 찰흙처럼 녹이고 깎는 조형을 했습니다."],
        ["실생활", "3D 프린팅·CAD", "SDF는 두께 계산, 부드러운 필렛, 격자 구조 설계에 쓰이고, 의료 영상의 장기 경계 표현에도 쓰입니다."]
      ] },

      { recap: [
        ["d(p) < 0 안, > 0 밖", "부호 있는 거리장"],
        ["min · max · max(a, −b)", "합치기 · 교집합 · 빼기"],
        ["smin(a, b, k)", "부드럽게 녹이기"],
        ["p ← p + d(p)·방향", "구 추적 레이마칭"],
        ["N = normalize(∇d)", "노멀은 거리장의 기울기"]
      ] }
    ]
  });
})();
