/* 36 부동소수점 정밀도 */
(() => {
  const f2 = n => num(n, 2);
  // 가수 m비트 부동소수점으로 반올림
  const roundMant = (x, m) => { if (x === 0) return 0; const e = Math.floor(Math.log2(Math.abs(x))), step = Math.pow(2, e - m); return Math.round(x / step) * step; };
  const f16 = x => roundMant(x, 10);

  lesson({
    topic: "float", title: "부동소수점 정밀도", desc: "멀어질수록 거칠어지는 숫자", stage: "하드웨어와 성능",
    sym: { x: "green", e: "orange", m: "teal" },
    hook: "GPU의 숫자는 무한히 정밀하지 않습니다. 부동소수점은 ==0 근처는 촘촘하고, 멀어질수록 칸이 두 배씩 넓어지는== 눈금자입니다. 거대한 월드의 떨림, 깊이 깜빡임, 텍스처 계단이 모두 여기서 나옵니다.",
    blocks: [
      { h: "눈금이 두 배씩 넓어진다" },
      "가수가 $m$비트인 부동소수점이 나타낼 수 있는 값들을 수직선에 찍었습니다. ==2의 거듭제곱을 넘을 때마다 간격이 두 배==가 됩니다. 비트 수를 줄이면 잘 보입니다.",
      { fig: {
        aspect: 0.36, view: { x0: 0, x1: 16.5, y0: -1, y1: 2, stretch: true },
        eq: ["값 = (1 + 가수 / 2^m) · 2^e   →   x ≈ {x} 근처 간격 = {gap}"],
        setup(F, C, L) {
          let m = 3, px = 9;
          C.slider({ label: "가수 비트 $m$", min: 1, max: 6, step: 1, value: m, fmt: x => x + "비트", onInput: x => { m = x; } });
          F.handle({ color: "yellow", get: () => [px, 1.4], set: x => { px = clamp(x, 0.3, 16); } });
          F.draw = g => {
            g.line([0, 0], [16.5, 0], "grey", { w: 1.5 });
            for (let e = -3; e <= 3; e++) {
              const base = Math.pow(2, e);
              for (let k = 0; k < Math.pow(2, m); k++) {
                const v = base * (1 + k / Math.pow(2, m));
                if (v > 16.5) break;
                g.line([v, -0.25], [v, 0.25], k === 0 ? "yellow" : "teal", { w: k === 0 ? 2.5 : 1.5 });
              }
              if (base <= 16) g.text(String(base), [base, -0.25], "yellow", { dy: 12, size: 11 });
            }
            const e = Math.floor(Math.log2(px)), gap = Math.pow(2, e - m);
            g.line([px, 0.3], [px, 1.3], "yellow", { w: 1, dash: [3, 3] });
            const r = roundMant(px, m);
            g.dot([r, 0], "pink", 6);
            L.set("x", f2(px)); L.set("gap", num(gap, 3));
          };
        }
      } },
      { key: "32비트 float의 가수는 23비트라 ==약 7자리==가 정확합니다. 1에서는 0.0000001까지 구분하지만, 100만에서는 0.06, 1억에서는 8까지밖에 구분하지 못합니다." },

      { h: "원점에서 멀어지면 떨린다" },
      "반지름 1인 원을 이루는 점들의 월드 좌표를 32비트 float로 저장합니다. 원을 원점에서 멀리 보낼수록 ==좌표가 가장 가까운 눈금으로 끌려가며== 원이 찌그러지고, 움직이면 떨립니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["원의 중심 x = 10^{p} = {d}   →   이 근처 float32 간격 ≈ {gap}"],
        setup(F, C, L) {
          let p = 6, wob = 0;
          C.slider({ label: "원점에서의 거리 (10의 몇 제곱)", min: 0, max: 8, step: 0.1, value: p, fmt: x => "10^" + num(x, 1), onInput: x => { p = x; } });
          C.play();
          F.loop(dt => { wob += dt; });
          F.draw = g => {
            const D = Math.pow(10, p), N = 48;
            g.circle([0, 0], 0.8, "grey", { w: 1, dash: [4, 4], alpha: 0.5 });
            const pts = [];
            for (let i = 0; i < N; i++) {
              const a = i / N * TAU + wob * 0.4;
              const wx = Math.fround(D + Math.cos(a) * 0.8 + wob * 0.013), wy = Math.fround(Math.sin(a) * 0.8 + D * 0.5) - Math.fround(D * 0.5);
              pts.push([wx - Math.fround(D + wob * 0.013), wy]);
            }
            g.poly(pts, { stroke: "yellow", w: 2.5, fill: "rgba(244,211,69,0.1)" });
            pts.forEach(q => g.dot(q, "white", 2.5));
            const e = Math.floor(Math.log2(D + 1)), gap = Math.pow(2, e - 23);
            L.set("p", num(p, 1)); L.set("d", D >= 1e3 ? D.toExponential(1) : num(D, 1)); L.set("gap", gap < 1e-3 ? gap.toExponential(1) : num(gap, 3));
          };
        }
      } },
      "그래서 큰 월드는 ==카메라를 원점으로 두고 상대 좌표로 그리거나==, 월드 좌표를 64비트(double)로 바꿉니다. UE5의 Large World Coordinates가 후자입니다.",

      { h: "16비트(half)로 저장하면" },
      "메모리를 아끼려고 UV나 색을 16비트 부동소수점(가수 10비트)으로 저장하는 경우가 많습니다. 텍스처를 많이 반복해 ==UV 값이 커지면 half의 간격이 텍셀보다 커져== 텍스처가 계단처럼 깨집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["UV 범위 {u} 근처에서 half 간격 = {gap} 텍셀 (텍스처 256칸 기준)"],
        setup(F, C, L) {
          let off = 6, half = true;
          C.slider({ label: "UV 시작값(반복 횟수)", min: 0, max: 128, step: 1, value: off, fmt: x => num(x, 0), onInput: x => { off = x; } });
          C.seg({ options: [{ value: 1, label: "half (16비트)" }, { value: 0, label: "float (32비트)" }], value: 1, onChange: x => { half = !!x; } });
          F.draw = g => {
            g.field(300, (x, y) => {
              let u = off + x * 0.06, v = off + y * 0.03;
              if (half) { u = f16(u); v = f16(v); }
              const tu = (u * 256) % 16, tv = (v * 256) % 16;
              const c = (Math.floor(tu / 2) + Math.floor(tv / 2)) % 2 ? [236, 239, 244] : [88, 140, 200];
              const ring = Math.abs(((u * 256) % 8) - 4) < 0.6 ? 0.7 : 1;
              return [c[0] * ring, c[1] * ring, c[2] * ring, 255];
            }, { smooth: false });
            const e = Math.floor(Math.log2(Math.max(1, off))), gap = Math.pow(2, e - 10) * 256;
            L.set("u", num(off, 0)); L.set("gap", half ? num(gap, 2) : "≈ 0");
          };
        }
      } },
      { ponder: "셰이더에서 시간 `Time`을 그대로 `sin(Time)`에 넣으면, 게임을 며칠 켜 두었을 때 애니메이션이 뚝뚝 끊깁니다. 왜일까요?",
        answer: "시간이 수십만 초가 되면 float 간격이 ==0.03초 이상==으로 벌어져 프레임 사이의 시간 차를 표현하지 못합니다. 그래서 시간은 `frac(Time / 주기)`처럼 작은 범위로 감아서 쓰거나, CPU에서 double로 관리한 뒤 넘깁니다." },

      { use: [
        ["엔진", "Large World Coordinates", "UE5는 월드 좌표를 double로 바꿔 수천 km 맵에서도 떨림을 없앴습니다. 셰이더에는 카메라 기준 상대 좌표(LWC 타일)로 넘깁니다."],
        ["셰이더", "half 정밀도 함정", "모바일 셰이더의 half(16비트)는 빠르지만, 월드 위치·큰 UV·시간은 float로 둬야 깨지지 않습니다. 머티리얼의 'Full Precision' 옵션이 이것입니다."],
        ["게임", "멀리 가면 떨리는 캐릭터", "오픈월드 끝에서 무기가 떨리거나 그림자가 지글거리는 버그는 대부분 원점에서 먼 좌표의 float 정밀도 문제입니다(원점 재설정으로 해결)."],
        ["실생활", "계산기와 돈 계산", "0.1 + 0.2 ≠ 0.3 같은 오차 때문에 은행·회계는 부동소수점 대신 정수(원 단위)나 십진수 형식을 씁니다."]
      ] },

      { recap: [
        ["(1 + 가수 / 2^m) · 2^e", "부동소수점: 멀수록 간격이 두 배씩"],
        ["float32 ≈ 7자리", "100만에서 0.06 간격"],
        ["상대 좌표 · double 월드", "큰 월드의 떨림 해결"],
        ["half = 가수 10비트", "큰 UV·시간·위치에 쓰면 깨짐"]
      ] }
    ]
  });
})();
