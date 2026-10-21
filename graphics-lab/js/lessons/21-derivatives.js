/* 19 DDX · DDY: 화면 공간 미분 */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const FUN = {
    lin: ["f = uv.x · 3", (x, y) => x * 3],
    sq: ["f = uv.x^2 · 4", (x, y) => x * x * 4],
    wave: ["f = sin(uv.x · 9) + uv.y", (x, y) => Math.sin(x * 9) + y]
  };

  lesson({
    topic: "derivatives", title: "DDX · DDY", desc: "옆 픽셀과의 차이", stage: "셰이더로 그리기",
    sym: { f: "yellow", uv: "green", w: "orange", u: "green" },
    hook: "픽셀 셰이더는 혼자 도는 것 같지만, GPU는 ==픽셀 4개(2×2)를 한 묶음으로 동시에== 실행합니다. 그래서 '오른쪽 픽셀에서 이 값은 얼마였지?'를 공짜로 물어볼 수 있습니다. 이것이 $ddx$, $ddy$ 입니다.",
    blocks: [
      { h: "2×2 쿼드 안에서 빼기" },
      "확대한 픽셀 격자입니다. 굵은 선이 2×2 쿼드입니다. 쿼드를 눌러 보세요. ==$ddx$ = 오른쪽 − 왼쪽, $ddy$ = 아래 − 위==. 값이 빨리 변하는 곳일수록 미분이 큽니다.",
      { fig: {
        aspect: 0.56, view: { x0: 0, x1: 16, y0: 0, y1: 9 },
        eq: ["{fn}", "ddx(f) = {dx},   ddy(f) = {dy},   fwidth(f) = |ddx| + |ddy| = {fw}"],
        setup(F, C, L) {
          let key = "sq", q = [5, 2];
          C.seg({ options: [{ value: "lin", label: "직선 증가" }, { value: "sq", label: "제곱" }, { value: "wave", label: "물결" }], value: key, onChange: x => { key = x; } });
          F.onTap = (p, sx, sy, moving) => { if (moving) return; q = [clamp(Math.floor(p[0] / 2), 0, 7), clamp(Math.floor((9 - p[1]) / 2), 0, 3)]; };
          F.draw = g => {
            const fn = FUN[key][1];
            const val = (i, j) => fn((i + 0.5) / 16, (j + 0.5) / 9);
            let mn = Infinity, mx = -Infinity;
            for (let i = 0; i < 16; i++) for (let j = 0; j < 9; j++) { const v = val(i, j); mn = Math.min(mn, v); mx = Math.max(mx, v); }
            for (let i = 0; i < 16; i++) for (let j = 0; j < 9; j++) {
              const v = (val(i, j) - mn) / (mx - mn || 1), c = Math.round(30 + 200 * v);
              const y = 9 - j - 1;
              g.poly([[i, y], [i + 1, y], [i + 1, y + 1], [i, y + 1]], { fill: `rgb(${c},${Math.round(c * 0.9)},${Math.round(c * 0.6)})`, stroke: "rgba(16,19,26,0.5)", w: 1 });
              g.text(num(val(i, j), 1), [i + 0.5, y + 0.5], v > 0.55 ? "#10131A" : "white", { size: 10, halo: false });
            }
            for (let i = 0; i <= 16; i += 2) g.line([i, 0], [i, 9], "white", { w: 2.2, alpha: 0.7 });
            for (let j = 9; j >= 0; j -= 2) g.line([0, j], [16, j], "white", { w: 2.2, alpha: 0.7 });
            const i0 = q[0] * 2, j0 = q[1] * 2;
            const a = val(i0, j0), b = val(i0 + 1, j0), c = val(i0, j0 + 1);
            g.poly([[i0, 9 - j0], [i0 + 2, 9 - j0], [i0 + 2, 9 - j0 - 2], [i0, 9 - j0 - 2]], { stroke: "yellow", w: 4 });
            g.arrow([i0 + 0.5, 9 - j0 - 0.5], [i0 + 1.5, 9 - j0 - 0.5], "green", { w: 3, head: 9 });
            g.arrow([i0 + 0.5, 9 - j0 - 0.5], [i0 + 0.5, 9 - j0 - 1.5], "red", { w: 3, head: 9 });
            L.set("fn", "$" + FUN[key][0] + "$");
            L.set("dx", f2(b - a)); L.set("dy", f2(c - a)); L.set("fw", f2(Math.abs(b - a) + Math.abs(c - a)));
          };
        }
      } },
      { key: "미분은 ==쿼드 안의 이웃 값 빼기==라 거의 공짜입니다. 대신 쿼드 단위라서 정밀도가 2픽셀 수준이고, 쿼드 안에서 일부 픽셀만 다른 갈래(분기)로 가면 값이 망가집니다." },

      { h: "fwidth: 어떤 배율에서도 1픽셀 두께로 부드럽게" },
      "절차적 원의 가장자리를 $step$으로 자르면 계단이 생기고(왼쪽), ==$fwidth$만큼만 부드럽게 자르면== 확대·축소와 관계없이 딱 1픽셀 폭으로 깔끔해집니다(오른쪽). 확대 배율을 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["왼쪽: c = step(d, 0)", "오른쪽: c = smoothstep(w, −w, d),   w = fwidth(d)"],
        setup(F, C, L) {
          let zoom = 1, lines = true;
          C.slider({ label: "확대 배율", min: 0.2, max: 4, value: zoom, fmt: x => "×" + num(x, 1), onInput: x => { zoom = x; } });
          C.seg({ options: [{ value: 1, label: "원 + 격자선" }, { value: 0, label: "원만" }], value: 1, onChange: x => { lines = !!x; } });
          F.draw = g => {
            const cols = 180, px = 4 / cols;
            // 왼쪽·오른쪽 절반에 같은 장면(원 + 격자선)을 그립니다. d < 0 이면 안쪽
            const dfun = (x, y) => {
              const X = (x < 0 ? x + 1 : x - 1) / zoom, Y = y / zoom;
              let d = Math.hypot(X, Y) - 0.35;
              if (lines) { const gx = Math.abs(fract(X * 4 + 0.5) - 0.5) / 4, gy = Math.abs(fract(Y * 4 + 0.5) - 0.5) / 4; d = Math.min(d, Math.min(gx, gy) - 0.003); }
              return d;
            };
            g.field(cols, (x, y) => {
              const d = dfun(x, y);
              let m;
              if (x < 0) m = d <= 0 ? 1 : 0;
              else { const w = Math.abs(dfun(x + px, y) - d) + Math.abs(dfun(x, y + px) - d); m = clamp(0.5 - d / (w || 1e-6), 0, 1); }
              return [lerp(16, 244, m), lerp(19, 211, m), lerp(26, 69, m), 255];
            }, { smooth: false });
            g.line([0, -1], [0, 1], "white", { w: 2 });
            g.text("step", [-1, 0.92], "white", { size: 12, bold: true }); g.text("fwidth로 부드럽게", [1, 0.92], "white", { size: 12, bold: true });
          };
        }
      } },
      "$fwidth$는 '이 값이 픽셀 하나 건너갈 때 얼마나 변하나'입니다. 그래서 ==값의 단위를 픽셀 단위로 바꿔 주는 자==처럼 씁니다 — 일정한 두께의 외곽선, 와이어프레임, 격자 그리드 셰이더가 모두 이 방식입니다.",

      { h: "미분이 튀는 곳: 이음매 버그" },
      "가운데를 감는 원형 UV $u = atan2(y, x) / 2π$ 에 체크 텍스처를 입혔습니다. 왼쪽 수평선에서 $u$가 0.99 → 0.0으로 ==갑자기 뛰면서 미분이 커지고==, GPU는 아주 작은 밉맵을 골라 가는 회색 선이 생깁니다. 고친 버전과 비교해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let fix = false, show = 0;
          C.seg({ options: [{ value: 0, label: "그대로 (이음매 생김)" }, { value: 1, label: "고침" }], value: 0, onChange: x => { fix = !!x; } });
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "밉 레벨 보기" }], value: 0, onChange: x => { show = x; } });
          F.draw = g => {
            const cols = 240, px = 4 / cols;
            const U = (x, y) => Math.atan2(y, x) / TAU + 0.5;
            g.field(cols, (x, y) => {
              const r = Math.hypot(x, y);
              if (r < 0.25 || r > 0.95) return null;
              const u = U(x, y), v = r;
              let du = Math.max(Math.abs(U(x + px, y) - u), Math.abs(U(x, y + px) - u));
              if (fix) { const u2 = fract(u + 0.5); du = Math.min(du, Math.max(Math.abs(fract(U(x + px, y) + 0.5) - u2), Math.abs(fract(U(x, y + px) + 0.5) - u2))); }
              const texels = du * 64;                       // 텍스처 64칸 기준 픽셀당 텍셀 수
              const lv = Math.max(0, Math.log2(texels + 1e-9));
              if (show) { const k = clamp(lv / 6, 0, 1); return [lerp(88, 252, k), lerp(196, 98, k), lerp(221, 85, k), 255]; }
              const chk = (Math.floor(u * 16) + Math.floor(v * 8)) % 2;
              const blend = clamp(lv - 1, 0, 1);              // 레벨이 높으면 평균색(회색)
              const val = lerp(chk, 0.5, blend);
              return [lerp(40, 236, val), lerp(46, 239, val), lerp(60, 244, val), 255];
            }, { smooth: false });
            L.set("eq", fix ? "$du = min(fwidth(u), fwidth(fract(u + 0.5)))$   이음매 반대편 값으로도 재서 작은 쪽 사용" : "$u$가 1 → 0으로 뛰는 곳에서 $fwidth(u) ≈ 1$ → 가장 작은 밉맵 → 회색 선");
          };
        }
      } },

      { use: [
        ["엔진", "밉맵 선택", "텍스처 샘플러는 내부적으로 UV의 ddx·ddy로 밉 레벨과 비등방 필터 방향을 고릅니다. UE 머티리얼의 DDX·DDY 노드로 직접 꺼낼 수도 있습니다."],
        ["셰이더", "안티에일리어싱된 선", "와이어프레임·격자·외곽선·텍스트(SDF 폰트)를 $fwidth$로 1픽셀 폭만 부드럽게 잘라 어떤 줌에서도 깔끔하게 그립니다."],
        ["셰이더", "노멀 없는 면 노멀", "$normalize(cross(ddx(위치), ddy(위치)))$ 로 픽셀 셰이더 안에서 면 노멀을 만들어 로우폴리 스타일을 냅니다."],
        ["디버깅", "이음매와 깨진 밉", "구형·원형 UV, 아틀라스 경계, 분기 안 샘플링에서 생기는 가는 선은 대부분 미분 문제입니다. `SampleGrad`/`SampleLevel`로 해결합니다."]
      ] },

      { recap: [
        ["ddx(f) = 오른쪽 − 왼쪽", "2×2 쿼드 안의 이웃 빼기"],
        ["fwidth(f) = |ddx| + |ddy|", "픽셀 하나당 변화량 = 픽셀 단위 자"],
        ["smoothstep(w, −w, d)", "1픽셀 폭 안티에일리어싱"],
        ["mip ← ddx(uv), ddy(uv)", "밉 선택도 미분, 이음매에서 튀면 선이 생김"]
      ] }
    ]
  });
})();
