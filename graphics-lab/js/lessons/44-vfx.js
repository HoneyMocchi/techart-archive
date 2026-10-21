/* 44 이펙트 셰이더: 디졸브 · 플립북 · 소프트 파티클 */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, s = t => t * t * (3 - 2 * t); return lerp(lerp(hash(i, j), hash(i + 1, j), s(fx)), lerp(hash(i, j + 1), hash(i + 1, j + 1), s(fx)), s(fy)); };
  const fbm = (x, y) => 0.5 * vn(x, y) + 0.3 * vn(x * 2.1, y * 2.1) + 0.2 * vn(x * 4.3, y * 4.3);
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  lesson({
    topic: "vfx", title: "이펙트 셰이더", desc: "디졸브 · 플립북 · 소프트 파티클", stage: "테크아트 실전",
    sym: { t: "teal", n: "yellow" },
    hook: "이펙트 TA의 머티리얼은 대부분 ==노이즈 텍스처 하나와 문턱값 하나==로 시작합니다. 사라지는 효과, 연기 애니메이션, 바닥에 닿는 연기의 부드러운 경계까지, 자주 쓰는 세 가지 패턴을 만져 봅니다.",
    blocks: [
      { h: "디졸브: 노이즈에 문턱을 올리기" },
      "노이즈 값이 문턱보다 작은 픽셀은 버리고(알파 0), ==문턱 바로 위의 얇은 띠만 빛나게== 칠하면 타 들어가며 사라지는 효과가 됩니다. 진행도를 움직이거나 재생해 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["버림: n < 진행도   ·   불꽃 띠: 진행도 ≤ n < 진행도 + {w}"],
        setup(F, C, L) {
          let prog = 0.4, w = 0.06, dir = false;
          C.play();
          const ps = C.slider({ label: "진행도", min: 0, max: 1, value: prog, onInput: x => { prog = x; } });
          C.slider({ label: "띠 두께", min: 0.005, max: 0.2, value: w, onInput: x => { w = x; } });
          C.seg({ options: [{ value: 0, label: "노이즈만" }, { value: 1, label: "노이즈 + 아래에서 위로" }], value: 0, onChange: x => { dir = !!x; } });
          F.loop((dt, t) => { prog = 0.5 - 0.5 * Math.cos(t * 0.7); ps.set(prog); });
          F.draw = g => {
            g.field(240, (x, y) => {
              const r = Math.hypot(x / 1.1, y / 0.75);
              if (r > 1) return [16, 19, 26, 255];
              let n = fbm(x * 3 + 7, y * 3);
              if (dir) n = n * 0.5 + (y + 0.75) / 1.5 * 0.5;
              if (n < prog) return [16, 19, 26, 255];
              if (n < prog + w) { const k = (n - prog) / w; return [255, lerp(240, 90, k), lerp(160, 20, k), 255]; }
              const sh = 0.6 + 0.4 * (1 - r * r);
              return [90 * sh, 140 * sh, 200 * sh, 255];
            });
          };
        }
      } },

      { h: "플립북(SubUV): 그림 여러 장을 한 텍스처에" },
      "폭발·연기 애니메이션은 ==4×4 칸에 프레임 16장을 그려 둔 텍스처==에서 시간에 따라 칸을 바꿔 읽습니다. 프레임 사이를 ==섞으면(블렌드)== 적은 프레임으로도 부드럽습니다. 재생 속도를 낮춰 차이를 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["칸 = floor(t · fps) mod 16,   uv = (칸 열 + uv_x, 칸 행 + uv_y) / 4   ·   프레임 {f}"],
        setup(F, C, L) {
          let fps = 6, blend = true;
          C.play(true);
          C.slider({ label: "fps", min: 1, max: 30, step: 1, value: fps, fmt: x => num(x, 0), onInput: x => { fps = x; } });
          C.seg({ options: [{ value: 1, label: "프레임 블렌드" }, { value: 0, label: "끊어서" }], value: 1, onChange: x => { blend = !!x; } });
          F.loop(() => {});
          // 프레임 k의 연기 덩어리 (0~15): 커지며 옅어짐
          const frameVal = (k, u, v) => { const t = k / 15, r = Math.hypot(u - 0.5, v - 0.42 - t * 0.12) / (0.18 + t * 0.3); const n = fbm(u * 5 + k * 0.7, v * 5 - k * 0.5); return clamp((1 - r) * 1.6 + (n - 0.5) * 1.2, 0, 1) * (1 - t * 0.6); };
          F.draw = g => {
            const ft = F.t * fps, k0 = Math.floor(ft) % 16, k1 = (k0 + 1) % 16, fr = ft - Math.floor(ft);
            g.field(200, (x, y) => {
              if (x < 2) {
                const cx = Math.floor(x / 0.5), cy = Math.floor((2 - y) / 0.5), u = (x % 0.5) / 0.5, v = ((2 - y) % 0.5) / 0.5, k = cy * 4 + cx, a = frameVal(k, u, v);
                const on = k === k0 || (blend && k === k1);
                return [lerp(20, 220, a) + (on ? 25 : 0), lerp(24, 200, a), lerp(32, 190, a), 255];
              }
              const u = (x - 2.25) / 1.5, v = (2 - y - 0.25) / 1.5;
              if (u < 0 || u > 1 || v < 0 || v > 1) return [16, 19, 26, 255];
              const a = blend ? lerp(frameVal(k0, u, v), frameVal(k1, u, v), fr) : frameVal(k0, u, v);
              return [lerp(16, 230, a), lerp(19, 215, a), lerp(26, 200, a), 255];
            }, { smooth: false });
            for (let i = 0; i <= 4; i++) { g.line([i * 0.5, 0], [i * 0.5, 2], "rgba(16,19,26,0.8)", { w: 1 }); g.line([0, i * 0.5], [2, i * 0.5], "rgba(16,19,26,0.8)", { w: 1 }); }
            const cx = k0 % 4, cy = Math.floor(k0 / 4);
            g.poly([[cx * 0.5, 2 - cy * 0.5], [cx * 0.5 + 0.5, 2 - cy * 0.5], [cx * 0.5 + 0.5, 2 - cy * 0.5 - 0.5], [cx * 0.5, 2 - cy * 0.5 - 0.5]], { stroke: "yellow", w: 2.5 });
            L.set("f", k0);
          };
        }
      } },

      { h: "소프트 파티클: 바닥과 만나는 경계 지우기" },
      "연기 판(쿼드)이 바닥을 뚫고 지나가면 ==날카로운 직선 경계==가 보입니다. 픽셀마다 '뒤에 있는 장면까지의 깊이 − 파티클 깊이'를 재서, 가까울수록 투명하게 만들면 부드럽게 녹아듭니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["알파 × saturate((장면 깊이 − 파티클 깊이) / {f})"],
        setup(F, C, L) {
          let fade = 0.35;
          C.slider({ label: "페이드 거리", min: 0.001, max: 1, value: fade, onInput: x => { fade = x; } });
          C.play(true);
          F.loop(() => {});
          F.draw = g => {
            const t = F.t;
            g.field(220, (x, y) => {
              // 바닥 평면(멀어질수록 화면 위로) 깊이, 파티클은 깊이 3인 세로 판
              const floorD = y < 0.1 ? 1.2 / (0.1 - y + 0.15) : 99;
              let col = y < 0.1 ? [110, 100, 85] : [40, 50, 70];
              const pd = 3, inQuad = Math.abs(x) < 1.1 && y > -0.85 && y < 0.95;
              if (inQuad) {
                const u = (x + 1.1) / 2.2, v = (y + 0.85) / 1.8;
                const a = clamp((1 - Math.hypot(u - 0.5, (v - 0.35) * 0.9) * 2.2) * 1.5 + (fbm(u * 4, v * 4 - t * 0.4) - 0.5), 0, 1) * 0.85;
                if (floorD > pd) {
                  const soft = clamp((floorD - pd) / fade, 0, 1);
                  col = col.map((c, i) => lerp(c, [220, 220, 225][i], a * soft));
                }
              }
              return [...col, 255];
            });
            L.set("f", f2(fade));
          };
        }
      } },
      { key: "이펙트 머티리얼의 비용은 ==화면을 덮는 반투명 픽셀 수 × 겹친 장수==입니다(46장). 작은 프레임, 잘라 낸 모양(컷아웃), 적은 겹침이 이펙트 최적화의 기본입니다." },

      { use: [
        ["엔진", "나이아가라와 머티리얼", "UE Niagara의 SubUV 모듈과 머티리얼의 SubUV_Function·Flipbook, DepthFade 노드(소프트 파티클), 노이즈 + 문턱 디졸브가 이 장 그대로입니다."],
        ["게임", "캐릭터 사망·소환 연출", "디졸브는 적이 사라지거나 장비가 소환될 때 가장 많이 쓰입니다. 띠 색을 불꽃·전기·얼음으로 바꿔 변주합니다."],
        ["TA", "플립북 굽기", "Houdini·EmberGen에서 연기 시뮬레이션을 플립북으로 굽고, 모션 벡터 텍스처를 함께 구우면 프레임 사이를 더 매끄럽게 보간할 수 있습니다."],
        ["실생활", "옛날 애니메이션", "플립북은 이름 그대로 종이 모서리에 그린 그림을 넘겨 보는 '플립북'과 같은 원리입니다."]
      ] },

      { recap: [
        ["clip(노이즈 − 진행도) + 띠", "디졸브"],
        ["칸 = floor(t·fps) mod N", "플립북, 프레임 블렌드로 부드럽게"],
        ["saturate(깊이 차 / 페이드)", "소프트 파티클"],
        ["반투명 픽셀 × 겹침", "이펙트 비용의 정체"]
      ] }
    ]
  });
})();
