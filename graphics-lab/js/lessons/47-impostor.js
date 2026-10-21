/* 47 빌보드와 임포스터 */
(() => {
  const f0 = n => num(n, 0);
  // 간단한 3D 물체(나무 비슷한 모양): 줄기 상자 + 잎 공 3개를 방향 yaw에서 본 2D 실루엣 색
  function viewObj(yaw, pitch, u, v) {
    // 화면 (u, v) ∈ [−1, 1] → 광선을 쏴서 색을 구함 (정사영)
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const right = [cy, 0, -sy], up = [-sy * sp, cp, -cy * sp], fwd = [sy * cp, sp, cy * cp];
    const o = V3.add(V3.add(V3.mul(right, u * 1.3), V3.mul(up, v * 1.3 + 0.2)), V3.mul(fwd, -3)), d = fwd;
    let best = { t: 9, c: null };
    [[[0, 0.55, 0], 0.55, [0.35, 0.65, 0.3]], [[0.35, 0.3, 0.2], 0.4, [0.3, 0.6, 0.28]], [[-0.3, 0.25, -0.15], 0.38, [0.42, 0.7, 0.33]]].forEach(([c, r, col]) => {
      const oc = V3.sub(o, c), b = V3.dot(oc, d), cc = V3.dot(oc, oc) - r * r, disc = b * b - cc;
      if (disc > 0) { const t = -b - Math.sqrt(disc); if (t < best.t) { const n = V3.norm(V3.sub(V3.add(o, V3.mul(d, t)), c)); const l = 0.35 + 0.65 * Math.max(0, V3.dot(n, V3.norm([0.5, 0.8, 0.3]))); best = { t, c: col.map(x => x * l) }; } }
    });
    // 줄기
    const bx = [[-0.08, -0.9, -0.08], [0.08, 0.2, 0.08]]; let t0 = -9, t1 = 9;
    for (let k = 0; k < 3; k++) { if (Math.abs(d[k]) < 1e-6) { if (o[k] < bx[0][k] || o[k] > bx[1][k]) { t0 = 9; } continue; } let a = (bx[0][k] - o[k]) / d[k], e = (bx[1][k] - o[k]) / d[k]; if (a > e) [a, e] = [e, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, e); }
    if (t0 < t1 && t0 < best.t) best = { t: t0, c: [0.4, 0.28, 0.18] };
    return best.c;
  }

  lesson({
    topic: "impostor", title: "빌보드와 임포스터", desc: "멀리는 사진 한 장으로", stage: "테크아트 실전",
    sym: {},
    hook: "멀리 있는 숲의 나무 수천 그루를 진짜 메시로 그릴 필요는 없습니다. ==여러 각도에서 찍어 둔 사진을 판 하나에 붙여== 카메라 방향에 맞는 사진을 고르면, 삼각형 2개로 나무 한 그루가 됩니다.",
    blocks: [
      { h: "빌보드: 늘 카메라를 보는 판" },
      "위에서 본 장면입니다. 카메라(흰 점)를 끌어 보세요. 빌보드 판은 ==항상 카메라를 향해 돌아서== 정면 그림만 보여 줍니다. 가장 싸지만, 돌아가도 같은 그림이라 가까이서는 티가 납니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["판의 방향 = normalize(카메라 − 판 위치)"],
        setup(F, C, L) {
          const cam = [-3, -1.2];
          F.vec(cam, "white", { snap: 0.01 });
          let seed = 4; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const trees = Array.from({ length: 14 }, () => [rnd() * 6 - 2, rnd() * 3.4 - 1.7]);
          F.draw = g => {
            g.grid(1, { minor: false, axes: false });
            trees.forEach(p => {
              const d = V.norm(V.sub(cam, p)), s = V.perp(d);
              g.line(V.add(p, V.mul(s, 0.28)), V.sub(p, V.mul(s, 0.28)), "green", { w: 4 });
              g.line(p, V.add(p, V.mul(d, 0.2)), "green", { w: 1, alpha: 0.6 });
              g.line(cam, p, "white", { w: 0.6, alpha: 0.15 });
            });
            g.circle(cam, 0.13, "white", { fill: PAL.bg, w: 2.5 });
          };
        }
      } },

      { h: "옥타헤드럴 임포스터: 방향별 사진 모음" },
      "물체를 ==반구 위 여러 방향에서 미리 찍어 한 장의 아틀라스==에 모아 둡니다(왼쪽). 실행 중에는 카메라 방향에 가장 가까운 칸(노란 테두리)을 골라 보여 줍니다. 회전시키며 진짜 메시(오른쪽 위)와 비교해 보세요. 칸 수가 적으면 ==뚝뚝 바뀌는 것(팝핑)==이 보이고, 이웃 칸을 섞으면 부드러워집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["아틀라스 {g} × {g} = {n}방향   ·   현재 칸 ({ci}, {cj})"],
        setup(F, C, L) {
          let gsz = 6, yaw = 0.6, pitch = 0.3, blend = true;
          const ys = C.slider({ label: "카메라 방위", min: -3.14, max: 3.14, value: yaw, fmt: x => f0(x / DEG) + "°", onInput: x => { yaw = x; } });
          C.slider({ label: "카메라 높이", min: 0, max: 1.4, value: pitch, fmt: x => f0(x / DEG) + "°", onInput: x => { pitch = x; } });
          C.seg({ options: [{ value: 4, label: "4×4" }, { value: 6, label: "6×6" }, { value: 10, label: "10×10" }], value: 6, onChange: x => { gsz = +x; } });
          C.seg({ options: [{ value: 1, label: "이웃 섞기" }, { value: 0, label: "가장 가까운 칸만" }], value: 1, onChange: x => { blend = !!x; } });
          C.play();
          F.loop(dt => { yaw += dt * 0.5; if (yaw > Math.PI) yaw -= TAU; ys.set(yaw); });
          // 단순화: 아틀라스의 가로 = 방위, 세로 = 높이 (반구를 격자로)
          const cellDir = (i, j) => [(i + 0.5) / gsz * TAU - Math.PI, (j + 0.5) / gsz * Math.PI / 2];
          F.draw = g => {
            const A = 1.9, cs = A / gsz;
            g.field(220, (x, y) => {
              if (x < 2) {
                if (y > 1.95 || y < 0.05 || x < 0.05 || x > 1.95) return [16, 19, 26, 255];
                const i = Math.floor((x - 0.05) / cs), j = Math.floor((y - 0.05) / cs), [cyw, cp] = cellDir(i, j);
                const u = ((x - 0.05) - i * cs) / cs * 2 - 1, v = ((y - 0.05) - j * cs) / cs * 2 - 1, c = viewObj(cyw, cp, u, v);
                return c ? c.map(q => q * 255).concat(255) : [24, 28, 38, 255];
              }
              // 오른쪽 위: 진짜 메시, 오른쪽 아래: 임포스터
              const top = y > 1, u = (x - 3) / 0.9, v = (top ? y - 1.5 : y - 0.5) / 0.45;
              if (Math.abs(u) > 1 || Math.abs(v) > 1) return [16, 19, 26, 255];
              if (top) { const c = viewObj(yaw, pitch, u, v); return c ? c.map(q => q * 255).concat(255) : [30, 36, 48, 255]; }
              const fi = ((yaw + Math.PI) / TAU) * gsz - 0.5, fj = clamp(pitch / (Math.PI / 2) * gsz - 0.5, 0, gsz - 1);
              const i0 = Math.floor(fi), j0 = Math.floor(fj), ti = fi - i0, tj = fj - j0;
              const sample = (i, j) => { const [a, b] = cellDir(((i % gsz) + gsz) % gsz, clamp(j, 0, gsz - 1)); return viewObj(a, b, u, v) || [30 / 255, 36 / 255, 48 / 255]; };
              let c;
              if (!blend) c = sample(Math.round(fi), Math.round(fj));
              else { const a = sample(i0, j0), b = sample(i0 + 1, j0), cc = sample(i0, j0 + 1), d = sample(i0 + 1, j0 + 1); c = a.map((_, k) => lerp(lerp(a[k], b[k], ti), lerp(cc[k], d[k], ti), tj)); }
              return c.map(q => q * 255).concat(255);
            }, { smooth: false });
            const ci = ((Math.round(((yaw + Math.PI) / TAU) * gsz - 0.5) % gsz) + gsz) % gsz, cj = clamp(Math.round(pitch / (Math.PI / 2) * gsz - 0.5), 0, gsz - 1);
            g.poly([[0.05 + ci * cs, 0.05 + cj * cs], [0.05 + (ci + 1) * cs, 0.05 + cj * cs], [0.05 + (ci + 1) * cs, 0.05 + (cj + 1) * cs], [0.05 + ci * cs, 0.05 + (cj + 1) * cs]], { stroke: "yellow", w: 2.5 });
            g.text("진짜 메시", [3, 1.97], "white", { size: 11, bold: true }); g.text("임포스터", [3, 0.97], "white", { size: 11, bold: true });
            L.set("g", gsz); L.set("n", gsz * gsz); L.set("ci", ci); L.set("cj", cj);
          };
        }
      } },
      { key: "실제 옥타헤드럴 임포스터는 반구를 팔면체로 펼쳐 방향을 고르게 배치하고, ==깊이·노멀도 함께 구워== 조명과 시차까지 맞춥니다. 칸 수 × 해상도가 메모리, 섞는 칸 수(보통 3)가 비용입니다." },

      { h: "LOD 사다리와 전환" },
      "거리에 따라 메시 → 낮은 LOD → 임포스터 순으로 바뀝니다. 바뀌는 순간의 ==팝핑을 디더 크로스페이드==(30장)로 숨깁니다. 거리를 움직여 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["거리 {d} m → {lod}   ·   삼각형 {tri}개"],
        setup(F, C, L) {
          let dist = 30, fadeW = 6;
          C.slider({ label: "거리 (m)", min: 1, max: 300, value: dist, fmt: x => f0(x), onInput: x => { dist = x; } });
          C.slider({ label: "크로스페이드 폭", min: 0.5, max: 30, value: fadeW, onInput: x => { fadeW = x; } });
          const LODS = [["LOD0 (메시)", 12000, 0], ["LOD1", 3000, 25], ["LOD2", 600, 60], ["임포스터", 2, 120]];
          F.draw = g => {
            let li = 0; LODS.forEach((l, i) => { if (dist >= l[2]) li = i; });
            const next = LODS[li + 1], fade = next ? clamp((dist - (next[2] - fadeW)) / fadeW, 0, 1) : 0;
            const X = d => 0.4 + Math.log10(d) / Math.log10(300) * 9.2;
            LODS.forEach((l, i) => { const x0 = X(Math.max(1, l[2])), x1 = i < 3 ? X(LODS[i + 1][2]) : X(300); g.poly([[x0, 2.6], [x1, 2.6], [x1, 3.3], [x0, 3.3]], { fill: hexA([PAL.teal, PAL.green, PAL.yellow, PAL.orange][i], i === li ? 0.7 : 0.25) }); g.text(l[0], [(x0 + x1) / 2, 2.95], "white", { size: 11, bold: i === li }); });
            g.line([X(dist), 2.4], [X(dist), 3.5], "white", { w: 2 });
            // 디더 크로스페이드 미리보기 (8×8 픽셀)
            const BAY = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
            for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) {
              const showNext = (BAY[(j % 8) * 8 + (i % 8)] + 0.5) / 64 < fade;
              g.poly([[3 + i * 0.25, 0.3 + j * 0.25], [3.25 + i * 0.25, 0.3 + j * 0.25], [3.25 + i * 0.25, 0.55 + j * 0.25], [3 + i * 0.25, 0.55 + j * 0.25]], { fill: showNext ? PAL.orange : PAL.teal, stroke: "rgba(16,19,26,0.4)", w: 0.5 });
            }
            g.text("전환 중 픽셀: 현재 LOD(청록) / 다음 LOD(주황)", [3, 0.3], "grey", { size: 11, align: "left", dy: -10 });
            L.set("d", f0(dist)); L.set("lod", LODS[li][0] + (fade > 0 && next ? ` → ${next[0]} ${f0(fade * 100)}%` : "")); L.set("tri", LODS[li][1].toLocaleString());
          };
        }
      } },

      { use: [
        ["엔진", "Impostor Baker·HLOD", "UE의 Impostor Baker 플러그인, 폴리지 LOD의 빌보드, HLOD의 임포스터 생성이 이 장입니다. SpeedTree도 마지막 LOD를 빌보드로 만듭니다."],
        ["게임", "오픈월드 숲과 군중", "수만 그루 숲, 경기장 관중, 먼 건물이 임포스터입니다. 가까이 오면 진짜 메시로 바뀝니다."],
        ["TA", "LOD 기준 정하기", "화면 크기(Screen Size) 기준으로 LOD 전환점을 정하고, 디더 페이드 폭과 임포스터 해상도를 프로젝트 기준으로 잡습니다."],
        ["실생활", "무대 배경 그림", "연극 무대의 원경 그림막, 영화의 매트 페인팅이 같은 발상입니다. 멀리 있으면 평면이어도 모릅니다."]
      ] },

      { recap: [
        ["판 방향 = 카메라 쪽", "빌보드: 가장 싸지만 돌아가도 같은 그림"],
        ["방향별 사진 아틀라스", "임포스터: 카메라 방향에 맞는 칸 선택·섞기"],
        ["메시 → LOD → 임포스터", "거리(화면 크기)별 사다리"],
        ["디더 크로스페이드", "전환 팝핑 숨기기"]
      ] }
    ]
  });
})();
