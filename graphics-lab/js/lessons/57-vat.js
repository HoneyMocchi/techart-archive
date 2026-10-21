/* 57 버텍스 애니메이션 텍스처(VAT) 심화 */
(() => {
  const f0 = n => num(n, 0);
  const MB = b => (b >= 1048576 ? num(b / 1048576, 1) + " MB" : num(b / 1024, 0) + " KB");

  lesson({
    topic: "vat", title: "애니메이션 텍스처(VAT) 심화", desc: "시뮬레이션을 텍스처로 굽기", stage: "고급 효과 제작",
    sym: { t: "teal", f: "orange" },
    hook: "25장에서 VAT의 개념을 봤습니다. 실무에서는 ==무엇을 저장할지(정점 위치냐, 조각의 회전이냐), 몇 비트로 저장할지, 프레임 사이를 어떻게 이을지==를 정하는 것이 일입니다. 같은 효과도 방식에 따라 메모리가 수십 배 차이 납니다.",
    blocks: [
      { h: "소프트 바디: 정점마다 위치 오프셋" },
      "깃발처럼 형태가 자유롭게 변하는 시뮬레이션은 ==정점마다, 프레임마다 위치 오프셋==을 저장합니다. 값의 범위(최소·최대)로 0~1에 맞춰 넣고, 셰이더에서 되돌립니다. 저장 정밀도를 낮추면 정점이 떨리는 것을 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["위치 = 기본 + lerp(최소, 최대, 텍스처(정점, 프레임))   ·   {bits}비트, 프레임 {f}"],
        setup(F, C, L) {
          let bits = 16, interp = true, frame = 0;
          C.play(true);
          C.slider({ label: "저장 비트", min: 4, max: 16, step: 1, value: bits, fmt: x => x + "비트", onInput: x => { bits = x; } });
          C.seg({ options: [{ value: 1, label: "프레임 사이 보간" }, { value: 0, label: "끊어서" }], value: 1, onChange: x => { interp = !!x; } });
          F.loop(() => {});
          const NX = 12, NY = 6, NF = 24;
          const sim = (i, j, f) => { const u = i / (NX - 1), v = j / (NY - 1), t = f / NF * TAU; return [0.06 * u * Math.sin(t * 2 + u * 5), 0.18 * u * Math.sin(t + u * 4 + v * 1.5), 0]; };
          const qz = (x, mn, mx) => { const m = (1 << bits) - 1, k = Math.round((x - mn) / (mx - mn) * m) / m; return mn + k * (mx - mn); };
          F.draw = g => {
            const ft = F.t * 8, f0i = Math.floor(ft) % NF, f1i = (f0i + 1) % NF, tt = interp ? ft - Math.floor(ft) : 0;
            frame = f0i;
            const P = (i, j) => { const a = sim(i, j, f0i), b = sim(i, j, f1i); const o = [0, 1].map(k => qz(lerp(a[k], b[k], tt), -0.2, 0.2)); return [1.0 + i / (NX - 1) * 2.4 + o[0], 0.55 + j / (NY - 1) * 1.0 + o[1]]; };
            g.line([0.98, 0.3], [0.98, 1.9], "grey", { w: 3 });
            for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) g.poly([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], { fill: (i + j) % 2 ? "rgba(252,98,85,0.75)" : "rgba(236,239,244,0.75)", stroke: "rgba(16,19,26,0.3)", w: 0.5 });
            // 텍스처 미리보기
            for (let f = 0; f < NF; f++) for (let k = 0; k < NX * NY; k++) { const o = sim(k % NX, Math.floor(k / NX), f); g.poly([[3.55 + k / (NX * NY) * 0.4, 1.9 - f / NF * 1.6], [3.55 + (k + 1) / (NX * NY) * 0.4, 1.9 - f / NF * 1.6], [3.55 + (k + 1) / (NX * NY) * 0.4, 1.9 - (f + 1) / NF * 1.6], [3.55 + k / (NX * NY) * 0.4, 1.9 - (f + 1) / NF * 1.6]], { fill: `rgb(${Math.round(128 + o[0] * 600)},${Math.round(128 + o[1] * 600)},128)` }); }
            g.text("위치 텍스처", [3.75, 1.92], "grey", { size: 10, dy: -4 });
            L.set("bits", bits); L.set("f", frame);
          };
        }
      } },

      { h: "리지드 바디: 조각마다 위치 + 회전" },
      "벽이 부서지는 파괴는 조각 하나하나가 ==모양은 그대로 움직이고 돌기만== 합니다. 그래서 정점마다가 아니라 ==조각마다 피벗 위치와 회전(쿼터니언)== 두 텍셀만 저장합니다. 정점 셰이더는 자기 조각 번호로 그 두 값을 읽어 회전·이동합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["정점 = 조각 위치(f) + 회전(f) · (정점 − 피벗)   ·   프레임 {f} / 47"],
        setup(F, C, L) {
          let fr = 0;
          C.play(true);
          const fs = C.slider({ label: "프레임", min: 0, max: 47, step: 1, value: 0, fmt: f0, onInput: x => { fr = x; } });
          F.loop((dt, t) => { fr = Math.floor(t * 14) % 48; fs.set(fr); });
          let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const pieces = [];
          for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { const cx = 0.4 + i * 0.22 + 0.11 + (j % 2) * 0.05, cy = 0.35 + j * 0.24 + 0.12; pieces.push({ c: [cx, cy], w: 0.1, h: 0.11, vx: (rnd() - 0.3) * 0.9, vy: rnd() * 0.6, spin: (rnd() - 0.5) * 8, delay: (1 - (cx - 0.4) / 1.4) * 8 + rnd() * 4 }); }
          F.draw = g => {
            g.line([0.1, 0.25], [3.9, 0.25], "grey", { w: 2 });
            pieces.forEach((p, k) => {
              const t = Math.max(0, fr - p.delay) / 24;
              const pos = [p.c[0] + p.vx * t, Math.max(0.25 + p.h, p.c[1] + p.vy * t - 2.2 * t * t)], ang = p.spin * t * (pos[1] <= 0.25 + p.h + 1e-3 ? 0.3 : 1);
              const corners = [[-p.w, -p.h], [p.w, -p.h], [p.w, p.h], [-p.w, p.h]].map(q => V.add(pos, V.rot(q, ang)));
              g.poly(corners, { fill: `hsl(${20 + k * 3},45%,${45 + (k % 3) * 6}%)`, stroke: "rgba(16,19,26,0.6)", w: 1 });
            });
            // 조각 텍스처: 조각 30개 × 프레임 48 × 2텍셀
            g.text("조각 텍스처: 30조각 × 48프레임 × (위치 + 회전)", [2.9, 1.92], "grey", { size: 11 });
            L.set("f", fr);
          };
        }
      } },

      { h: "메모리 계산기" },
      "같은 길이의 효과라도 방식에 따라 텍스처 크기가 크게 다릅니다. 숫자를 바꿔 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["소프트: 정점 {v} × 프레임 {f} × {b}B {nrm}= {soft}   ·   리지드: 조각 {p} × 프레임 {f} × 2 × {b}B = {rigid}"],
        setup(F, C, L) {
          let v = 4000, fr = 120, p = 60, fmt = 8, nrm = true;
          C.slider({ label: "정점 수", min: 200, max: 20000, step: 100, value: v, fmt: f0, onInput: x => { v = x; } });
          C.slider({ label: "프레임 수", min: 10, max: 300, step: 10, value: fr, fmt: f0, onInput: x => { fr = x; } });
          C.slider({ label: "조각 수 (리지드)", min: 10, max: 500, step: 10, value: p, fmt: f0, onInput: x => { p = x; } });
          C.seg({ options: [{ value: 8, label: "RGBA16F (8B)" }, { value: 4, label: "RGBA8 (4B)" }], value: 8, onChange: x => { fmt = +x; } });
          C.seg({ options: [{ value: 1, label: "노멀도 저장" }, { value: 0, label: "위치만" }], value: 1, onChange: x => { nrm = !!x; } });
          F.draw = g => {
            const soft = v * fr * fmt * (nrm ? 2 : 1), rigid = p * fr * 2 * fmt, mx = Math.max(soft, rigid, 1);
            [[soft, "소프트 (정점마다)", PAL.orange, 2.8], [rigid, "리지드 (조각마다)", PAL.teal, 1.5]].forEach(([b, n, c, y]) => {
              const w = Math.max(0.05, b / mx * 6.5);
              g.poly([[2.6, y], [2.6 + w, y], [2.6 + w, y + 0.8], [2.6, y + 0.8]], { fill: c });
              g.text(n, [2.5, y + 0.4], "white", { size: 12, bold: true, align: "right" }); g.text(MB(b), [2.7 + w, y + 0.4], "white", { size: 12, align: "left" });
            });
            L.set("v", v); L.set("f", fr); L.set("b", fmt); L.set("nrm", nrm ? "× 2 (노멀) " : ""); L.set("soft", MB(soft)); L.set("p", p); L.set("rigid", MB(rigid));
          };
        }
      } },
      { key: "VAT 텍스처는 ==필터링을 끄고(Nearest), 밉도 끄고, sRGB도 끕니다==. 텍셀 하나가 정확히 정점 하나·프레임 하나여야 하기 때문입니다. 대신 프레임 사이 보간은 셰이더에서 두 줄을 읽어 직접 합니다." },

      { use: [
        ["툴", "Houdini Labs VAT", "Houdini의 Vertex Animation Textures ROP가 소프트·리지드·유체·파티클 모드로 텍스처와 데이터 테이블을 굽고, UE·Unity용 머티리얼 함수를 함께 줍니다."],
        ["엔진", "UE 머티리얼 함수", "UE에는 VAT용 머티리얼 함수(정점 ID로 UV 계산 → WPO·노멀 출력)를 연결합니다. 바운드 확장과 정적 메시의 UV2(정점 번호)가 필요합니다."],
        ["게임", "군중과 파괴", "수백 명 군중의 걷기 애니메이션을 VAT로 돌리면 스켈레탈 메시보다 훨씬 쌉니다(뼈 계산 없음, 인스턴싱 가능). 건물 붕괴·천 찢어짐도 단골입니다."],
        ["TA", "정밀도 체크", "큰 움직임(수 m)을 8비트에 담으면 정점이 덜덜 떨립니다. 범위를 조각별로 나누거나 16비트 HDR 텍스처를 씁니다(36장 부동소수점, 54장 비트 패킹)."]
      ] },

      { recap: [
        ["위치 = 기본 + lerp(최소, 최대, 텍셀)", "소프트 바디 VAT: 정점마다"],
        ["피벗 + 쿼터니언, 조각마다", "리지드 바디 VAT: 메모리 수십 배 절약"],
        ["Nearest · 밉 없음 · sRGB 끔", "VAT 텍스처 설정"],
        ["두 프레임 읽어 lerp", "부드러운 재생"]
      ] }
    ]
  });
})();
