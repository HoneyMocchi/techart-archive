function drawGpu() {
  const { ctx, w, h } = fitCanvas(document.getElementById("gpuCanvas"));
  const s = state.gpu;
  clear(ctx, w, h);
  const pixels = s.width * s.height;
  const fragments = pixels * s.overdraw;
  const framebufferMb = pixels * 4 / (1024 * 1024);
  const vertexMb = s.vertices * 32 / (1024 * 1024);
  canvasLayouts.gpu = { w, h };
  const stages = [
    ["CPU", "scene data", C.ink],
    ["Vertex Buffer", `${s.vertices.toLocaleString("ko-KR")} verts`, C.blue],
    ["Vertex Shader", "positions", C.teal],
    ["Rasterizer", `${s.triangles.toLocaleString("ko-KR")} tris`, C.orange],
    ["Fragment Shader", `${Math.round(fragments).toLocaleString("ko-KR")} frags`, C.red],
    ["Framebuffer", `${framebufferMb.toFixed(1)} MB`, C.green]
  ];
  const margin = 28;
  const laneY = h * 0.32;
  const boxW = Math.min(160, (w - margin * 2) / stages.length - 12);
  const gap = (w - margin * 2 - boxW * stages.length) / (stages.length - 1);
  stages.forEach((stage, i) => {
    const x = margin + i * (boxW + gap);
    ctx.fillStyle = C.panelDeep;
    ctx.strokeStyle = stage[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, laneY, boxW, 78, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = stage[2];
    ctx.font = "800 13px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText(stage[0], x + 12, laneY + 30);
    ctx.fillStyle = C.muted;
    ctx.font = "12px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText(stage[1], x + 12, laneY + 54);
    if (i < stages.length - 1) {
      arrow(ctx, { x: x + boxW + 8, y: laneY + 39 }, { x: x + boxW + gap - 8, y: laneY + 39 }, C.axis, 2);
    }
  });

  const bars = [
    ["정점 처리", s.vertices / 200000, C.blue, `${s.vertices.toLocaleString("ko-KR")} vertices`],
    ["삼각형 조립", s.triangles / 300000, C.orange, `${s.triangles.toLocaleString("ko-KR")} triangles`],
    ["픽셀 수", pixels / (3840 * 2160), C.teal, `${pixels.toLocaleString("ko-KR")} pixels`],
    ["fragment 작업", fragments / (3840 * 2160 * 4), C.red, `${Math.round(fragments).toLocaleString("ko-KR")} fragments`]
  ];
  const barX = margin;
  const barY = h * 0.62;
  const barW = w - margin * 2;
  bars.forEach((bar, i) => {
    const y = barY + i * 40;
    ctx.fillStyle = C.panelSoft;
    ctx.fillRect(barX, y, barW, 18);
    ctx.fillStyle = bar[2];
    ctx.fillRect(barX, y, barW * clamp(bar[1], 0.02, 1), 18);
    ctx.fillStyle = C.ink;
    ctx.font = "700 13px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText(bar[0], barX, y - 8);
    ctx.fillStyle = C.muted;
    ctx.font = "12px Segoe UI, Malgun Gothic, sans-serif";
    ctx.fillText(bar[3], barX + barW - ctx.measureText(bar[3]).width, y - 8);
  });

  setMetrics("gpuMetrics", [
    ["픽셀 수", pixels.toLocaleString("ko-KR")],
    ["fragment 추정", Math.round(fragments).toLocaleString("ko-KR")],
    ["프레임버퍼", `${framebufferMb.toFixed(1)} MB`],
    ["버텍스 버퍼", `${vertexMb.toFixed(2)} MB`]
  ]);
  setNote("gpuNote", `${s.width}x${s.height} 화면은 ${pixels.toLocaleString("ko-KR")}개의 픽셀을 갖습니다. 오버드로우 ${s.overdraw.toFixed(1)}배라면 fragment shader는 대략 ${Math.round(fragments).toLocaleString("ko-KR")}번 실행됩니다. 해상도와 오버드로우는 지오메트리 수보다 더 빨리 비용을 키울 때가 많습니다.`);
  setSteps("gpu", [
    { title: "해상도", formula: "pixels=width*height", result: `${pixels.toLocaleString("ko-KR")} pixels` },
    { title: "프래그먼트", formula: "fragments=pixels*overdraw", result: `${Math.round(fragments).toLocaleString("ko-KR")} shader runs` },
    { title: "정점 메모리", formula: "vertexBytes=vertices*32", result: `${vertexMb.toFixed(2)} MB` },
    { title: "프레임버퍼", formula: "framebuffer=width*height*4", result: `${framebufferMb.toFixed(1)} MB per color target` }
  ]);
}
