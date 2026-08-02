function drawDotCross() {
  const { ctx, w, h } = fitCanvas(document.getElementById("dotCanvas"));
  const s = state.dotcross;
  clear(ctx, w, h);
  const origin = { x: w * 0.5, y: h * 0.55 };
  const scale = Math.min(w, h) / 13;
  drawGrid(ctx, w, h, origin, scale);

  const a = vecFromAngle(s.aAngle, s.aLength);
  const b = vecFromAngle(s.bAngle, s.bLength);
  const aEnd = worldToScreen(origin, scale, a);
  const bEnd = worldToScreen(origin, scale, b);
  canvasLayouts.dotcross = { origin, scale, aEnd, bEnd };
  const aUnit = { x: a.x / s.aLength, y: a.y / s.aLength };
  const dot = a.x * b.x + a.y * b.y;
  const cross = a.x * b.y - a.y * b.x;
  const projection = dot / s.aLength;
  const p = { x: aUnit.x * projection, y: aUnit.y * projection };
  const pEnd = worldToScreen(origin, scale, p);

  ctx.fillStyle = cross >= 0 ? "rgba(45, 212, 191, 0.14)" : "rgba(251, 113, 133, 0.14)";
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(aEnd.x, aEnd.y);
  ctx.lineTo(aEnd.x + bEnd.x - origin.x, aEnd.y + bEnd.y - origin.y);
  ctx.lineTo(bEnd.x, bEnd.y);
  ctx.closePath();
  ctx.fill();

  arrow(ctx, origin, aEnd, C.blue, 4, "A");
  arrow(ctx, origin, bEnd, C.orange, 4, "B");

  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(pEnd.x, pEnd.y);
  ctx.stroke();
  ctx.strokeStyle = C.muted;
  ctx.beginPath();
  ctx.moveTo(bEnd.x, bEnd.y);
  ctx.lineTo(pEnd.x, pEnd.y);
  ctx.stroke();
  ctx.setLineDash([]);
  drawTag(ctx, "B projected on A", pEnd.x + 8, pEnd.y + 8, C.teal);

  const start = degToRad(-s.aAngle);
  const diff = signedAngleDiff(s.aAngle, s.bAngle);
  ctx.strokeStyle = diff >= 0 ? C.teal : C.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, scale * 1.15, -degToRad(s.aAngle), -degToRad(s.aAngle + diff), diff < 0);
  ctx.stroke();
  drawTag(ctx, `${Math.abs(diff).toFixed(0)}°`, origin.x + scale * 0.9, origin.y - scale * 0.95, ctx.strokeStyle);

  const cosTheta = dot / (s.aLength * s.bLength);
  setMetrics("dotMetrics", [
    ["dot", dot.toFixed(3)],
    ["cos(theta)", clamp(cosTheta, -1, 1).toFixed(3)],
    ["cross.z", cross.toFixed(3)],
    ["투영 길이", projection.toFixed(3)]
  ]);

  const dotText = dot >= 0 ? "내적이 양수라 두 벡터는 대체로 같은 방향을 봅니다." : "내적이 음수라 두 벡터는 서로 반대 성격이 강합니다.";
  const crossText = cross >= 0 ? "외적 z가 양수라 A에서 B로 반시계 방향입니다." : "외적 z가 음수라 A에서 B로 시계 방향입니다.";
  setNote("dotNote", `${dotText} ${crossText} 면적의 절댓값은 두 벡터가 만드는 평행사변형 넓이와 같습니다.`);
  setSteps("dotcross", [
    { title: "벡터 구성", formula: "A=(cos a, sin a)*lenA, B=(cos b, sin b)*lenB", result: `A=(${a.x.toFixed(2)}, ${a.y.toFixed(2)}), B=(${b.x.toFixed(2)}, ${b.y.toFixed(2)})` },
    { title: "내적", formula: "dot=A.x*B.x + A.y*B.y", result: `dot=${dot.toFixed(3)}, cos=${clamp(cosTheta, -1, 1).toFixed(3)}` },
    { title: "투영", formula: "projection=dot/|A|", result: `B가 A축으로 ${projection.toFixed(3)}만큼 놓입니다.` },
    { title: "외적 z", formula: "cross.z=A.x*B.y - A.y*B.x", result: `cross.z=${cross.toFixed(3)}, 방향=${cross >= 0 ? "CCW" : "CW"}` }
  ]);
}
