/* 05 3D 회전과 쿼터니언 */
(() => {
  const f2 = n => num(n, 2);
  const rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
  const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
  const rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
  const euler = (v, y, p, r) => rotY(rotX(rotZ(v, r), p), y);      // R = Ry · Rx · Rz
  // 쿼터니언 [w, x, y, z]
  const qAxis = (n, a) => [Math.cos(a / 2), n[0] * Math.sin(a / 2), n[1] * Math.sin(a / 2), n[2] * Math.sin(a / 2)];
  const qMul = (a, b) => [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  const qEuler = (y, p, r) => qMul(qMul(qAxis([0, 1, 0], y), qAxis([1, 0, 0], p)), qAxis([0, 0, 1], r));
  const qRot = (q, v) => { const r = qMul(qMul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]); return [r[1], r[2], r[3]]; };
  function slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(x => -x); d = -d; }               // 짧은 쪽으로
    if (d > 0.9995) { const r = a.map((x, i) => lerp(x, b[i], t)); const l = Math.hypot(...r); return r.map(x => x / l); }
    const th = Math.acos(d), s = Math.sin(th);
    return a.map((x, i) => (Math.sin((1 - t) * th) * x + Math.sin(t * th) * b[i]) / s);
  }
  const ring = (cam, R, color, w, alpha) => {
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; pts.push(R([Math.cos(a) * 1, Math.sin(a) * 1])); }
    for (let i = 0; i < 64; i++) cam.line(pts[i], pts[i + 1], color, { w, alpha });
  };
  // 작은 비행기: 코(+z) 노랑, 날개(x), 꼬리 날개(y)
  function plane(cam, R) {
    const P = p => R(p);
    cam.poly([[0, 0, 1.2], [0.9, 0, -0.4], [0, 0, -0.1], [-0.9, 0, -0.4]].map(P), { fill: hexA(PAL.yellow, 0.55), stroke: "yellow" });
    cam.poly([[0, 0, -0.1], [0, 0.45, -0.5], [0, 0, -0.5]].map(P), { fill: hexA(PAL.red, 0.6), stroke: "red" });
  }

  lesson({
    topic: "rotation3d", title: "3D 회전과 쿼터니언", desc: "짐벌락과 slerp", stage: "공간의 언어",
    sym: { yaw: "red", pitch: "green", roll: "blue", q: "purple", n: "teal", v: "yellow", "θ": "blue", t: "teal", w: "grey" },
    hook: "2D 회전은 각도 하나면 됐습니다. 3D는 축이 셋이라 ==각도 셋을 어떤 순서로 돌리느냐==가 문제가 되고, 그 틈에서 짐벌락이 생깁니다.",
    blocks: [
      { h: "오일러 각과 짐벌락" },
      "비행기를 [[red:요(yaw)]] → [[green:피치(pitch)]] → [[blue:롤(roll)]] 순서로 돌리는 짐벌입니다. ==피치를 90°로 올려 보세요==. 파란 고리가 빨간 고리와 겹치면서, 요와 롤이 같은 방향으로만 돌게 됩니다. 한 축을 잃은 것입니다.",
      { fig: {
        aspect: 0.6, view: { x0: -4, x1: 4, y0: -2.4, y1: 2.4 },
        eq: ["R = R_y(yaw)·R_x(pitch)·R_z(roll)", "{msg}"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.7, pitch: 0.35, dist: 8, fov: 38, scale: 1.25 });
          cam.orbit();
          let y = 30, p = 20, r = 0;
          C.slider({ label: "$yaw$", min: -180, max: 180, step: 1, value: y, fmt: x => x + "°", onInput: x => { y = x; } });
          C.slider({ label: "$pitch$", min: -90, max: 90, step: 1, value: p, fmt: x => x + "°", onInput: x => { p = x; } });
          C.slider({ label: "$roll$", min: -180, max: 180, step: 1, value: r, fmt: x => x + "°", onInput: x => { r = x; } });
          F.draw = g => {
            const Y = y * DEG, P = p * DEG, Rr = r * DEG;
            cam.floor(3);
            const lock = Math.abs(Math.abs(p) - 90) < 4;
            ring(cam, q => rotY([q[0] * 1.9, 0, q[1] * 1.9], Y), "red", 4, 0.9);                         // 요: 수평 고리
            ring(cam, q => rotY(rotX([0, q[0] * 1.6, q[1] * 1.6], P), Y), "green", 4, 0.9);              // 피치
            ring(cam, q => euler([q[0] * 1.35, q[1] * 1.35, 0], Y, P, Rr), lock ? "orange" : "blue", 4, 0.9); // 롤
            plane(cam, v => euler(v, Y, P, Rr));
            cam.arrow([0, 0, 0], [0, 2.4, 0], "red", { w: 2, alpha: 0.6 });
            cam.arrow([0, 0, 0], euler([0, 0, 2.2], Y, P, 0), "blue", { w: 2, alpha: 0.6 });
            g.textS("빈 곳을 끌어 시점 돌리기", F.w - 10, F.h - 10, "rgba(236,239,244,0.45)", { align: "right", base: "bottom", size: 12, halo: false });
            L.set("msg", lock ? "짐벌락: 롤 축이 요 축과 겹쳐 자유도가 하나 사라졌습니다" : "세 고리가 서로 다른 축을 돕니다");
          };
        }
      } },
      { key: "오일러 각은 직관적이지만 ==두 축이 겹치는 자세(짐벌락)==가 반드시 생기고, 각도끼리 보간하면 이상한 길로 돕니다. 그래서 엔진 내부는 회전을 **쿼터니언**으로 저장합니다." },

      { h: "축 하나와 각도 하나" },
      "사실 어떤 3D 회전이든 ==축 $n$ 하나를 중심으로 각도 $θ$만큼 도는 것==으로 표현할 수 있습니다. 쿼터니언은 이 축과 각을 숫자 네 개에 담은 것입니다. 축을 바꾸고 재생해 보세요. 노란 $v$가 축을 중심으로 원뿔을 그립니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["q = (cos(θ/2), sin(θ/2)·n) = ({w}, {qx}, {qy}, {qz})"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.6, pitch: 0.3, dist: 8, fov: 38, scale: 1.2 });
          cam.orbit();
          let az = 40, el = 55, th = 1.2;
          const v = [1.5, 0.2, 0.4];
          C.slider({ label: "축 방위", min: -180, max: 180, step: 1, value: az, fmt: x => x + "°", onInput: x => { az = x; } });
          C.slider({ label: "축 높이", min: -90, max: 90, step: 1, value: el, fmt: x => x + "°", onInput: x => { el = x; } });
          const ts = C.slider({ label: "$θ$", min: 0, max: 6.28, value: th, fmt: x => num(x / DEG, 0) + "°", onInput: x => { th = x; } });
          C.play();
          F.loop(dt => { th = (th + dt) % TAU; ts.set(th); });
          F.draw = g => {
            cam.floor(3);
            const n = [Math.cos(el * DEG) * Math.cos(az * DEG), Math.sin(el * DEG), Math.cos(el * DEG) * Math.sin(az * DEG)];
            const q = qAxis(n, th);
            const along = V3.mul(n, V3.dot(n, v));
            const pts = [];
            for (let i = 0; i <= 48; i++) pts.push(qRot(qAxis(n, i / 48 * TAU), v));
            for (let i = 0; i < 48; i++) cam.line(pts[i], pts[i + 1], "yellow", { w: 1.5, alpha: 0.35, dash: [3, 4] });
            const arc = [];
            for (let i = 0; i <= 24; i++) arc.push(qRot(qAxis(n, th * i / 24), v));
            for (let i = 0; i < 24; i++) cam.line(arc[i], arc[i + 1], "blue", { w: 3 });
            cam.line(V3.mul(n, -2.6), V3.mul(n, 2.6), "teal", { w: 1.5, dash: [6, 5], alpha: 0.7 });
            cam.arrow([0, 0, 0], V3.mul(n, 2.2), "teal", { w: 3.5, label: "n" });
            cam.line(along, qRot(q, v), "grey", { w: 1, alpha: 0.6 });
            cam.arrow([0, 0, 0], v, "yellow", { w: 2.5, alpha: 0.45, label: "v" });
            cam.arrow([0, 0, 0], qRot(q, v), "orange", { w: 3.5, label: "v'" });
            L.set("w", f2(q[0])); L.set("qx", f2(q[1])); L.set("qy", f2(q[2])); L.set("qz", f2(q[3]));
          };
        }
      } },
      "식에 ==각도의 절반 $θ/2$==가 들어가는 것이 특이한 점입니다. 덕분에 $q$와 $−q$는 같은 회전을 나타내고, 회전을 곱셈 한 번($q_2·q_1$)으로 합칠 수 있습니다.",

      { h: "보간: 오일러 각 vs slerp" },
      "두 자세 사이를 부드럽게 돌리고 싶습니다. 주황 점은 ==오일러 각 숫자를 그냥 섞은 경로==, 청록 점은 쿼터니언을 **slerp**한 경로입니다. 구 위에서 청록은 언제나 가장 짧은 대원(大圓)을 따라갑니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["slerp(q_A, q_B, t) — 일정한 속도로 가장 짧은 길", "t = {t}"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.9, pitch: 0.45, dist: 7, fov: 38, scale: 1.25 });
          cam.orbit();
          let t = 0.4, by = 160, bp = 60;
          const A = [10, -20, 0];
          const ts = C.slider({ label: "$t$", min: 0, max: 1, value: t, onInput: x => { t = x; } });
          C.slider({ label: "B의 요", min: -180, max: 180, step: 1, value: by, fmt: x => x + "°", onInput: x => { by = x; } });
          C.slider({ label: "B의 피치", min: -85, max: 85, step: 1, value: bp, fmt: x => x + "°", onInput: x => { bp = x; } });
          C.play(true);
          F.loop((dt, tt) => { t = 0.5 - 0.5 * Math.cos(tt * 1.2); ts.set(t); });
          F.draw = g => {
            const R = 1.6;
            for (let i = -2; i <= 2; i++) {
              const pts = [], pts2 = [];
              for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU, e = i * 0.5; pts.push([R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a)]); pts2.push(rotY([R * Math.cos(a), R * Math.sin(a), 0], i * Math.PI / 5)); }
              for (let k = 0; k < 40; k++) { cam.line(pts[k], pts[k + 1], "grey", { w: 1, alpha: 0.18 }); cam.line(pts2[k], pts2[k + 1], "grey", { w: 1, alpha: 0.18 }); }
            }
            const B = [by, bp, 0];
            const nose = [0, 0, R];
            const eu = s => euler(nose, lerp(A[0], B[0], s) * DEG, lerp(A[1], B[1], s) * DEG, 0);
            const qa = qEuler(A[0] * DEG, A[1] * DEG, 0), qb = qEuler(B[0] * DEG, B[1] * DEG, 0);
            const sl = s => qRot(slerp(qa, qb, s), nose);
            for (let k = 0; k < 40; k++) {
              cam.line(eu(k / 40), eu((k + 1) / 40), "orange", { w: 2.5, alpha: 0.75 });
              cam.line(sl(k / 40), sl((k + 1) / 40), "teal", { w: 2.5, alpha: 0.9 });
            }
            cam.dot(eu(0), "white", 6); cam.dot(eu(1), "white", 6);
            cam.tex("A", eu(0), "white", { dx: -12, dy: -12 }); cam.tex("B", eu(1), "white", { dx: 12, dy: -12 });
            cam.dot(eu(t), "orange", 7); cam.dot(sl(t), "teal", 7);
            cam.arrow([0, 0, 0], sl(t), "teal", { w: 2, alpha: 0.6 });
            L.set("t", f2(t));
          };
        }
      } },
      "주황 점은 길을 돌아가고 속도도 들쭉날쭉합니다. ==캐릭터 회전 블렌딩, 카메라 보간, 애니메이션 키 사이==는 거의 모두 slerp(또는 정규화한 lerp)로 처리합니다.",
      { ponder: "쿼터니언 $q$와 $−q$가 같은 회전이라면, slerp할 때 무엇을 조심해야 할까요?",
        answer: "두 쿼터니언의 내적이 음수면 ==먼 길(360°에 가까운 쪽)로 돕니다==. 그래서 slerp 전에 내적을 보고 음수면 한쪽 부호를 뒤집어 짧은 길을 고릅니다. 위 코드도 그렇게 합니다." },

      { use: [
        ["엔진", "FRotator와 FQuat", "에디터에는 읽기 쉬운 오일러 각(FRotator)을 보여 주고, 내부 계산과 보간은 ==쿼터니언(FQuat)==으로 합니다."],
        ["게임", "카메라·조준 보간", "카메라가 부드럽게 따라오는 것, 조준 보간, 비행·우주 게임의 자유 회전이 모두 쿼터니언과 slerp입니다."],
        ["애니메이션", "본 회전 저장", "스켈레탈 애니메이션 키는 본마다 쿼터니언을 저장하고 프레임 사이를 slerp합니다."],
        ["실생활", "스마트폰과 드론", "휴대폰 자이로 센서와 드론 비행 제어기도 자세를 쿼터니언으로 계산해 짐벌락을 피합니다."]
      ] },

      { recap: [
        ["R = R_y·R_x·R_z", "오일러 각: 순서가 있고, 두 축이 겹치면 짐벌락"],
        ["q = (cos(θ/2), sin(θ/2)·n)", "쿼터니언: 축과 각을 숫자 넷에"],
        ["q_2·q_1", "회전 합치기 = 곱셈 (오른쪽부터)"],
        ["slerp(q_A, q_B, t)", "가장 짧은 길, 일정한 속도"]
      ] }
    ]
  });
})();
