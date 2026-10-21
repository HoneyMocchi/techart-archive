/* 63 알파 테스트·알파 투 커버리지 (벤 골루스 기법) */
(() => {
  const pct = n => num(n * 100, 0) + "%";
  const N = 64;
  // 나뭇잎 알파 텍스처: 가는 줄기 + 타원 잎 여러 장 (가장자리는 부드럽게)
  const LEAF = (() => {
    const a = new Float32Array(N * N);
    const leaves = [];
    for (let k = 0; k < 9; k++) { const t = k / 8, side = k % 2 ? 1 : -1; leaves.push({ c: [32 + side * (7 + 4 * Math.sin(k)), 8 + t * 48], ang: side * 0.8 + 0.2 * Math.sin(k * 3), rx: 9 - t * 3, ry: 3.2 - t * 0.8 }); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = x + 0.5, py = y + 0.5;
      let v = clamp(1.2 - Math.abs(px - 32 - Math.sin(py * 0.08) * 2) / 0.9, 0, 1) * (py > 4 && py < 60 ? 1 : 0);
      leaves.forEach(l => {
        const dx = px - l.c[0], dy = py - l.c[1], c = Math.cos(l.ang), s = Math.sin(l.ang);
        const u = (dx * c + dy * s) / l.rx, w = (-dx * s + dy * c) / l.ry, r = Math.hypot(u, w);
        v = Math.max(v, clamp((1 - r) * l.ry, 0, 1));
      });
      a[y * N + x] = v;
    }
    return a;
  })();
  // 밉 체인: 2×2 평균
  const mips = [{ n: N, a: LEAF }];
  while (mips[mips.length - 1].n > 2) {
    const p = mips[mips.length - 1], n = p.n / 2, a = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) a[y * n + x] = (p.a[2 * y * p.n + 2 * x] + p.a[2 * y * p.n + 2 * x + 1] + p.a[(2 * y + 1) * p.n + 2 * x] + p.a[(2 * y + 1) * p.n + 2 * x + 1]) / 4;
    mips.push({ n, a });
  }
  const cover = (m, s, cut) => { let c = 0; for (let i = 0; i < m.a.length; i++) if (m.a[i] * s >= cut) c++; return c / m.a.length; };
  // 커버리지 보존: 밉마다 알파에 곱할 배율을 이분 탐색
  const scaleFor = (m, target, cut) => { let lo = 0.5, hi = 8; for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (cover(m, mid, cut) < target) lo = mid; else hi = mid; } return hi; };
  const sampleBilinear = (a, n, u, v) => {
    const x = clamp(u * n - 0.5, 0, n - 1), y = clamp(v * n - 0.5, 0, n - 1), i = Math.min(n - 2, Math.floor(x)), j = Math.min(n - 2, Math.floor(y)), fx = x - i, fy = y - j;
    return lerp(lerp(a[j * n + i], a[j * n + i + 1], fx), lerp(a[(j + 1) * n + i], a[(j + 1) * n + i + 1], fx), fy);
  };

  lesson({
    topic: "alphacov", title: "알파 테스트와 알파 투 커버리지", desc: "멀어지면 사라지는 나뭇잎 고치기", stage: "그래픽스 연구 노트",
    sym: { α: "pink", c: "orange" },
    hook: "나무와 풀은 ==알파 테스트==(알파가 기준값보다 작으면 픽셀을 버림)로 그립니다. 그런데 멀어질수록 나뭇잎이 앙상해지다 사라지고, 가까이서는 가장자리가 계단처럼 깨집니다. 벤 골루스가 정리한 두 가지 처방, ==커버리지 보존 밉맵과 날카롭게 만든 알파 투 커버리지==를 직접 만져 봅니다.",
    blocks: [
      { h: "밉맵이 나뭇잎을 갉아먹는 이유" },
      "밉을 만들 때 알파를 평균 내면, 얇은 잎 가장자리의 1과 바깥의 0이 섞여 ==0.5 아래로 떨어지는 픽셀이 늘어납니다==. 기준값 0.5로 자르면 잎이 점점 얇아지다 사라집니다. 오른쪽은 밉마다 알파에 배율을 곱해 ==기준값을 넘는 비율(커버리지)을 원본과 같게== 맞춘 것입니다.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 3, y0: 0, y1: 1.26, stretch: true },
        eq: ["밉 {m} ({n}×{n})   ·   커버리지: 원본 {c0} → 그냥 평균 {c1}  ·  보존 밉 {c2} (배율 ×{s})"],
        setup(F, C, L) {
          let m = 2, cut = 0.5;
          C.slider({ label: "밉 단계", min: 0, max: mips.length - 2, step: 1, value: m, fmt: x => "밉 " + x, onInput: x => { m = x; } });
          C.slider({ label: "기준값 $c$", min: 0.2, max: 0.8, value: cut, onInput: x => { cut = x; } });
          F.draw = g => {
            const M = mips[m], c0 = cover(mips[0], 1, cut), s = scaleFor(M, c0, cut);
            const panel = (x0, fn, label) => {
              g.field(Math.min(240, M.n * 3 * 4), (x, y) => {
                const u = (x - x0) / 0.9, v = (1.1 - y) / 0.9;
                if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
                const a = M.a[Math.floor(v * M.n) * M.n + Math.floor(u * M.n)];
                return fn(a);
              }, { rect: { x0, x1: x0 + 0.9, y0: 0.2, y1: 1.1 }, smooth: false, rows: Math.min(80, M.n * 4) });
              g.text(label, [x0 + 0.45, 0.1], "grey", { size: 11 });
            };
            panel(0.05, a => [a * 255, a * 255, a * 255, 255], "평균 낸 알파");
            panel(1.05, a => (a >= cut ? [110, 190, 90, 255] : [30, 34, 44, 255]), "알파 테스트");
            panel(2.05, a => (a * s >= cut ? [110, 190, 90, 255] : [30, 34, 44, 255]), "커버리지 보존 밉");
            L.set("m", m); L.set("n", M.n); L.set("c0", pct(c0)); L.set("c1", pct(cover(M, 1, cut))); L.set("c2", pct(cover(M, s, cut))); L.set("s", num(s, 2));
          };
        }
      } },
      { key: "커버리지 보존은 ==굽는 단계에서 한 번== 하는 처리라 실행 비용이 없습니다. Unity의 텍스처 임포터에 'Mip Maps Preserve Coverage' 체크박스가 바로 이것입니다." },

      { h: "알파 투 커버리지와 날카롭게 만들기" },
      "알파 테스트는 픽셀을 켜거나 끄기만 해서 가장자리가 계단입니다. MSAA가 켜져 있으면 ==알파를 샘플 마스크로 바꿔(알파 투 커버리지)== 4샘플 중 몇 개만 칠할 수 있습니다. 그런데 텍스처 알파는 확대하면 흐릿해서 가장자리가 뿌옇게 번집니다. 골루스의 한 줄 처방은 ==알파를 화면 픽셀 하나 폭으로 날카롭게== 다시 맞추는 것입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 2, zoom = 3;
          C.seg({ options: [{ value: 0, label: "알파 테스트" }, { value: 1, label: "알파 투 커버리지" }, { value: 2, label: "날카롭게 한 A2C" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "확대", min: 1, max: 8, value: zoom, fmt: x => "×" + num(x, 1), onInput: x => { zoom = x; } });
          F.draw = g => {
            const cols = 96, rows = 48, tex = mips[0];
            const A = (i, j) => sampleBilinear(tex.a, tex.n, 0.5 + (i - cols / 2) / (cols * zoom) * 1.6, 0.42 + (j - rows / 2) / (cols * zoom) * 1.6);
            g.field(cols, (x, y, i, j) => {
              let a = A(i + 0.5, j + 0.5), cov;
              if (mode === 0) cov = a >= 0.5 ? 1 : 0;
              else {
                if (mode === 2) { const fw = Math.abs(A(i + 1.5, j + 0.5) - a) + Math.abs(A(i + 0.5, j + 1.5) - a); a = (a - 0.5) / Math.max(fw, 1e-4) + 0.5; }
                cov = Math.round(clamp(a, 0, 1) * 4) / 4;   // 4× MSAA: 0, ¼, ½, ¾, 1
              }
              return [lerp(24, 110, cov), lerp(28, 190, cov), lerp(40, 90, cov), 255];
            }, { rows, smooth: false });
            L.set("eq", ["$α ≥ 0.5$ 이면 켜고 아니면 버림 → 계단", "커버리지 = $α$ (4샘플로 반올림) → 확대하면 뿌옇게 번짐", "$α' = (α − 0.5) / fwidth(α) + 0.5$ → 픽셀 하나 폭의 매끈한 가장자리"][mode]);
          };
        }
      } },
      { key: "$fwidth(α)$ 는 ==옆 픽셀과 알파가 얼마나 다른가==입니다(21장 미분). 그것으로 나누면 확대 배율과 상관없이 전환 폭이 늘 화면 픽셀 하나가 됩니다. SDF 글꼴 렌더링의 가장자리 처리와 같은 원리입니다." },

      { use: [
        ["엔진", "Unity·UE 설정", "Unity 텍스처 임포터의 'Preserve Coverage', 셰이더의 AlphaToMask On이 이 장의 두 기법입니다. UE는 머티리얼의 'Dithered/Alpha to Coverage' 옵션(포워드 + MSAA)이 같은 역할입니다."],
        ["게임", "풀과 나무", "포워드 렌더링에 MSAA를 쓰는 VR·모바일 게임(예: Valve의 VR 게임)은 A2C로 풀숲 가장자리를 다듬습니다. 디퍼드 + TAA 엔진은 대신 디더링을 TAA로 풀어 냅니다."],
        ["글", "벤 골루스의 원문", "Medium 글 'Anti-aliased Alpha Test: The Esoteric Alpha To Coverage'에 밉 커버리지 문제와 샤프닝 식이 단계별로 정리되어 있습니다."],
        ["TA", "폴리지 체크리스트", "잎이 멀리서 앙상해지면 밉 커버리지 보존, 가까이서 계단이면 A2C 또는 TAA, 반짝이면 밉 바이어스를 의심합니다."]
      ] },

      { recap: [
        ["평균 낸 알파 → 커버리지 감소", "멀리서 나뭇잎이 사라지는 원인"],
        ["밉마다 알파 × 배율", "커버리지 보존 밉: 굽는 단계에서 해결"],
        ["커버리지 = α (MSAA 샘플)", "알파 투 커버리지"],
        ["(α − c) / fwidth(α) + 0.5", "픽셀 하나 폭으로 날카롭게"]
      ] }
    ]
  });
})();
