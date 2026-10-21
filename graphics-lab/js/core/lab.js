/* ===== 랩 본체: 주제 등록 · 화면 구성 · 주제 전환 =====
   주제 파일은 lesson({...})로 자신을 등록하고, buildLab()이 한 번에 화면을 만듭니다.
   그림은 해당 주제를 처음 열 때 만들어집니다(숨겨진 캔버스는 크기를 잴 수 없기 때문). */

const LESSON_DEFS = [];
function lesson(def) { LESSON_DEFS.push(def); }

const lab = { active: -1, sections: [], ctxs: [] };

function renderBlock(b, sym, pending) {
  if (typeof b === "string") return `<p>${fmtText(b, sym)}</p>`;
  if (b.h) return `<h2>${fmtText(b.h, sym)}</h2>`;
  if (b.key) return `<div class="keybox"><span class="keybox-tag">핵심</span><p>${fmtText(b.key, sym)}</p></div>`;
  if (b.ponder) {
    return `<details class="ponder"><summary><span class="ponder-tag">잠깐</span>${fmtText(b.ponder, sym)}</summary><div class="ponder-a">${fmtText(b.answer, sym)}</div></details>`;
  }
  // 실전 활용: [분류, 제목, 설명] 목록
  if (b.use) {
    return `<section class="uses"><h2>실전에서는</h2><div class="use-grid">${b.use.map(u =>
      `<div class="use"><span class="use-tag">${u[0]}</span><div class="use-t">${fmtText(u[1], sym)}</div><div class="use-d">${fmtText(u[2], sym)}</div></div>`).join("")}</div></section>`;
  }
  if (b.recap) {
    return `<div class="recap"><div class="recap-tag">한 장 요약</div>${b.recap.map(r =>
      `<div class="recap-row"><span class="recap-eq">${fmtMath(r[0], sym)}</span><span class="recap-d">${fmtText(r[1] || "", sym)}</span></div>`).join("")}</div>`;
  }
  if (b.fig) {
    pending.push(b.fig);
    const eq = (b.fig.eq || []).map(e => `<div class="fig-eq-line">${fmtMath(e, sym)}</div>`).join("");
    return `<figure class="fig" data-fig="${pending.length - 1}">
      ${b.fig.title ? `<div class="fig-title">${fmtText(b.fig.title, sym)}</div>` : ""}
      <div class="fig-stage"></div>
      <div class="fig-ctl"></div>
      ${eq ? `<div class="fig-eq">${eq}</div>` : ""}
    </figure>${b.fig.caption ? `<p class="fig-cap">${fmtText(b.fig.caption, sym)}</p>` : ""}`;
  }
  return "";
}

