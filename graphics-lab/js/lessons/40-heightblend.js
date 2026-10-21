/* 40 높이 기반 블렌딩과 지형 레이어 */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = t => t * t * (3 - 2 * t); return lerp(lerp(hash(i, j), hash(i + 1, j), s(fx)), lerp(hash(i, j + 1), hash(i + 1, j + 1), s(fx)), s(fy)); };
  // 재질 A: 벽돌(벽돌 위는 높고 줄눈은 낮음), 재질 B: 모래(잔물결)
  function brick(u, v) {
    const row = Math.floor(v * 4), off = (row % 2) * 0.5, fu = fract(u * 2 + off), fv = fract(v * 4);
    const m = Math.min(fu, 1 - fu, (fv) * 0.5, (1 - fv) * 0.5);
    const h = clamp(m * 14, 0, 1) * (0.75 + 0.25 * hash(Math.floor(u * 2 + off), row));
    return { c: [lerp(90, 170, h), lerp(70, 85, h), lerp(60, 70, h)], h };
  }
  function sand(u, v) { const h = 0.5 + 0.25 * Math.sin(u * 30 + vnoise(u * 4, v * 4) * 6) * 0.5 + 0.2 * vnoise(u * 20, v * 20); return { c: [lerp(180, 225, h), lerp(150, 195, h), lerp(100, 140, h)], h: h * 0.6 }; }

  lesson({
    topic: "heightblend", title: "높이 기반 블렌딩", desc: "모래는 줄눈부터 채운다", stage: "테크아트 실전",
    sym: { m: "teal", h: "red", k: "orange" },
    hook: "두 재질을 마스크로 그냥 섞으면 반투명하게 겹쳐 보입니다. 실제로는 ==낮은 곳(벽돌 사이 줄눈)부터 모래가 차오릅니다==. 재질마다 높이 정보를 함께 써서 섞으면 이 모습이 나옵니다. 지형·바닥·벽 머티리얼의 기본기입니다.",
    blocks: [
      { h: "선형 블렌드 vs 높이 블렌드" },
      "왼쪽에서 오른쪽으로 갈수록 모래 마스크가 커집니다. ==그냥 섞으면 흐릿한 반투명==, 높이 블렌드는 각 재질의 높이에 마스크를 더해 ==더 높은 쪽이 이기게== 합니다. 경계 날카로움을 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 1, k = 0.08, shift = 0;
          C.seg({ options: [{ value: 0, label: "선형 lerp" }, { value: 1, label: "높이 블렌드" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "경계 폭 $k$", min: 0.01, max: 0.5, value: k, onInput: x => { k = x; } });
          C.slider({ label: "마스크 밀기", min: -0.6, max: 0.6, value: shift, onInput: x => { shift = x; } });
          F.draw = g => {
            g.field(260, (x, y) => {
              const u = x, v = y, m = clamp(x / 2 + shift, 0, 1);
              const A = brick(u, v), B = sand(u, v);
              let w;
              if (mode === 0) w = m;
              else { const ha = A.h + (1 - m), hb = B.h + m, top = Math.max(ha, hb) - k; const wa = Math.max(ha - top, 0), wb = Math.max(hb - top, 0); w = wb / (wa + wb || 1); }
              return [0, 1, 2].map(i => lerp(A.c[i], B.c[i], w)).concat(255);
            }, { smooth: false });
            const m0 = 0.5 - shift;
            if (m0 > 0 && m0 < 1) g.line([m0 * 2, 0], [m0 * 2, 1], "white", { w: 1, dash: [4, 4], alpha: 0.6 });
            L.set("eq", mode === 0 ? "$색 = lerp(A, B, m)$   반투명하게 겹쳐 보임" : "$높이_A = h_A + (1 − m),  높이_B = h_B + m$ → 위에서 $k$ 안쪽만 섞음");
          };
        }
      } },
      { key: "높이 블렌드의 핵심은 ==마스크에 높이 맵을 더한 뒤 비교하는 것==입니다. 높이 맵은 보통 기본색 텍스처의 알파나 패킹된 채널(37장)에 넣어 둡니다." },

      { h: "버텍스 컬러로 직접 칠하기" },
      "벽 메시의 정점마다 마스크 값을 붓으로 칠합니다(캔버스를 끌어 보세요, 첫 줄 버튼으로 지우기/칠하기 전환). 정점 사이는 보간되고, ==높이 블렌드가 그 경계를 줄눈 모양으로 다듬어== 줍니다. 레벨 아티스트가 이끼·먼지·젖은 자국을 칠하는 방법입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 }, captureTouch: true,
        eq: ["정점 마스크 → (보간) → 높이 블렌드   ·   정점 {nx} × {ny}"],
        setup(F, C, L) {
          const NX = 25, NY = 13, V0 = new Float32Array(NX * NY);
          let erase = false, rad = 0.12, showV = true;
          C.seg({ options: [{ value: 0, label: "칠하기" }, { value: 1, label: "지우기" }], value: 0, onChange: x => { erase = !!x; } });
          C.slider({ label: "붓 크기", min: 0.04, max: 0.35, value: rad, onInput: x => { rad = x; } });
          C.seg({ options: [{ value: 1, label: "정점 보기" }, { value: 0, label: "숨기기" }], value: 1, onChange: x => { showV = !!x; } });
          C.button("↺ 지우기", () => V0.fill(0));
          F.onTap = p => {
            for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
              const d = Math.hypot(i / (NX - 1) * 2 - p[0], j / (NY - 1) - p[1]);
              if (d < rad) { const k = j * NX + i, s = (1 - d / rad) * 0.5; V0[k] = clamp(V0[k] + (erase ? -s : s), 0, 1); }
            }
          };
          const mask = (x, y) => { const fx = x / 2 * (NX - 1), fy = y * (NY - 1), i = Math.min(NX - 2, Math.floor(fx)), j = Math.min(NY - 2, Math.floor(fy)), tx = fx - i, ty = fy - j; return lerp(lerp(V0[j * NX + i], V0[j * NX + i + 1], tx), lerp(V0[(j + 1) * NX + i], V0[(j + 1) * NX + i + 1], tx), ty); };
          F.draw = g => {
            g.field(240, (x, y) => {
              const m = mask(x, y), A = brick(x, y);
              const moss = { c: [lerp(70, 120, vnoise(x * 30, y * 30)), lerp(110, 160, vnoise(x * 30, y * 30)), 60], h: 0.3 + 0.3 * vnoise(x * 25, y * 25) };
              const ha = A.h + (1 - m), hb = moss.h + m, top = Math.max(ha, hb) - 0.06, wa = Math.max(ha - top, 0), wb = Math.max(hb - top, 0), w = wb / (wa + wb || 1);
              return [0, 1, 2].map(i => lerp(A.c[i], moss.c[i], w)).concat(255);
            }, { smooth: false });
            if (showV) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const v = V0[j * NX + i]; g.dot([i / (NX - 1) * 2, j / (NY - 1)], v > 0.01 ? `rgba(131,193,103,${0.4 + v * 0.6})` : "rgba(236,239,244,0.35)", 2.5); }
            L.set("nx", NX); L.set("ny", NY);
          };
        }
      } },

      { h: "지형 레이어: 경사와 높이로 자동 칠하기" },
      "넓은 지형은 손으로 다 칠하지 않습니다. ==높이가 높으면 눈, 경사가 가파르면 바위, 나머지는 풀==처럼 규칙으로 레이어 가중치를 만들고, 필요한 곳만 손으로 고칩니다. 오른쪽 '가중치 보기'가 스플랫맵(RGBA 가중치 텍스처)입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["풀 = 기본,   바위 = smoothstep(경사 기준),   눈 = smoothstep(높이 기준) · (1 − 바위)"],
        setup(F, C, L) {
          let slopeT = 0.55, snowT = 0.62, view = 0;
          C.slider({ label: "바위가 되는 경사", min: 0.1, max: 1.5, value: slopeT, onInput: x => { slopeT = x; } });
          C.slider({ label: "눈이 쌓이는 높이", min: 0.3, max: 0.9, value: snowT, onInput: x => { snowT = x; } });
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "가중치 보기 (R 풀·G 바위·B 눈)" }], value: 0, onChange: x => { view = x; } });
          const H = (x, y) => 0.55 * vnoise(x * 2.2, y * 2.2) + 0.3 * vnoise(x * 5, y * 5) + 0.12 * vnoise(x * 13, y * 13);
          const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
          F.draw = g => {
            g.field(220, (x, y) => {
              const h = H(x, y), e = 0.004, gx = (H(x + e, y) - H(x - e, y)) / (2 * e), gy = (H(x, y + e) - H(x, y - e)) / (2 * e), slope = Math.hypot(gx, gy);
              const rock = ss(slopeT - 0.1, slopeT + 0.1, slope), snow = ss(snowT - 0.03, snowT + 0.03, h) * (1 - rock), grass = clamp(1 - rock - snow, 0, 1);
              if (view) return [grass * 255, rock * 255, snow * 255, 255];
              const sh = 0.75 + 0.35 * (gx * -0.5 + gy * 0.5);
              const col = [0, 1, 2].map(i => (grass * [80, 130, 60][i] + rock * [120, 110, 100][i] + snow * [235, 240, 245][i]) * sh);
              return col.concat(255);
            });
          };
        }
      } },

      { use: [
        ["엔진", "랜드스케이프 레이어", "UE 랜드스케이프의 Layer Blend 노드(Weight Blend·Height Blend)와 페인트 툴이 이 장입니다. 레이어마다 스플랫맵 채널을 하나씩 씁니다."],
        ["엔진", "버텍스 페인트", "메시 페인트 모드로 정점 RGBA에 이끼·먼지·젖음을 칠하고, 머티리얼에서 Vertex Color 노드로 읽어 높이 블렌드합니다."],
        ["TA", "레이어 수 관리", "픽셀마다 활성 레이어가 많을수록 텍스처 샘플이 늘어납니다. 레이어 수 제한·가상 텍스처(RVT)로 지형 비용을 관리합니다."],
        ["실생활", "실제 지형 관찰", "눈은 평평하고 높은 곳에, 바위는 가파른 곳에 드러납니다. 규칙 기반 지형 셰이더가 자연스러운 이유입니다."]
      ] },

      { recap: [
        ["lerp(A, B, m)", "선형 블렌드: 반투명하게 겹침"],
        ["h_A + (1 − m)  vs  h_B + m", "높이 블렌드: 높은 쪽이 이김, k만큼만 섞음"],
        ["버텍스 컬러 마스크", "레벨에서 직접 칠하기"],
        ["경사·높이 규칙 → 스플랫맵", "지형 레이어 자동 배치"]
      ] }
    ]
  });
})();
