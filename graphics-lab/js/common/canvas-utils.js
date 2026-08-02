function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(300, Math.floor(rect.height));
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: width, h: height };
}

function clear(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function vecFromAngle(deg, length) {
  const r = degToRad(deg);
  return { x: Math.cos(r) * length, y: Math.sin(r) * length };
}

function drawGrid(ctx, w, h, origin, scale, maxCells = 18) {
  const left = -Math.ceil(origin.x / scale);
  const right = Math.ceil((w - origin.x) / scale);
  const bottom = -Math.ceil((h - origin.y) / scale);
  const top = Math.ceil(origin.y / scale);
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.grid;
  ctx.beginPath();
  for (let i = Math.max(left, -maxCells); i <= Math.min(right, maxCells); i++) {
    const x = origin.x + i * scale;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let j = Math.max(bottom, -maxCells); j <= Math.min(top, maxCells); j++) {
    const y = origin.y - j * scale;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(w, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, h);
  ctx.stroke();
}

function worldToScreen(origin, scale, p) {
  return { x: origin.x + p.x * scale, y: origin.y - p.y * scale };
}

function arrow(ctx, from, to, color, width = 3, label = "") {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = 12;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle - Math.PI / 6) * head, to.y - Math.sin(angle - Math.PI / 6) * head);
  ctx.lineTo(to.x - Math.cos(angle + Math.PI / 6) * head, to.y - Math.sin(angle + Math.PI / 6) * head);
  ctx.closePath();
  ctx.fill();
  if (label) drawTag(ctx, label, to.x + 8, to.y - 24, color);
}

function drawTag(ctx, text, x, y, color = C.muted) {
  ctx.save();
  ctx.font = "700 12px Segoe UI, Malgun Gothic, sans-serif";
  const width = ctx.measureText(text).width + 14;
  ctx.fillStyle = C.tag;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x + 7, y + 16);
  ctx.restore();
}

function setMetrics(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(item => `<div class="metric"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join("");
}

function setNote(id, text) {
  document.getElementById(id).textContent = text;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ensureStepPanel(topic) {
  const lesson = lessons.find(item => item.dataset.topic === topic);
  let panel = lesson.querySelector(`[data-steps-for="${topic}"]`);
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "step-panel";
    panel.dataset.stepsFor = topic;
    lesson.appendChild(panel);
  }
  return panel;
}

function setSteps(topic, items) {
  const panel = ensureStepPanel(topic);
  panel.innerHTML = `
    <strong>수식과 처리 순서</strong>
    <div class="step-grid">
      ${items.map((item, index) => `
        <div class="step-card">
          <span class="step-index">${String(index + 1).padStart(2, "0")}</span>
          <b>${escapeHTML(item.title)}</b>
          <code>${escapeHTML(item.formula)}</code>
          <span>${escapeHTML(item.result)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function ensureMatrixPanel() {
  let panel = document.getElementById("transformMatrixBreakdown");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "transformMatrixBreakdown";
    panel.className = "matrix-breakdown";
    const formula = document.querySelector("#lesson-transform .formula");
    formula.insertAdjacentElement("afterend", panel);
  }
  return panel;
}

function matrixText(rows) {
  return rows.map(row => `[ ${row.map(value => Number(value).toFixed(2).padStart(6, " ")).join(" ")} ]`).join("\n");
}

function setTransformMatrices(items) {
  const panel = ensureMatrixPanel();
  panel.innerHTML = `
    <strong>T / R / S 행렬 분해</strong>
    <div class="matrix-grid">
      ${items.map(item => `
        <div class="matrix-card">
          <b>${escapeHTML(item.title)}</b>
          <pre>${escapeHTML(item.body)}</pre>
        </div>
      `).join("")}
    </div>
  `;
}

function signedAngleDiff(a, b) {
  let d = ((b - a + 540) % 360) - 180;
  return d;
}

function colorToCss(c) {
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

function wrap360(deg) {
  return ((deg % 360) + 360) % 360;
}

function wrap180(deg) {
  return ((deg + 540) % 360) - 180;
}

function roundStep(value, step) {
  return Math.round(value / step) * step;
}

function screenToWorld(origin, scale, p) {
  return { x: (p.x - origin.x) / scale, y: (origin.y - p.y) / scale };
}
