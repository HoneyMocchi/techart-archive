function drawTrig() {
  const { ctx, w, h } = fitCanvas(document.getElementById("trigCanvas"));
  const s = state.trig;
  clear(ctx, w, h);
  const angle = degToRad(s.angle);
  const baseR = Math.min(w * 0.18, h * 0.28);
  const circleR = baseR * s.radius;
  const center = { x: w * 0.26, y: h * 0.5 };
  const point = { x: center.x + Math.cos(angle) * circleR, y: center.y - Math.sin(angle) * circleR };
  canvasLayouts.trig = { center, baseR };

  drawGrid(ctx, w, h, center, Math.max(28, circleR / 2.2), 8);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, circleR, 0, Math.PI * 2);
  ctx.stroke();
  arrow(ctx, center, point, C.blue, 4, "r");

  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(point.x, center.y);
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(center.x, point.y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawTag(ctx, `cos=${Math.cos(angle).toFixed(2)}`, (center.x + point.x) * 0.5 - 28, center.y + 14, C.teal);
  drawTag(ctx, `sin=${Math.sin(angle).toFixed(2)}`, point.x + 10, (center.y + point.y) * 0.5 - 12, C.orange);

  const graph = { x: w * 0.5, y: h * 0.18, width: w * 0.42, height: h * 0.64 };
  canvasLayouts.trig.graph = graph;
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(graph.x, graph.y, graph.width, graph.height);
  ctx.beginPath();
  ctx.moveTo(graph.x, graph.y + graph.height / 2);
  ctx.lineTo(graph.x + graph.width, graph.y + graph.height / 2);
  ctx.stroke();

  function drawWave(color, fn) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= graph.width; i++) {
      const t = i / graph.width;
      const a = t * Math.PI * 2 * s.frequency;
      const y = graph.y + graph.height / 2 - fn(a) * graph.height * 0.38 * s.radius;
      if (i === 0) ctx.moveTo(graph.x + i, y);
      else ctx.lineTo(graph.x + i, y);
    }
    ctx.stroke();
  }
  drawWave(C.orange, Math.sin);
  drawWave(C.teal, Math.cos);

  const markerX = graph.x + ((s.angle / 360) / s.frequency % 1) * graph.width;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerX, graph.y);
  ctx.lineTo(markerX, graph.y + graph.height);
  ctx.stroke();
  drawTag(ctx, "sin", graph.x + 12, graph.y + 14, C.orange);
  drawTag(ctx, "cos", graph.x + 70, graph.y + 14, C.teal);

  setMetrics("trigMetrics", [
    ["라디안", angle.toFixed(3)],
    ["sin(theta)", Math.sin(angle).toFixed(3)],
    ["cos(theta)", Math.cos(angle).toFixed(3)],
    ["tan(theta)", Math.abs(Math.cos(angle)) < 0.01 ? "무한대" : Math.tan(angle).toFixed(3)]
  ]);

  setNote("trigNote", `각도 ${s.angle.toFixed(0)}도는 라디안 ${angle.toFixed(3)}입니다. 원 위 점의 x는 cos, y는 sin이며, 그래픽스 회전 공식은 이 두 값을 행렬 안에 배치한 형태입니다.`);
  setSteps("trig", [
    { title: "각도 입력", formula: `degree=${s.angle.toFixed(0)}°`, result: "사람이 보기 쉬운 도 단위입니다." },
    { title: "라디안 변환", formula: "radian=degree*PI/180", result: `theta=${angle.toFixed(3)} rad` },
    { title: "원 위 좌표", formula: "x=cos(theta)*r, y=sin(theta)*r", result: `(${(Math.cos(angle) * s.radius).toFixed(3)}, ${(Math.sin(angle) * s.radius).toFixed(3)})` },
    { title: "회전/파형 적용", formula: "sin/cos 값을 시간이나 행렬에 사용", result: `frequency=${s.frequency.toFixed(2)}x` }
  ]);
}
