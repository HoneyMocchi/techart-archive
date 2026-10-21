/* 16 그림자 */
(() => {
  const f2 = n => num(n, 2);
  // 2D 상자들과 광선 교차 (가장 가까운 거리)
  function rayBoxes(o, d, boxes) {
    let best = Infinity;
    boxes.forEach(b => {
      let t0 = -Infinity, t1 = Infinity;
      for (let k = 0; k < 2; k++) {
        if (Math.abs(d[k]) < 1e-9) { if (o[k] < b[0][k] || o[k] > b[1][k]) return; continue; }
        let a = (b[0][k] - o[k]) / d[k], c = (b[1][k] - o[k]) / d[k];
        if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      }
      if (t0 <= t1 && t1 > 0) best = Math.min(best, t0 > 0 ? t0 : t1);
    });
    return best;
  }

  lesson({
    topic: "shadow", title: "그림자", desc: "빛의 눈으로 한 번 더 보기", stage: "빛과 색",
    sym: { d: "yellow", z: "blue", b: "orange" },
    hook: "어떤 점이 그림자 안인지 알려면 =='빛에서 이 점이 보이는가?'== 를 물으면 됩니다. 섀도우 맵은 이 질문을 위해 빛의 자리에서 장면을 한 번 더 그려 두는 방법입니다.",
    blocks: [
      { h: "섀도우 맵: 빛이 본 깊이를 저장" },
      "옆에서 본 장면입니다. 위쪽 띠는 ==빛이 각 방향으로 본 가장 가까운 거리==(섀도우 맵)입니다. 바닥의 점 $P$를 끌어 보세요. 빛까지 거리 $d_P$ 가 저장된 깊이보다 크면, 무언가에 가려진 것이므로 그림자입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4.2, x1: 4.2, y0: -2.35, y1: 2.35 },
        eq: ["d_P = {dp}   vs   섀도우 맵 = {sm}   →   {res}"],
        setup(F, C, L) {
          const light = [-2.6, 2.0], P = [1.2, -1.7];
          const boxes = [[[-1.2, -1.7], [-0.4, -0.3]], [[0.6, -1.7], [1.0, -1.0]], [[2.1, -1.7], [3.2, -0.9]]];
          F.vec(light, "gold", { snap: 0.02 });
          F.vec(P, "white", { constrain: q => [q[0], -1.7], snap: 0.02 });
          F.draw = g => {
            g.poly([[-4.2, -1.7], [4.2, -1.7], [4.2, -2.35], [-4.2, -2.35]], { fill: "rgba(138,147,166,0.25)" });
            // 바닥 음영 (점마다 가려짐 판정)
            for (let x = -4.2; x < 4.2; x += 0.05) {
              const q = [x + 0.025, -1.7], dir = V.norm(V.sub(q, light)), dist = V.len(V.sub(q, light));
              const hit = rayBoxes(light, dir, boxes);
              g.line([x, -1.72], [x + 0.05, -1.72], hit < dist - 1e-3 ? "rgba(16,19,26,0.95)" : "rgba(244,211,69,0.8)", { w: 5 });
            }
            boxes.forEach(b => g.poly([b[0], [b[1][0], b[0][1]], b[1], [b[0][0], b[1][1]]], { fill: "rgba(177,137,198,0.5)", stroke: "purple", w: 2 }));
            // 섀도우 맵: 빛에서 아래쪽 부채꼴로 N개 방향
            const Nn = 48, a0 = -Math.PI * 0.95, a1 = -Math.PI * 0.05;
            for (let k = 0; k < Nn; k++) {
              const a = lerp(a0, a1, (k + 0.5) / Nn), dir = [Math.cos(a), Math.sin(a)];
              const floorT = (light[1] + 1.7) / -dir[1];
              const dpt = Math.min(rayBoxes(light, dir, boxes), dir[1] < 0 ? floorT : 99);
              const v = clamp(dpt / 7, 0, 1);
              const x0 = -4 + k * 8 / Nn;
              g.poly([[x0, 2.0], [x0 + 8 / Nn, 2.0], [x0 + 8 / Nn, 2.3], [x0, 2.3]], { fill: `rgb(${Math.round(255 * v)},${Math.round(255 * v)},${Math.round(255 * v)})` });
            }
            g.text("섀도우 맵 (밝을수록 멀다)", [-4, 2.0], "grey", { align: "left", dy: -10, size: 11 });
            const dir = V.norm(V.sub(P, light)), dp = V.len(V.sub(P, light)), sm = rayBoxes(light, dir, boxes);
            const shadowed = sm < dp - 1e-3;
            if (shadowed) {
              g.line(light, V.add(light, V.mul(dir, sm)), "gold", { w: 2.5 });
              g.line(V.add(light, V.mul(dir, sm)), P, "red", { w: 2, dash: [5, 5] });
              g.dot(V.add(light, V.mul(dir, sm)), "orange", 5);
            } else g.line(light, P, "gold", { w: 2.5 });
            g.circle(light, 0.16, "gold", { fill: "gold", w: 0 });
            g.tex("P", P, "white", { dy: 16 });
            L.set("dp", f2(dp)); L.set("sm", isFinite(sm) ? f2(Math.min(sm, dp)) : f2(dp)); L.set("res", shadowed ? "더 멀다 → 그림자" : "같다 → 빛을 받음");
          };
        }
      } },
      { key: "그림자 판정은 ==깊이 비교 한 번==입니다. 대신 빛마다 장면을 한 번 더 그려야 하므로(점광원은 6방향), 그림자를 드리우는 빛이 많을수록 비쌉니다." },

      { h: "그림자 여드름과 바이어스" },
      "섀도우 맵은 해상도가 유한해서 텍셀 하나가 ==바닥의 한 구간을 하나의 깊이로 퉁칩니다==. 그러면 같은 바닥이 자기 자신을 가리는 줄무늬(그림자 여드름)가 생깁니다. 비교할 때 조금 봐주는 값(바이어스)을 더하면 사라지지만, 너무 크면 그림자가 물체에서 떨어집니다(피터 팬 현상).",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["그림자 = d_P > 섀도우 맵 + b   (b = {b})", "{msg}"],
        setup(F, C, L) {
          let b = 0.0, res = 24, ang = 0.75;
          C.slider({ label: "바이어스 $b$", min: 0, max: 0.6, step: 0.005, value: b, onInput: x => { b = x; } });
          C.slider({ label: "섀도우 맵 해상도", min: 8, max: 96, step: 4, value: res, fmt: x => num(x, 0), onInput: x => { res = x; } });
          C.slider({ label: "빛 기울기", min: 0.2, max: 1.3, value: ang, fmt: x => num(x / DEG, 0) + "°", onInput: x => { ang = x; } });
          F.draw = g => {
            // 방향광: 빛 방향 기준 좌표 u(가로)·depth(빛까지 깊이)
            const Ld = [Math.sin(ang), -Math.cos(ang)], U = [Math.cos(ang), Math.sin(ang)];
            const box = [[0.2, -1.6], [0.9, -0.6]];
            const floorY = -1.6;
            const toLight = p => [V.dot(p, U), V.dot(p, Ld)];            // [u, depth]
            const span = [-6, 6], texel = (span[1] - span[0]) / res;
            // 텍셀마다 깊이 = 텍셀 중심 방향으로 쏜 광선의 첫 교차
            const depthAt = u => {
              const uc = span[0] + (Math.floor((u - span[0]) / texel) + 0.5) * texel;
              const o = V.sub(V.mul(U, uc), V.mul(Ld, 10));
              const tb = rayBoxes(o, Ld, [box]), tf = (floorY - o[1]) / Ld[1];
              return Math.min(tb, tf) - 10;
            };
            g.poly([[-4.2, floorY], [4.2, floorY], [4.2, -2.1], [-4.2, -2.1]], { fill: "rgba(138,147,166,0.2)" });
            let acne = 0, gap = 0;
            for (let x = -4.2; x < 4.2; x += 0.03) {
              const q = [x + 0.015, floorY], [u, dq] = toLight(q);
              const sh = dq > depthAt(u) + b + 1e-6;
              const trulyLit = !(rayBoxes(q, V.mul(Ld, -1), [box]) < 99);
              if (sh && trulyLit) acne++;
              if (!sh && !trulyLit) gap++;
              g.line([x, floorY - 0.02], [x + 0.03, floorY - 0.02], sh ? "rgba(16,19,26,1)" : "rgba(244,211,69,0.85)", { w: 7 });
            }
            g.poly([box[0], [box[1][0], box[0][1]], box[1], [box[0][0], box[1][1]]], { fill: "rgba(177,137,198,0.55)", stroke: "purple", w: 2 });
            for (let k = -6; k <= 6; k++) { const s = V.add(V.mul(U, k * 0.7), V.mul(Ld, -4)); g.arrow(s, V.add(s, V.mul(Ld, 1.3)), "gold", { w: 1.5, head: 7, alpha: 0.5 }); }
            L.set("b", f2(b));
            L.set("msg", acne > 20 ? "여드름: 바닥이 자기 자신을 가린다고 착각 → 줄무늬" : gap > 3 ? "피터 팬: 바이어스가 커서 그림자가 상자에서 떨어짐" : "적당함");
          };
        }
      } },
      "여드름은 ==빛이 비스듬할수록, 해상도가 낮을수록== 심해집니다. 그래서 엔진은 기울기에 비례하는 바이어스(slope-scaled bias)와 노멀 방향으로 살짝 미는 오프셋을 함께 씁니다.",

      { h: "부드러운 가장자리: PCF" },
      "섀도우 맵 비교는 '예/아니오'라서 가장자리가 계단처럼 딱딱합니다. ==주변 여러 텍셀과 비교해 그림자인 비율==을 쓰면(PCF) 가장자리가 부드러워집니다. 실제 그림자도 광원이 크면 부드럽습니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.2, x1: 4.2, y0: -2.1, y1: 2.1 },
        eq: ["그림자 = (가려진 샘플 수) / {n}"],
        setup(F, C, L) {
          let k = 2, res = 32;
          const occ = [-0.5, 0.2];
          F.vec(occ, "purple", { snap: 0.02 });
          C.slider({ label: "PCF 범위", min: 0, max: 5, step: 1, value: k, fmt: x => `${2 * x + 1}×${2 * x + 1}`, onInput: x => { k = x; } });
          C.slider({ label: "섀도우 맵 해상도", min: 8, max: 96, step: 4, value: res, fmt: x => num(x, 0), onInput: x => { res = x; } });
          F.draw = g => {
            const tex = 8.4 / res;
            const inShadowTexel = (x, y) => {
              const cx = (Math.floor(x / tex) + 0.5) * tex, cy = (Math.floor(y / tex) + 0.5) * tex;   // 텍셀 중심
              return Math.hypot(cx - occ[0] - 0.6, cy - occ[1] + 0.4) < 1.1;                          // 비스듬한 빛이라 그림자는 오른쪽 아래로
            };
            g.field(240, (x, y) => {
              let s = 0, n = 0;
              for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) { s += inShadowTexel(x + i * tex, y + j * tex) ? 1 : 0; n++; }
              const lit = 1 - s / n;
              return [lerp(40, 236, lit), lerp(44, 225, lit), lerp(60, 190, lit), 255];
            });
            g.circle(occ, 1.1, "purple", { fill: "rgba(177,137,198,0.65)", w: 2 });
            g.text("가리는 물체(위에 떠 있음)", occ, "white", { size: 12, bold: true });
            L.set("n", (2 * k + 1) * (2 * k + 1));
          };
        }
      } },
      "샘플이 많을수록 부드럽지만 비쌉니다. 실무에서는 ==가리는 물체와의 거리에 따라 범위를 바꾸는 PCSS==(물체에 가까운 곳은 선명, 멀수록 흐릿)나, 여러 해상도를 거리별로 나눈 ==캐스케이드 섀도우 맵==을 함께 씁니다.",

      { use: [
        ["엔진", "캐스케이드 섀도우", "UE 디렉셔널 라이트의 Dynamic Shadow Distance·Cascade 수는 가까운 곳에 고해상도 맵을 몰아주는 설정입니다. 멀수록 흐려지는 이유입니다."],
        ["엔진", "가상 섀도우 맵", "UE5의 Virtual Shadow Map은 16k×16k 가상 텍스처에서 화면에 필요한 페이지만 그려 해상도 문제를 크게 줄였습니다."],
        ["게임", "그림자 품질 옵션", "그래픽 옵션의 그림자 품질은 맵 해상도·필터 샘플 수·그림자 거리입니다. 바이어스 설정이 틀리면 벽에 줄무늬가 생깁니다."],
        ["실생활", "해시계와 일식", "광원이 크면 그림자 가장자리가 흐릿해지는 반그림자(penumbra)는 일식과 해시계 그림자에서도 보입니다."]
      ] },

      { recap: [
        ["d_P > 섀도우 맵(P)", "빛이 본 것보다 멀면 그림자"],
        ["d_P > 섀도우 맵 + b", "바이어스: 여드름 ↔ 피터 팬 사이의 균형"],
        ["PCF = 가려진 샘플 / 전체", "부드러운 가장자리"],
        ["캐스케이드 · PCSS · VSM", "실무의 해상도·부드러움 해법"]
      ] }
    ]
  });
})();
