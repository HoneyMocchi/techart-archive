/* 56 셰이더 컴파일러 최적화 */
(() => {
  const f0 = n => num(n, 0);
  const MONO = '"Cascadia Code", Consolas, monospace';
  function code(g, lines, x, y, lh) {
    const c = g.c;
    lines.forEach((ln, k) => {
      const yy = y + k * lh;
      c.font = `500 13px ${MONO}`; c.textAlign = "left"; c.textBaseline = "middle";
      const col = ln.s === "gone" ? "rgba(138,147,166,0.55)" : ln.s === "fold" ? PAL.teal : ln.s === "new" ? PAL.yellow : "#ECEFF4";
      c.fillStyle = col; c.fillText(ln.t, x, yy);
      if (ln.s === "gone") { const w = c.measureText(ln.t).width; c.strokeStyle = "rgba(252,98,85,0.8)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); }
      if (ln.note) { c.font = `500 12px ${UI_FONT}`; c.fillStyle = ln.s === "gone" ? PAL.red : PAL.grey; c.fillText(ln.note, x + 330, yy); }
    });
  }

  lesson({
    topic: "compiler", title: "셰이더 컴파일러 최적화", desc: "상수 폴딩부터 점유율까지", stage: "GPU 심화",
    sym: {},
    hook: "머티리얼 그래프나 HLSL은 그대로 GPU에서 돌지 않습니다. 컴파일러가 ==미리 계산할 수 있는 것은 계산해 두고(상수 폴딩), 결과에 영향 없는 것은 지우고(죽은 코드 제거), 비싼 연산은 싼 연산으로 바꿉니다==. 무엇이 최적화되고 무엇이 안 되는지 알면 셰이더를 쓰는 방식이 바뀝니다.",
    blocks: [
      { h: "상수 폴딩과 죽은 코드 제거" },
      "왼쪽 코드를 컴파일러가 어떻게 줄이는지 봅니다. ==파라미터가 컴파일 시점 상수인지==, 정적 스위치가 켜졌는지에 따라 남는 명령이 달라집니다. 버튼을 바꿔 보세요. [[teal:청록]]은 미리 계산된 줄, 취소선은 지워진 줄입니다.",
      { fig: {
        aspect: 0.56, view: { x0: 0, x1: 10, y0: 0, y1: 5.6 },
        eq: ["명령 수: 최적화 전 {a} → 후 {b}"],
        setup(F, C, L) {
          let constAB = true, detail = false, view = 1;
          C.seg({ options: [{ value: 1, label: "a, b = 상수" }, { value: 0, label: "a, b = 런타임 파라미터" }], value: 1, onChange: x => { constAB = !!x; } });
          C.seg({ options: [{ value: 0, label: "USE_DETAIL 끔" }, { value: 1, label: "켬" }], value: 0, onChange: x => { detail = !!x; } });
          C.seg({ options: [{ value: 0, label: "원본" }, { value: 1, label: "최적화 후" }], value: 1, onChange: x => { view = x; } });
          F.draw = g => {
            const opt = view === 1;
            const lines = [
              { t: constAB ? "const float a = 0.5;" : "float a = Param.a;", s: "" },
              { t: constAB ? "const float b = 2.0;" : "float b = Param.b;", s: "" },
              { t: "float  k = a * b;", s: opt && constAB ? "fold" : "", note: opt && constAB ? "→ k = 1.0 (미리 계산)" : "" },
              { t: "float3 c = tex * k;", s: opt && constAB ? "fold" : "", note: opt && constAB ? "→ c = tex (×1 제거)" : "" },
              { t: "float  w = pow(x, 2.0);", s: opt ? "fold" : "", note: opt ? "→ x * x (거듭제곱 → 곱셈)" : "" },
              { t: "c = c + w * 0.0;", s: opt ? "gone" : "", note: opt ? "×0 → 통째로 제거" : "" },
              { t: "#if USE_DETAIL", s: "" },
              { t: "    c *= Sample(Detail, uv * 8);", s: opt && !detail ? "gone" : "", note: opt && !detail ? "정적 스위치 꺼짐 → 텍스처 읽기까지 제거" : "" },
              { t: "#endif", s: "" },
              { t: "float unused = sin(t) * cos(t);", s: opt ? "gone" : "", note: opt ? "결과에 안 쓰임 → 제거" : "" },
              { t: "return c * 1.0 + sin(0.0);", s: opt ? "fold" : "", note: opt ? "→ return c" : "" }
            ];
            code(g, lines, F.toS([0.3, 0])[0], 30, 26);
            const before = 2 + 1 + 3 + 1 + 3 + 1 + (detail ? 2 + 3 : 2 + 3) + 4 + 4;
            let after = 3 + 1;                                     // tex 곱, x*x
            if (!constAB) after += 1 + 3;                          // a*b, tex*k
            if (detail) after += 3 + 4;                            // uv*8, 샘플, 곱
            L.set("a", before); L.set("b", after);
          };
        }
      } },
      { key: "그래서 머티리얼에서 ==상수로 둘 수 있는 값은 상수로, 켜고 끌 기능은 정적 스위치로== 두면 컴파일러가 알아서 지웁니다. 런타임 파라미터는 편하지만 그 계산은 매 픽셀 남습니다(대신 퍼뮤테이션은 늘지 않음 — 46장의 거래)." },

      { h: "강도 줄이기: 비싼 연산을 싼 연산으로" },
      "자주 보는 변환을 골라 보세요. 컴파일러가 대부분 해 주지만, ==의미가 미세하게 달라지는 변환(정밀도·NaN 처리)==은 직접 써 줘야 할 때가 있습니다. 막대는 대략의 사이클입니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["{before}   →   {after}"],
        setup(F, C, L) {
          const T = {
            div: ["$x / 4$", "$x · 0.25$", 8, 1, "나눗셈은 곱셈보다 몇 배 비쌈. 상수로 나누기는 역수 곱으로"],
            pow2: ["$pow(x, 2)$", "$x · x$", 12, 1, "pow는 exp2(log2(x)·y): 두 번의 초월함수"],
            pow5: ["$pow(x, 5)$", "$x2 = x·x;  x4 = x2·x2;  x4·x$", 12, 3, "작은 정수 거듭제곱은 곱셈 사슬로 (슐릭 프레넬의 단골)"],
            mad: ["$a · b + c$", "$mad(a, b, c)$", 2, 1, "곱하고 더하기는 명령 하나 (FMA)"],
            len: ["$length(v) < r$", "$dot(v, v) < r · r$", 9, 3, "비교만 할 때는 제곱근을 피함"],
            norm: ["$normalize(lerp(n1, n2, t))$ 를 매번", "보간 끝난 뒤 한 번만 normalize", 18, 9, "정규화는 rsqrt + 곱셈 3개: 반복을 줄이기"],
            trig: ["$sin(x)^2 + cos(x)^2$", "$1$", 16, 0, "항등식은 컴파일러가 모를 수 있음 → 직접 정리"]
          };
          let key = "pow5";
          C.seg({ options: [{ value: "div", label: "나눗셈" }, { value: "pow2", label: "pow 2" }, { value: "pow5", label: "pow 5" }, { value: "mad", label: "MAD" }, { value: "len", label: "length 비교" }, { value: "norm", label: "normalize" }, { value: "trig", label: "항등식" }], value: key, onChange: x => { key = x; } });
          F.draw = g => {
            const [b, a, cb, ca, note] = T[key], mx = 18;
            g.poly([[1.5, 2.6], [1.5 + cb / mx * 8, 2.6], [1.5 + cb / mx * 8, 3.3], [1.5, 3.3]], { fill: PAL.orange });
            g.poly([[1.5, 1.5], [1.5 + Math.max(0.05, ca / mx * 8), 1.5], [1.5 + Math.max(0.05, ca / mx * 8), 2.2], [1.5, 2.2]], { fill: PAL.teal });
            g.text("전", [1.3, 2.95], "white", { size: 12, bold: true, align: "right" }); g.text("후", [1.3, 1.85], "white", { size: 12, bold: true, align: "right" });
            g.text(`≈ ${cb} 사이클`, [1.6 + cb / mx * 8, 2.95], "grey", { size: 11, align: "left" }); g.text(`≈ ${ca} 사이클`, [1.6 + Math.max(0.05, ca / mx * 8), 1.85], "grey", { size: 11, align: "left" });
            g.text(note, [5, 0.7], "white", { size: 12 });
            L.set("before", b); L.set("after", a);
          };
        }
      } },

      { h: "레지스터 압박과 점유율" },
      "GPU는 메모리를 기다리는 동안 ==다른 워프로 바꿔 계산==해서 시간을 숨깁니다(34장). 그런데 셰이더가 변수를 많이 쓰면(레지스터 많이) 한 번에 올릴 수 있는 워프 수(점유율)가 줄어 숨길 거리가 사라집니다. 레지스터 수와 메모리 대기 시간을 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 40, y0: 0, y1: 12 },
        eq: ["레지스터 {r}개 → 동시 워프 {w}개   ·   ALU 가동률 {u}%"],
        setup(F, C, L) {
          let regs = 64, lat = 24;
          C.slider({ label: "스레드당 레지스터", min: 16, max: 256, step: 8, value: regs, fmt: f0, onInput: x => { regs = x; } });
          C.slider({ label: "메모리 대기(사이클)", min: 4, max: 60, step: 2, value: lat, fmt: f0, onInput: x => { lat = x; } });
          F.draw = g => {
            const waves = Math.max(1, Math.min(10, Math.floor(256 / regs))), alu = 4, T = 38;
            // 간단한 스케줄링: 매 사이클 준비된 워프 하나가 ALU 4사이클 실행 후 메모리 대기
            const ready = Array(waves).fill(0); let busy = 0;
            const rows = [];
            for (let w = 0; w < waves; w++) rows.push([]);
            let t = 0;
            while (t < T) {
              let pick = -1; for (let w = 0; w < waves; w++) if (ready[w] <= t) { pick = w; break; }
              if (pick < 0) { t++; continue; }
              rows[pick].push([t, t + alu, "alu"]); rows[pick].push([t + alu, t + alu + lat, "mem"]);
              ready[pick] = t + alu + lat; busy += Math.min(alu, T - t); t += alu;
            }
            rows.forEach((r, w) => r.forEach(([a, b, k]) => { if (a >= T) return; const y = 10.6 - w * 1.0; g.poly([[1 + a, y], [1 + Math.min(T, b), y], [1 + Math.min(T, b), y + 0.75], [1 + a, y + 0.75]], { fill: k === "alu" ? PAL.teal : "rgba(138,147,166,0.25)" }); }));
            for (let w = 0; w < waves; w++) g.text("워프 " + (w + 1), [0.9, 10.95 - w], "grey", { size: 10, align: "right" });
            g.text("청록 = 계산, 회색 = 메모리 대기", [39, 0.4], "grey", { size: 11, align: "right" });
            L.set("r", regs); L.set("w", waves); L.set("u", f0(busy / T * 100));
          };
        }
      } },
      { key: "루프 펼치기·큰 배열·긴 수식은 계산을 줄여도 ==레지스터를 늘려 점유율을 떨어뜨릴 수== 있습니다. 컴파일러 통계(VGPR 수)를 보고, 텍스처를 많이 읽는 셰이더일수록 레지스터를 아끼는 쪽이 유리합니다." },

      { use: [
        ["엔진", "머티리얼 통계와 코드 보기", "UE 머티리얼 에디터의 Stats(명령 수·샘플러 수)와 Window → Shader Code → HLSL Code, 플랫폼 통계(Platform Stats)로 최적화 결과를 확인합니다."],
        ["엔진", "상수 폴딩되는 노드", "Constant 노드끼리의 연산, Static Switch Parameter, Feature Level Switch는 컴파일 시 접힙니다. Scalar Parameter는 접히지 않습니다."],
        ["TA", "셰이더 분석 툴", "RenderDoc·PIX·Radeon GPU Analyzer·NVIDIA Nsight로 실제 ISA 명령 수, VGPR 수, 점유율을 확인하고 병목을 찾습니다."],
        ["실생활", "일반 프로그래밍과 같다", "C++ 컴파일러의 -O2 최적화도 같은 상수 폴딩·죽은 코드 제거·강도 줄이기를 합니다. GPU는 레지스터·점유율이라는 제약이 하나 더 있을 뿐입니다."]
      ] },

      { recap: [
        ["상수 폴딩", "컴파일 시점에 계산 가능한 것은 미리"],
        ["죽은 코드 제거 · 정적 스위치", "쓰이지 않는 계산과 텍스처 읽기 삭제"],
        ["pow → 곱셈, 나눗셈 → 역수 곱, MAD", "강도 줄이기"],
        ["레지스터 ↑ → 점유율 ↓", "메모리 대기를 숨길 워프가 줄어듦"]
      ] }
    ]
  });
})();
