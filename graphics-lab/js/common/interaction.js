function animateTopic(topic, dt) {
  if (topic === "vector") {
    state.vector.angle = wrap180(state.vector.angle + dt * 52);
    state.vector.length = 3.3 + Math.sin(performance.now() * 0.0015) * 1.8;
  } else if (topic === "trig") {
    state.trig.angle = wrap360(state.trig.angle + dt * 70);
  } else if (topic === "dotcross") {
    state.dotcross.bAngle = wrap180(state.dotcross.bAngle + dt * 58);
    state.dotcross.aAngle = wrap180(state.dotcross.aAngle + dt * 18);
  } else if (topic === "transform") {
    state.transform.rotation = wrap180(state.transform.rotation + dt * 44);
    state.transform.tx = Math.cos(performance.now() * 0.001) * 1.7;
    state.transform.ty = Math.sin(performance.now() * 0.0012) * 1.2;
  } else if (topic === "projection") {
    state.projection.yaw = Math.sin(performance.now() * 0.001) * 58;
    state.projection.distance = 5.8 + Math.sin(performance.now() * 0.0008) * 1.6;
  } else if (topic === "raster") {
    state.raster.sampleX = 50 + Math.cos(performance.now() * 0.0012) * 36;
    state.raster.sampleY = 48 + Math.sin(performance.now() * 0.0015) * 34;
  } else if (topic === "texture") {
    state.texture.u = (state.texture.u + dt * 0.1) % 1;
    state.texture.v = (state.texture.v + dt * 0.07) % 1;
  } else if (topic === "lighting") {
    state.lighting.lightAngle = wrap180(state.lighting.lightAngle + dt * 48);
    state.lighting.normalAngle = Math.sin(performance.now() * 0.0011) * 52;
  } else if (topic === "gpu") {
    const t = performance.now() * 0.0007;
    state.gpu.width = roundStep(2240 + Math.sin(t) * 1360, 80);
    state.gpu.height = roundStep(1260 + Math.cos(t * 1.1) * 765, 45);
    state.gpu.overdraw = 2.2 + Math.sin(t * 1.7) * 1.2;
  }
}

const dragHandlers = {
  vector(p) {
    const layout = canvasLayouts.vector;
    const wpos = screenToWorld(layout.origin, layout.scale, p);
    state.vector.length = clamp(Math.hypot(wpos.x, wpos.y), 0.5, 6);
    state.vector.angle = wrap180(radToDeg(Math.atan2(wpos.y, wpos.x)));
  },
  trig(p) {
    const layout = canvasLayouts.trig;
    const dx = p.x - layout.center.x;
    const dy = layout.center.y - p.y;
    state.trig.angle = wrap360(radToDeg(Math.atan2(dy, dx)));
    state.trig.radius = clamp(Math.hypot(dx, dy) / layout.baseR, 0.5, 1.6);
  },
  dotcross(p, isStart) {
    const layout = canvasLayouts.dotcross;
    if (isStart || !dragState.target) {
      const da = Math.hypot(p.x - layout.aEnd.x, p.y - layout.aEnd.y);
      const db = Math.hypot(p.x - layout.bEnd.x, p.y - layout.bEnd.y);
      dragState.target = da < db ? "a" : "b";
    }
    const wpos = screenToWorld(layout.origin, layout.scale, p);
    const angle = wrap180(radToDeg(Math.atan2(wpos.y, wpos.x)));
    const length = clamp(Math.hypot(wpos.x, wpos.y), 1, 5.5);
    if (dragState.target === "a") {
      state.dotcross.aAngle = angle;
      state.dotcross.aLength = length;
    } else {
      state.dotcross.bAngle = angle;
      state.dotcross.bLength = length;
    }
  },
  transform(p) {
    const layout = canvasLayouts.transform;
    const wpos = screenToWorld(layout.origin, layout.scale, p);
    state.transform.tx = clamp(wpos.x, -3, 3);
    state.transform.ty = clamp(wpos.y, -2.5, 2.5);
  },
  projection(p) {
    const layout = canvasLayouts.projection;
    if (p.x < layout.split) {
      state.projection.yaw = clamp((p.x / layout.split - 0.5) * 140, -70, 70);
      state.projection.fov = clamp(25 + (p.y / layout.h) * 80, 25, 105);
    } else {
      const t = clamp((p.x - layout.split) / Math.max(1, layout.w - layout.split), 0, 1);
      state.projection.distance = 3 + t * 6;
    }
  },
  raster(p) {
    const layout = canvasLayouts.raster;
    state.raster.sampleX = clamp((p.x - layout.ox) / layout.size * 100, 0, 100);
    state.raster.sampleY = clamp((p.y - layout.oy) / layout.size * 100, 0, 100);
  },
  texture(p) {
    const layout = canvasLayouts.texture;
    state.texture.u = clamp((p.x - layout.ox) / layout.texSize, 0, 1);
    state.texture.v = clamp((p.y - layout.oy) / layout.texSize, 0, 1);
  },
  lighting(p, isStart) {
    const layout = canvasLayouts.lighting;
    if (isStart || !dragState.target) dragState.target = p.x < layout.leftW ? "normal" : "light";
    if (dragState.target === "normal") {
      const dx = p.x - layout.center.x;
      const dz = layout.center.y - p.y;
      state.lighting.normalAngle = clamp(radToDeg(Math.atan2(dx, dz)), -90, 90);
    } else {
      const dx = p.x - layout.sphereX;
      const dy = p.y - layout.sphereY;
      state.lighting.lightAngle = wrap180(radToDeg(Math.atan2(dy, dx)));
    }
  },
  gpu(p) {
    const widthT = clamp(p.x / canvasLayouts.gpu.w, 0, 1);
    const heightT = clamp(p.y / canvasLayouts.gpu.h, 0, 1);
    state.gpu.width = roundStep(640 + widthT * (3840 - 640), 80);
    state.gpu.height = roundStep(360 + heightT * (2160 - 360), 45);
    state.gpu.overdraw = clamp(1 + heightT * 3, 1, 4);
  }
};
