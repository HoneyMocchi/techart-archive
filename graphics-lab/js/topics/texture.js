const texels = [
  ["#1f2937", "#1f2937", "#f4f7fb", "#f4f7fb", "#d4611d", "#d4611d", "#087f7a", "#087f7a"],
  ["#1f2937", "#2463eb", "#f4f7fb", "#f0b429", "#d4611d", "#f4f7fb", "#087f7a", "#101820"],
  ["#f4f7fb", "#f4f7fb", "#2463eb", "#2463eb", "#101820", "#f0b429", "#f4f7fb", "#f4f7fb"],
  ["#f4f7fb", "#f0b429", "#2463eb", "#101820", "#101820", "#d4611d", "#f4f7fb", "#087f7a"],
  ["#c4314b", "#c4314b", "#101820", "#101820", "#2463eb", "#2463eb", "#f4f7fb", "#f4f7fb"],
  ["#c4314b", "#f4f7fb", "#f0b429", "#101820", "#2463eb", "#087f7a", "#f4f7fb", "#d4611d"],
  ["#087f7a", "#087f7a", "#f4f7fb", "#d4611d", "#f4f7fb", "#f4f7fb", "#1f2937", "#1f2937"],
  ["#087f7a", "#101820", "#f4f7fb", "#d4611d", "#f0b429", "#f4f7fb", "#1f2937", "#2463eb"]
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function sampleTexture(u, v, filter) {
  const n = texels.length;
  const x = ((u % 1) + 1) % 1 * n - 0.5;
  const y = ((v % 1) + 1) % 1 * n - 0.5;
  if (filter === "nearest") {
    const ix = ((Math.round(x) % n) + n) % n;
    const iy = ((Math.round(y) % n) + n) % n;
    return { color: hexToRgb(texels[iy][ix]), ix, iy };
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const get = (ix, iy) => hexToRgb(texels[((iy % n) + n) % n][((ix % n) + n) % n]);
  const c00 = get(x0, y0);
  const c10 = get(x0 + 1, y0);
  const c01 = get(x0, y0 + 1);
  const c11 = get(x0 + 1, y0 + 1);
  const color = [0, 1, 2].map(i => lerp(lerp(c00[i], c10[i], tx), lerp(c01[i], c11[i], tx), ty));
  return { color, ix: ((x0 % n) + n) % n, iy: ((y0 % n) + n) % n, tx, ty };
}

function drawTexture() {
  const { ctx, w, h } = fitCanvas(document.getElementById("textureCanvas"));
  const s = state.texture;
  clear(ctx, w, h);
  const panelGap = 28;
  const texSize = Math.min(w * 0.42, h * 0.7);
  const ox = w * 0.08;
  const oy = h * 0.5 - texSize * 0.5;
  const n = texels.length;
  const cell = texSize / n;
  canvasLayouts.texture = { ox, oy, texSize };

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = texels[y][x];
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      ctx.strokeStyle = "rgba(15, 23, 34, 0.56)";
      ctx.strokeRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }

  const tiledU = s.u * s.tiling;
  const tiledV = s.v * s.tiling;
  const localU = ((tiledU % 1) + 1) % 1;
  const localV = ((tiledV % 1) + 1) % 1;
  const sample = sampleTexture(tiledU, tiledV, s.filter);
  const px = ox + localU * texSize;
  const py = oy + localV * texSize;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colorToCss(sample.color);
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
  drawTag(ctx, `texel ${sample.ix},${sample.iy}`, px + 12, py - 28, C.ink);

  const outX = ox + texSize + panelGap;
  const outW = w - outX - w * 0.08;
  const outH = texSize;
  const previewCell = Math.max(18, outW / 16);
  ctx.fillStyle = C.panelDeep;
  ctx.fillRect(outX, oy, outW, outH);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const uu = (x + 0.5) / 16 * s.tiling + s.u;
      const vv = (y + 0.5) / 16 * s.tiling + s.v;
      ctx.fillStyle = colorToCss(sampleTexture(uu, vv, s.filter).color);
      ctx.fillRect(outX + x * previewCell, oy + y * previewCell, previewCell + 0.5, previewCell + 0.5);
    }
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(outX, oy, previewCell * 16, previewCell * 16);
  drawTag(ctx, "sampled surface", outX + 10, oy + previewCell * 16 + 12, C.blue);

  setMetrics("textureMetrics", [
    ["wrapped UV", `(${localU.toFixed(2)}, ${localV.toFixed(2)})`],
    ["필터", s.filter],
    ["읽은 색", colorToCss(sample.color)],
    ["텍스처 크기", "8 x 8 texels"]
  ]);
  setNote("textureNote", s.filter === "nearest"
    ? "Nearest는 가장 가까운 텍셀 하나만 읽습니다. 픽셀 아트처럼 또렷하지만 확대하면 경계가 계단처럼 보입니다."
    : "Bilinear는 주변 네 텍셀을 섞습니다. 경계가 부드러워지지만 아주 작은 디테일은 흐려질 수 있습니다.");
  setSteps("texture", [
    { title: "UV 입력", formula: `uv=(${s.u.toFixed(2)}, ${s.v.toFixed(2)})`, result: "표면 좌표를 텍스처 좌표로 보냅니다." },
    { title: "반복과 래핑", formula: "wrapped = fract(uv * tiling)", result: `wrapped=(${localU.toFixed(3)}, ${localV.toFixed(3)})` },
    { title: "텍셀 좌표", formula: "texel = wrapped * textureSize", result: `base texel=(${sample.ix}, ${sample.iy})` },
    { title: "필터링", formula: s.filter === "nearest" ? "nearest = closest texel" : "bilinear = lerp 4 texels", result: `color=${colorToCss(sample.color)}` }
  ]);
}
