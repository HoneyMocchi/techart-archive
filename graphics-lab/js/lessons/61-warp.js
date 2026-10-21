/* 61 코사인 팔레트 · 도메인 워핑 · 노이즈 미분 (이니고 킬레즈 기법) */
(() => {
  const f2 = n => num(n, 2);
  const fract = x => x - Math.floor(x);
  // 해시는 미리 만든 256×256 난수표에서 읽습니다 (sin 해시보다 훨씬 빠름)
  const HT = new Float32Array(65536); { let s = 12345; for (let k = 0; k < 65536; k++) { s = (Math.imul(s, 1664525) + 1013904223) | 0; HT[k] = (s >>> 8) / 16777216; } }
  const h2 = (x, y) => HT[(x & 255) | ((y & 255) << 8)];
  // 값 노이즈 + 해석적 미분 (5차 보간) — [값, ∂/∂x, ∂/∂y]
  function vnd(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const du = 30 * fx * fx * (fx * (fx - 2) + 1), dv = 30 * fy * fy * (fy * (fy - 2) + 1);
    const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
    const k1 = b - a, k2 = c - a, k4 = a - b - c + d;
    return [a + k1 * u + k2 * v + k4 * u * v, du * (k1 + k4 * v), dv * (k2 + k4 * u)];
  }
  const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let k = 0; k < o; k++) { s += a * vnd(x * f + k * 1.7, y * f - k * 2.3)[0]; a *= 0.5; f *= 2.03; } return s / 0.97; };
  const pal = (t, A, B, Cc, D) => [0, 1, 2].map(i => A[i] + B[i] * Math.cos(TAU * (Cc[i] * t + D[i])));
  const PRESETS = {
    rainbow: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0.33, 0.67]],
    sunset: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 0.5], [0.8, 0.9, 0.3]],
    ocean: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 0.7, 0.4], [0, 0.15, 0.2]],
    fire: [[0.8, 0.5, 0.4], [0.2, 0.4, 0.2], [2, 1, 1], [0, 0.25, 0.25]]
  };

  lesson({
    topic: "warp", title: "코사인 팔레트와 도메인 워핑", desc: "식 몇 줄로 만드는 자연", stage: "그래픽스 연구 노트",
    sym: { a: "red", b: "green", c: "blue", d: "purple", t: "teal", p: "white", q: "orange", r: "pink" },
    hook: "이니고 킬레즈(Shadertoy 공동 제작자)가 정리한 기법 셋입니다. ==코사인 하나로 만드는 색 팔레트, 좌표를 노이즈로 비트는 도메인 워핑, 노이즈의 미분으로 깎은 지형==. 텍스처 없이 수식만으로 자연스러운 그림을 만드는 절차적 그래픽스의 핵심 도구입니다.",
    blocks: [
      { h: "코사인 팔레트: 숫자 12개로 그라데이션" },
      "$색(t) = a + b · cos(2π(c·t + d))$. 채널마다 ==밝기 중심 $a$, 진폭 $b$, 반복 횟수 $c$, 위상 $d$== 네 숫자씩, 모두 12개로 무지개·노을·바다 같은 팔레트가 나옵니다. 아래 곡선이 R·G·B 각각의 코사인입니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["색(t) = a + b · cos(2π (c · t + d))   ·   d = ({d0}, {d1}, {d2})"],
        setup(F, C, L) {
          let key = "sunset", shift = 0;
          const P = JSON.parse(JSON.stringify(PRESETS.sunset));
          C.seg({ options: Object.keys(PRESETS).map(k => ({ value: k, label: { rainbow: "무지개", sunset: "노을", ocean: "바다", fire: "불" }[k] })), value: key, onChange: x => { key = x; const s = PRESETS[x]; for (let i = 0; i < 4; i++) P[i] = s[i].slice(); } });
          C.slider({ label: "위상 d 밀기", min: -0.5, max: 0.5, value: shift, onInput: x => { shift = x; } });
          C.slider({ label: "반복 c 배율", min: 0.3, max: 3, value: 1, onInput: x => { P[2] = PRESETS[key][2].map(v => v * x); } });
          F.draw = g => {
            const D = P[3].map(v => v + shift);
            g.field(300, (x, y) => {
              if (y > 1.55) { const c = pal(x / 4, P[0], P[1], P[2], D); return c.map(v => clamp(v, 0, 1) * 255).concat(255); }
              if (y < 1.45 && x > 2.1) { const r = Math.hypot(x - 3.05, y - 0.72), c = pal(r * 1.3 - F.t * 0, P[0], P[1], P[2], D); return c.map(v => clamp(v, 0, 1) * 255 * (r < 0.7 ? 1 : 0.15)).concat(255); }
              return null;
            }, { smooth: false });
            ["red", "green", "blue"].forEach((col, i) => { const pts = []; for (let k = 0; k <= 100; k++) { const t = k / 100; pts.push([0.1 + t * 1.85, 0.1 + clamp(pal(t, P[0], P[1], P[2], D)[i], 0, 1) * 1.3]); } g.poly(pts, { stroke: col, w: 2.5, close: false }); });
            g.text("t →", [1.95, 0.1], "grey", { size: 10, dy: 8, align: "right" });
            L.set("d0", f2(D[0])); L.set("d1", f2(D[1])); L.set("d2", f2(D[2]));
          };
        }
      } },

      { h: "도메인 워핑: 노이즈로 노이즈의 좌표를 비틀기" },
      "fBm(22장)을 그냥 그리는 대신 ==그 좌표를 다른 fBm으로 밀어서== 다시 읽습니다. $f(p + 4·q)$, $q = fbm(p)$. 한 번 더 겹치면 연기·마블·행성 대기 같은 유체 무늬가 됩니다. 워핑 단계를 올려 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let level = 2, amt = 4;
          C.seg({ options: [{ value: 0, label: "fbm(p)" }, { value: 1, label: "fbm(p + 4q)" }, { value: 2, label: "fbm(p + 4r), r = fbm(p + 4q)" }], value: level, onChange: x => { level = x; } });
          C.slider({ label: "비트는 세기", min: 0, max: 8, value: amt, onInput: x => { amt = x; } });
          C.play();
          F.loop(() => {});
          F.draw = g => {
            const t = F.t * 0.15;
            g.field(F.playing ? 90 : 140, (x, y) => {
              const px = x * 0.9, py = y * 0.9;
              let qx = 0, qy = 0, rx = 0, ry = 0, f;
              if (level >= 1) { qx = fbm(px, py, 4); qy = fbm(px + 5.2, py + 1.3, 4); }
              if (level >= 2) { rx = fbm(px + amt * qx + 1.7 + t, py + amt * qy + 9.2, 4); ry = fbm(px + amt * qx + 8.3, py + amt * qy + 2.8 + t, 4); f = fbm(px + amt * rx, py + amt * ry, 4); }
              else f = fbm(px + amt * qx, py + amt * qy, 4);
              // 킬레즈의 '워프' 그림처럼 f, q, r 로 색을 섞음
              let c = [lerp(0.1, 0.67, f), lerp(0.4, 0.67, f), lerp(0.4, 0.5, f)];
              const ql = Math.hypot(qx, qy), rl = Math.abs(rx);
              c = c.map((v, i) => lerp(v, [0, 0, 0.16][i], clamp(ql * ql * 1.5, 0, 1)));
              c = c.map((v, i) => lerp(v, [0.67, 1, 1][i], clamp(rl * rl, 0, 1)));
              return c.map(v => clamp(v * (f * f * 2.2 + 0.6 * f) * 1.6, 0, 1) * 255).concat(255);
            });
            L.set("eq", ["$f = fbm(p)$   그냥 구름", "$f = fbm(p + 4q)$,  $q = (fbm(p), fbm(p + 이동))$   한 번 비틀면 흐름이 생김", "$f = fbm(p + 4r)$,  $r = fbm(p + 4q)$   두 번 비틀면 소용돌이·마블"][level]);
          };
        }
      } },
      { key: "도메인 워핑의 요점은 ==값이 아니라 좌표를 바꾼다==는 것입니다. 4장의 행렬이 공간을 고르게 비틀었다면, 워핑은 공간을 곳곳마다 다르게 비틉니다. 셰이더 비용은 fBm 호출 수(여기선 5번)에 비례합니다." },

      { h: "노이즈 미분으로 깎은 지형" },
      "노이즈의 ==기울기(미분)를 식으로 함께 계산==하면 두 가지가 공짜로 생깁니다. 하나는 정확한 노멀(조명), 다른 하나는 '가파른 곳에서는 세부를 줄이는' 침식 느낌입니다. 옥타브마다 진폭을 $1 / (1 + |∇|^2)$ 로 줄이면 능선은 날카롭고 골짜기는 부드러워집니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 4, y0: 0, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 1, sun = 0.6;
          C.seg({ options: [{ value: 0, label: "보통 fBm" }, { value: 1, label: "미분으로 깎은 fBm" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "해 방향", min: -3.14, max: 3.14, value: sun, fmt: x => num(x / DEG, 0) + "°", onInput: x => { sun = x; } });
          // 높이와 기울기를 한 번에: 기울기는 옥타브마다 해석적 미분을 누적
          const terrain = (x, y) => {
            let h = 0, a = 0.5, f = 1, dx = 0, dy = 0, gx = 0, gy = 0;
            for (let k = 0; k < 6; k++) {
              const n = vnd(x * f + k * 3.1, y * f - k * 1.7);
              dx += n[1] * a * f; dy += n[2] * a * f;
              const w = mode ? 1 / (1 + dx * dx + dy * dy) : 1;
              h += a * n[0] * w; gx += a * f * n[1] * w; gy += a * f * n[2] * w;
              a *= 0.5; f *= 2;
            }
            return [h, gx, gy];
          };
          F.draw = g => {
            const Ld = V3.norm([Math.cos(sun), Math.sin(sun), 0.7]);
            g.field(200, (x, y) => {
              const r = terrain(x * 1.4, y * 1.4), h = r[0];
              const n = V3.norm([-r[1] * 0.35, -r[2] * 0.35, 1]), d = Math.max(0, V3.dot(n, Ld));
              const base = h < 0.42 ? [0.2, 0.35, 0.55] : h < 0.6 ? [0.35, 0.5, 0.25] : [0.55, 0.5, 0.45];
              return base.map(c => clamp(c * (0.25 + 0.95 * d), 0, 1) * 255).concat(255);
            });
            L.set("eq", mode ? "$h += a · noise / (1 + |∇|^2)$   기울기가 누적된 곳(가파른 곳)은 세부를 줄임 → 침식된 능선" : "$h += a · noise$   모든 곳에 같은 세부 → 둥글둥글한 언덕");
          };
        }
      } },

      { use: [
        ["셰이더", "Shadertoy와 데모씬", "킬레즈의 'Warp', 'Elevated', 'Rainforest' 같은 장면이 이 장의 세 기법(팔레트·워핑·미분 노이즈)을 조합한 것입니다. 원문 글이 iquilezles.org에 정리되어 있습니다."],
        ["엔진", "머티리얼에서 쓰기", "코사인 팔레트는 Custom 노드 한 줄로 그라데이션 텍스처를 대신하고, 도메인 워핑은 UV에 노이즈 텍스처 값을 더해 다시 샘플하는 방식으로 용암·구름 머티리얼에 씁니다."],
        ["게임", "절차적 지형", "노 맨즈 스카이, 마인크래프트 계열 지형 생성기는 미분 노이즈·도메인 워핑으로 능선과 하천 모양을 만듭니다."],
        ["TA", "툴 쪽 활용", "Houdini·Substance Designer의 Warp·Slope Blur 노드가 같은 원리입니다. 셰이더에서 쓰던 식이 텍스처 제작 툴에서도 그대로 통합니다."]
      ] },

      { recap: [
        ["a + b · cos(2π(c·t + d))", "코사인 팔레트: 12개 숫자로 그라데이션"],
        ["fbm(p + 4·fbm(p))", "도메인 워핑: 좌표를 노이즈로 비틀기"],
        ["노이즈 + 해석적 미분", "정확한 노멀과 기울기를 함께"],
        ["진폭 / (1 + |∇|^2)", "가파른 곳 세부 줄이기 → 침식 지형"]
      ] }
    ]
  });
})();
