function normalize3(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function drawLighting() {
  const { ctx, w, h } = fitCanvas(document.getElementById("lightingCanvas"));
  const s = state.lighting;
  clear(ctx, w, h);
  const leftW = w * 0.36;
  const center = { x: leftW * 0.52, y: h * 0.52 };
  const r = Math.min(leftW, h) * 0.24;
  const sphereX = leftW + (w - leftW) * 0.5;
  const sphereY = h * 0.51;
  const sphereR = Math.min(w - leftW, h) * 0.34;
  canvasLayouts.lighting = { leftW, center, sphereX, sphereY };
  const lightAngle = degToRad(s.lightAngle);
  const normalAngle = degToRad(s.normalAngle);
  const light = normalize3([Math.cos(lightAngle) * 0.8, Math.sin(lightAngle) * 0.8, 0.72]);
  const normal = normalize3([Math.sin(normalAngle), 0, Math.cos(normalAngle)]);
  const view = [0, 0, 1];
  const half = normalize3([light[0] + view[0], light[1] + view[1], light[2] + view[2]]);
  const diffuse = Math.max(dot3(normal, light), 0);
  const power = lerp(90, 8, s.roughness);
  const specular = Math.pow(Math.max(dot3(normal, half), 0), power);
  const finalLight = clamp(s.ambient + diffuse * 0.72 + specular * 0.55, 0, 1);

  drawGrid(ctx, leftW, h, center, 44, 6);
  ctx.fillStyle = C.panelDeep;
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  arrow(ctx, center, { x: center.x + normal[0] * r * 1.55, y: center.y - normal[2] * r * 1.55 }, C.blue, 4, "N");
  arrow(ctx, { x: center.x - light[0] * r * 1.9, y: center.y + light[1] * r * 1.9 }, center, C.orange, 4, "L");
  drawTag(ctx, `diffuse ${diffuse.toFixed(2)}`, center.x - r * 1.2, center.y + r + 20, C.teal);

  const image = ctx.createImageData(Math.ceil(sphereR * 2), Math.ceil(sphereR * 2));
  const side = image.width;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const nx = (x / (side - 1)) * 2 - 1;
      const ny = (y / (side - 1)) * 2 - 1;
      const rr = nx * nx + ny * ny;
      const i = (y * side + x) * 4;
      if (rr > 1) {
        image.data[i + 3] = 0;
        continue;
      }
      const nz = Math.sqrt(1 - rr);
      const nrm = normalize3([nx, -ny, nz]);
      const diff = Math.max(dot3(nrm, light), 0);
      const hvec = half;
      const spec = Math.pow(Math.max(dot3(nrm, hvec), 0), power);
      const shade = clamp(s.ambient + diff * 0.78 + spec * 0.62, 0, 1);
      image.data[i] = Math.round(lerp(26, 230, shade));
      image.data[i + 1] = Math.round(lerp(34, 210, shade));
      image.data[i + 2] = Math.round(lerp(44, 185, shade));
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, sphereX - side / 2, sphereY - side / 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, sphereR, 0, Math.PI * 2);
  ctx.stroke();

  setMetrics("lightingMetrics", [
    ["diffuse", diffuse.toFixed(3)],
    ["specular", specular.toFixed(3)],
    ["최종 밝기", finalLight.toFixed(3)],
    ["spec power", power.toFixed(1)]
  ]);
  setNote("lightingNote", `노멀과 빛 방향이 가까워질수록 diffuse가 커집니다. roughness ${s.roughness.toFixed(2)}에서는 specular power가 ${power.toFixed(1)}이라 하이라이트가 ${s.roughness < 0.35 ? "좁고 강하게" : "넓고 부드럽게"} 퍼집니다.`);
  setSteps("lighting", [
    { title: "방향 벡터", formula: "N=normal, L=light, V=view", result: `N=(${normal.map(v => v.toFixed(2)).join(", ")}), L=(${light.map(v => v.toFixed(2)).join(", ")})` },
    { title: "확산광", formula: "diffuse=max(dot(N,L),0)", result: `diffuse=${diffuse.toFixed(3)}` },
    { title: "하프 벡터", formula: "H=normalize(L+V)", result: `dot(N,H)=${Math.max(dot3(normal, half), 0).toFixed(3)}` },
    { title: "최종 밝기", formula: "ambient + diffuse + specular", result: `final=${finalLight.toFixed(3)}, spec=${specular.toFixed(3)}` }
  ]);
}
