function drawTransform() {
  const { ctx, w, h } = fitCanvas(document.getElementById("transformCanvas"));
  const s = state.transform;
  clear(ctx, w, h);
  const origin = { x: w * 0.48, y: h * 0.55 };
  const scale = Math.min(w, h) / 10;
  canvasLayouts.transform = { origin, scale };
  drawGrid(ctx, w, h, origin, scale);

  const rad = degToRad(s.rotation);
  const c = Math.cos(rad);
  const sn = Math.sin(rad);
  const m = {
    a: c * s.scaleX,
    b: sn * s.scaleX,
    c: -sn * s.scaleY,
    d: c * s.scaleY,
    e: s.tx,
    f: s.ty
  };
  const model = [
    { x: -1.1, y: -0.9 },
    { x: 1.1, y: -0.9 },
    { x: 1.1, y: 0.45 },
    { x: 0, y: 1.35 },
    { x: -1.1, y: 0.45 }
  ];
  const transform = p => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
  const drawPoly = (points, color, fill, dashed) => {
    ctx.save();
    ctx.setLineDash(dashed ? [8, 6] : []);
    ctx.strokeStyle = color;
    ctx.fillStyle = fill;
    ctx.lineWidth = dashed ? 2 : 3;
    ctx.beginPath();
    points.forEach((p, i) => {
      const sp = worldToScreen(origin, scale, p);
      if (i === 0) ctx.moveTo(sp.x, sp.y);
      else ctx.lineTo(sp.x, sp.y);
    });
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  drawPoly(model, C.muted, "rgba(153, 167, 184, 0.08)", true);
  const world = model.map(transform);
  drawPoly(world, C.blue, "rgba(96, 165, 250, 0.15)", false);

  const localOrigin = transform({ x: 0, y: 0 });
  const ox = worldToScreen(origin, scale, localOrigin);
  arrow(ctx, ox, worldToScreen(origin, scale, transform({ x: 1.1, y: 0 })), C.red, 3, "local X");
  arrow(ctx, ox, worldToScreen(origin, scale, transform({ x: 0, y: 1.1 })), C.teal, 3, "local Y");

  const combinedMatrixLines = [
    `[ ${m.a.toFixed(2)}  ${m.c.toFixed(2)}  ${m.e.toFixed(2)} ]`,
    `[ ${m.b.toFixed(2)}  ${m.d.toFixed(2)}  ${m.f.toFixed(2)} ]`,
    "[ 0.00  0.00  1.00 ]"
  ];
  ctx.font = "700 14px Consolas, monospace";
  ctx.fillStyle = C.ink;
  const boxW = Math.min(270, w * 0.42);
  const boxX = w - boxW - 18;
  const boxY = 18;
  ctx.fillStyle = C.tag;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, 102, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  combinedMatrixLines.forEach((line, i) => ctx.fillText(line, boxX + 16, boxY + 30 + i * 24));

  const det = s.scaleX * s.scaleY;
  const sMatrix = [[s.scaleX, 0, 0], [0, s.scaleY, 0], [0, 0, 1]];
  const rMatrix = [[c, -sn, 0], [sn, c, 0], [0, 0, 1]];
  const tMatrix = [[1, 0, s.tx], [0, 1, s.ty], [0, 0, 1]];
  const trsMatrix = [[m.a, m.c, m.e], [m.b, m.d, m.f], [0, 0, 1]];
  setMetrics("transformMetrics", [
    ["면적 배율", `${det.toFixed(3)}x`],
    ["회전", `${s.rotation.toFixed(0)}°`],
    ["이동", `(${s.tx.toFixed(1)}, ${s.ty.toFixed(1)})`],
    ["행렬 타입", "TRS 3x3"]
  ]);
  setNote("transformNote", `회전은 도형의 방향을 바꾸고 이동은 원점을 옮깁니다. 스케일의 곱 ${det.toFixed(2)}는 2D 면적 배율이므로 텍스처 밀도와 충돌 판정 감각에도 영향을 줍니다.`);
  setTransformMatrices([
    { title: "S Scale", body: matrixText(sMatrix) },
    { title: "R Rotate", body: matrixText(rMatrix) },
    { title: "T Translate", body: matrixText(tMatrix) },
    { title: "T * R * S", body: matrixText(trsMatrix) }
  ]);
  const localSample = { x: 1, y: 1 };
  const scaled = { x: localSample.x * s.scaleX, y: localSample.y * s.scaleY };
  const rotated = { x: scaled.x * c - scaled.y * sn, y: scaled.x * sn + scaled.y * c };
  const translated = { x: rotated.x + s.tx, y: rotated.y + s.ty };
  setSteps("transform", [
    { title: "Local Point", formula: "p=(1, 1, 1)", result: "모델 안에서의 원래 좌표입니다." },
    { title: "S 적용", formula: "p1=S*p", result: `(${scaled.x.toFixed(3)}, ${scaled.y.toFixed(3)}, 1)` },
    { title: "R 적용", formula: "p2=R*p1", result: `(${rotated.x.toFixed(3)}, ${rotated.y.toFixed(3)}, 1)` },
    { title: "T 적용", formula: "world=T*p2", result: `(${translated.x.toFixed(3)}, ${translated.y.toFixed(3)}, 1)` }
  ]);
}