function buildLab() {
  const root = document.getElementById("lessonRoot");
  const nav = document.getElementById("topicNav");
  LESSON_DEFS.forEach((def, i) => {
    const sym = def.sym || {};
    const no = String(i + 1).padStart(2, "0");
    const pending = [];
    const sec = document.createElement("section");
    sec.className = "lesson";
    sec.id = "lesson-" + def.topic;
    sec.dataset.topic = def.topic;
    sec.dataset.title = def.title;
    sec.dataset.desc = def.desc;
    sec.dataset.stage = def.stage;
    const meta = lessonMeta(def.topic);
    sec.dataset.level = meta.level;
    sec.dataset.tags = meta.tags.join(",");
    const body = def.blocks.map(b => renderBlock(b, sym, pending)).join("\n");
    const prev = LESSON_DEFS[i - 1], next = LESSON_DEFS[i + 1];
    sec.innerHTML = `
      <header class="lesson-head">
        <p class="lesson-kicker"><span>${no}</span>${def.stage}</p>
        <h1>${def.title}</h1>
        <div class="lesson-meta">
          <span class="lv lv-${meta.level}" title="난이도"><i></i><i></i><i></i>${LEVEL_NAMES[meta.level]}</span>
          ${meta.tags.map(t => `<button type="button" class="tag" data-tag="${t}">#${t}</button>`).join("")}
        </div>
        <p class="lesson-hook">${fmtText(def.hook, sym)}</p>
      </header>
      <div class="lesson-body">${body}</div>
      <nav class="lesson-foot">
        ${prev ? `<button type="button" class="foot-btn prev" data-go="${i - 1}"><span>← 이전</span>${prev.title}</button>` : "<span></span>"}
        ${next ? `<button type="button" class="foot-btn next" data-go="${i + 1}"><span>다음 →</span>${next.title}</button>` : ""}
      </nav>`;
    root.appendChild(sec);

    const ctx = { index: i, sym, figs: [], pending, isActive: () => lab.active === i };
    lab.sections.push(sec);
    lab.ctxs.push(ctx);
  });

  nav.innerHTML = LESSON_DEFS.map((d, i) =>
    `<button type="button" data-go="${i}"><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="label">${d.title}</span></button>`).join("");
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]");
    if (b && (nav.contains(b) || root.contains(b))) setActive(+b.dataset.go, true);
    // 태그를 누르면 그 태그로 검색 (검색 창은 라이브러리가 제공)
    const t = e.target.closest(".lesson-meta .tag");
    if (t) document.dispatchEvent(new CustomEvent("gfxlab:tag", { detail: { tag: t.dataset.tag } }));
  });
  const prevBtn = document.getElementById("prevTopic"), nextBtn = document.getElementById("nextTopic");
  if (prevBtn) prevBtn.addEventListener("click", () => setActive(Math.max(0, lab.active - 1), true));
  if (nextBtn) nextBtn.addEventListener("click", () => setActive(Math.min(LESSON_DEFS.length - 1, lab.active + 1), true));
  window.addEventListener("resize", () => requestAnimationFrame(render));
}

function initFigures(i) {
  const ctx = lab.ctxs[i], sec = lab.sections[i];
  ctx.pending.forEach((def, k) => {
    const el = sec.querySelector(`[data-fig="${k}"]`);
    // 실시간 값은 그림마다 따로: 같은 키(v.x 등)를 여러 그림이 써도 섞이지 않습니다
    const liveEls = {};
    const figCtx = Object.assign({}, ctx, {
      // 숫자는 그대로, 문장(한글·$수식$ 포함)은 서식을 입혀 넣습니다
      set(k, v) {
        const els = liveEls[k] || (liveEls[k] = Array.from(el.querySelectorAll(`.live[data-k="${k}"]`)));
        const s = String(v);
        els.forEach(x => {
          if (x._v === s) return;
          x._v = s;
          if (/[$가-힣]/.test(s)) { x.classList.add("live-txt"); x.innerHTML = fmtText(s, ctx.sym); }
          else { x.classList.remove("live-txt"); x.textContent = s; }
        });
      }
    });
    const F = makeFig(el, def, figCtx);
    const ctlEl = el.querySelector(".fig-ctl");
    const C = makeControls(ctlEl, F, ctx.sym);
    def.setup(F, C, figCtx);
    if (!ctlEl.children.length) ctlEl.remove();
    ctx.figs.push(F);
  });
  ctx.pending = [];
}

function setActive(index, scroll) {
  if (index === lab.active || !lab.sections[index]) return;
  lab.active = index;
  lab.sections.forEach((s, i) => s.classList.toggle("active", i === index));
  document.querySelectorAll("#topicNav button").forEach((b, i) => b.classList.toggle("active", i === index));
  const cur = document.getElementById("currentTopic");
  if (cur) cur.textContent = LESSON_DEFS[index].title;
  if (lab.ctxs[index].pending.length) initFigures(index);
  render();
  if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
  document.dispatchEvent(new CustomEvent("gfxlab:change", { detail: { index } }));
}

function render() {
  const ctx = lab.ctxs[lab.active];
  if (!ctx) return;
  ctx.figs.forEach(F => { F.resize(); F.paint(); });
}
