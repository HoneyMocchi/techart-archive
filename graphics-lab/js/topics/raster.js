function barycentric(p, a, b, c) {
  const v0 = { x: b.x - a.x, y: b.y - a.y };
  const v1 = { x: c.x - a.x, y: c.y - a.y };
  const v2 = { x: p.x - a.x, y: p.y - a.y };
  const d00 = v0.x * v0.x + v0.y * v0.y;
  const d01 = v0.x * v1.x + v0.y * v1.y;
  const d11 = v1.x * v1.x + v1.y * v1.y;
  const d20 = v2.x * v0.x + v2.y * v0.y;
  const d21 = v2.x * v1.x + v2.y * v1.y;
  const denom = d00 * d11 - d01 * d01;
  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;
  return [u, v, w];
}

function drawRaster() {
  const { ctx, w, h } = fitCanvas(document.getElementById("rasterCanvas"));
  const s = state.raster;
  clear(ctx, w, h);
  const res = s.resolution;
  const size = Math.min(w * 0.82, h * 0.84);
  const cell = size / res;
  const ox = (w - size) * 0.5;
  const oy = (h - size) * 0.52;
  canvasLayouts.raster = { ox, oy, size };
  const a = { x: 3, y: 3 };
  const b = { x: res - 3.6, y: 5.2 };
  const c = { x: res * 0.38, y: res - 3.2 };
  const colors = [[196, 49, 75], [8, 127, 122], [36, 99, 235]];

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };
      const bc = barycentric(p, a, b, c);
      const inside = bc.every(v => v >= 0);
      if (inside) {
        const color = [0, 0, 0].map((_, i) => colors[0][i] * bc[0] + colors[1][i] * bc[1] + colors[2][i] * bc[2]);
        ctx.fillStyle = colorToCss(color);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#121c28" : "#0f1722";
      }
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }

  ctx.strokeStyle = "rgba(153, 167, 184, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= res; i++) {
    const p = ox + i * cell;
    ctx.beginPath();
    ctx.moveTo(p, oy);
    ctx.lineTo(p, oy + size);
    ctx.stroke();
    const q = oy + i * cell;
    ctx.beginPath();
    ctx.moveTo(ox, q);
    ctx.lineTo(ox + size, q);
    ctx.stroke();
  }

  const toScreen = p => ({ x: ox + p.x * cell, y: oy + p.y * cell });
  const va = toScreen(a);
  const vb = toScreen(b);
  const vc = toScreen(c);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(va.x, va.y);
  ctx.lineTo(vb.x, vb.y);
  ctx.lineTo(vc.x, vc.y);
  ctx.closePath();
  ctx.stroke();

  const sample = { x: s.sampleX / 100 * res, y: s.sampleY / 100 * res };
  const sp = toScreen(sample);
  const bc = barycentric(sample, a, b, c);
  const inside = bc.every(v => v >= 0);
  const sampleColor = inside ? [0, 0, 0].map((_, i) => colors[0][i] * bc[0] + colors[1][i] * bc[1] + colors[2][i] * bc[2]) : [102, 112, 133];
  ctx.fillStyle = C.tag;
  ctx.strokeStyle = inside ? C.ink : C.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(7, cell * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colorToCss(sampleColor);
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(4, cell * 0.13), 0, Math.PI * 2);
  ctx.fill();

  setMetrics("rasterMetrics", [
    ["w0 / red", bc[0].toFixed(3)],
    ["w1 / green", bc[1].toFixed(3)],
    ["w2 / blue", bc[2].toFixed(3)],
    ["판정", inside ? "Inside" : "Outside"]
  ]);
  setNote("rasterNote", inside
    ? `샘플이 삼각형 내부에 있어 fragment가 생성됩니다. 현재 색은 세 꼭짓점 색을 (${bc[0].toFixed(2)}, ${bc[1].toFixed(2)}, ${bc[2].toFixed(2)}) 가중치로 섞은 결과입니다.`
    : `샘플이 삼각형 밖에 있어 이 위치의 fragment는 버려집니다. 픽셀 중심이 경계 안으로 들어오는 순간 색과 셰이더 계산이 시작됩니다.`);
  setSteps("raster", [
    { title: "픽셀 샘플", formula: `sample=(${sample.x.toFixed(2)}, ${sample.y.toFixed(2)})`, result: "픽셀 중심이 삼각형 안인지 검사합니다." },
    { title: "무게 계산", formula: "barycentric(sample, A, B, C)", result: `w=(${bc[0].toFixed(3)}, ${bc[1].toFixed(3)}, ${bc[2].toFixed(3)})` },
    { title: "내부 판정", formula: "inside = all(w >= 0)", result: inside ? "fragment 생성" : "fragment 버림" },
    { title: "속성 보간", formula: "attr = a0*w0 + a1*w1 + a2*w2", result: inside ? `color=${colorToCss(sampleColor)}` : "색 보간 없음" }
  ]);
}
