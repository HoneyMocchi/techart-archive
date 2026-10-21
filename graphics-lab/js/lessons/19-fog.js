/* 17 안개와 높이 안개 */
(() => {
  const f2 = n => num(n, 2);
  const FOG = [178, 196, 214], SUN = [255, 214, 150];

  lesson({
    topic: "fog", title: "안개와 높이 안개", desc: "멀수록, 낮을수록 흐려진다", stage: "빛과 색",
    sym: { d: "yellow", h: "red", a: "teal", k: "orange", T: "blue", "σ": "teal" },
    hook: "공기 중의 입자는 빛을 조금씩 가리고 조금씩 흩뿌립니다. ==거리를 지날수록 원래 색은 지수적으로 줄고, 안개 색이 그 자리를 채웁니다==. 높이 안개는 여기에 '아래쪽일수록 짙다'를 더한 것입니다.",
    blocks: [
      { h: "거리 안개: 투과율은 지수적으로 줄어든다" },
      "같은 기둥들이 점점 멀어집니다. 안개 밀도 $σ$ 를 바꿔 보세요. 원래 색이 남는 비율(투과율) $T = e^(−σ·d)$ 는 ==직선이 아니라 지수 곡선==이라, 가까운 곳은 금방 변하고 먼 곳은 서서히 안개색에 수렴합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: 0, y1: 5, stretch: true },
        eq: ["T = e^(−σ·d)   →   거리 {d} 에서 T = {t}", "색 = 물체 색 · T + 안개 색 · (1 − T)"],
        setup(F, C, L) {
          let s = 0.25, probe = 4;
          C.slider({ label: "밀도 $σ$", min: 0, max: 1, value: s, onInput: x => { s = x; } });
          F.handle({ color: "yellow", get: () => [0.6 + probe * 0.9, 0.35], set: x => { probe = clamp((x - 0.6) / 0.9, 0, 10); } });
          F.draw = g => {
            // 아래: 투과율 곡선
            const pts = [];
            for (let i = 0; i <= 100; i++) { const d = i / 10; pts.push([0.6 + d * 0.9, 0.35 + Math.exp(-s * d) * 1.6]); }
            g.line([0.6, 0.35], [9.6, 0.35], "grey", { w: 1 });
            g.poly(pts, { stroke: "blue", w: 3, close: false });
            const T = Math.exp(-s * probe);
            g.line([0.6 + probe * 0.9, 0.35], [0.6 + probe * 0.9, 0.35 + T * 1.6], "yellow", { w: 1.5, dash: [3, 4] });
            g.dot([0.6 + probe * 0.9, 0.35 + T * 1.6], "yellow", 5);
            g.text("투과율 T", [0.6, 1.95], "blue", { align: "left", size: 11, dy: -6 });
            // 위: 같은 기둥 9개를 거리 1~9에
            g.poly([[0, 2.4], [10, 2.4], [10, 5], [0, 5]], { fill: `rgb(${FOG.join(",")})` });
            for (let i = 1; i <= 9; i++) {
              const t = Math.exp(-s * i), base = [220, 90, 70];
              const c = base.map((v, k) => Math.round(v * t + FOG[k] * (1 - t)));
              const x = 0.6 + i * 0.9, hgt = 2.1 / Math.sqrt(i) + 0.3;
              g.poly([[x - 0.18, 2.55], [x + 0.18, 2.55], [x + 0.18, 2.55 + hgt], [x - 0.18, 2.55 + hgt]], { fill: `rgb(${c.join(",")})` });
            }
            L.set("d", f2(probe)); L.set("t", f2(T));
          };
        }
      } },

      { h: "높이 안개: 아래쪽이 짙다" },
      "실제 안개는 지면 근처에 깔립니다. 밀도를 ==높이에 따라 지수적으로 줄어들게== $σ(h) = a · e^(−k·h)$ 로 두면, 시선을 따라 쌓이는 안개의 양을 식 하나로 계산할 수 있습니다. 시선 방향(노란 점)을 위아래로 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -0.5, x1: 9.5, y0: -0.5, y1: 4.5 },
        eq: ["σ(h) = a · e^(−k·h)", "시선을 따라 쌓인 양 = a · e^(−k·h_0) · (1 − e^(−k·d·sin φ)) / (k·sin φ) = {od}   →   T = {t}"],
        setup(F, C, L) {
          let a = 0.6, k = 0.9, camH = 1.2;
          const aim = [6, 2.2];
          F.vec(aim, "yellow", { constrain: q => [clamp(q[0], 1, 9.3), clamp(q[1], -0.3, 4.3)], snap: 0.02 });
          C.slider({ label: "밀도 $a$", min: 0, max: 1.5, value: a, onInput: x => { a = x; } });
          C.slider({ label: "높이 감쇠 $k$", min: 0.05, max: 3, value: k, onInput: x => { k = x; } });
          C.slider({ label: "카메라 높이", min: 0, max: 3.5, value: camH, onInput: x => { camH = x; } });
          F.draw = g => {
            g.field(200, (x, y) => {
              if (y < 0) return [60, 66, 70, 255];
              const dens = a * Math.exp(-k * y);
              const v = clamp(dens / 0.9, 0, 1);
              return [lerp(16, FOG[0], v), lerp(19, FOG[1], v), lerp(26, FOG[2], v), 255];
            });
            g.line([-0.5, 0], [9.5, 0], "grey", { w: 2 });
            const cam = [0.3, camH], dv = V.sub(aim, cam), d = V.len(dv), sinp = dv[1] / d;
            const od = Math.abs(sinp) < 1e-4 ? a * Math.exp(-k * camH) * d : a * Math.exp(-k * camH) * (1 - Math.exp(-k * d * sinp)) / (k * sinp);
            g.line(cam, aim, "yellow", { w: 3 });
            g.circle(cam, 0.14, "white", { fill: PAL.bg, w: 2.5 });
            g.text("카메라", cam, "white", { dy: -16, size: 11, bold: true });
            for (let h = 0.5; h <= 4; h += 1) g.text("h=" + h, [9.2, h], "grey", { size: 10, align: "right" });
            L.set("od", f2(od)); L.set("t", f2(Math.exp(-od)));
          };
        }
      } },
      { key: "높이 안개는 ==위로 볼수록 빨리 맑아지고, 아래로 볼수록 끝없이 짙어집니다==. 시선 위의 적분이 식 하나로 풀려서(지수 함수의 적분) 픽셀마다 비싼 반복 없이 계산됩니다." },

      { h: "장면에 적용: 태양 쪽 산란까지" },
      "산 능선과 바닥이 있는 장면에 높이 안개를 씌웁니다. 해 쪽을 바라볼 때 ==안개가 해 색으로 밝게 빛나는== 것(방향성 산란)까지 넣으면 공기의 깊이가 살아납니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["색 = 장면 · T + (안개 색 + 해 색 · max(0, V·L)^8) · (1 − T)"],
        setup(F, C, L) {
          let a = 0.35, k = 0.7, sunAz = 0.4, sunAmt = 0.8;
          C.slider({ label: "밀도", min: 0, max: 1.2, value: a, onInput: x => { a = x; } });
          C.slider({ label: "높이 감쇠", min: 0.1, max: 2.5, value: k, onInput: x => { k = x; } });
          C.slider({ label: "해 방향", min: -1.2, max: 1.2, value: sunAz, onInput: x => { sunAz = x; } });
          C.slider({ label: "해 산란", min: 0, max: 1.5, value: sunAmt, onInput: x => { sunAmt = x; } });
          const ridge = (x, layer) => 0.35 + 0.55 * Math.sin(x * (1.1 + layer * 0.5) + layer * 2.1) * Math.cos(x * 0.6 - layer) + 0.2 * Math.sin(x * 3.1 + layer);
          F.draw = g => {
            const camH = 0.6;
            g.field(260, (x, y) => {
              // 화면 좌표 → 시선 방향. 산은 거리 D에 서 있는 능선, 바닥은 높이 0 평면
              const dir = V3.norm([x * 0.35, y * 0.35, 1]);
              const sunDir = V3.norm([Math.sin(sunAz), 0.12, Math.cos(sunAz)]);
              const sky = clamp(1 - y * 0.25, 0, 1);
              let dist = 400, base = [lerp(80, 160, sky), lerp(120, 190, sky), lerp(190, 220, sky)];
              for (let l = 0; l < 3; l++) {
                const D = 8 + l * 14, Hr = (ridge(x, l) + 0.7) * (3.2 - l * 0.5);
                const yTop = (Hr - camH) / (0.35 * D);
                if (y < yTop) { dist = D / dir[2]; const sh = clamp(0.5 + (y - yTop) * 0.6 + 0.4, 0, 1); base = [lerp(35, 85, sh), lerp(60, 105, sh), lerp(45, 75, sh)]; break; }
              }
              if (dir[1] < 0) { const t = camH / -dir[1]; if (t < dist) { dist = t; base = [72, 92, 60]; } }
              const sp = dir[1], ae = a * 0.12;
              const od = Math.abs(sp) < 1e-4 ? ae * Math.exp(-k * camH) * dist : ae * Math.exp(-k * camH) * (1 - Math.exp(-k * dist * sp)) / (k * sp);
              const T = Math.exp(-Math.max(0, od));
              const vl = Math.pow(Math.max(0, V3.dot(dir, sunDir)), 8) * sunAmt;
              const fog = FOG.map((c, i) => c + SUN[i] * vl * 0.6);
              return [0, 1, 2].map(i => clamp(base[i] * T + fog[i] * (1 - T), 0, 255)).concat(255);
            });
          };
        }
      } },
      "안개는 멀리 있는 것을 흐리게 해 ==거리감을 만들고==, 그리지 않아도 되는 먼 곳을 자연스럽게 가립니다. 성능상 그리는 거리를 줄이는 오래된 기법이기도 합니다.",

      { use: [
        ["엔진", "Exponential Height Fog", "UE의 지수 높이 안개 액터가 이 장의 식입니다. Fog Density = $a$, Height Falloff = $k$, Directional Inscattering = 해 쪽 산란입니다."],
        ["엔진", "볼류메트릭 포그", "빛줄기(갓 레이)와 그림자 진 안개는 화면을 3D 격자(프로브)로 나눠 칸마다 산란을 적분하는 볼류메트릭 포그로 처리합니다."],
        ["게임", "분위기와 거리감", "공포 게임의 짙은 안개, 오픈월드의 먼 산 푸르스름함이 모두 이 공기 원근법입니다. 렌더 거리를 숨기는 데도 씁니다."],
        ["실생활", "대기 원근법", "먼 산이 파랗고 흐려 보이는 현상은 레오나르도 다 빈치가 그림에 쓴 '공기 원근법'이고, 물리적으로는 이 장의 지수 감쇠입니다."]
      ] },

      { recap: [
        ["T = e^(−σ·d)", "투과율: 거리에 따라 지수적으로 감소"],
        ["색 = 장면·T + 안개·(1 − T)", "안개 섞기"],
        ["σ(h) = a · e^(−k·h)", "높이 안개: 아래쪽이 짙음"],
        ["(1 − e^(−k·d·sin φ)) / (k·sin φ)", "시선 위 적분이 식 하나로 풀림"]
      ] }
    ]
  });
})();
