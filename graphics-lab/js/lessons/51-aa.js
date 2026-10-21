/* 51 안티에일리어싱 총정리 */
(() => {
  const f0 = n => num(n, 0);
  const fract = x => x - Math.floor(x);
  // 테스트 장면 (해상도 무관한 연속 함수): 기울어진 가장자리 + 가는 선 + 반짝이는 하이라이트
  function sceneAt(x, y, t) {
    const inTri = (y - 0.15) * 1.2 - (x - 0.05) * 0.5 < 0 && x * 0.9 + y < 1.5 && y > 0.12;
    let c = inTri ? [0.85, 0.55, 0.35] : [0.12, 0.14, 0.2];
    for (let k = 0; k < 3; k++) { const d = Math.abs((x - 1.1 - k * 0.18) * Math.cos(0.3) + (y - 0.5) * Math.sin(0.3)); if (d < 0.006 && y > 0.1 && y < 0.9) c = [0.9, 0.9, 0.95]; }
    // 하이라이트: 거칠기가 낮은 곡면 위의 날카로운 반사 (노멀이 빠르게 변함)
    const r = Math.hypot(x - 1.65, y - 0.5);
    if (r < 0.3) { const n = Math.sin(x * 120 + t) * Math.cos(y * 110) * 0.5 + 0.5; c = [0.3, 0.35, 0.5].map(v => v + Math.pow(n, 40) * 3); }
    return c;
  }
  const W = 64, H = 32;
  const luma = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const tone = v => Math.round(255 * Math.pow(clamp(v / (1 + v * 0.3), 0, 1), 1 / 2.2));

  lesson({
    topic: "aa", title: "안티에일리어싱 총정리", desc: "계단·지글거림을 다루는 방법들", stage: "TA 도구 상자",
    sym: {},
    hook: "에일리어싱은 두 종류입니다. ==모서리의 계단(기하 에일리어싱)==과 ==표면 안의 지글거림(셰이딩 에일리어싱)==. 방법마다 잡는 것과 놓치는 것이 다릅니다. 같은 장면에 하나씩 적용해 봅니다.",
    blocks: [
      { h: "방법별 결과 비교" },
      "64×32 픽셀로 그린 장면을 확대했습니다. 왼쪽은 기울어진 모서리, 가운데는 가는 선, 오른쪽은 반짝이는 하이라이트입니다. ==MSAA는 모서리를 고치지만 하이라이트 지글거림은 못 고칩니다==. 재생하면 하이라이트가 움직입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = "none";
          C.seg({ options: [{ value: "none", label: "없음" }, { value: "ssaa", label: "SSAA 4×" }, { value: "msaa", label: "MSAA 4×" }, { value: "fxaa", label: "FXAA" }], value: mode, onChange: x => { mode = x; } });
          C.play();
          F.loop(() => {});
          const SS = [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]];
          F.draw = g => {
            const t = F.t * 2, img = [];
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
              const cx = (i + 0.5) / W * 2, cy = 1 - (j + 0.5) / H;
              let c;
              if (mode === "ssaa") { c = [0, 0, 0]; SS.forEach(s => { const q = sceneAt((i + s[0]) / W * 2, 1 - (j + s[1]) / H, t); for (let k = 0; k < 3; k++) c[k] += q[k] / 4; }); }
              else if (mode === "msaa") {
                // 커버리지는 4번, 셰이딩은 픽셀 중심에서 1번: 같은 '물체'에 속한 샘플은 중심 색을 씀
                const center = sceneAt(cx, cy, t), ids = SS.map(s => { const q = sceneAt((i + s[0]) / W * 2, 1 - (j + s[1]) / H, t); return q; });
                c = [0, 0, 0];
                ids.forEach(q => { const same = Math.abs(luma(q) - luma(center)) < 0.25 || Math.hypot(cx - 1.65, cy - 0.5) < 0.3; for (let k = 0; k < 3; k++) c[k] += (same ? center[k] : q[k]) / 4; });
              } else c = sceneAt(cx, cy, t);
              img.push(c);
            }
            let out = img;
            if (mode === "fxaa") {
              out = img.map((c, k) => {
                const i = k % W, j = Math.floor(k / W), L0 = luma(c);
                const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([di, dj]) => img[clamp(j + dj, 0, H - 1) * W + clamp(i + di, 0, W - 1)]);
                const ls = n.map(luma), mx = Math.max(L0, ...ls), mn = Math.min(L0, ...ls);
                if (mx - mn < 0.12) return c;
                const horiz = Math.abs(ls[0] + ls[1] - 2 * L0) > Math.abs(ls[2] + ls[3] - 2 * L0);
                const a = horiz ? n[0] : n[2], b = horiz ? n[1] : n[3];
                return c.map((v, q) => v * 0.5 + (a[q] + b[q]) * 0.25);
              });
            }
            g.field(W, (x, y, i, j) => out[j * W + i].map(tone).concat(255), { rows: H, smooth: false });
            L.set("eq", { none: "픽셀 중심 한 점만: 모서리 계단 + 가는 선 끊김 + 하이라이트 지글거림", ssaa: "픽셀마다 4번 그려 평균: 모두 해결, 비용도 4배", msaa: "커버리지만 4번, 셰이딩은 1번: 모서리·가는 선은 해결, 하이라이트 지글거림은 그대로", fxaa: "다 그린 뒤 밝기 경계를 찾아 흐림: 매우 싸지만 가는 선은 이미 끊겨 복원 못 함, 글자도 흐려짐" }[mode]);
          };
        }
      } },

      { h: "FXAA 안에서 일어나는 일" },
      "FXAA는 기하 정보 없이 ==완성된 이미지의 밝기만 보고== 경계를 찾아 그 방향과 수직으로 살짝 섞습니다. 단계별로 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let step = 1, thr = 0.12;
          C.seg({ options: [{ value: 0, label: "① 밝기(luma)" }, { value: 1, label: "② 경계 찾기" }, { value: 2, label: "③ 방향" }, { value: 3, label: "④ 결과" }], value: step, onChange: x => { step = x; } });
          C.slider({ label: "경계 문턱", min: 0.02, max: 0.5, value: thr, onInput: x => { thr = x; } });
          F.draw = g => {
            const img = [];
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) img.push(sceneAt((i + 0.5) / W * 2, 1 - (j + 0.5) / H, 0));
            g.field(W, (x, y, i, j) => {
              const c = img[j * W + i], L0 = luma(c);
              const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([di, dj]) => img[clamp(j + dj, 0, H - 1) * W + clamp(i + di, 0, W - 1)]), ls = n.map(luma);
              const edge = Math.max(L0, ...ls) - Math.min(L0, ...ls) >= thr, horiz = Math.abs(ls[0] + ls[1] - 2 * L0) > Math.abs(ls[2] + ls[3] - 2 * L0);
              if (step === 0) { const v = tone(L0); return [v, v, v, 255]; }
              if (step === 1) return edge ? [252, 98, 85, 255] : [tone(L0) * 0.3, tone(L0) * 0.3, tone(L0) * 0.3, 255];
              if (step === 2) return !edge ? [20, 22, 30, 255] : horiz ? [131, 193, 103, 255] : [88, 196, 221, 255];
              if (!edge) return c.map(tone).concat(255);
              const a = horiz ? n[0] : n[2], b = horiz ? n[1] : n[3];
              return c.map((v, q) => tone(v * 0.5 + (a[q] + b[q]) * 0.25)).concat(255);
            }, { rows: H, smooth: false });
            L.set("eq", ["밝기만 봅니다 (색 정보는 버림)", "이웃과 밝기 차가 문턱보다 크면 경계(빨강)", "경계가 가로(초록)인지 세로(파랑)인지 판단", "경계와 수직 방향 이웃과 섞어 계단을 누그러뜨림"][step]);
          };
        }
      } },

      { h: "비용과 장단점" },
      "해상도를 고르면 방법별 ==상대 비용과 메모리==가 바뀝니다. 실무에서는 하나만 쓰지 않고, 셰이딩 쪽은 재질에서(거칠기 보정·밉), 화면 쪽은 TAA·업스케일러로 함께 다룹니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: 0, y1: 5, stretch: true },
        eq: ["{res} 기준 · 막대 = 픽셀 셰이딩 비용, 글자 = 추가 메모리와 약점"],
        setup(F, C, L) {
          let rs = "1440p";
          C.seg({ options: [{ value: "1080p", label: "1080p" }, { value: "1440p", label: "1440p" }, { value: "4K", label: "4K" }], value: rs, onChange: x => { rs = x; } });
          const M = [["없음", 1, 0, "계단·지글거림 모두"], ["SSAA 4×", 4, 3, "비용 4배"], ["MSAA 4×", 1.3, 3, "셰이딩 지글거림, 디퍼드와 궁합 나쁨"], ["FXAA·SMAA", 1.05, 0, "흐림, 가는 선 복원 불가"], ["TAA", 1.1, 1, "움직임 잔상(고스팅)"], ["TSR·DLSS (업스케일)", 0.55, 1, "잔상, 미세 디테일 환각"]];
          F.draw = g => {
            const px = { "1080p": 2.07, "1440p": 3.69, "4K": 8.29 }[rs];
            M.forEach(([name, cost, mem, weak], k) => {
              const y = 4.5 - k * 0.75, w = cost / 4 * 5.2;
              g.text(name, [2.1, y], "white", { size: 12, bold: true, align: "right" });
              g.poly([[2.3, y - 0.22], [2.3 + w, y - 0.22], [2.3 + w, y + 0.22], [2.3, y + 0.22]], { fill: cost > 2 ? PAL.red : cost > 1.2 ? PAL.orange : PAL.teal });
              g.text(`×${num(cost, 2)}  +${num(px * 4 * mem, 0)}MB · ${weak}`, [2.4 + w, y], "grey", { size: 11, align: "left" });
            });
            L.set("res", rs);
          };
        }
      } },
      { key: "셰이딩 에일리어싱은 ==화면 후처리보다 재질에서 먼저== 막는 것이 정석입니다. 노멀 맵 밉에 따라 거칠기를 키우는 보정(Toksvig·Specular AA), 너무 가는 디테일 피하기가 그 예입니다." },

      { use: [
        ["엔진", "안티에일리어싱 방법 설정", "UE 프로젝트 설정의 Anti-Aliasing Method: None·FXAA·TAA·MSAA(포워드 전용)·TSR. 디퍼드에서 MSAA를 쓸 수 없는 이유가 G버퍼 메모리입니다."],
        ["엔진", "Specular AA", "머티리얼의 'Normal Curvature to Roughness'와 노멀 맵 밉 거칠기 보정이 셰이딩 에일리어싱을 재질에서 줄이는 옵션입니다."],
        ["게임", "옵션 메뉴 해석", "그래픽 옵션의 AA 선택지는 이 장의 표 그대로의 거래입니다. 경쟁 게임은 잔상 없는 SMAA를, 시네마틱 게임은 TAA·DLSS를 선호합니다."],
        ["TA", "에셋 가이드", "가는 전선·철망·머리카락처럼 픽셀보다 가는 형태는 알파 테스트 대신 두께 보정·반투명 디더·전용 셰이더로 다루도록 가이드합니다."]
      ] },

      { recap: [
        ["SSAA", "다 고치지만 비용 N배"],
        ["MSAA", "커버리지만 N번: 모서리만 해결"],
        ["FXAA·SMAA", "후처리 경계 흐리기: 싸지만 흐림"],
        ["TAA·TSR", "시간 누적 (30장): 고스팅 관리 필요"],
        ["Specular AA", "셰이딩 지글거림은 재질에서"]
      ] }
    ]
  });
})();
