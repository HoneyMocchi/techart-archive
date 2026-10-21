/* 07 UV와 텍스처 샘플링 */
(() => {
  const f2 = n => num(n, 2);
  // 8×8 텍스처: 네 귀퉁이 색이 다르고 흰 'F'가 있어 방향과 뒤집힘이 보입니다
  const GLYPH = ["........", "..####..", "..#.....", "..###...", "..#.....", "..#.....", "........", "........"];
  const Q = [rgb("pink"), rgb("gold"), rgb("teal"), rgb("blue")];
  function texel(i, j) {   // i: 가로(u), j: 세로(위에서부터)
    i = ((i % 8) + 8) % 8; j = ((j % 8) + 8) % 8;
    if (GLYPH[j][i] === "#") return [245, 245, 245];
    const q = Q[(j < 4 ? 0 : 2) + (i < 4 ? 0 : 1)];
    const k = (i + j) % 2 ? 1 : 0.82;
    return [q[0] * k, q[1] * k, q[2] * k];
  }
  const sampleNearest = (u, v) => texel(Math.floor(u * 8), Math.floor((1 - v) * 8));
  function sampleBilinear(u, v) {
    const x = u * 8 - 0.5, y = (1 - v) * 8 - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const a = texel(i, j), b = texel(i + 1, j), c = texel(i, j + 1), d = texel(i + 1, j + 1);
    return a.map((_, k) => lerp(lerp(a[k], b[k], fx), lerp(c[k], d[k], fx), fy));
  }
  const edge = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  function bary(A, B, C, p) { const ar = edge(A, B, C) || 1e-9; return [edge(B, C, p) / ar, edge(C, A, p) / ar, edge(A, B, p) / ar]; }

  lesson({
    topic: "texture", title: "UV와 텍스처 샘플링", desc: "표면 위의 주소", stage: "3D에서 화면으로",
    sym: { u: "green", v: "red", fx: "green", fy: "red", t: "teal", "θ": "blue" },
    hook: "텍스처는 그림이고, UV는 ==표면의 각 점이 그 그림의 어디를 가리키는지 적은 주소==입니다.",
    blocks: [
      { h: "UV: 모델 위의 점 → 그림 위의 점" },
      "왼쪽이 텍스처(0~1 사각형), 오른쪽이 모델의 면입니다. ==오른쪽 꼭짓점을 끌면 면이 찌그러지고, 왼쪽 UV 꼭짓점을 끌면 그림의 어느 부분을 붙일지가 바뀝니다==. 흰 점은 서로 대응하는 한 점입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.3, x1: 4.3, y0: -2.15, y1: 2.15 },
        eq: ["(u, v) = ({u}, {v})"],
        setup(F, C, L) {
          const T0 = [-4, -1.6], TS = 3.2;                        // 텍스처 사각형 위치·크기
          const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
          const pos = [[0.6, -1.5], [3.9, -1.2], [3.4, 1.7], [0.4, 1.3]];
          const probe = [0.62, 0.38];
          const T = uv => [T0[0] + uv[0] * TS, T0[1] + uv[1] * TS];
          uvs.forEach((uv, k) => F.handle({ color: "green", get: () => T(uv), set: (x, y) => { uv[0] = clamp(snap((x - T0[0]) / TS, 0.01), 0, 1); uv[1] = clamp(snap((y - T0[1]) / TS, 0.01), 0, 1); } }));
          pos.forEach(p => F.vec(p, "yellow", { snap: 0.02 }));
          F.handle({ color: "white", get: () => T(probe), set: (x, y) => { probe[0] = clamp((x - T0[0]) / TS, 0, 1); probe[1] = clamp((y - T0[1]) / TS, 0, 1); } });
          const tris = [[0, 1, 2], [0, 2, 3]];
          F.draw = g => {
            g.field(260, (x, y) => {
              if (x >= T0[0] && x <= T0[0] + TS && y >= T0[1] && y <= T0[1] + TS) { const c = sampleNearest((x - T0[0]) / TS, (y - T0[1]) / TS); return [c[0], c[1], c[2], 255]; }
              for (const t of tris) {
                const w = bary(pos[t[0]], pos[t[1]], pos[t[2]], [x, y]);
                if (w[0] < 0 || w[1] < 0 || w[2] < 0) continue;
                const u = w[0] * uvs[t[0]][0] + w[1] * uvs[t[1]][0] + w[2] * uvs[t[2]][0];
                const v = w[0] * uvs[t[0]][1] + w[1] * uvs[t[1]][1] + w[2] * uvs[t[2]][1];
                const c = sampleNearest(clamp(u, 0, 0.999), clamp(v, 0, 0.999));
                return [c[0], c[1], c[2], 255];
              }
              return null;
            }, { smooth: false });
            g.poly([T([0, 0]), T([1, 0]), T([1, 1]), T([0, 1])], { stroke: "rgba(236,239,244,0.5)", w: 1.5 });
            g.poly(uvs.map(T), { stroke: "green", w: 2.5 });
            g.poly(pos, { stroke: "yellow", w: 2.5 });
            g.text("텍스처 (u, v)", [T0[0] + TS / 2, T0[1] + TS], "grey", { dy: -12, size: 12 });
            g.tex("u →", [T0[0] + TS / 2, T0[1]], "green", { dy: 16, size: 15 });
            g.tex("v ↑", [T0[0], T0[1] + TS / 2], "red", { dx: -18, size: 15 });
            // 같은 UV를 모델 위에서 찾기 (삼각형 안에서 UV의 무게중심 좌표를 구해 위치로 옮김)
            for (const t of tris) {
              const w = bary(uvs[t[0]], uvs[t[1]], uvs[t[2]], probe);
              if (w[0] < -1e-6 || w[1] < -1e-6 || w[2] < -1e-6) continue;
              const p = [0, 1].map(k => w[0] * pos[t[0]][k] + w[1] * pos[t[1]][k] + w[2] * pos[t[2]][k]);
              g.line(T(probe), p, "white", { w: 1.2, dash: [4, 5], alpha: 0.6 });
              g.circle(p, 0.09, "white", { fill: "white" });
              break;
            }
            L.set("u", f2(probe[0])); L.set("v", f2(probe[1]));
          };
        }
      } },
      "UV가 ==삼각형마다 꼭짓점에만 저장==되고, 그 사이는 9장의 무게중심 좌표로 보간된다는 점을 기억하세요. UV 사각형을 작게 줄이면 그림의 일부가 면 전체로 확대됩니다.",

      { h: "0~1 밖으로 나가면: 래핑" },
      "UV가 1을 넘거나 0보다 작아지면 어떻게 할지 정해야 합니다. 반복 횟수를 늘리고 모드를 바꿔 보세요. 점선이 원래의 0~1 영역입니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.3, x1: 4.3, y0: -2.15, y1: 2.15 },
        eq: ["{formula}"],
        setup(F, C, L) {
          let tile = 2.5, mode = "repeat";
          C.seg({ options: [{ value: "repeat", label: "반복" }, { value: "clamp", label: "가장자리 늘이기" }, { value: "mirror", label: "거울 반복" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "UV 배율", min: 1, max: 4, value: tile, onInput: x => { tile = x; } });
          const wrap = a => mode === "repeat" ? a - Math.floor(a) : mode === "clamp" ? clamp(a, 0, 0.999) : (() => { const t = a - 2 * Math.floor(a / 2); return t > 1 ? 2 - t : t; })();
          F.draw = g => {
            const R = { x0: -3.6, x1: 3.6, y0: -1.8, y1: 1.8 };
            g.field(240, (x, y) => {
              if (x < R.x0 || x > R.x1 || y < R.y0 || y > R.y1) return null;
              const u = ((x - R.x0) / (R.x1 - R.x0) - 0.5) * tile + 0.5, v = ((y - R.y0) / (R.y1 - R.y0) - 0.5) * tile + 0.5;
              const c = sampleNearest(Math.min(wrap(u), 0.999), Math.min(wrap(v), 0.999));
              return [c[0], c[1], c[2], 255];
            }, { smooth: false });
            const cx = (R.x1 - R.x0) / tile / 2, cy = (R.y1 - R.y0) / tile / 2;
            g.poly([[-cx, -cy], [cx, -cy], [cx, cy], [-cx, cy]], { stroke: "white", w: 2.5, dash: [7, 5] });
            g.text("0 ~ 1", [0, cy], "white", { dy: -10, size: 12, bold: true });
            L.set("formula", mode === "repeat" ? "$uv' = frac(uv)$   소수 부분만 → 타일처럼 반복" : mode === "clamp" ? "$uv' = clamp(uv, 0, 1)$   가장자리 텍셀이 쭉 늘어남" : "짝수 칸은 그대로, 홀수 칸은 뒤집기 → 이음매 없이 반복");
          };
        }
      } },

      { h: "텍셀 사이를 읽으면: 필터링" },
      "텍스처를 크게 확대한 모습입니다. 흰 점(샘플 위치)을 끌어 보세요. ==Nearest는 가장 가까운 텍셀 하나, Bilinear는 주변 네 텍셀을 거리 비율로 섞습니다==.",
      { fig: {
        aspect: 0.5, view: { x0: -4.3, x1: 4.3, y0: -2.15, y1: 2.15 },
        eq: ["{eq1}", "fx = {fx},   fy = {fy}"],
        setup(F, C, L) {
          let bil = true;
          const S0 = [-3.9, -2], SZ = 4;          // 텍스처 2×2 칸 영역(0.25~0.75)을 확대
          const sp = [0.43, 0.56];
          const W = uv => [S0[0] + (uv[0] - 0.25) * 2 * SZ, S0[1] + (uv[1] - 0.25) * 2 * SZ];
          F.handle({ color: "white", get: () => W(sp), set: (x, y) => { sp[0] = clamp((x - S0[0]) / (2 * SZ) + 0.25, 0.26, 0.74); sp[1] = clamp((y - S0[1]) / (2 * SZ) + 0.25, 0.26, 0.74); } });
          C.seg({ options: [{ value: 0, label: "Nearest" }, { value: 1, label: "Bilinear" }], value: 1, onChange: x => { bil = !!x; } });
          F.draw = g => {
            g.field(200, (x, y) => {
              const u = (x - S0[0]) / (2 * SZ) + 0.25, v = (y - S0[1]) / (2 * SZ) + 0.25;
              if (u < 0.25 || u > 0.75 || v < 0.25 || v > 0.75) return null;
              const c = bil ? sampleBilinear(u, v) : sampleNearest(u, v);
              return [c[0], c[1], c[2], 255];
            }, { smooth: true });
            for (let i = 2; i <= 6; i++) {
              const a = W([i / 8, 0.25]), b = W([i / 8, 0.75]), c = W([0.25, i / 8]), d = W([0.75, i / 8]);
              g.line(a, b, "rgba(16,19,26,0.6)", { w: 1 }); g.line(c, d, "rgba(16,19,26,0.6)", { w: 1 });
            }
            for (let i = 2; i < 6; i++) for (let j = 2; j < 6; j++) g.dot(W([(i + 0.5) / 8, (j + 0.5) / 8]), "rgba(16,19,26,0.7)", 3);
            // 주변 네 텍셀 중심과 가중치
            const x = sp[0] * 8 - 0.5, y = sp[1] * 8 - 0.5, i0 = Math.floor(x), j0 = Math.floor(y), fx = x - i0, fy = y - j0;
            const cs = [[i0, j0, (1 - fx) * (1 - fy)], [i0 + 1, j0, fx * (1 - fy)], [i0, j0 + 1, (1 - fx) * fy], [i0 + 1, j0 + 1, fx * fy]];
            const sP = W(sp);
            if (bil) cs.forEach(([i, j, w]) => {
              const c = W([(i + 0.5) / 8, (j + 0.5) / 8]);
              g.line(sP, c, "white", { w: 1 + w * 6, alpha: 0.85 });
              g.text(num(w, 2), c, "white", { size: 12, bold: true, dy: -14 });
            });
            else { const c = W([(Math.floor(sp[0] * 8) + 0.5) / 8, (Math.floor(sp[1] * 8) + 0.5) / 8]); g.line(sP, c, "white", { w: 4 }); }
            const col3 = bil ? sampleBilinear(sp[0], sp[1]) : sampleNearest(sp[0], sp[1]);
            g.poly([[1.4, -1.2], [3.8, -1.2], [3.8, 1.2], [1.4, 1.2]], { fill: `rgb(${col3[0] | 0},${col3[1] | 0},${col3[2] | 0})`, stroke: "white", w: 2 });
            g.text("샘플 결과", [2.6, 1.2], "white", { dy: -12, size: 13, bold: true });
            L.set("eq1", bil ? "$색 = lerp(lerp(c00, c10, fx), lerp(c01, c11, fx), fy)$" : "가장 가까운 텍셀 하나의 색을 그대로");
            L.set("fx", f2(fx)); L.set("fy", f2(fy));
          };
        }
      } },
      "확대했을 때 Nearest는 ==또렷한 픽셀 덩어리==(도트 그래픽), Bilinear는 ==부드럽지만 흐릿한== 결과가 나옵니다. `lerp` 세 번이 전부입니다.",

      { h: "멀리 있는 텍스처와 밉맵" },
      "반대로 텍스처가 ==화면에서 아주 작아지면== 픽셀 하나에 텍셀 수십 개가 들어갑니다. 그중 하나만 집으면 무늬가 지글거립니다(모아레). 미리 줄여 둔 그림(밉맵)에서 읽으면 해결됩니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.3, x1: 4.3, y0: -2.15, y1: 2.15 },
        eq: ["mip = log2(픽셀 하나가 덮는 텍셀 수)   →   {lv}"],
        setup(F, C, L) {
          let mode = 0, scale = 1;
          C.seg({ options: [{ value: 0, label: "밉맵 없음" }, { value: 1, label: "밉맵" }, { value: 2, label: "레벨 색칠" }], value: 0, onChange: x => { mode = x; } });
          C.slider({ label: "무늬 촘촘함", min: 0.5, max: 3, value: scale, onInput: x => { scale = x; } });
          C.play();
          let off = 0;
          F.loop(dt => { off += dt * 0.6; });
          const LV = ["blue", "teal", "green", "yellow", "orange", "red", "pink", "purple"].map(rgb);
          F.draw = g => {
            const H = 1.9;                              // 지평선 높이
            const freq = 6 * scale;
            g.field(320, (x, y) => {
              if (y > H - 0.02) return [16, 19, 26, 255];
              const z = 2.6 / (H - y);                  // 바닥 평면의 깊이
              const u = x * z * 0.5, v = z + off;
              const fp = z * z / 2.6 * (8.6 / 320) * freq;   // 픽셀 하나가 덮는 무늬 칸 수(대략)
              const chk = (Math.floor(u * freq) + Math.floor(v * freq)) % 2 ? 1 : 0;
              if (mode === 0) return chk ? [236, 239, 244, 255] : [40, 46, 60, 255];
              const level = Math.max(0, Math.log2(fp * 2));
              if (mode === 2) { const c = LV[Math.min(7, Math.floor(level))]; return [c[0], c[1], c[2], 255]; }
              const k = clamp(1.6 - fp * 1.6, 0, 1);    // 줄어들수록 평균색(회색)으로
              const val = lerp(0.5, chk, k);
              return [lerp(40, 236, val), lerp(46, 239, val), lerp(60, 244, val), 255];
            }, { smooth: mode !== 0 });
            L.set("lv", mode === 2 ? "파랑 0 → 청록 1 → 초록 2 → 노랑 3 → … 멀수록 작은 밉맵" : mode === 1 ? "멀수록 미리 줄여 둔(평균 낸) 그림에서 읽음" : "항상 원본에서 한 점만 읽음 → 먼 곳이 지글거림");
          };
        }
      } },
      "'레벨 색칠'로 보면 ==거리에 따라 자동으로 작은 밉맵이 골라지는 것==이 보입니다. GPU는 옆 픽셀과의 UV 차이(미분)로 이 레벨을 계산합니다. 밉맵은 용량을 1/3만 더 쓰고 화질과 캐시 효율을 함께 얻습니다. 생성 필터·트라이리니어·비등방은 53장에서 자세히 봅니다.",

      { h: "UV를 움직이면 애니메이션" },
      "UV는 그냥 숫자라서 ==셰이더에서 더하고 돌리면== 텍스처가 흐르고 돕니다. 물결, 컨베이어 벨트, 마법진이 이렇게 만들어집니다.",
      { fig: {
        aspect: 0.5, view: { x0: -4.3, x1: 4.3, y0: -2.15, y1: 2.15 },
        eq: ["uv' = R(θ)·(uv − 0.5) + 0.5 + t·속도"],
        setup(F, C, L) {
          let sp = 0.25, rotSp = 0.4, tile = 2;
          C.play(true);
          C.slider({ label: "흐르는 속도", min: -1, max: 1, value: sp, onInput: x => { sp = x; } });
          C.slider({ label: "도는 속도", min: -1.5, max: 1.5, value: rotSp, onInput: x => { rotSp = x; } });
          C.slider({ label: "타일", min: 1, max: 4, value: tile, onInput: x => { tile = x; } });
          F.loop(() => {});
          F.draw = g => {
            const t = F.t, th = t * rotSp, c = Math.cos(th), s = Math.sin(th);
            g.field(300, (x, y) => {
              if (Math.abs(x) > 3.8 || Math.abs(y) > 1.9) return null;
              const u = x / 3.8 * tile * 0.5, v = y / 3.8 * tile * 0.5;
              const ru = c * u - s * v, rv = s * u + c * v;
              const cl = sampleNearest(((ru + 0.5 + t * sp) % 1 + 1) % 1, ((rv + 0.5) % 1 + 1) % 1);
              return [cl[0], cl[1], cl[2], 255];
            }, { smooth: false });
          };
        }
      } },

      { use: [
        ["엔진", "텍스처 설정 창", "UE 텍스처의 sRGB, 필터(Nearest·Bilinear·Trilinear·Anisotropic), 래핑, 밉 생성 옵션이 이 장 내용 그대로입니다."],
        ["게임", "도트 그래픽", "픽셀 아트 게임은 ==Nearest 필터와 밉맵 끄기==로 또렷한 도트를 지킵니다."],
        ["셰이더", "UV 애니메이션", "흐르는 용암·물·홀로그램·진행 바가 UV 스크롤·회전·왜곡입니다. 머티리얼의 Panner·Rotator 노드."],
        ["실생활", "온라인 지도", "지도 앱은 줌 단계마다 줄여 둔 타일(밉맵과 같은 원리)을 내려받아 보여 줍니다."]
      ] },

      { recap: [
        ["(u, v) ∈ [0, 1]", "그림 위의 주소, 꼭짓점에 저장 → 보간"],
        ["frac(uv) · clamp(uv, 0, 1)", "래핑: 반복 / 가장자리 늘이기 / 거울"],
        ["lerp(lerp(c00, c10, fx), lerp(c01, c11, fx), fy)", "Bilinear 필터"],
        ["mip = log2(덮는 텍셀 수)", "멀수록 작은 밉맵 → 지글거림 제거"]
      ] }
    ]
  });
})();
