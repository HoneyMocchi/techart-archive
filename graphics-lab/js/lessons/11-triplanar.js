/* 11 트라이플래너 매핑 */
(() => {
  const f2 = n => num(n, 2);
  // 16×16 벽돌 텍스처(줄눈 + 벽돌마다 다른 색)
  const N = 16, TEX = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const row = Math.floor(j / 4), off = (row % 2) * 2;
    const mortar = j % 4 === 3 || (i + off) % 4 === 3;
    const id = row * 7 + Math.floor((i + off) / 4) * 13;
    const h = ((id * 9301 + 49297) % 233280) / 233280;
    TEX.push(mortar ? [205, 200, 190] : [150 + h * 70, 70 + h * 40, 55 + h * 25]);
  }
  const texel = (i, j) => TEX[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
  function sample(u, v, bil) {
    const x = u * N - (bil ? 0.5 : 0), y = v * N - (bil ? 0.5 : 0);
    const i = Math.floor(x), j = Math.floor(y);
    if (!bil) return texel(i, j);
    const fx = x - i, fy = y - j, a = texel(i, j), b = texel(i + 1, j), c = texel(i, j + 1), d = texel(i + 1, j + 1);
    return a.map((_, k) => lerp(lerp(a[k], b[k], fx), lerp(c[k], d[k], fx), fy));
  }
  const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
  const rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
  const LIGHT = V3.norm([0.4, 0.7, 0.6]);
  // 화면 원 안의 픽셀 → 구 표면의 월드 위치·노멀
  function sphereSurf(x, y, c, R, yaw, pitch) {
    const nx = (x - c[0]) / R, ny = (y - c[1]) / R, r2 = nx * nx + ny * ny;
    if (r2 > 1) return null;
    const nv = [nx, ny, Math.sqrt(1 - r2)];
    const n = rotY(rotX(nv, pitch), yaw);
    return { n, nv, edge: clamp((1 - r2) * 40, 0, 1) };
  }

  lesson({
    topic: "triplanar", title: "트라이플래너·바이플래너", desc: "UV 없이 세(두) 방향에서 투영", stage: "3D에서 화면으로",
    sym: { w: "purple", N: "yellow", k: "orange", x: "green", y: "red", z: "blue" },
    hook: "바위·지형·절벽처럼 UV를 펴기 어려운 모델에는 ==UV 대신 월드 좌표로 텍스처를 찍습니다==. 한 방향에서 찍으면 옆면이 늘어나니, 세 방향에서 찍어 노멀로 섞습니다.",
    blocks: [
      { h: "한 방향 투영: 옆면이 늘어난다" },
      "구에 월드 좌표 $(x, z)$로 벽돌을 위에서 찍어 봅니다. ==위아래는 멀쩡한데 옆면은 줄무늬로 늘어납니다==. 위에서 본 텍스처 한 점이 옆면에서는 긴 선으로 펼쳐지기 때문입니다. 투영 방향을 바꾸고 구를 돌려 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let axis = "y", yaw = 0.5, pitch = 0.35;
          C.seg({ options: [{ value: "y", label: "위에서 (uv = xz)" }, { value: "z", label: "앞에서 (uv = xy)" }, { value: "x", label: "옆에서 (uv = zy)" }], value: axis, onChange: x => { axis = x; } });
          C.slider({ label: "돌리기", min: -3.14, max: 3.14, value: yaw, fmt: x => num(x / DEG, 0) + "°", onInput: x => { yaw = x; } });
          C.slider({ label: "기울이기", min: -1.5, max: 1.5, value: pitch, fmt: x => num(x / DEG, 0) + "°", onInput: x => { pitch = x; } });
          F.draw = g => {
            const c = [0, 0], R = 1.85, sc = 0.55;
            g.field(220, (x, y) => {
              const s = sphereSurf(x, y, c, R, yaw, pitch);
              if (!s) return null;
              const p = s.n;   // 반지름 1인 구라 위치 = 노멀
              const uv = axis === "y" ? [p[0], p[2]] : axis === "z" ? [p[0], p[1]] : [p[2], p[1]];
              const t = sample(uv[0] * sc + 5, uv[1] * sc + 5, true);
              const l = 0.25 + 0.75 * Math.max(0, V3.dot(rotY(rotX(s.nv, 0), 0), LIGHT));
              return [t[0] * l, t[1] * l, t[2] * l, 255 * s.edge];
            });
            L.set("eq", axis === "y" ? "$uv = (x, z)$   위·아래 면은 정확, 옆면은 세로로 늘어남" : axis === "z" ? "$uv = (x, y)$   앞·뒤 면은 정확, 위아래와 옆이 늘어남" : "$uv = (z, y)$   좌우 면은 정확, 나머지가 늘어남");
          };
        }
      } },

      { h: "세 방향에서 찍어 노멀로 섞기" },
      "그래서 ==$x$, $y$, $z$ 세 방향에서 모두 찍고==, 면이 어느 쪽을 보는지($N$)에 따라 섞습니다. 위를 보는 면은 위에서 찍은 것을, 옆을 보는 면은 옆에서 찍은 것을 주로 씁니다. '가중치 보기'로 섞는 비율을 색으로 확인하세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["w = |N|^k / (|N_x|^k + |N_y|^k + |N_z|^k)", "{eq}"],
        setup(F, C, L) {
          let k = 4, view = 0, bil = true, sc = 0.55, yaw = 0.5;
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "가중치 보기 (x 초록·y 빨강·z 파랑)" }], value: 0, onChange: x => { view = x; } });
          C.slider({ label: "경계 날카로움 $k$", min: 1, max: 24, step: 1, value: k, fmt: x => num(x, 0), onInput: x => { k = x; } });
          C.slider({ label: "텍스처 확대", min: 0.15, max: 1.5, value: sc, onInput: x => { sc = x; } });
          C.seg({ options: [{ value: 1, label: "Bilinear" }, { value: 0, label: "Nearest" }], value: 1, onChange: x => { bil = !!x; } });
          C.play();
          F.loop(dt => { yaw += dt * 0.5; });
          F.draw = g => {
            const c = [0, 0], R = 1.85;
            g.field(220, (x, y) => {
              const s = sphereSurf(x, y, c, R, yaw, 0.35);
              if (!s) return null;
              const n = s.n;
              let w = n.map(v => Math.pow(Math.abs(v), k));
              const sum = w[0] + w[1] + w[2];
              w = w.map(v => v / sum);
              if (view === 1) return [w[1] * 252 + w[0] * 131 + w[2] * 88, w[0] * 193 + w[1] * 98 + w[2] * 196, w[2] * 221 + w[0] * 103 + w[1] * 85, 255 * s.edge];
              const tx = sample(n[2] * sc + 5, n[1] * sc + 5, bil), ty = sample(n[0] * sc + 5, n[2] * sc + 5, bil), tz = sample(n[0] * sc + 5, n[1] * sc + 5, bil);
              const l = 0.25 + 0.75 * Math.max(0, V3.dot(s.nv, LIGHT));
              return [0, 1, 2].map(i => (tx[i] * w[0] + ty[i] * w[1] + tz[i] * w[2]) * l).concat(255 * s.edge);
            });
            L.set("eq", `$k = ${k}$ : ${k <= 2 ? "넓게 섞여 경계가 흐릿함 (이중으로 겹쳐 보임)" : k >= 12 ? "거의 한 방향만 골라 경계가 또렷함" : "적당히 섞임"}`);
          };
        }
      } },
      { key: "트라이플래너는 ==텍스처를 세 번 읽고 노멀로 섞습니다==. UV가 필요 없고 이음매도 없지만, 읽기가 3배라 비용이 큽니다. 그래서 바위·지형처럼 꼭 필요한 곳에만 씁니다." },

      { h: "섞는 비율을 단면으로 보기" },
      "원 둘레를 돌며 $N$ 이 바뀔 때 [[green:$x$ 방향 가중치]]와 [[red:$y$ 방향 가중치]]가 어떻게 바뀌는지 그래프로 봅니다. $k$를 키우면 ==가운데 섞이는 구간이 좁아져== 두 투영이 겹쳐 보이는 영역이 줄어듭니다.",
      { fig: {
        aspect: 0.42, view: { x0: -0.4, x1: 10.4, y0: -0.3, y1: 1.3, stretch: true },
        eq: ["θ = {deg}°   →   w_x = {wx},   w_y = {wy}"],
        setup(F, C, L) {
          let k = 4, th = 0.6;
          C.slider({ label: "$k$", min: 1, max: 24, step: 1, value: k, fmt: x => num(x, 0), onInput: x => { k = x; } });
          F.handle({ color: "yellow", get: () => [th / (Math.PI / 2) * 10, 1.15], set: x => { th = clamp(x / 10, 0, 1) * Math.PI / 2; } });
          F.draw = g => {
            const W = t => { const a = Math.pow(Math.abs(Math.cos(t)), k), b = Math.pow(Math.abs(Math.sin(t)), k); return [a / (a + b), b / (a + b)]; };
            const px = [], py = [];
            for (let i = 0; i <= 100; i++) { const t = i / 100 * Math.PI / 2, w = W(t); px.push([i / 10, w[0]]); py.push([i / 10, w[1]]); }
            g.line([0, 0], [10, 0], "grey", { w: 1 }); g.line([0, 1], [10, 1], "grey", { w: 1, dash: [3, 4], alpha: 0.5 });
            g.poly(px, { stroke: "green", w: 3, close: false });
            g.poly(py, { stroke: "red", w: 3, close: false });
            const w = W(th);
            g.line([th / (Math.PI / 2) * 10, 0], [th / (Math.PI / 2) * 10, 1.15], "yellow", { w: 1.5, dash: [4, 4] });
            g.dot([th / (Math.PI / 2) * 10, w[0]], "green", 5); g.dot([th / (Math.PI / 2) * 10, w[1]], "red", 5);
            g.text("N = 옆(+x)", [0, 0], "grey", { dy: 14, size: 11, align: "left" }); g.text("N = 위(+y)", [10, 0], "grey", { dy: 14, size: 11, align: "right" });
            L.set("deg", num(th / DEG, 0)); L.set("wx", f2(w[0])); L.set("wy", f2(w[1]));
          };
        }
      } },
      "실무에서는 노멀 맵도 트라이플래너로 찍는데, 이때는 ==각 투영의 노멀을 해당 축 기준으로 돌려서== 섞어야 조명이 맞습니다(화이트아웃 블렌드 등). 그리고 텍스처 읽기가 3배이므로 바이리니어·밉맵 비용도 3배가 됩니다.",

      { h: "바이플래너: 두 번만 읽기" },
      "트라이플래너는 텍스처를 세 번 읽지만, 실제로 크게 기여하는 것은 ==가장 큰 두 축==뿐입니다. 바이플래너는 픽셀마다 $|N|$이 가장 큰 축과 두 번째 축만 골라 두 번 읽고, 가장 작은 축의 몫을 빼서 경계를 맞춥니다. 트라이플래너와의 차이를 확대해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let view = 0, k = 8, yaw = 0.5;
          C.seg({ options: [{ value: 0, label: "바이플래너 결과" }, { value: 1, label: "트라이플래너와 차이 ×4" }, { value: 2, label: "고른 두 축 보기" }], value: 0, onChange: x => { view = x; } });
          C.slider({ label: "경계 날카로움 $k$", min: 2, max: 24, step: 1, value: k, fmt: x => num(x, 0), onInput: x => { k = x; } });
          C.play();
          F.loop(dt => { yaw += dt * 0.5; });
          const AX = [[2, 1], [0, 2], [0, 1]];                      // 축마다 투영 평면의 (u, v) 성분: x축 → zy, y축 → xz, z축 → xy
          const proj = (n, a, sc) => sample(n[AX[a][0]] * sc + 5, n[AX[a][1]] * sc + 5, true);
          F.draw = g => {
            const c = [0, 0], R = 1.85, sc = 0.55;
            g.field(220, (x, y) => {
              const sf = sphereSurf(x, y, c, R, yaw, 0.35);
              if (!sf) return null;
              const n = sf.n, an = n.map(Math.abs);
              const ma = an.indexOf(Math.max(...an)), mi = an.indexOf(Math.min(...an)), me = 3 - ma - mi;
              // 바이플래너 (iq): 가장 작은 축의 몫(최소 0.5773)을 빼고 거듭제곱
              let w = [an[ma], an[me]].map(v => Math.pow(clamp((v - 0.5773) / (1 - 0.5773), 0, 1), k / 8));
              const ws = w[0] + w[1] || 1;
              const t1 = proj(n, ma, sc), t2 = proj(n, me, sc);
              const bi = [0, 1, 2].map(i => (t1[i] * w[0] + t2[i] * w[1]) / ws);
              const l = 0.25 + 0.75 * Math.max(0, V3.dot(sf.nv, LIGHT));
              if (view === 2) { const col = [[131, 193, 103], [252, 98, 85], [88, 196, 221]]; return [0, 1, 2].map(i => (col[ma][i] * w[0] + col[me][i] * w[1]) / ws).concat(255 * sf.edge); }
              if (view === 1) {
                let tw = an.map(v => Math.pow(v, k)); const ts = tw[0] + tw[1] + tw[2]; tw = tw.map(v => v / ts);
                const tri = [0, 1, 2].map(i => proj(n, 0, sc)[i] * tw[0] + proj(n, 1, sc)[i] * tw[1] + proj(n, 2, sc)[i] * tw[2]);
                return [0, 1, 2].map(i => clamp(Math.abs(tri[i] - bi[i]) * 4, 0, 255)).concat(255 * sf.edge);
              }
              return bi.map(v => v * l).concat(255 * sf.edge);
            });
            L.set("eq", view === 1 ? "차이가 거의 검정 → 두 번 읽고도 세 번 읽은 것과 거의 같음" : "텍스처 읽기: 트라이플래너 3번 → 바이플래너 2번 (픽셀마다 고른 두 축)");
          };
        }
      } },
      "가장 작은 축의 가중치는 원래도 거의 0이라 버려도 티가 안 납니다. 대신 ==고르는 축이 바뀌는 경계==에서 끊기지 않도록 $0.5773$($1/√3$, 세 성분이 같을 때의 값)을 빼서 그 지점에서 가중치가 0이 되게 맞춥니다.",

      { use: [
        ["엔진", "머티리얼 함수", "UE의 `WorldAlignedTexture`·`WorldAlignedNormal` 머티리얼 함수가 트라이플래너입니다. 크기 파라미터가 이 장의 '텍스처 확대'입니다."],
        ["게임", "지형과 절벽", "지형의 가파른 절벽은 높이맵 UV로 찍으면 늘어나므로, 경사가 큰 곳만 트라이플래너로 바꿉니다."],
        ["아트", "바위·스캔 에셋", "포토스캔 바위나 프로시저럴 메시처럼 UV가 엉망인 모델에 이음매 없는 디테일 텍스처를 입힙니다."],
        ["최적화", "비용 줄이기", "가중치가 거의 0인 투영은 건너뛰거나(동적 분기), 가장 큰 축 하나만 읽는 '바이플래너'로 비용을 줄입니다."]
      ] },

      { recap: [
        ["uv = (x, z)", "한 방향 투영: 그 방향을 보는 면만 정확"],
        ["w = |N|^k / Σ|N|^k", "노멀로 세 투영을 섞는 비율"],
        ["색 = w_x·T(zy) + w_y·T(xz) + w_z·T(xy)", "트라이플래너: 텍스처 3번 읽기"],
        ["k ↑", "경계가 날카로워지고 겹쳐 보임이 줄어듦"],
        ["가장 큰 두 축만, 1/√3 빼기", "바이플래너: 읽기 2번"]
      ] }
    ]
  });
})();
