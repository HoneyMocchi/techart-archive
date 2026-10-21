/* 52 Edge Extend Fill: 투명 텍셀 채우기 */
(() => {
  const f0 = n => num(n, 0);
  const N = 48;
  // 잎사귀 알파 마스크 + 초록 색. 투명한 곳의 RGB는 '정해지지 않은 값'(보통 검정·흰색)
  const leafA = (i, j) => { const u = (i + 0.5) / N - 0.5, v = (j + 0.5) / N - 0.5, r = Math.hypot(u * 1.6, v); const a = Math.atan2(v, u * 1.6); return r < 0.33 + 0.06 * Math.cos(a * 7) ? 1 : 0; };
  const leafC = (i, j) => [0.25 + 0.3 * (i / N), 0.65 - 0.2 * (j / N), 0.2];

  // 바깥 텍셀을 가장 가까운 불투명 색으로 채우기 (팽창 n번)
  function dilate(rgb, a, n) {
    let c = rgb.slice(), al = a.slice();
    for (let k = 0; k < n; k++) {
      const nc = c.slice(), na = al.slice();
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const id = j * N + i; if (al[id]) continue;
        let s = [0, 0, 0], cnt = 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < N && y < N && al[y * N + x]) { const q = c[y * N + x]; s = s.map((v, t) => v + q[t]); cnt++; } });
        if (cnt) { nc[id] = s.map(v => v / cnt); na[id] = 1; }
      }
      c = nc; al = na;
    }
    return c;
  }

  lesson({
    topic: "edgefill", title: "Edge Extend Fill", desc: "투명한 곳의 색을 채워 두기", stage: "TA 도구 상자",
    sym: {},
    hook: "알파로 잘라 쓰는 텍스처(잎·머리카락·UI 아이콘)는 투명한 곳의 RGB가 보이지 않으니 아무 값이나 들어 있곤 합니다. 그런데 ==바이리니어 필터와 밉맵은 그 보이지 않는 색까지 섞습니다==. 가장자리의 검은·흰 테를 막으려면 투명한 영역을 ==가장자리 색으로 바깥으로 늘려 채워== 둡니다.",
    blocks: [
      { h: "문제와 해결: 팽창(Dilation)" },
      "잎사귀 텍스처를 확대하고 밉을 올려 봤습니다. 투명 영역의 RGB가 검정이면 ==가장자리가 검게 물듭니다==. 채우기 반복 수를 늘리면 테두리가 사라집니다. 'RGB만 보기'로 채워진 색을 확인하세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["채우기 {n}회   ·   밉 {m} 에서 픽셀 하나 = 원본 {k}×{k} 평균"],
        setup(F, C, L) {
          let n = 0, mip = 2, view = 0, bg = "black", cache = null;
          C.slider({ label: "채우기 반복", min: 0, max: 16, step: 1, value: n, fmt: f0, onInput: x => { n = x; } });
          C.slider({ label: "밉 단계", min: 0, max: 4, step: 1, value: mip, fmt: f0, onInput: x => { mip = x; } });
          C.seg({ options: [{ value: "black", label: "투명부 검정" }, { value: "white", label: "투명부 흰색" }], value: bg, onChange: x => { bg = x; cache = null; } });
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "RGB만 보기" }], value: 0, onChange: x => { view = x; } });
          F.draw = g => {
            if (!cache || cache.n !== n || cache.bg !== bg) {
              const a = [], rgb = [];
              for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const al = leafA(i, j); a.push(al); rgb.push(al ? leafC(i, j) : bg === "black" ? [0, 0, 0] : [1, 1, 1]); }
              const filled = dilate(rgb, a, n);
              // 밉 사슬: RGB와 알파를 각각 평균 (일반 알파 방식)
              const lv = [{ c: filled, a, s: N }];
              for (let k = 1; k <= 4; k++) { const p = lv[k - 1], s = p.s >> 1, c = [], al = []; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const ids = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([di, dj]) => (2 * j + dj) * p.s + 2 * i + di); c.push([0, 1, 2].map(t => ids.reduce((q, id) => q + p.c[id][t], 0) / 4)); al.push(ids.reduce((q, id) => q + p.a[id], 0) / 4); } lv.push({ c, a: al, s }); }
              cache = { n, bg, lv };
            }
            const L0 = cache.lv[mip], s = L0.s, BG = [0.55, 0.6, 0.7];
            g.field(256, (x, y) => {
              const left = x < 2, u = (left ? x : x - 2) / 2, v = (2 - y) / 2;
              // 왼쪽: 텍스처 원래 크기로(밉 단계 그대로), 오른쪽: 바이리니어로 확대
              const fx = u * s - 0.5, fy = v * s - 0.5, i = Math.floor(fx), j = Math.floor(fy), tx = left ? 0 : fx - i, ty = left ? 0 : fy - j;
              const at = (a, b) => { const ii = clamp(a, 0, s - 1), jj = clamp(b, 0, s - 1), id = jj * s + ii; return [...L0.c[id], L0.a[id]]; };
              const q = left ? at(Math.round(fx), Math.round(fy)) : [0, 1, 2, 3].map(t => lerp(lerp(at(i, j)[t], at(i + 1, j)[t], tx), lerp(at(i, j + 1)[t], at(i + 1, j + 1)[t], tx), ty));
              if (view === 1) return [q[0] * 255, q[1] * 255, q[2] * 255, 255];
              const al = clamp((q[3] - 0.5) * 6 + 0.5, 0, 1);       // 알파 테스트를 조금 부드럽게
              return BG.map((b, t) => lerp(b, q[t], al) * 255).concat(255);
            }, { smooth: false });
            g.line([2, 0], [2, 2], "white", { w: 2 });
            g.text("밉 " + mip, [1, 1.93], "white", { size: 11, bold: true }); g.text("바이리니어로 확대", [3, 1.93], "white", { size: 11, bold: true });
            L.set("n", n); L.set("m", mip); L.set("k", 1 << mip);
          };
        }
      } },

      { h: "빠르게 채우기: 점프 플러딩" },
      "한 칸씩 늘리면 큰 텍스처에서 수백 번 반복해야 합니다. 점프 플러딩은 ==처음엔 멀리(절반 크기) 건너뛰며 '가장 가까운 씨앗'을 전하고, 점점 보폭을 반으로 줄입니다==. $log_2 N$번만에 모든 칸이 가장 가까운 색을 알게 됩니다. 씨앗을 끌어 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 64, y0: 0, y1: 32 },
        eq: ["단계 {k} / {tot}   ·   보폭 {st}칸"],
        setup(F, C, L) {
          const seeds = [[10, 8, "red"], [40, 24, "teal"], [52, 6, "gold"], [22, 26, "purple"], [32, 14, "green"]];
          let pass = 6;
          seeds.forEach(sd => F.handle({ color: sd[2], get: () => [sd[0], sd[1]], set: (x, y) => { sd[0] = clamp(Math.round(x), 0, 63); sd[1] = clamp(Math.round(y), 0, 31); } }));
          C.slider({ label: "진행 단계", min: 0, max: 6, step: 1, value: pass, fmt: f0, onInput: x => { pass = x; } });
          F.draw = g => {
            const Wd = 64, Hd = 32, near = new Int16Array(Wd * Hd).fill(-1);
            seeds.forEach((sd, k) => { near[Math.round(sd[1]) * Wd + Math.round(sd[0])] = k; });
            let step = 32;
            for (let p = 0; p < pass; p++) {
              const nx = Int16Array.from(near);
              for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) {
                let best = near[j * Wd + i], bd = best >= 0 ? Math.hypot(seeds[best][0] - i, seeds[best][1] - j) : 1e9;
                for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
                  const x = i + di * step, y = j + dj * step; if (x < 0 || y < 0 || x >= Wd || y >= Hd) continue;
                  const s = near[y * Wd + x]; if (s < 0) continue;
                  const d = Math.hypot(seeds[s][0] - i, seeds[s][1] - j); if (d < bd) { bd = d; best = s; }
                }
                nx[j * Wd + i] = best;
              }
              near.set(nx); step = Math.max(1, step >> 1);
            }
            for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) { const s = near[j * Wd + i]; if (s >= 0) g.poly([[i - 0.5, j - 0.5], [i + 0.5, j - 0.5], [i + 0.5, j + 0.5], [i - 0.5, j + 0.5]], { fill: hexA(PAL[seeds[s][2]], 0.55) }); }
            L.set("k", pass); L.set("tot", 6); L.set("st", pass < 6 ? (32 >> pass) : "끝");
          };
        }
      } },
      "보폭이 크게 시작하므로 ==텍스처가 4096이어도 12번==이면 끝납니다. GPU에서 패스마다 모든 픽셀을 동시에 처리하므로 실시간으로도 돌아갑니다. 거리장(23장 SDF) 생성에도 같은 방법을 씁니다.",

      { h: "부드럽게 채우기: 푸시-풀" },
      "가장 가까운 색으로 채우면 경계가 각지게 갈라집니다(보로노이 모양). 푸시-풀은 ==알파로 가중한 평균으로 밉을 끝까지 내렸다가(풀), 다시 올라오며 빈 곳만 위 단계 색으로 채웁니다(푸시)==. 듬성듬성한 점에서 부드러운 색 바탕이 만들어집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["풀: 색 = Σ(색·α) / Σα,  푸시: α < 1 인 곳만 위 단계 색으로 채움   ·   단계 {lv}"],
        setup(F, C, L) {
          let lv = 5, dens = 0.03;
          C.slider({ label: "사용할 단계 수", min: 0, max: 5, step: 1, value: lv, fmt: f0, onInput: x => { lv = x; } });
          C.slider({ label: "점 밀도", min: 0.005, max: 0.15, value: dens, onInput: x => { dens = x; } });
          const S = 64;
          F.draw = g => {
            let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const c0 = [], a0 = [];
            for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const on = rnd() < dens; a0.push(on ? 1 : 0); c0.push(on ? [0.5 + 0.5 * Math.sin(i * 0.15), 0.5 + 0.5 * Math.cos(j * 0.2), 0.5 + 0.5 * Math.sin((i + j) * 0.08)] : [0, 0, 0]); }
            const P = [{ c: c0, a: a0, s: S }];
            for (let k = 1; k <= lv; k++) { const p = P[k - 1], s = p.s >> 1, c = [], a = []; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { let w = 0, acc = [0, 0, 0]; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([di, dj]) => { const id = (2 * j + dj) * p.s + 2 * i + di; w += p.a[id]; for (let t = 0; t < 3; t++) acc[t] += p.c[id][t] * p.a[id]; }); c.push(w ? acc.map(v => v / w) : [0, 0, 0]); a.push(Math.min(1, w)); } P.push({ c, a, s }); }
            for (let k = lv - 1; k >= 0; k--) { const p = P[k], up = P[k + 1]; for (let j = 0; j < p.s; j++) for (let i = 0; i < p.s; i++) { const id = j * p.s + i, uid = (j >> 1) * up.s + (i >> 1); const a = p.a[id]; p.c[id] = p.c[id].map((v, t) => v * a + up.c[uid][t] * (1 - a)); p.a[id] = Math.max(a, up.a[uid]); } }
            g.field(256, (x, y) => {
              const left = x < 2, i = Math.floor((left ? x : x - 2) / 2 * S), j = Math.floor((2 - y) / 2 * S), id = j * S + i;
              if (left) return a0[id] ? c0[id].map(v => v * 255).concat(255) : [20, 22, 30, 255];
              return P[0].c[id].map(v => v * 255).concat(255);
            }, { smooth: false });
            g.line([2, 0], [2, 2], "white", { w: 2 });
            g.text("입력 (듬성한 점)", [1, 1.93], "white", { size: 11, bold: true }); g.text("푸시-풀로 채움", [3, 1.93], "white", { size: 11, bold: true });
            L.set("lv", lv);
          };
        }
      } },
      { key: "알파 텍스처는 ==저장 전에 반드시 바깥을 채워 두는 것==이 규칙입니다. 프리멀티플라이드 알파(14장)로 저장하면 이 문제 자체가 사라지지만, 알파 테스트 머티리얼에서는 여전히 채우기가 필요합니다." },

      { use: [
        ["툴", "Substance·포토샵 플러그인", "Substance의 Dilation, 포토샵의 'Solidify'·'Flaming Pear' 같은 플러그인, UE 임포트 시 'Chroma Key/Dilate' 옵션이 이 장의 채우기입니다."],
        ["TA", "익스포트 파이프라인", "잎·머리카락·데칼 텍스처를 내보낼 때 자동으로 바깥을 채우는 스크립트를 넣어 두면 가장자리 테 문제가 프로젝트에서 사라집니다."],
        ["엔진", "라이트맵·베이크 패딩", "라이트맵과 베이크 텍스처도 UV 섬 바깥을 채우는 'Edge Padding'이 있어야 밉에서 검은 이음매가 생기지 않습니다(38장)."],
        ["셰이더", "JFA·푸시-풀 활용", "점프 플러딩은 외곽선 두께·SDF 생성·보로노이 무늬에, 푸시-풀은 구멍 난 깊이·속도 버퍼 메우기와 저밀도 샘플 보간에 씁니다."]
      ] },

      { recap: [
        ["투명 텍셀 RGB도 필터에 섞인다", "검은·흰 테의 원인"],
        ["팽창: 가장 가까운 불투명 색으로", "Edge Extend Fill"],
        ["점프 플러딩: 보폭 N/2, N/4 … 1", "log₂N 번에 가장 가까운 씨앗 전파"],
        ["푸시-풀: 알파 가중 밉 → 빈 곳 채우기", "부드러운 채우기"]
      ] }
    ]
  });
})();
