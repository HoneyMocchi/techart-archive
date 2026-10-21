/* 53 밉맵 심화 */
(() => {
  const f2 = n => num(n, 2);
  const N = 64;
  // 원본: 가는 줄무늬 + 원형 무늬 (고주파가 많은 텍스처)
  const SRC = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const r = Math.hypot(i - 40, j - 30); SRC.push(((i >> 1) % 2 === 0 ? 0.85 : 0.15) * (i < 24 ? 1 : 0) + (i >= 24 ? (Math.sin(r * r * 0.02) > 0 ? 0.9 : 0.1) : 0)); }
  function build(method) {
    const lv = [SRC];
    for (let k = 1; k <= 5; k++) {
      const p = lv[k - 1], ps = N >> (k - 1), s = ps >> 1, c = [];
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
        if (method === "point") { c.push(p[(2 * j) * ps + 2 * i]); continue; }
        if (method === "box") { c.push((p[2 * j * ps + 2 * i] + p[2 * j * ps + 2 * i + 1] + p[(2 * j + 1) * ps + 2 * i] + p[(2 * j + 1) * ps + 2 * i + 1]) / 4); continue; }
        // 넓은 커널(4×4, 가우시안 비슷한 가중치)
        let acc = 0, ws = 0; const w = [0.125, 0.375, 0.375, 0.125];
        for (let dj = 0; dj < 4; dj++) for (let di = 0; di < 4; di++) { const x = clamp(2 * i - 1 + di, 0, ps - 1), y = clamp(2 * j - 1 + dj, 0, ps - 1), ww = w[di] * w[dj]; acc += p[y * ps + x] * ww; ws += ww; }
        c.push(acc / ws);
      }
      lv.push(c);
    }
    return lv;
  }
  const LV = { point: build("point"), box: build("box"), kaiser: build("wide") };

  lesson({
    topic: "mipmap", title: "밉맵 심화", desc: "만들기·고르기·섞기", stage: "GPU 심화",
    sym: { "λ": "orange", u: "green", v: "red" },
    hook: "10장에서 밉맵이 왜 필요한지 봤습니다. 실무에서는 ==어떻게 줄일지(생성 필터), 어느 단계를 읽을지(LOD 계산), 단계 사이를 어떻게 섞을지(트라이리니어·비등방)== 세 가지를 고릅니다. 하나라도 틀리면 지글거리거나 흐려집니다.",
    blocks: [
      { h: "만들기: 어떤 필터로 줄이나" },
      "고주파 무늬가 있는 원본을 단계별로 줄였습니다(같은 크기로 확대해 표시). ==픽셀을 그냥 건너뛰면==(점 버리기) 무늬가 엉뚱한 굵은 줄로 바뀌는 에일리어싱이 생기고, 평균을 내면 회색으로 수렴합니다. 넓은 커널은 박스보다 조금 더 부드럽고 덜 각집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["밉 {k}: {s}×{s}   ·   {m}"],
        setup(F, C, L) {
          let method = "box", k = 2;
          C.seg({ options: [{ value: "point", label: "점 버리기" }, { value: "box", label: "박스 (2×2 평균)" }, { value: "kaiser", label: "넓은 커널 (4×4)" }], value: method, onChange: x => { method = x; } });
          C.slider({ label: "밉 단계", min: 0, max: 5, step: 1, value: k, fmt: x => num(x, 0), onInput: x => { k = x; } });
          F.draw = g => {
            const s = N >> k, img = LV[method][k];
            g.field(256, (x, y) => {
              if (x < 2) { const i = Math.floor(x / 2 * N), j = Math.floor((2 - y) / 2 * N), v = SRC[j * N + i] * 255; return [v, v, v * 0.95, 255]; }
              const i = Math.floor((x - 2) / 2 * s), j = Math.floor((2 - y) / 2 * s), v = img[j * s + i] * 255; return [v, v, v * 0.95, 255];
            }, { smooth: false });
            g.line([2, 0], [2, 2], "white", { w: 2 });
            g.text("원본 64×64", [1, 1.93], "white", { size: 11, bold: true }); g.text(`밉 ${k} (확대 표시)`, [3, 1.93], "white", { size: 11, bold: true });
            L.set("k", k); L.set("s", s); L.set("m", { point: "정보를 버림 → 줄무늬가 가짜 무늬로(에일리어싱)", box: "4개 평균 → 무난, 대부분의 엔진 기본", kaiser: "주변까지 가중 평균 → 더 부드럽고 반짝임이 적음" }[method]);
          };
        }
      } },

      { h: "고르기와 섞기: 트라이리니어·비등방" },
      "기울어진 바닥입니다. GPU는 픽셀마다 UV 미분(21장)으로 LOD $λ$를 구합니다. ==한 단계만 읽으면 단계 경계에 선이 보이고(바이리니어), 두 단계를 섞으면 매끄럽고(트라이리니어), 비스듬한 방향으로 여러 번 읽으면 먼 곳도 선명합니다(비등방)==. '레벨 색칠'로 확인하세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["λ = log2(max(|∂uv/∂x|, |∂uv/∂y|) · 크기) + 바이어스   ·   {m}"],
        setup(F, C, L) {
          let mode = "tri", bias = 0, color = false, aniso = 8;
          C.seg({ options: [{ value: "bi", label: "바이리니어 (한 단계)" }, { value: "tri", label: "트라이리니어" }, { value: "aniso", label: "비등방" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "밉 바이어스", min: -2, max: 2, value: bias, onInput: x => { bias = x; } });
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "레벨 색칠" }], value: 0, onChange: x => { color = !!x; } });
          const LC = [[88, 196, 221], [92, 208, 179], [131, 193, 103], [244, 211, 69], [240, 172, 95], [252, 98, 85]];
          const tex = (u, v, lvf) => {           // 체크 무늬의 밉 = 대비가 줄어든 체크 (해석적 근사)
            const l = clamp(lvf, 0, 5), contrast = clamp(1 - Math.max(0, l - 2.2) / 2.2, 0, 1);
            const chk = (Math.floor(u * 16) + Math.floor(v * 16)) % 2 ? 1 : 0;
            return lerp(0.5, chk, contrast);
          };
          F.draw = g => {
            const H = 0.95;
            g.field(280, (x, y) => {
              if (y > H - 0.02) return [20, 24, 32, 255];
              const z = 0.9 / (H - y), u = x * z * 0.3, v = z * 0.6;
              const px = 4 / 280;
              const dudx = px * z * 0.3, dvdy = px * 0.6 * 0.9 / Math.pow(H - y, 2);   // 화면 x·y 한 픽셀당 UV 변화
              const big = Math.max(dudx, dvdy) * 16 * 64, small = Math.min(dudx, dvdy) * 16 * 64;
              let lam;
              if (mode === "aniso") lam = Math.log2(Math.max(small, big / aniso)) + bias;
              else lam = Math.log2(big) + bias;
              lam = Math.max(0, lam);
              const lv = mode === "bi" ? Math.round(lam) : lam;
              if (color) { const a = Math.min(5, Math.floor(lv)), b = Math.min(5, a + 1), t = lv - Math.floor(lv); return LC[a].map((c, i) => lerp(c, LC[b][i], mode === "bi" ? 0 : t)).concat(255); }
              const val = tex(u, v, lv);
              return [lerp(40, 236, val), lerp(46, 239, val), lerp(60, 244, val), 255];
            });
            L.set("m", { bi: "가장 가까운 단계 하나 → 단계 경계에 선(밴드)", tri: "위아래 두 단계를 λ의 소수부로 섞음 → 매끄럽지만 먼 곳이 흐림", aniso: "짧은 축 기준으로 단계를 고르고 긴 축으로 여러 번(최대 8×) 읽음 → 먼 곳도 선명" }[mode]);
          };
        }
      } },

      { h: "왜 먼 바닥은 흐려지나: 픽셀 발자국" },
      "픽셀 하나가 텍스처 위에서 덮는 영역(발자국)은 비스듬히 볼수록 ==한쪽으로 길쭉한 타원==이 됩니다. 등방 필터는 긴 축에 맞춰 큰 원으로 읽어 흐려지고, 비등방 필터는 짧은 축 크기로 긴 축을 따라 여러 번 읽습니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["긴 축 / 짧은 축 = {ratio}   →   등방 λ = {li},  비등방 λ = {la} ({n}번 읽기)"],
        setup(F, C, L) {
          let tilt = 1.1, maxA = 16;
          C.slider({ label: "바닥 기울기 (시선과의 각)", min: 0, max: 1.5, value: tilt, fmt: x => num(x / DEG, 0) + "°", onInput: x => { tilt = x; } });
          C.seg({ options: [{ value: 2, label: "2×" }, { value: 4, label: "4×" }, { value: 8, label: "8×" }, { value: 16, label: "16×" }], value: 16, onChange: x => { maxA = +x; } });
          F.draw = g => {
            g.grid(0.5, { minor: false, axes: false, color: "rgba(88,196,221,0.12)" });
            const minor = 0.5, major = minor / Math.max(0.06, Math.cos(tilt)), ratio = major / minor, n = Math.min(maxA, Math.ceil(ratio));
            const e = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU; e.push([Math.cos(a) * minor, Math.sin(a) * major]); }
            g.poly(e, { fill: "rgba(244,211,69,0.15)", stroke: "yellow", w: 2 });
            g.circle([0, 0], major, "orange", { w: 1.5, dash: [5, 4] });
            for (let k = 0; k < n; k++) { const t = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2 * (major - minor); g.circle([0, t], minor, "teal", { w: 1.2, alpha: 0.8 }); }
            g.text("등방: 긴 축 크기의 원 (흐림)", [2.4, 1.6], "orange", { size: 11 }); g.text("비등방: 작은 원 여러 개", [2.4, 1.3], "teal", { size: 11 });
            L.set("ratio", num(ratio, 1)); L.set("li", num(Math.log2(major / 0.05), 1)); L.set("la", num(Math.log2(Math.max(minor, major / n) / 0.05), 1)); L.set("n", n);
          };
        }
      } },
      { key: "밉 바이어스를 음수로 주면 선명해지지만 지글거리고, 양수면 부드럽지만 흐립니다. ==업스케일러(TSR·DLSS)를 쓸 때는 렌더 해상도가 낮으므로 음수 바이어스를 줘서== 최종 해상도에 맞는 디테일을 읽게 합니다." },

      { use: [
        ["엔진", "텍스처 밉 설정", "UE 텍스처의 Mip Gen Settings(SimpleAverage·Sharpen·Blur·NoMipmaps), Filter(트라이리니어·Anisotropic), Max Anisotropy가 이 장의 선택지입니다."],
        ["엔진", "밉 바이어스와 업스케일", "TSR·DLSS 사용 시 엔진이 자동으로 음수 밉 바이어스를 줍니다. 커스텀 셰이더에서 SampleBias·SampleLevel을 쓸 때 이것을 놓치면 흐려집니다."],
        ["TA", "노멀·마스크 밉 주의", "노멀 맵 밉은 평균 후 다시 정규화해야 하고(길이가 줄면 거칠기 보정에 활용), 알파 테스트 텍스처는 밉에서 알파 범위를 보존(coverage)해야 잎이 멀리서 사라지지 않습니다."],
        ["실생활", "지도 줌 레벨", "온라인 지도의 줌 단계 타일이 밉맵이고, 줌 사이를 부드럽게 넘어가는 애니메이션이 트라이리니어 섞기와 같습니다."]
      ] },

      { recap: [
        ["박스·넓은 커널 > 점 버리기", "밉 생성 필터: 에일리어싱 방지"],
        ["λ = log2(UV 미분 · 크기) + 바이어스", "LOD 선택"],
        ["트라이리니어", "두 단계 섞기: 경계선 제거"],
        ["비등방: 짧은 축 λ + 긴 축으로 N번", "비스듬한 면을 선명하게"]
      ] }
    ]
  });
})();
