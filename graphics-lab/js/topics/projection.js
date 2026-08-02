function drawProjection() {
  const { ctx, w, h } = fitCanvas(document.getElementById("projectionCanvas"));
  const s = state.projection;
  clear(ctx, w, h);
  const split = w * 0.62;
  canvasLayouts.projection = { split, w, h };
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(split, 0);
  ctx.lineTo(split, h);
  ctx.stroke();

  const cube = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const yaw = degToRad(s.yaw);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const f = 1 / Math.tan(degToRad(s.fov) / 2);

  function rotate(p) {
    const [x, y, z] = p;
    return [x * cy + z * sy, y, -x * sy + z * cy];
  }

  function project(p) {
    const r = rotate(p);
    const z = r[2] + s.distance;
    const aspect = split / h;
    let px;
    let py;
    if (s.mode === "perspective") {
      px = (r[0] * f / aspect) / z;
      py = (r[1] * f) / z;
    } else {
      px = r[0] * 0.42;
      py = r[1] * 0.42;
    }
    return {
      x: split * 0.5 + px * split * 0.42,
      y: h * 0.52 - py * h * 0.42,
      z
    };
  }

  const pts = cube.map(project);
  ctx.fillStyle = C.panelDeep;
  ctx.fillRect(18, 18, split - 36, h - 36);
  ctx.strokeStyle = C.line;
  ctx.strokeRect(18, 18, split - 36, h - 36);

  edges.forEach(([a, b]) => {
    const depth = (pts[a].z + pts[b].z) * 0.5;
    const alpha = clamp(1.25 - depth / 8, 0.35, 1);
    ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  });
  pts.forEach(p => {
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const sideX = split + (w - split) * 0.18;
  const sideW = (w - split) * 0.68;
  const cam = { x: sideX, y: h * 0.52 };
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(cam.x, cam.y);
  ctx.lineTo(cam.x + 16, cam.y - 10);
  ctx.lineTo(cam.x + 16, cam.y + 10);
  ctx.closePath();
  ctx.fill();

  const far = sideX + sideW;
  const spread = s.mode === "perspective" ? Math.tan(degToRad(s.fov) / 2) * 0.36 * h : 72;
  ctx.fillStyle = "rgba(45, 212, 191, 0.1)";
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cam.x + 16, cam.y);
  ctx.lineTo(far, cam.y - spread);
  ctx.lineTo(far, cam.y + spread);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const objX = sideX + sideW * (s.distance - 2.5) / 7;
  ctx.fillStyle = C.blue;
  ctx.fillRect(objX - 20, cam.y - 38, 40, 76);
  drawTag(ctx, "camera", cam.x - 6, cam.y + 20, C.ink);
  drawTag(ctx, "object", objX - 24, cam.y - 68, C.blue);

  const nearZ = Math.min(...pts.map(p => p.z));
  const farZ = Math.max(...pts.map(p => p.z));
  setMetrics("projectionMetrics", [
    ["모드", s.mode === "perspective" ? "Perspective" : "Orthographic"],
    ["초점 계수", f.toFixed(3)],
    ["가까운 z", nearZ.toFixed(2)],
    ["먼 z", farZ.toFixed(2)]
  ]);
  const projectionText = s.mode === "perspective" ? "z로 나누기 때문에 가까운 모서리가 더 커 보입니다." : "깊이로 크기를 나누지 않아 앞뒤 크기가 유지됩니다.";
  setNote("projectionNote", `${projectionText} FOV가 커질수록 같은 물체가 화면에서 작아지고, 카메라 거리가 가까워질수록 깊이 차이가 더 강하게 보입니다.`);
  setSteps("projection", [
    { title: "월드 좌표", formula: "worldPos = World * localPos", result: "큐브 꼭짓점이 월드에 배치됩니다." },
    { title: "뷰 좌표", formula: "viewZ = rotatedZ + cameraDistance", result: `z 범위 ${nearZ.toFixed(2)} ~ ${farZ.toFixed(2)}` },
    { title: "투영", formula: s.mode === "perspective" ? "x'=x*f/z, y'=y*f/z" : "x'=x*scale, y'=y*scale", result: `${s.mode}, f=${f.toFixed(3)}` },
    { title: "화면 매핑", formula: "screen = ndc * viewport", result: "NDC 좌표를 캔버스 픽셀로 옮깁니다." }
  ]);
}
