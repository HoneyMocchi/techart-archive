/* 25 버텍스 애니메이션 (WPO) */
(() => {
  const f2 = n => num(n, 2);

  lesson({
    topic: "vertexanim", title: "버텍스 애니메이션", desc: "정점을 셰이더에서 움직이기", stage: "움직임과 시뮬레이션",
    sym: { t: "teal", h: "red", A: "gold", k: "orange", Q: "pink" },
    hook: "뼈 없이도 정점은 움직일 수 있습니다. 버텍스 셰이더에서 ==위치에 오프셋을 더하면==(월드 포지션 오프셋) 풀·나뭇잎·물결·깃발이 CPU 비용 없이 수십만 개씩 흔들립니다.",
    blocks: [
      { h: "바람에 흔들리는 풀" },
      "풀잎마다 같은 식을 적용합니다. ==뿌리는 고정하고 위로 갈수록 많이== 흔들리도록 높이의 제곱을 곱하고, 위치마다 위상을 달리해 바람이 지나가는 물결을 만듭니다.",
      { fig: {
        aspect: 0.45, view: { x0: 0, x1: 10, y0: -0.2, y1: 4.3 },
        eq: ["오프셋 = A · sin(t·속도 + x·k) · h^2   (h = 정점 높이 / 풀 높이)"],
        setup(F, C, L) {
          let A = 0.5, k = 0.8, sp = 2, mask = true;
          C.play(true);
          C.slider({ label: "세기 $A$", min: 0, max: 1.2, value: A, onInput: x => { A = x; } });
          C.slider({ label: "물결 간격 $k$", min: 0, max: 2.5, value: k, onInput: x => { k = x; } });
          C.seg({ options: [{ value: 1, label: "h² 마스크 쓰기" }, { value: 0, label: "마스크 없이 (뿌리까지 흔들림)" }], value: 1, onChange: x => { mask = !!x; } });
          F.loop(() => {});
          let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const blades = Array.from({ length: 70 }, () => [rnd() * 9.6 + 0.2, 1.6 + rnd() * 2, rnd()]);
          F.draw = g => {
            g.poly([[0, -0.2], [10, -0.2], [10, 0], [0, 0]], { fill: "rgba(120,95,70,0.6)" });
            blades.forEach(([x, H, r]) => {
              const pts = [];
              for (let s = 0; s <= 8; s++) {
                const h = s / 8, m = mask ? h * h : 1;
                pts.push([x + A * Math.sin(F.t * sp + x * k + r * 0.5) * m, h * H]);
              }
              for (let s = 0; s < 8; s++) g.line(pts[s], pts[s + 1], `rgb(${Math.round(lerp(60, 150, s / 8))},${Math.round(lerp(120, 200, s / 8))},${Math.round(lerp(50, 90, s / 8))})`, { w: lerp(4, 1.5, s / 8) });
            });
          };
        }
      } },
      "마스크 없이 하면 풀이 ==땅에서 미끄러져 다닙니다==. 실무에서는 높이 대신 버텍스 컬러나 UV에 '얼마나 흔들릴지'를 칠해 두고 마스크로 씁니다.",

      { h: "게르스트너 파도: 점이 원을 그린다" },
      "물 표면의 점은 위아래로만 움직이지 않고 ==제자리에서 원을 그립니다==. 그래서 마루는 뾰족하고 골은 넓은 진짜 파도 모양이 됩니다. 사인파와 비교하며 가파름 $Q$를 바꿔 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: -1.6, y1: 1.6 },
        eq: ["x' = x + Q·A·cos(k·x − ω·t),   y = A·sin(k·x − ω·t)"],
        setup(F, C, L) {
          let Q = 0.8, gerst = true;
          C.play(true);
          C.slider({ label: "가파름 $Q$", min: 0, max: 1.2, value: Q, onInput: x => { Q = x; } });
          C.seg({ options: [{ value: 1, label: "게르스트너" }, { value: 0, label: "사인파" }], value: 1, onChange: x => { gerst = !!x; } });
          F.loop(() => {});
          F.draw = g => {
            const A = 0.55, k = 1.6, w = 2.2, t = F.t;
            const P = x0 => { const ph = k * x0 - w * t; return [x0 + (gerst ? Q * A * Math.cos(ph) : 0), A * Math.sin(ph)]; };   // 마루에서 점들이 모여 뾰족해짐
            const pts = [];
            for (let i = 0; i <= 300; i++) pts.push(P(-1 + i / 300 * 12));
            g.poly(pts.concat([[11, -1.6], [-1, -1.6]]), { fill: "rgba(88,196,221,0.35)", stroke: "blue", w: 2.5 });
            for (let i = 0; i < 9; i++) {
              const x0 = 1 + i * 1.0, c = [x0, 0];
              if (gerst) g.circle(c, Q * A * 1, "white", { w: 1, alpha: 0.3, dash: [3, 3] });
              const p = P(x0);
              g.line(c, p, "white", { w: 1, alpha: 0.5 });
              g.dot(p, "yellow", 5);
            }
          };
        }
      } },
      "$Q$가 너무 크면 파도 꼭대기에서 ==표면이 자기 자신을 뚫고 고리를 만듭니다==. 실제 바다 셰이더는 방향·파장이 다른 게르스트너 파도 여러 개를 더하고, 노멀도 같은 식의 미분으로 구합니다.",

      { h: "버텍스 애니메이션 텍스처 (VAT)" },
      "복잡한 시뮬레이션(천 찢어짐, 건물 붕괴)은 실시간으로 못 푸니 ==미리 계산한 정점 위치를 텍스처에 저장==합니다. 가로 = 정점 번호, 세로 = 프레임, 색 = 위치 오프셋. 버텍스 셰이더가 현재 프레임 줄을 읽어 정점을 옮깁니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: 0, y1: 5 },
        eq: ["위치 = 기본 위치 + 텍스처(정점 번호, 프레임)   — 프레임 {f} / 31"],
        setup(F, C, L) {
          let frame = 0;
          C.play(true);
          const fs = C.slider({ label: "프레임", min: 0, max: 31, step: 1, value: 0, fmt: x => num(x, 0), onInput: x => { frame = x; } });
          F.loop((dt, t) => { frame = Math.floor(t * 12) % 32; fs.set(frame); });
          const NV = 24, NF = 32;
          // 미리 '구운' 애니메이션: 원 → 꽃 모양으로 부풀었다 돌아옴
          const off = (v, f) => { const a = v / NV * TAU, s = Math.sin(f / NF * TAU); return [Math.cos(a) * 0.5 * s * (1 + Math.cos(a * 5)), Math.sin(a) * 0.5 * s * (1 + Math.cos(a * 5))]; };
          F.draw = g => {
            const T0 = [0.4, 0.5], TW = 4.4, TH = 4.2;
            for (let f = 0; f < NF; f++) for (let v = 0; v < NV; v++) {
              const o = off(v, f), x = T0[0] + v / NV * TW, y = T0[1] + (NF - 1 - f) / NF * TH;
              g.poly([[x, y], [x + TW / NV, y], [x + TW / NV, y + TH / NF], [x, y + TH / NF]], { fill: `rgb(${Math.round(128 + o[0] * 200)},${Math.round(128 + o[1] * 200)},128)` });
            }
            const yy = T0[1] + (NF - 1 - frame) / NF * TH;
            g.poly([[T0[0], yy], [T0[0] + TW, yy], [T0[0] + TW, yy + TH / NF], [T0[0], yy + TH / NF]], { stroke: "yellow", w: 2 });
            g.text("정점 번호 →", [T0[0] + TW / 2, T0[1]], "grey", { dy: 10, size: 11 }); g.text("프레임 ↓", [T0[0], T0[1] + TH], "grey", { dy: -8, size: 11, align: "left" });
            const c = [7.5, 2.5], pts = [];
            for (let v = 0; v < NV; v++) { const a = v / NV * TAU, o = off(v, frame); pts.push([c[0] + Math.cos(a) * 1.2 + o[0], c[1] + Math.sin(a) * 1.2 + o[1]]); }
            g.poly(pts, { fill: "rgba(227,111,200,0.35)", stroke: "pink", w: 2 });
            pts.forEach(p => g.dot(p, "white", 3));
            L.set("f", frame);
          };
        }
      } },
      { key: "버텍스 셰이더 애니메이션은 ==충돌·물리 판정과 따로 놉니다==. 화면에서만 움직이므로 그림자·모션 블러·컬링 범위(바운드)를 함께 신경 써야 합니다." },

      { use: [
        ["엔진", "World Position Offset", "UE 머티리얼의 WPO 핀이 이 장의 오프셋입니다. SimpleGrassWind 함수, 폴리지의 Pivot Painter가 대표적인 예입니다."],
        ["게임", "바다와 깃발", "오픈월드 바다는 게르스트너·FFT 파도를, 깃발·천막은 사인 합성 WPO를 씁니다. 수천 개라도 CPU 비용이 거의 없습니다."],
        ["이펙트", "파괴와 시뮬레이션 재생", "Houdini로 구운 VAT로 건물 붕괴·액체·천 찢어짐을 게임에서 텍스처 몇 장으로 재생합니다."],
        ["주의", "바운드와 그림자", "오프셋이 크면 물체가 원래 경계 상자 밖으로 나가 컬링에 잘리거나 그림자가 어긋납니다. 바운드 확장(Bounds Scale)이 필요한 이유입니다."]
      ] },

      { recap: [
        ["위치 + 오프셋(t, 위치)", "버텍스 셰이더에서 움직이기 (WPO)"],
        ["· h^2 마스크", "뿌리는 고정, 끝만 흔들기"],
        ["x' = x + Q·A·cos(…)", "게르스트너 파도: 점이 원을 그림"],
        ["텍스처(정점, 프레임)", "VAT: 미리 구운 움직임 재생"]
      ] }
    ]
  });
})();
