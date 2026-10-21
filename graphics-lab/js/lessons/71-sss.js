/* 71 분리형 서브서피스 스캐터링 (호르헤 히메네스, Separable SSS) */
(() => {
  // 피부 확산 프로필: 가우시안 6개의 합 (d'Eon & Luebke, 분산 mm², RGB 가중치)
  const SKIN = [[0.0064, [0.233, 0.455, 0.649]], [0.0484, [0.1, 0.336, 0.344]], [0.187, [0.118, 0.198, 0]], [0.567, [0.113, 0.007, 0.007]], [1.99, [0.358, 0.004, 0]], [7.41, [0.078, 0, 0]]];
  const prof2 = r => [0, 1, 2].map(c => SKIN.reduce((s, [v, w]) => s + w[c] * Math.exp(-r * r / (2 * v)) / (TAU * v), 0));
  const prof1 = x => [0, 1, 2].map(c => SKIN.reduce((s, [v, w]) => s + w[c] * Math.exp(-x * x / (2 * v)) / Math.sqrt(TAU * v), 0));
  const trans = s => [0, 1, 2].map(c => SKIN.reduce((a, [v, w]) => a + w[c] * Math.exp(-s * s / v), 0));
  const hsh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

  lesson({
    topic: "sss", title: "분리형 서브서피스 스캐터링", desc: "피부는 빛을 안에서 번지게 한다", stage: "그래픽스 연구 노트",
    sym: { r: "orange", s: "teal" },
    hook: "피부에 들어온 빛은 바로 튕겨 나가지 않고 ==속에서 몇 mm를 헤매다== 다른 곳으로 나옵니다. 빨간빛이 가장 멀리 갑니다. 그래서 그림자 경계가 붉게 번지고 모공이 부드러워 보입니다. 호르헤 히메네스는 이것을 ==화면 공간에서 가로·세로 두 번의 1D 블러==로 근사해 게임에 넣었습니다(Separable SSS, 2015).",
    blocks: [
      { h: "확산 프로필: 빛이 얼마나 멀리 번지나" },
      "한 점에 빛을 쏘았을 때 거리 $r$ 만큼 떨어진 곳에서 나오는 빛의 양입니다. 피부 측정값을 ==가우시안 여섯 개의 합==으로 맞춘 것으로, R·G·B 채널이 각각 다릅니다. 오른쪽은 레이저 점 하나를 피부에 쏜 모습입니다. 빨강이 가장 넓게 퍼집니다.",
      { fig: {
        aspect: 0.45, view: { x0: 0, x1: 4.4, y0: 0, y1: 2, stretch: true },
        eq: ["R(r) = Σ wᵢ · G(vᵢ, r)   ·   번짐 배율 ×{s}"],
        setup(F, C, L) {
          let s = 1;
          C.slider({ label: "번짐 배율", min: 0.3, max: 3, value: s, fmt: x => "×" + num(x, 1), onInput: x => { s = x; } });
          F.draw = g => {
            // 왼쪽: 로그 눈금 그래프, r = 0~4 mm
            const gx = r => 0.25 + r / 4 * 2, gy = v => 0.15 + clamp((Math.log10(v) + 3) / 4.2, 0, 1) * 1.7;
            g.line([0.25, 0.15], [2.3, 0.15], "grey", { w: 1 }); g.line([0.25, 0.15], [0.25, 1.9], "grey", { w: 1 });
            ["red", "green", "blue"].forEach((c, k) => { const pts = []; for (let i = 0; i <= 120; i++) { const r = i / 30; pts.push([gx(r), gy(prof2(r / s)[k] / (s * s) + 1e-6)]); } g.poly(pts, { stroke: c, w: 2.2, close: false }); });
            g.text("거리 r (mm) →", [2.3, 0.05], "grey", { size: 10, align: "right" }); g.text("로그 세기", [0.3, 1.95], "grey", { size: 10, align: "left" });
            // 오른쪽: 레이저 점
            g.field(90, (x, y) => {
              const r = Math.hypot(x - 3.45, y - 1) * 4 / s, p = prof2(r);
              return p.map(v => clamp(Math.pow(v * 0.35, 0.45), 0, 1) * 255).concat(255);
            }, { rect: { x0: 2.55, x1: 4.35, y0: 0.1, y1: 1.9 } });
            L.set("s", num(s, 1));
          };
        }
      } },

      { h: "화면 공간에서 두 번 흐리기" },
      "조명을 먼저 계산한 화면(확산광만)을 피부 픽셀끼리만 흐립니다. 원래 커널은 둥근 2D 모양이라 픽셀마다 수백 번 읽어야 하지만, ==가로 한 번, 세로 한 번==으로 나누면 수십 번이면 됩니다. 깊이가 크게 다른 이웃(배경, 코 너머)은 ==섞지 않습니다==. 그림자 경계와 모공을 비교해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 2, y0: 0, y1: 1 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 1, width = 1, sun = 0.5, ck = "", out = null;
          C.seg({ options: [{ value: 0, label: "SSS 없음" }, { value: 1, label: "분리형 (가로 → 세로)" }, { value: 2, label: "원래 2D 커널" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "번짐 폭", min: 0.2, max: 2, value: width, onInput: x => { width = x; } });
          C.slider({ label: "빛 방향", min: -1.4, max: 1.4, value: sun, fmt: x => num(x / DEG, 0) + "°", onInput: x => { sun = x; } });
          const W = 128, H = 64, R = 9;
          const build = () => {
            const Ld = V3.norm([Math.sin(sun), 0.35, Math.cos(sun)]), E = new Float32Array(W * H * 3), Dp = new Float32Array(W * H), M = new Uint8Array(W * H);
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
              const k = j * W + i, x = (i + 0.5 - W / 2) / (H * 0.42), y = (H / 2 - j - 0.5) / (H * 0.42), rr = x * x + y * y;
              if (rr >= 1) { Dp[k] = 99; continue; }
              M[k] = 1; const z = Math.sqrt(1 - rr); Dp[k] = -z;
              // 모공: 작은 범프 노멀
              const bx = (hsh(Math.floor(i / 2), Math.floor(j / 2)) - 0.5) * 0.5, by = (hsh(Math.floor(i / 2) + 7, Math.floor(j / 2)) - 0.5) * 0.5;
              const n = V3.norm([x + bx, y + by, z]);
              let d = Math.max(0, V3.dot(n, Ld));
              if (x * 0.9 - y * 0.4 > 0.25 && x * 0.9 - y * 0.4 < 0.45) d *= 0.05;   // 딱딱한 그림자 띠 (코 그림자처럼)
              E[k * 3] = E[k * 3 + 1] = E[k * 3 + 2] = d;
            }
            return { E, Dp, M };
          };
          const kern = (() => { const K = []; return w => { if (K.w === w) return K; K.length = 0; K.w = w; let sum = [0, 0, 0]; for (let t = -R; t <= R; t++) { const v = prof1(t / R * 3 * w); K.push(v); sum = sum.map((s, c) => s + v[c]); } K.forEach(v => { for (let c = 0; c < 3; c++) v[c] /= sum[c]; }); return K; }; })();
          const blur1 = (src, S, dx, dy) => {
            const K = kern(width), dst = new Float32Array(src.length);
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
              const k = j * W + i; if (!S.M[k]) continue;
              const acc = [0, 0, 0];
              for (let t = -R; t <= R; t++) {
                const qi = clamp(i + dx * t, 0, W - 1), qj = clamp(j + dy * t, 0, H - 1), q = qj * W + qi, w = K[t + R];
                // 깊이가 크게 다르면 가운데 값으로 대신 (표면을 따라가기)
                const use = S.M[q] && Math.abs(S.Dp[q] - S.Dp[k]) < 0.15 ? q : k;
                for (let c = 0; c < 3; c++) acc[c] += src[use * 3 + c] * w[c];
              }
              for (let c = 0; c < 3; c++) dst[k * 3 + c] = acc[c];
            }
            return dst;
          };
          const blur2 = (src, S) => {
            const dst = new Float32Array(src.length), sc = 3 * width / R, Kr = [];
            let sum = [0, 0, 0];
            for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const v = prof2(Math.hypot(a, b) * sc); Kr.push(v); sum = sum.map((s, c) => s + v[c]); }
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
              const k = j * W + i; if (!S.M[k]) continue;
              const acc = [0, 0, 0]; let n = 0;
              for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++, n++) {
                const qi = clamp(i + a, 0, W - 1), qj = clamp(j + b, 0, H - 1), q = qj * W + qi, use = S.M[q] && Math.abs(S.Dp[q] - S.Dp[k]) < 0.15 ? q : k, w = Kr[n];
                for (let c = 0; c < 3; c++) acc[c] += src[use * 3 + c] * w[c] / sum[c];
              }
              for (let c = 0; c < 3; c++) dst[k * 3 + c] = acc[c];
            }
            return dst;
          };
          F.draw = g => {
            const key = [mode, width, sun].join();
            if (key !== ck) {
              ck = key; const S = build();
              const Er = mode === 0 ? S.E : mode === 1 ? blur1(blur1(S.E, S, 1, 0), S, 0, 1) : blur2(S.E, S);
              out = { Er, M: S.M };
            }
            const alb = [0.9, 0.62, 0.5];
            g.field(W, (x, y, i, j) => {
              const k = j * W + i;
              if (!out.M[k]) return [16, 19, 26, 255];
              return [0, 1, 2].map(c => clamp(Math.pow(out.Er[k * 3 + c] * alb[c] + 0.03, 1 / 2.2), 0, 1) * 255).concat(255);
            }, { rows: H, smooth: true });
            const n = 2 * R + 1;
            L.set("eq", ["확산광 그대로: 그림자 경계가 칼같고 모공이 거침", `가로 ${n}번 + 세로 ${n}번 = 픽셀당 ${2 * n}번 읽기`, `${n} × ${n} = 픽셀당 ${n * n}번 읽기 (분리형과 거의 같은 결과)`][mode]);
          };
        }
      } },
      { key: "가우시안 하나는 정확히 분리되지만 ==가우시안의 합은 엄밀히는 분리되지 않습니다==. 히메네스는 그 오차가 눈에 띄지 않는다는 것을 보이고, 1D 커널 하나로 맞추는 근사를 썼습니다. 화면 공간이라 비용이 얼굴 크기(픽셀 수)에만 비례합니다." },

      { h: "투과: 얇은 곳은 뒤에서도 비친다" },
      "귀나 콧방울처럼 얇은 부분은 뒤에서 온 빛이 비쳐 나옵니다. 그림자 맵으로 ==빛이 지나온 두께 $s$== 를 구한 뒤, 같은 프로필로 투과 색을 정합니다. 두께가 얇을수록 밝고, 두꺼워지면 빨강만 남습니다.",
      { fig: {
        aspect: 0.32, view: { x0: 0, x1: 4, y0: 0, y1: 1.28, stretch: true },
        eq: ["T(s) = Σ wᵢ · exp(−s² / vᵢ)   ·   두께 {s} mm → ({r}, {g}, {b})"],
        setup(F, C, L) {
          let s = 0.8;
          C.slider({ label: "두께 $s$ (mm)", min: 0, max: 4, value: s, fmt: x => num(x, 2) + " mm", onInput: x => { s = x; } });
          F.draw = g => {
            g.field(200, x => { const t = trans(x); return t.map(v => clamp(Math.pow(v, 1 / 2.2), 0, 1) * 255).concat(255); }, { rect: { x0: 0, x1: 4, y0: 0.35, y1: 1.1 } });
            g.line([s, 0.3], [s, 1.15], "white", { w: 2 });
            for (let k = 0; k <= 4; k++) g.text(k + " mm", [k, 0.18], "grey", { size: 10, align: k === 0 ? "left" : k === 4 ? "right" : "center" });
            const t = trans(s);
            L.set("s", num(s, 2)); L.set("r", num(t[0], 2)); L.set("g", num(t[1], 2)); L.set("b", num(t[2], 2));
          };
        }
      } },

      { use: [
        ["엔진", "UE 서브서피스 프로필", "UE의 Subsurface Profile 셰이딩 모델이 이 장의 분리형 SSS(화면 공간 블러 + 투과)를 기반으로 합니다. 프로필 에셋의 Scatter Radius·Falloff Color가 커널 폭과 채널별 번짐입니다. 이후 Burley 정규화 프로필이 추가되었습니다."],
        ["게임", "캐릭터 피부", "히메네스의 기법은 액티비전 작품들과 여러 AAA 캐릭터 렌더링에 쓰였고, 원 논문은 'Separable Subsurface Scattering'(Computer Graphics Forum 2015)입니다. 데모 소스가 GitHub에 공개되어 있습니다."],
        ["TA", "피부 외 재질", "왁스, 대리석, 우유, 잎, 젤리도 같은 방식입니다. 채널별 번짐 폭만 바꾸면 됩니다. 너무 넓히면 얼굴이 고무처럼 보이고, 프로필이 화면 픽셀보다 작으면 효과가 사라집니다."],
        ["실생활", "손전등과 손가락", "손전등에 손가락을 대면 붉게 비치는 것이 투과 항, 그림자 경계의 붉은 띠가 확산 항입니다."]
      ] },

      { recap: [
        ["R(r) = Σ wᵢ G(vᵢ, r)", "피부 확산 프로필: 가우시안 6개의 합"],
        ["가로 1D → 세로 1D", "2D 커널(n²)을 2n번 읽기로"],
        ["깊이 차이 크면 섞지 않음", "표면을 따라 흐리기"],
        ["T(s) = Σ wᵢ exp(−s² / vᵢ)", "얇은 부분의 투과"]
      ] }
    ]
  });
})();
