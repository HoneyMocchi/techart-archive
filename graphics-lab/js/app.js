buildLab();
// 단독 실행 시 #3 처럼 번호로 주제를 고를 수 있습니다(라이브러리에서는 라이브러리가 주소를 맡습니다).
const startMatch = location.hash.match(/^#(\d+)$/);
setActive(startMatch ? clamp(+startMatch[1] - 1, 0, LESSON_DEFS.length - 1) : 0);

// 홈 화면용 그림: 격자가 여러 행렬을 차례로 따라 변형됩니다(4장 미리보기)
function mountHero(host) {
  host.innerHTML = '<figure class="fig hero-fig"><div class="fig-stage"></div></figure>';
  const block = host.firstChild;
  const F = makeFig(block, { aspect: w => (w < 600 ? 0.66 : 0.4), view: { x0: -4.6, x1: 4.6, y0: -1.9, y1: 1.9 }, hint: false },
    { isActive: () => host.offsetParent !== null, set() {} });
  const SHAPE = [[0, 0], [0.28, 0], [0.28, 0.48], [0.68, 0.48], [0.68, 0.7], [0.28, 0.7], [0.28, 0.86], [0.85, 0.86], [0.85, 1.08], [0, 1.08]].map(p => [p[0] + 0.3, p[1] + 0.2]);
  const STEPS = [
    ["", [1, 0, 0, 1]], ["회전", [0.71, -0.71, 0.71, 0.71]], ["기울이기", [1, 1, 0, 1]],
    ["늘이기", [1.7, 0, 0, 0.6]], ["뒤집기", [-1, 0.4, 0, 1]], ["섞기", [0.9, -0.6, 0.7, 1.1]]
  ];
  let i = 0, from = STEPS[0][1], to = STEPS[0][1], k = 1, hold = 0;
  F.loop(dt => {
    if (k < 1) { k = Math.min(1, k + dt / 1.4); return; }
    hold += dt;
    if (hold > 1.1) { hold = 0; i = (i + 1) % STEPS.length; from = to; to = STEPS[i][1]; k = 0; }
  });
  F.draw = g => {
    const e = ease(k), m = from.map((a, n) => lerp(a, to[n], e));
    const T = p => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
    g.grid(1, { minor: false, color: "rgba(88,196,221,0.08)", axes: false });
    g.gridM(m, 12);
    g.poly([[0, 0], T([1, 0]), T([1, 1]), T([0, 1])], { fill: hexA(PAL.yellow, 0.18) });
    g.poly(SHAPE.map(T), { fill: hexA(PAL.pink, 0.6), stroke: "pink", w: 2 });
    g.arrow([0, 0], T([1, 0]), "green", { w: 4.5, label: "î" });
    g.arrow([0, 0], T([0, 1]), "red", { w: 4.5, label: "ĵ" });
    g.arrow([0, 0], T([-1.6, 0.9]), "yellow", { w: 3.5, label: "v" });
    if (STEPS[i][0]) g.textS(STEPS[i][0], 16, F.h - 16, "rgba(236,239,244,0.7)", { align: "left", base: "bottom", size: 14, bold: true });
  };
  F.resize(); F.paint(); F.play(true);
  window.addEventListener("resize", () => { F.resize(); F.paint(); });
  return F;
}

window.GFXLab = { setActive: i => setActive(i, true), render, lessons: lab.sections, mountHero, tagOrder: TAG_ORDER };
