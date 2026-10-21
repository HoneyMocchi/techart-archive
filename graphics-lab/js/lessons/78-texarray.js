/* 78 텍스처 배열(Texture2DArray) */
(() => {
  const fract = x => x - Math.floor(x);
  const MB = b => (b >= 1073741824 ? num(b / 1073741824, 2) + " GB" : num(b / 1048576, 0) + " MB");
  const R = 32, NAMES = ["흙", "풀", "자갈", "모래"];
  const LAYER_COL = [[0.45, 0.3, 0.2], [0.3, 0.62, 0.28], [0.55, 0.56, 0.6], [0.88, 0.78, 0.5]];
  const layerPix = (l, x, y) => {
    const c = LAYER_COL[l];
    const n = ((x * 7 + y * 13) ^ (x * y)) % 5 / 5;
    if (l === 1) return (x + y * 3) % 6 < 2 ? c.map(k => k * 0.75) : c;
    if (l === 2) return ((x >> 2) + (y >> 2)) % 2 ? c.map(k => k * 0.8) : c;
    return c.map(k => k * (0.85 + 0.25 * n));
  };
  const pyramid = (n, get) => {
    const L0 = new Float32Array(n * n * 3);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = get(x, y); for (let k = 0; k < 3; k++) L0[(y * n + x) * 3 + k] = c[k]; }
    const M = [{ n, a: L0 }];
    while (M[M.length - 1].n > 1) {
      const p = M[M.length - 1], m = p.n / 2, a = new Float32Array(m * m * 3);
      for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) for (let k = 0; k < 3; k++)
        a[(y * m + x) * 3 + k] = (p.a[(2 * y * p.n + 2 * x) * 3 + k] + p.a[(2 * y * p.n + 2 * x + 1) * 3 + k] + p.a[((2 * y + 1) * p.n + 2 * x) * 3 + k] + p.a[((2 * y + 1) * p.n + 2 * x + 1) * 3 + k]) / 4;
      M.push({ n: m, a });
    }
    return M;
  };
  const ARR = [0, 1, 2, 3].map(l => pyramid(R, (x, y) => layerPix(l, x, y)));
  const ATL = pyramid(R * 2, (x, y) => layerPix((x >= R ? 1 : 0) + (y >= R ? 2 : 0), x % R, y % R));
  const bil = (m, u, v, out) => {
    const n = m.n, x = u * n - 0.5, y = v * n - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const i0 = ((i % n) + n) % n, i1 = (i0 + 1) % n, j0 = ((j % n) + n) % n, j1 = (j0 + 1) % n;
    for (let k = 0; k < 3; k++) out[k] = lerp(lerp(m.a[(j0 * n + i0) * 3 + k], m.a[(j0 * n + i1) * 3 + k], fx), lerp(m.a[(j1 * n + i0) * 3 + k], m.a[(j1 * n + i1) * 3 + k], fx), fy);
    return out;
  };
  const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
  const tri = (M, u, v, lod) => {
    lod = clamp(lod, 0, M.length - 1); const l0 = Math.floor(lod), l1 = Math.min(M.length - 1, l0 + 1), f = lod - l0;
    bil(M[l0], u, v, tmp); bil(M[l1], u, v, tmp2);
    return [lerp(tmp[0], tmp2[0], f), lerp(tmp[1], tmp2[1], f), lerp(tmp[2], tmp2[2], f)];
  };

  lesson({
    topic: "texarray", title: "텍스처 배열", desc: "같은 크기 텍스처를 층으로 쌓기", stage: "배경 아트 기법",
    sym: { u: "pink", v: "teal", w: "orange" },
    hook: "지형 레이어, 벽돌·타일 변형, 데칼 모음처럼 ==크기와 형식이 같은 텍스처 여러 장==은 아틀라스 대신 ==텍스처 배열(Texture2DArray)==로 묶을 수 있습니다. 셰이더는 $(u, v, 층 번호)$ 로 읽습니다. 층마다 밉맵과 반복(wrap)이 따로라서, 아틀라스(77장)의 이음새와 번짐이 원리적으로 생기지 않습니다.",
    blocks: [
      { h: "아틀라스 vs 배열: 멀어질 때" },
      "칸마다 흙·풀·자갈·모래 중 하나를 깐 바닥을 위에서 봅니다. 칸을 누르면 재질이 바뀝니다. '멀리 보기'를 올리면 밉이 내려갑니다. 아틀라스는 밉에서 ==네 재질이 섞여 모두 같은 갈색으로== 수렴하지만, 배열은 층마다 밉을 따로 만들어 ==재질 색이 끝까지 유지==됩니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 8, y0: 0, y1: 4 },
        eq: ["{eq}   ·   밉 {lod}"],
        setup(F, C, L) {
          let mode = 1, far = 2;
          const cells = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) cells.push((i * 3 + j * 5 + (i * j) % 3) % 4);
          C.seg({ options: [{ value: 0, label: "아틀라스 (2×2 칸)" }, { value: 1, label: "텍스처 배열 (4층)" }], value: mode, onChange: x => { mode = x; } });
          C.slider({ label: "멀리 보기", min: 0, max: 5, value: far, fmt: x => "밉 " + num(x, 1), onInput: x => { far = x; } });
          F.onTap = (p, sx, sy, moving) => {
            const i = Math.floor(p[0]), j = Math.floor(4 - p[1]);
            if (!moving && i >= 0 && i < 8 && j >= 0 && j < 4) cells[j * 8 + i] = (cells[j * 8 + i] + 1) % 4;
          };
          F.draw = g => {
            const rep = Math.pow(2, far) * 0.6;
            g.field(176, (x, y) => {
              const ci = Math.min(7, Math.floor(x)), cj = Math.min(3, Math.floor(4 - y)), l = cells[cj * 8 + ci];
              const u = x * rep, v = (4 - y) * rep;
              const c = mode ? tri(ARR[l], u, v, far) : tri(ATL, (l & 1) * 0.5 + fract(u) * 0.5, (l >> 1) * 0.5 + fract(v) * 0.5, far);
              return c.map(k => Math.pow(clamp(k, 0, 1), 1 / 1.4) * 255).concat(255);
            });
            for (let i = 1; i < 8; i++) g.line([i, 0], [i, 4], "black", { w: 1, alpha: 0.35 });
            for (let j = 1; j < 4; j++) g.line([0, j], [8, j], "black", { w: 1, alpha: 0.35 });
            L.set("eq", mode ? "$texture(배열, float3(u, v, 층))$   층마다 밉·반복이 따로 → 섞이지 않음" : "$texture(아틀라스, 칸 시작 + fract(uv) · ½)$   밉이 내려가면 이웃 칸과 평균됨");
            L.set("lod", num(far, 1));
          };
        }
      } },
      { key: "배열의 층 번호는 ==정수로 고르는 것==이라 층 사이는 보간되지 않습니다. 지형처럼 두 재질이 섞여야 하면 층 두 개를 읽어 셰이더에서 섞습니다(가중치는 높이 블렌딩, 40장). 대신 텍스처 바인딩은 하나라서, 재질이 수십 종이어도 머티리얼 하나·드로우 하나로 그립니다." },

      { h: "언제 무엇을 쓰나" },
      "재질 수와 해상도를 바꿔 보며 세 방식을 비교합니다. 개별 텍스처는 ==셰이더 하나에 묶을 수 있는 샘플러 수(보통 16)==에 걸리고, 아틀라스는 ==최대 텍스처 크기==와 패딩 낭비에, 배열은 ==모든 층이 같은 크기·형식이어야 한다==는 제약에 걸립니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 10, y0: 0, y1: 5 },
        eq: ["재질 {n}종 × {res}²  ·  층 하나 {one}"],
        setup(F, C, L) {
          let n = 12, res = 1024;
          C.slider({ label: "재질 수", min: 2, max: 64, step: 1, value: n, fmt: x => x + "종", onInput: x => { n = x; } });
          C.seg({ options: [{ value: 512, label: "512" }, { value: 1024, label: "1K" }, { value: 2048, label: "2K" }, { value: 4096, label: "4K" }], value: res, onChange: x => { res = +x; } });
          F.draw = g => {
            const one = res * res * 4 / 3;   // BC7 1바이트/픽셀 + 밉
            const side = Math.ceil(Math.sqrt(n)), atlasPx = Math.pow(2, Math.ceil(Math.log2(side * res))), atlasMem = atlasPx * atlasPx * 4 / 3;
            const rows = [
              ["개별 텍스처", [[`바인딩 ${n}개`, n <= 16], ["반복 그대로", true], [MB(n * one), true], [n <= 16 ? "샘플러 한계 안" : "샘플러 16개 초과", n <= 16]]],
              ["아틀라스", [["바인딩 1개", true], ["반복은 셰이더로 접기", false], [MB(atlasMem) + ` (${atlasPx}²)`, atlasMem < n * one * 1.3], [atlasPx <= 16384 ? "밉에서 칸끼리 번짐" : "최대 크기 16384 초과", false]]],
              ["텍스처 배열", [["바인딩 1개", true], ["반복 그대로", true], [MB(n * one), true], ["모든 층 같은 크기·형식", true]]]
            ];
            ["", "셰이더 바인딩", "타일 반복", "메모리", "주의할 점"].forEach((h, k) => g.text(h, [k === 0 ? 0.2 : 0.4 + k * 1.95, 4.55], "grey", { size: 11, bold: true, align: k === 0 ? "left" : "center" }));
            rows.forEach(([name, cells], r) => {
              const y = 3.6 - r * 1.3;
              g.text(name, [0.2, y], "white", { size: 13, bold: true, align: "left" });
              cells.forEach(([t, ok], k) => {
                const cx = 0.4 + (k + 1) * 1.95;
                g.poly([[cx - 0.92, y - 0.42], [cx + 0.92, y - 0.42], [cx + 0.92, y + 0.42], [cx - 0.92, y + 0.42]], { fill: ok ? "rgba(92,208,179,0.14)" : "rgba(252,98,85,0.16)", stroke: ok ? "teal" : "red", w: 1 });
                g.text(t, [cx, y], ok ? "teal" : "red", { size: 11, bold: true });
              });
            });
            L.set("n", n); L.set("res", res); L.set("one", MB(one));
          };
        }
      } },

      { use: [
        ["엔진", "UE·Unity 지원", "UE의 Texture2DArray 에셋(여러 텍스처를 드래그해 생성)과 머티리얼의 TextureSampleParameter2DArray, Unity의 Texture2DArray와 SAMPLE_TEXTURE2D_ARRAY 매크로가 있습니다. 랜드스케이프는 레이어별 텍스처 대신 배열을 쓰도록 커스텀하기도 합니다."],
        ["게임", "지형과 블록 게임", "마인크래프트 계열 블록 렌더러(블록 텍스처 수백 장), 대형 지형의 재질 수십 종, 데칼·플립북 모음이 배열을 씁니다. 층 번호를 정점 색이나 스플랫 맵에 저장합니다."],
        ["주의", "스트리밍과 크기", "배열은 보통 통째로 스트리밍·로드됩니다. 한 층만 고해상도로 둘 수 없고, 층 하나를 바꾸면 배열 전체를 다시 굽습니다. 그래서 자주 바뀌는 텍스처는 넣지 않습니다."],
        ["TA", "구성 팁", "같은 형식(BC7·BC5)끼리 배열을 나눕니다(컬러 배열, 노멀 배열, 마스크 배열). 층 순서를 문서화해 두고, 층 번호는 머티리얼 파라미터 대신 데이터(정점 색·텍스처)로 넘기면 머티리얼 인스턴스가 줄어듭니다."]
      ] },

      { recap: [
        ["texture(배열, (u, v, 층))", "층 번호는 정수, 층 사이 보간 없음"],
        ["층마다 밉·반복 따로", "아틀라스의 이음새·번짐이 없음"],
        ["같은 크기·형식", "배열의 유일한 큰 제약"],
        ["바인딩 1개", "재질이 많아도 머티리얼·드로우 하나"]
      ] }
    ]
  });
})();
