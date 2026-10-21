/* 75 엣지 메시 데칼 */
(() => {
  const HT = new Float32Array(4096); { let s = 77; for (let k = 0; k < 4096; k++) { s = (Math.imul(s, 1664525) + 1013904223) | 0; HT[k] = (s >>> 8) / 16777216; } }
  const h2 = (x, y) => HT[(x & 63) | ((y & 63) << 6)];
  const vn = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h2(i, j), h2(i + 1, j), u), lerp(h2(i, j + 1), h2(i + 1, j + 1), u), v);
  };
  const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1 + 3, y * 2.1) * 0.3 + vn(x * 4.3, y * 4.3 + 7) * 0.15;
  // 벽 앞면: 바깥 사각형 + 문 구멍. 엣지 스트립이 붙는 모서리 목록 [시작, 끝]
  const WALL = { x0: 0.3, x1: 3.7, y0: 0.15, y1: 1.85 }, DOOR = { x0: 1.55, x1: 2.45, y0: 0.15, y1: 1.3 };
  const EDGES = [
    [[0.3, 1.85], [3.7, 1.85]], [[0.3, 0.15], [0.3, 1.85]], [[3.7, 0.15], [3.7, 1.85]],
    [[1.55, 0.15], [1.55, 1.3]], [[2.45, 0.15], [2.45, 1.3]], [[1.55, 1.3], [2.45, 1.3]]
  ];
  const inWall = (x, y) => x > WALL.x0 && x < WALL.x1 && y > WALL.y0 && y < WALL.y1 && !(x > DOOR.x0 && x < DOOR.x1 && y < DOOR.y1);
  // 가장 가까운 모서리까지 거리와 모서리를 따라 잰 길이(u)
  function edgeCoord(x, y) {
    let best = 1e9, u = 0;
    let acc = 0;
    for (const [a, b] of EDGES) {
      const d = V.sub(b, a), len = Math.hypot(d[0], d[1]), t = clamp(((x - a[0]) * d[0] + (y - a[1]) * d[1]) / (len * len), 0, 1);
      const dist = Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t);
      if (dist < best) { best = dist; u = acc + t * len; }
      acc += len + 1;
    }
    return [best, u];
  }
  const plaster = (x, y) => { const n = fbm(x * 9, y * 9); return [0.74 + n * 0.1, 0.7 + n * 0.1, 0.62 + n * 0.08]; };
  const brick = (x, y) => {
    const r = Math.floor(y / 0.09), bx = x / 0.2 + (r % 2) * 0.5, fx = bx - Math.floor(bx), fy = y / 0.09 - r;
    const mortar = fx < 0.06 || fy < 0.12, n = h2(Math.floor(bx), r) * 0.2;
    return mortar ? [0.55, 0.53, 0.5] : [0.55 + n, 0.25 + n * 0.5, 0.18];
  };

  lesson({
    topic: "edgedecal", title: "엣지 메시 데칼", desc: "모서리를 따라 붙이는 얇은 띠", stage: "배경 아트 기법",
    sym: { w: "teal", d: "orange" },
    hook: "타일 텍스처로 칠한 벽은 깨끗하지만 너무 새것처럼 보입니다. 실제 건물은 ==모서리부터 낡고 깨집니다==. 배경 TA는 모서리를 따라 ==얇은 띠 메시(엣지 데칼)==를 붙이고, 데칼 아틀라스의 '깨진 가장자리' 줄을 입혀 고유 텍스처 없이 손상을 표현합니다. 투영 데칼(42장)과 달리 형태가 메시에 고정되어 싸고 정확합니다.",
    blocks: [
      { h: "모서리를 따라 띠 붙이기" },
      "벽 앞면입니다. 띠의 $u$ 는 ==모서리를 따라 잰 길이==(그래서 길이와 상관없이 텍스처가 같은 밀도로 반복), $v$ 는 ==모서리에서 안쪽으로 잰 거리==(0 = 모서리, 1 = 띠 안쪽 끝)입니다. 마스크가 $v$ 에 가까울수록 많이 깨지도록 만들어, 띠 안쪽 경계가 보이지 않게 녹입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 1, w = 0.18, dmg = 0.55;
          C.seg({ options: [{ value: 0, label: "데칼 없음" }, { value: 1, label: "엣지 데칼" }, { value: 2, label: "띠 메시 보기" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "띠 폭 $w$", min: 0.05, max: 0.35, value: w, onInput: x => { w = x; } });
          C.slider({ label: "손상 정도", min: 0, max: 1, value: dmg, onInput: x => { dmg = x; } });
          F.draw = g => {
            g.field(240, (x, y) => {
              if (!inWall(x, y)) return y < 0.15 ? [40, 44, 52, 255] : [16, 19, 26, 255];
              let c = plaster(x, y);
              if (mode) {
                const [d, u] = edgeCoord(x, y);
                if (d < w) {
                  const v = d / w, n = fbm(u * 7, v * 2.2);
                  // 모서리(v=0)에서 많이, 띠 끝(v=1)에서 0이 되도록
                  const m = n * dmg * 1.6 - v * 0.9;
                  if (m > 0.05) c = brick(x, y).map(k => k * (m < 0.12 ? 0.6 : 1));
                  else if (m > -0.04) c = c.map(k => k * 0.78);
                  if (mode === 2) c = c.map((k, i) => lerp(k, [0.36, 0.82, 0.7][i], 0.35));
                }
              }
              return c.map(k => clamp(k, 0, 1) * 255).concat(255);
            });
            if (mode === 2) EDGES.forEach(([a, b]) => {
              const d = V.sub(b, a), len = Math.hypot(d[0], d[1]), t = [d[0] / len, d[1] / len], nIn = [-t[1], t[0]];
              // 벽 안쪽을 향하도록 방향 맞추기
              const mid = V.add(V.lerp(a, b, 0.5), V.mul(nIn, 0.02)), sgn = inWall(mid[0], mid[1]) ? 1 : -1, o = V.mul(nIn, w * sgn);
              for (let k = 0; k < Math.ceil(len / 0.3); k++) {
                const p = V.add(a, V.mul(t, k * 0.3)), q = V.add(a, V.mul(t, Math.min(len, (k + 1) * 0.3)));
                g.poly([p, q, V.add(q, o), V.add(p, o)], { stroke: "teal", w: 1 });
              }
            });
            L.set("eq", ["타일 텍스처만: 깨끗하지만 모서리가 너무 새것", "띠 $u$ = 모서리 따라 길이, $v$ = 안쪽 거리 → 마스크 = 노이즈 · 손상 − $v$", "청록 선 = 엣지 데칼 띠 메시 (정점 몇 개짜리 쿼드 줄)"][mode]);
          };
        }
      } },
      { key: "엣지 데칼 텍스처는 보통 ==데칼 아틀라스의 한 줄==입니다(가로로 길게 반복되는 깨진 가장자리, 칠 벗겨짐, 물때). 그래서 수백 개 건물이 텍스처 한 장을 나눠 씁니다. 블렌드는 반투명 대신 ==디더 마스크나 DBuffer 데칼==로 해서 정렬 문제를 피하기도 합니다." },

      { h: "얼마나 띄워야 하나: 깊이 정밀도" },
      "띠는 벽에 딱 붙어 있어서 깊이 버퍼가 두 면을 구분하지 못하면 ==지글지글 깜빡입니다(Z-파이팅)==. 멀리 갈수록 깊이 정밀도가 떨어지므로 조금 띄웁니다. 띄우는 거리, 카메라 니어 평면, 깊이 형식을 바꿔 보세요. 주황이 데칼이 보이는 곳, 회색이 진 곳입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{fmt}   ·   띄움 {off}   ·   니어 {near}   ·   데칼이 진 픽셀 {lost}"],
        setup(F, C, L) {
          let off = 0.002, near = 0.1, fmt = 24;
          C.slider({ label: "띄우는 거리", min: -5, max: -1, value: Math.log10(off), fmt: x => num(10 ** x * 1000, 1) + " mm", onInput: x => { off = 10 ** x; } });
          C.slider({ label: "니어 평면", min: -2, max: 0, value: Math.log10(near), fmt: x => num(10 ** x * 100, 0) + " cm", onInput: x => { near = 10 ** x; } });
          C.seg({ options: [{ value: 16, label: "16비트" }, { value: 24, label: "24비트" }, { value: 32, label: "32F 역Z" }], value: fmt, onChange: x => { fmt = +x; } });
          F.draw = g => {
            const W = 160, H = 80, HOR = 8, far = 2000;
            const depth = z => fmt === 32 ? Math.fround(near / z) : Math.round(far / (far - near) * (1 - near / z) * ((fmt === 16 ? 65536 : 16777216) - 1));
            let tot = 0, lost = 0;
            g.field(W, (x, y, i, j) => {
              if (j < HOR) return [20, 24, 34, 255];
              const z = 2 * Math.pow(400, (H - 1 - j) / (H - 1 - HOR)), wx = (i - W / 2) / W * Math.pow(z, 0.6) * 1.6;
              const floor = (Math.floor(wx * 2) + Math.floor(Math.log2(z) * 3)) & 1 ? [92, 96, 106] : [70, 74, 84];
              if (Math.abs(wx) > 1.1 || z > 600) return floor.concat(255);
              // 두 면은 다른 삼각형이라 보간 오차가 조금씩 다름(±½ 최하위 단위)
              const jit = s => (h2(i * 3 + s, j * 7 + s * 5) - 0.5);
              const dw = depth(z), dd = depth(z - off);
              const ww = fmt === 32 ? dw * (1 + jit(1) * 1.2e-7) : dw + jit(1), wd = fmt === 32 ? dd * (1 + jit(2) * 1.2e-7) : dd + jit(2);
              const win = fmt === 32 ? wd > ww : wd < ww;
              tot++; if (!win) lost++;
              const stripe = Math.floor(Math.log2(z) * 6) & 1;
              return win ? (stripe ? [255, 134, 47, 255] : [235, 110, 35, 255]) : floor.concat(255);
            }, { rows: H, smooth: false });
            [[2, 0.02], [20, 0.36], [200, 0.71], [800, 0.86]].forEach(([d, yy]) => g.text(d + " m", [1.97, yy + 0.04], "grey", { size: 10, align: "right" }));
            L.set("fmt", { 16: "16비트 정수 깊이", 24: "24비트 정수 깊이", 32: "32비트 float 역Z" }[fmt]); L.set("off", num(off * 1000, 1) + " mm"); L.set("near", num(near * 100, 0) + " cm"); L.set("lost", num(lost / Math.max(1, tot) * 100, 0) + "%");
          };
        }
      } },
      { key: "정수 깊이는 정밀도가 ==니어 평면 근처에 몰려== 있어서, 니어를 조금만 키워도 먼 곳이 훨씬 안정됩니다. ==역Z + 32비트 float==는 먼 곳까지 정밀도가 고르게 퍼져(36장 부동소수점) UE5 등 최신 엔진의 기본입니다. 그래도 데칼 띠는 머티리얼의 깊이 오프셋이나 몇 mm 띄우기를 함께 씁니다." },

      { use: [
        ["게임", "오픈 월드 건물", "어쌔신 크리드, 위쳐 3, 사이버펑크 2077의 건물·도로 가장자리 손상과 물때가 엣지 데칼 띠와 데칼 아틀라스로 만들어집니다. 'Mesh Decal' 작업 가이드가 각 스튜디오의 GDC 발표에 자주 등장합니다."],
        ["툴", "띠 만들기", "Blender·Max에서 모서리 선택 → 면 밀어내기(Inset/Extrude)로 띠를 만들고 UV를 한 줄로 펴서 아틀라스 행에 맞춥니다. Houdini로 자동 생성하는 경우도 많습니다(PolyExpand2D·Sweep)."],
        ["엔진", "UE 설정", "UE에서는 Deferred Decal 머티리얼을 메시에 입히거나(DBuffer), 마스크드 머티리얼 + 디더로 띠를 칠합니다. 그림자를 끄고(Cast Shadow off) 충돌을 빼서 비용을 줄입니다."],
        ["TA", "규칙 만들기", "띠 폭, 띄우는 거리(예: 0.5~2mm), 아틀라스 행 배치, 텍셀 밀도를 정해 두면 아티스트가 일관된 손상을 빠르게 붙일 수 있습니다."]
      ] },

      { recap: [
        ["u = 모서리 따라 길이", "길이와 무관하게 같은 밀도로 반복"],
        ["v = 안쪽 거리, 마스크 − v", "띠 안쪽 경계를 녹이기"],
        ["데칼 아틀라스 한 줄", "수백 개 에셋이 공유"],
        ["띄움 · 니어 · 역Z", "Z-파이팅 막기"]
      ] }
    ]
  });
})();
