function formatValue(path, value) {
  if (path.endsWith("angle") || path.endsWith("rotation") || path.endsWith("yaw") || path.endsWith("fov")) return `${Number(value).toFixed(0)}°`;
  if (path.endsWith("zoom")) return `${Number(value).toFixed(0)} px`;
  if (path.endsWith("length")) return Number(value).toFixed(1);
  if (path.endsWith("radius") || path.endsWith("frequency") || path.endsWith("scaleX") || path.endsWith("scaleY") || path.endsWith("tx") || path.endsWith("ty")) return Number(value).toFixed(2);
  if (path.endsWith("distance")) return Number(value).toFixed(1);
  if (path.endsWith("sampleX") || path.endsWith("sampleY")) return `${Number(value).toFixed(0)}%`;
  if (path.endsWith("resolution")) return `${Number(value).toFixed(0)} x ${Number(value).toFixed(0)}`;
  if (path.endsWith("u") || path.endsWith("v") || path.endsWith("roughness") || path.endsWith("ambient") || path.endsWith("overdraw")) return Number(value).toFixed(2);
  if (path.endsWith("tiling")) return `${Number(value).toFixed(0)}x`;
  if (path.endsWith("width") || path.endsWith("height") || path.endsWith("vertices") || path.endsWith("triangles")) return Number(value).toLocaleString("ko-KR");
  return String(value);
}

function buildNav() {
  topicNav.innerHTML = lessons.map((lesson, index) => {
    const no = String(index + 1).padStart(2, "0");
    return `<button type="button" data-go="${index}">
      <span class="num">${no}</span>
      <span><span class="label">${lesson.dataset.title}</span><span class="desc">${lesson.dataset.desc}</span></span>
    </button>`;
  }).join("");
  topicNav.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => setActive(Number(button.dataset.go)));
  });
}

function injectAutoControls() {
  lessons.forEach(lesson => {
    const topic = lesson.dataset.topic;
    const panel = lesson.querySelector(".control-panel");
    const group = document.createElement("div");
    group.className = "control-group auto-group";
    group.innerHTML = `
      <div class="control-title">실험 조작</div>
      <button class="play-toggle" type="button" data-play="${topic}">▶ 자동 애니메이션</button>
      <span class="drag-hint">캔버스 위의 그래프를 드래그하면 주요 값이 바로 바뀝니다.</span>
    `;
    panel.prepend(group);
  });

  document.querySelectorAll("[data-play]").forEach(button => {
    button.addEventListener("click", () => toggleAuto(button.dataset.play));
  });
}

function wireControls() {
  document.querySelectorAll("[data-bind]").forEach(input => {
    const eventName = input.type === "radio" || input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, () => {
      const [topic, key] = input.dataset.bind.split(".");
      if (input.type === "radio" && !input.checked) return;
      state[topic][key] = input.type === "radio" || input.tagName === "SELECT" ? input.value : Number(input.value);
      render();
    });
  });

  document.getElementById("prevTopic").addEventListener("click", () => setActive((state.active + lessons.length - 1) % lessons.length));
  document.getElementById("nextTopic").addEventListener("click", () => setActive((state.active + 1) % lessons.length));
}

function wireCanvasDrag() {
  document.querySelectorAll(".visual-canvas").forEach(canvas => {
    canvas.addEventListener("pointerdown", event => {
      dragState.active = true;
      dragState.topic = canvas.closest(".lesson").dataset.topic;
      dragState.target = "";
      canvas.setPointerCapture(event.pointerId);
      applyCanvasDrag(canvas, event, true);
    });
    canvas.addEventListener("pointermove", event => {
      if (!dragState.active) return;
      applyCanvasDrag(canvas, event, false);
    });
    canvas.addEventListener("pointerup", event => {
      dragState.active = false;
      dragState.target = "";
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointercancel", () => {
      dragState.active = false;
      dragState.target = "";
    });
  });
}

function pointerPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function applyCanvasDrag(canvas, event, isStart) {
  const topic = canvas.closest(".lesson").dataset.topic;
  if (!canvasLayouts[topic] && drawFns[topic]) drawFns[topic]();
  const handler = dragHandlers[topic];
  if (!handler) return;
  handler(pointerPoint(canvas, event), isStart);
  render();
}

function toggleAuto(topic) {
  if (autoState.topic === topic) {
    stopAuto();
    return;
  }
  autoState.topic = topic;
  autoState.last = performance.now();
  updateAutoButtons();
  if (!autoState.raf) autoState.raf = requestAnimationFrame(tickAuto);
}

function stopAuto() {
  autoState.topic = "";
  if (autoState.raf) cancelAnimationFrame(autoState.raf);
  autoState.raf = 0;
  updateAutoButtons();
}

function updateAutoButtons() {
  document.querySelectorAll("[data-play]").forEach(button => {
    const active = button.dataset.play === autoState.topic;
    button.classList.toggle("active", active);
    button.textContent = active ? "Ⅱ 정지" : "▶ 자동 애니메이션";
  });
}

function tickAuto(now) {
  if (!autoState.topic) {
    autoState.raf = 0;
    return;
  }
  const dt = clamp((now - autoState.last) / 1000, 0, 0.05);
  autoState.last = now;
  animateTopic(autoState.topic, dt);
  render();
  autoState.raf = requestAnimationFrame(tickAuto);
}

function syncInputs() {
  document.querySelectorAll("[data-bind]").forEach(input => {
    const [topic, key] = input.dataset.bind.split(".");
    const value = state[topic][key];
    if (input.type === "radio") {
      input.checked = input.value === value;
    } else {
      input.value = value;
    }
  });
}

function syncValueLabels() {
  document.querySelectorAll("[data-value-for]").forEach(output => {
    const path = output.dataset.valueFor;
    const [topic, key] = path.split(".");
    output.value = formatValue(path, state[topic][key]);
  });
}

function setActive(index) {
  state.active = index;
  const nextTopic = lessons[index].dataset.topic;
  if (autoState.topic && autoState.topic !== nextTopic) stopAuto();
  lessons.forEach((lesson, i) => lesson.classList.toggle("active", i === index));
  topicNav.querySelectorAll("button").forEach((button, i) => button.classList.toggle("active", i === index));
  currentTopic.textContent = lessons[index].dataset.title;
  render();
}

function render() {
  syncInputs();
  syncValueLabels();
  const topic = lessons[state.active].dataset.topic;
  if (drawFns[topic]) drawFns[topic]();
}
