function drawVector() {
  const { ctx, w, h } = fitCanvas(document.getElementById("vectorCanvas"));
  const s = state.vector;
  clear(ctx, w, h);
  const origin = { x: w * 0.5, y: h * 0.54 };
  const scale = s.zoom;
  canvasLayouts.vector = { origin, scale };
  drawGrid(ctx, w, h, origin, scale);

  const v = vecFromAngle(s.angle, s.length);
  const end = worldToScreen(origin, scale, v);
  const xEnd = worldToScreen(origin, scale, { x: v.x, y: 0 });

  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(xEnd.x, xEnd.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  arrow(ctx, origin, end, C.blue, 4, "v");
  const unit = vecFromAngle(s.angle, 1);
  arrow(ctx, origin, worldToScreen(origin, scale, unit), C.orange, 3, "unit");

  ctx.strokeStyle = "rgba(96, 165, 250, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, s.length * scale, 0, Math.PI * 2);
  ctx.stroke();

  drawTag(ctx, `x=${v.x.toFixed(2)}`, (origin.x + xEnd.x) * 0.5 - 30, origin.y + 10, C.orange);
  drawTag(ctx, `y=${v.y.toFixed(2)}`, xEnd.x + 10, (origin.y + end.y) * 0.5 - 12, C.orange);

  setMetrics("vectorMetrics", [
    ["x 성분", v.x.toFixed(3)],
    ["y 성분", v.y.toFixed(3)],
    ["길이 |v|", s.length.toFixed(3)],
    ["단위 벡터", `(${unit.x.toFixed(2)}, ${unit.y.toFixed(2)})`]
  ]);

  const axisText = Math.abs(v.x) > Math.abs(v.y) ? "x 성분이 더 크므로 좌우 이동 성격이 강합니다." : "y 성분이 더 크므로 위아래 이동 성격이 강합니다.";
  setNote("vectorNote", `${s.angle.toFixed(0)}도 방향의 벡터는 (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) 성분으로 나뉩니다. ${axisText} 노멀과 라이트 방향처럼 길이보다 방향만 필요할 때는 단위 벡터로 정규화합니다.`);
  setSteps("vector", [
    { title: "입력", formula: `angle=${s.angle.toFixed(0)}°, length=${s.length.toFixed(2)}`, result: "방향과 크기를 먼저 정합니다." },
    { title: "성분 계산", formula: "x=cos(a)*len, y=sin(a)*len", result: `v=(${v.x.toFixed(3)}, ${v.y.toFixed(3)})` },
    { title: "길이 확인", formula: "|v|=sqrt(x*x+y*y)", result: `|v|=${Math.hypot(v.x, v.y).toFixed(3)}` },
    { title: "정규화", formula: "unit=v/|v|", result: `unit=(${unit.x.toFixed(3)}, ${unit.y.toFixed(3)})` }
  ]);
}
