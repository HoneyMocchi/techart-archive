/* 54 비트 패킹 */
(() => {
  const f2 = n => num(n, 2);
  const LAYOUTS = {
    rgb10a2: { name: "RGB10A2 (노멀 + 플래그)", fields: [["x", 10, "red"], ["y", 10, "green"], ["z", 10, "blue"], ["플래그", 2, "gold"]] },
    gbuf: { name: "G버퍼 한 칸 (재질 ID·거칠기·금속성·AO)", fields: [["재질 ID", 4, "purple"], ["거칠기", 8, "green"], ["금속성", 8, "blue"], ["AO", 8, "orange"], ["예약", 4, "grey"]] },
    half2: { name: "half 2개 (UV 하나)", fields: [["u (half)", 16, "green"], ["v (half)", 16, "red"]] }
  };
  // 옥타헤드럴 인코딩
  const octEnc = n => { const s = Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]); let x = n[0] / s, y = n[1] / s; if (n[2] < 0) { const ox = (1 - Math.abs(y)) * Math.sign(x || 1), oy = (1 - Math.abs(x)) * Math.sign(y || 1); x = ox; y = oy; } return [x, y]; };
  const octDec = ([x, y]) => { let z = 1 - Math.abs(x) - Math.abs(y), a = x, b = y; if (z < 0) { a = (1 - Math.abs(y)) * Math.sign(x || 1); b = (1 - Math.abs(x)) * Math.sign(y || 1); } return V3.norm([a, b, z]); };
  const q = (v, bits) => { const m = (1 << bits) - 1; return Math.round(clamp(v, 0, 1) * m) / m; };

  lesson({
    topic: "bitpack", title: "비트 패킹", desc: "32비트에 여러 값을 담기", stage: "GPU 심화",
    sym: { n: "yellow" },
    hook: "GPU 메모리와 대역폭은 늘 부족합니다. 0~1 사이 값 하나에 32비트 float를 쓰는 대신 ==필요한 정밀도만큼의 비트만 떼어 한 정수에 나눠 담으면== G버퍼·정점·인스턴스 데이터가 절반 이하로 줄어듭니다.",
    blocks: [
      { h: "32비트를 칸으로 나누기" },
      "값을 바꾸면 각 칸의 비트가 바뀝니다. 저장은 ==시프트와 OR==, 꺼낼 때는 ==시프트와 AND(마스크)== 입니다. 레이아웃을 바꿔 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 32, y0: 0, y1: 13.4 },
        eq: ["{eq}", "16진수 = 0x{hex}"],
        setup(F, C, L) {
          let key = "gbuf";
          const vals = [0.3, 0.6, 0.2, 0.9, 0];
          C.seg({ options: Object.keys(LAYOUTS).map(k => ({ value: k, label: LAYOUTS[k].name })), value: key, onChange: x => { key = x; } });
          [0, 1, 2, 3].forEach(i => C.slider({ label: "값 " + (i + 1), min: 0, max: 1, value: vals[i], onInput: x => { vals[i] = x; } }));
          F.draw = g => {
            const Lt = LAYOUTS[key];
            let bit = 32, word = 0, parts = [];
            Lt.fields.forEach(([name, w, c], fi) => {
              const m = Math.pow(2, w) - 1, iv = Math.round(clamp(vals[fi] ?? 0, 0, 1) * m);
              bit -= w;
              word += iv * Math.pow(2, bit);
              for (let b = 0; b < w; b++) {
                const on = Math.floor(iv / Math.pow(2, b)) % 2;
                const x = 31 - (bit + b);
                g.poly([[x + 0.06, 6], [x + 0.94, 6], [x + 0.94, 8.6], [x + 0.06, 8.6]], { fill: hexA(PAL[c], on ? 0.9 : 0.18), stroke: hexA(PAL[c], 0.8), w: 1 });
                g.text(String(on), [x + 0.5, 7.3], on ? "#10131A" : "grey", { size: 12, bold: true, halo: false });
              }
              g.text(name, [31 - bit - w / 2 + 0.5, 9.6], c, { size: 12, bold: true });
              g.text(`${w}비트 · ${iv}/${m}`, [31 - bit - w / 2 + 0.5, 4.9], "grey", { size: 11 });
              parts.push(`(${name} << ${bit})`);
            });
            for (let b = 0; b < 32; b += 4) g.text(String(31 - b), [b + 0.5, 11.2], "grey", { size: 9 });
            L.set("eq", "$패킹 = " + parts.join(" | ") + "$   꺼내기: $(패킹 >> 위치) & (2^비트 − 1)$");
            L.set("hex", Math.round(word).toString(16).toUpperCase().padStart(8, "0"));
          };
        }
      } },

      { h: "비트를 줄이면 생기는 계단" },
      "0~1 값을 $n$비트에 담으면 단계가 $2^n$개뿐입니다. 위는 그라데이션, 아래는 노멀을 $n$비트로 저장한 구의 조명입니다. ==8비트 노멀은 하이라이트에 계단==이 보이고 10비트면 거의 사라집니다.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["단계 = 2^{b} = {lv}개,   최대 오차 = 1 / (2 · ({lv} − 1)) = {err}"],
        setup(F, C, L) {
          let bits = 6;
          C.slider({ label: "비트 수", min: 2, max: 12, step: 1, value: bits, fmt: x => x + "비트", onInput: x => { bits = x; } });
          F.draw = g => {
            const Ld = V3.norm([0.4, 0.5, 0.75]), H = V3.norm(V3.add(Ld, [0, 0, 1]));
            g.field(260, (x, y) => {
              if (y > 0.55) { const v = q((x + 2) / 4, bits); return [v * 255, v * 240, v * 220, 255]; }
              const c = [0, -0.25], R = 0.68, nx = (x - c[0]) / R, ny = (y - c[1]) / R, r2 = nx * nx + ny * ny;
              if (r2 > 1) return [16, 19, 26, 255];
              let n = [nx, ny, Math.sqrt(1 - r2)];
              n = V3.norm(n.map(v => q(v * 0.5 + 0.5, bits) * 2 - 1));
              const d = Math.max(0, V3.dot(n, Ld)), s = Math.pow(Math.max(0, V3.dot(n, H)), 120);
              return [Math.min(255, 50 + 160 * d + 255 * s), Math.min(255, 70 + 150 * d + 255 * s), Math.min(255, 110 + 120 * d + 255 * s), 255];
            });
            const lv = Math.pow(2, bits);
            L.set("b", bits); L.set("lv", lv); L.set("err", num(1 / (2 * (lv - 1)), 4));
          };
        }
      } },

      { h: "노멀은 두 숫자면 충분: 옥타헤드럴 인코딩" },
      "단위 노멀은 길이가 1이라 자유도가 둘뿐입니다. 구를 ==팔면체로 펴서 정사각형에 펼치면== $(x, y)$ 두 값으로 담을 수 있고, 같은 비트 수에서 $xyz$ 셋을 담는 것보다 오차가 작습니다. 방향을 바꿔 정사각형 위의 위치를 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2.1, x1: 2.1, y0: -1.05, y1: 1.05 },
        eq: ["n = ({nx}, {ny}, {nz})   →   oct = ({ox}, {oy})   ·   {b}비트 복원 오차 {err}°"],
        setup(F, C, L) {
          let az = 0.8, el = -0.3, bits = 8;
          C.slider({ label: "방향 수평각", min: -3.14, max: 3.14, value: az, fmt: x => num(x / DEG, 0) + "°", onInput: x => { az = x; } });
          C.slider({ label: "방향 높이", min: -1.5, max: 1.5, value: el, fmt: x => num(x / DEG, 0) + "°", onInput: x => { el = x; } });
          C.slider({ label: "성분당 비트", min: 3, max: 12, step: 1, value: bits, fmt: x => x + "비트", onInput: x => { bits = x; } });
          F.draw = g => {
            const n = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
            // 왼쪽: 펼친 정사각형 (z ≥ 0 은 가운데 마름모, z < 0 은 네 모서리 삼각형)
            const O = [-1.05, 0], S = 0.95;
            g.field(220, (x, y) => {
              const u = (x - O[0]) / S, v = (y - O[1]) / S;
              if (Math.abs(u) > 1 || Math.abs(v) > 1) return null;
              const d = octDec([u, v]);
              return [(d[0] * 0.5 + 0.5) * 255, (d[1] * 0.5 + 0.5) * 255, (d[2] * 0.5 + 0.5) * 255, 255];
            }, { rect: { x0: O[0] - S, x1: O[0] + S, y0: -S, y1: S }, smooth: true });
            g.poly([[O[0], S], [O[0] + S, 0], [O[0], -S], [O[0] - S, 0]], { stroke: "white", w: 1.5, dash: [4, 4] });
            const m = (1 << bits) - 1, oc = octEnc(n), qc = oc.map(v => Math.round((v * 0.5 + 0.5) * m) / m * 2 - 1);
            if (bits <= 6) for (let k = 0; k <= m; k++) { const t = k / m * 2 - 1; g.line([O[0] + t * S, -S], [O[0] + t * S, S], "rgba(16,19,26,0.35)", { w: 1 }); g.line([O[0] - S, t * S], [O[0] + S, t * S], "rgba(16,19,26,0.35)", { w: 1 }); }
            g.circle([O[0] + oc[0] * S, oc[1] * S], 0.05, "white", { fill: "white", w: 0 });
            g.circle([O[0] + qc[0] * S, qc[1] * S], 0.06, "pink", { w: 2 });
            g.text("펼친 팔면체 (색 = 방향)", [O[0], S], "white", { size: 11, bold: true, dy: -8 });
            // 오른쪽: 구 위 방향
            const c2 = [1.15, 0];
            g.circle(c2, 0.8, "grey", { w: 1.5 });
            g.arrow(c2, V.add(c2, [n[0] * 0.8, n[2] * 0.8]), "yellow", { w: 3, label: "n" });
            const dq = octDec(qc), err = Math.acos(clamp(V3.dot(dq, n), -1, 1)) / DEG;
            L.set("nx", f2(n[0])); L.set("ny", f2(n[1])); L.set("nz", f2(n[2])); L.set("ox", f2(oc[0])); L.set("oy", f2(oc[1])); L.set("b", bits); L.set("err", num(err, 3));
          };
        }
      } },
      { key: "패킹의 원칙은 ==값마다 필요한 정밀도를 먼저 정하고, 그만큼만 비트를 주는 것==입니다. 노멀은 옥타헤드럴 10~12비트, 색은 8비트, 플래그는 1~2비트, 깊이는 24~32비트처럼요." },

      { use: [
        ["엔진", "G버퍼 포맷", "UE의 G버퍼는 노멀(10:10:10:2), 기본색·거칠기·금속성·셰이딩 모델 ID를 채널마다 쪼개 담습니다. 이 프로젝트의 ToonLit도 CustomData 8비트 채널에 프로필 ID와 값을 나눠 담습니다."],
        ["셰이더", "비트 연산", "HLSL의 `f32tof16`, `asuint`, `<<`, `&`, `firstbithigh`, `countbits`로 패킹·플래그 검사를 합니다. 나나이트·가상 섀도우 맵의 페이지 테이블도 비트 패킹 덩어리입니다."],
        ["TA", "정점 데이터 압축", "정점 노멀·탄젠트를 옥타헤드럴로, UV를 half로, 버텍스 컬러를 8비트로 줄이면 메시 메모리와 정점 대역폭이 크게 줄어듭니다."],
        ["실생활", "IP 주소와 색 코드", "#FF8800 같은 색 코드는 RGB 8비트 세 개를 24비트에 패킹한 것이고, IP 주소도 8비트 네 개를 32비트에 담은 것입니다."]
      ] },

      { recap: [
        ["(a << n) | b", "패킹: 시프트와 OR"],
        ["(x >> n) & (2^k − 1)", "꺼내기: 시프트와 마스크"],
        ["n비트 = 2^n 단계", "필요한 정밀도만큼만"],
        ["옥타헤드럴 인코딩", "노멀을 두 값으로, 같은 비트에서 더 정확"]
      ] }
    ]
  });
})();
