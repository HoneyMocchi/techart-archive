/* 07 메시와 정점 데이터 */
(() => {
  const f0 = n => num(n, 0);
  const edge = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

  lesson({
    topic: "mesh", title: "메시와 정점 데이터", desc: "점 목록 + 번호 목록", stage: "3D에서 화면으로",
    sym: { N: "yellow", L: "gold", n: "teal" },
    hook: "GPU가 받는 3D 모델은 ==정점 목록과, 정점 번호 셋씩 묶은 삼각형 목록==이 전부입니다. 노멀 하나를 어떻게 저장하느냐에 따라 같은 모양이 각지게도 매끈하게도 보입니다.",
    blocks: [
      { h: "정점 버퍼와 인덱스 버퍼" },
      "격자 메시입니다. 삼각형을 눌러 보세요. ==삼각형은 좌표를 직접 갖지 않고 정점 번호 세 개만== 갖습니다. 이웃한 삼각형이 정점을 함께 쓰므로 메모리가 크게 줄어듭니다.",
      { fig: {
        aspect: 0.56, view: { x0: -4, x1: 4, y0: -2.24, y1: 2.24 },
        eq: ["인덱스 사용: 정점 {v}개 × 32 B + 번호 {i}개 × 2 B = {a} B", "중복 저장: 삼각형 {t}개 × 3 × 32 B = {b} B   ({ratio}배)", "{sel}"],
        setup(F, C, L) {
          let n = 3, sel = 4;
          C.slider({ label: "격자 칸 수", min: 1, max: 10, step: 1, value: n, fmt: x => x + " × " + x, onInput: x => { n = x; sel = Math.min(sel, 2 * n * n - 1); } });
          const size = 3.6, x0 = -3.6, y0 = -1.8;
          const vid = (i, j) => j * (n + 1) + i;
          const pos = (i, j) => [x0 + i * size / n, y0 + j * size / n];
          const tris = () => {
            const T = [];
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
              T.push([vid(i, j), vid(i + 1, j), vid(i + 1, j + 1)], [vid(i, j), vid(i + 1, j + 1), vid(i, j + 1)]);
            }
            return T;
          };
          const P = k => pos(k % (n + 1), Math.floor(k / (n + 1)));
          F.onTap = (p, sx, sy, moving) => {
            if (moving) return;
            tris().forEach((t, k) => { const a = P(t[0]), b = P(t[1]), c = P(t[2]); if (edge(a, b, p) >= 0 && edge(b, c, p) >= 0 && edge(c, a, p) >= 0) sel = k; });
          };
          F.draw = g => {
            const T = tris();
            T.forEach((t, k) => g.poly(t.map(P), { fill: k === sel ? hexA(PAL.yellow, 0.35) : "rgba(88,196,221,0.07)", stroke: "rgba(88,196,221,0.55)", w: 1.2 }));
            const st = T[sel];
            for (let k = 0; k < (n + 1) * (n + 1); k++) {
              const on = st && st.includes(k);
              g.dot(P(k), on ? "yellow" : "white", on ? 5.5 : 3.5);
              if (n <= 5) g.text(String(k), P(k), on ? "yellow" : "grey", { dx: 9, dy: -9, size: 11, bold: on });
            }
            // 오른쪽: 실제 버퍼 모습
            const bx = 0.9;
            g.text("정점 버퍼", [bx, 1.95], "white", { align: "left", size: 12, bold: true });
            const nv = (n + 1) * (n + 1);
            for (let k = 0; k < Math.min(nv, 12); k++) {
              const on = st && st.includes(k), p = P(k);
              g.text(`${k}: (${num(p[0], 1)}, ${num(p[1], 1)}, 0)`, [bx, 1.6 - k * 0.27], on ? "yellow" : "grey", { align: "left", size: 11, bold: on });
            }
            if (nv > 12) g.text(`… ${nv}개`, [bx, 1.6 - 12 * 0.27], "grey", { align: "left", size: 11 });
            g.text("인덱스 버퍼", [2.75, 1.95], "white", { align: "left", size: 12, bold: true });
            for (let k = 0; k < Math.min(T.length, 12); k++) g.text(T[k].join(", "), [2.75, 1.6 - k * 0.27], k === sel ? "yellow" : "grey", { align: "left", size: 11, bold: k === sel });
            if (T.length > 12) g.text(`… ${T.length}개`, [2.75, 1.6 - 12 * 0.27], "grey", { align: "left", size: 11 });
            const a = nv * 32 + T.length * 3 * 2, b = T.length * 3 * 32;
            L.set("v", nv); L.set("i", T.length * 3); L.set("a", a.toLocaleString()); L.set("t", T.length); L.set("b", b.toLocaleString()); L.set("ratio", num(b / a, 1));
            L.set("sel", st ? `선택한 삼각형 = 정점 ${st.join(", ")} 번 (반시계 순서)` : "");
          };
        }
      } },
      { key: "정점 하나에는 위치만이 아니라 ==노멀·UV·탄젠트·색==이 함께 들어갑니다(보통 32~64바이트). 인덱스는 번호 하나에 2~4바이트라, 정점을 함께 쓸수록 이득입니다. 3장의 감김 순서도 이 번호 순서로 정해집니다." },

      { h: "플랫 노멀 vs 스무스 노멀" },
      "원을 다각형으로 근사한 단면입니다. ==면마다 노멀 하나==(플랫)를 쓰면 각이 보이고, ==정점마다 이웃 면 노멀의 평균==(스무스)을 쓰고 그 사이를 보간하면, 같은 다각형이 둥글게 보입니다. 해를 끌고 변 개수를 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let sides = 8, smooth = false;
          const sun = [-2.6, 1.5];
          F.vec(sun, "gold", { snap: 0.01 });
          C.slider({ label: "변 개수", min: 3, max: 32, step: 1, value: sides, fmt: f0, onInput: x => { sides = x; } });
          C.seg({ options: [{ value: 0, label: "플랫 (면마다 하나)" }, { value: 1, label: "스무스 (정점마다 평균)" }], value: 0, onChange: x => { smooth = !!x; } });
          F.draw = g => {
            const R = 1.55, ctr = [0.4, 0];
            const Ld = V.norm(V.sub(sun, ctr));
            const vert = k => { const a = k / sides * TAU + 0.2; return V.add(ctr, [Math.cos(a) * R, Math.sin(a) * R]); };
            const vn = k => { const a = k / sides * TAU + 0.2; return [Math.cos(a), Math.sin(a)]; };
            g.circle(ctr, R, "grey", { w: 1, alpha: 0.25, dash: [4, 5] });
            for (let k = 0; k < sides; k++) {
              const a = vert(k), b = vert(k + 1);
              const fn = V.norm(V.perp(V.sub(b, a))).map(x => -x);
              const steps = 18;
              for (let s = 0; s < steps; s++) {
                const t0 = s / steps, t1 = (s + 1) / steps;
                const N = smooth ? V.norm(V.lerp(vn(k), vn(k + 1), (t0 + t1) / 2)) : fn;
                const lum = Math.max(0, V.dot(N, Ld));
                const c = Math.round(30 + 225 * lum);
                g.line(V.lerp(a, b, t0), V.lerp(a, b, t1), `rgb(${c},${Math.round(c * 0.85)},${Math.round(c * 0.55)})`, { w: 14 });
              }
              if (!smooth) g.arrow(V.lerp(a, b, 0.5), V.add(V.lerp(a, b, 0.5), V.mul(fn, 0.55)), "yellow", { w: 2, head: 8 });
            }
            if (smooth) for (let k = 0; k < sides; k++) g.arrow(vert(k), V.add(vert(k), V.mul(vn(k), 0.55)), "teal", { w: 2, head: 8 });
            for (let k = 0; k < sides; k++) g.dot(vert(k), "white", 3);
            g.circle(sun, 0.16, "gold", { fill: "gold", w: 0 });
            L.set("eq", smooth ? "정점 노멀 = 이웃 면 노멀의 평균 → 면 위에서 보간 → 둥글게 보임" : "면 노멀 하나로 면 전체를 칠함 → 면마다 밝기가 뚝뚝 끊김");
          };
        }
      } },
      "변이 8개뿐이어도 스무스로 바꾸면 거의 원처럼 보입니다. ==모양(실루엣)은 그대로인데 음영만 둥글어지는 것==이 핵심입니다. 그래서 저폴리 모델도 노멀만 잘 주면 매끈하게 보입니다(노멀 맵은 이것을 픽셀 단위로 한 것입니다).",

      { h: "각진 모서리 = 정점 나누기" },
      "그런데 상자처럼 ==모서리가 날카로워야 하는 곳==은 어떻게 할까요? 한 위치에 노멀이 여러 개 필요하므로 정점을 복사해 나눕니다. 시점을 돌리며 모서리 한 곳의 노멀을 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -4, x1: 4, y0: -2, y1: 2 },
        eq: ["정점 수 = {nv}개   (위치는 8개)", "{why}"],
        setup(F, C, L) {
          const cam = makeCam(F, { yaw: 0.65, pitch: 0.45, dist: 8, fov: 36, scale: 1.2 });
          cam.orbit();
          let hard = true;
          C.seg({ options: [{ value: 1, label: "하드 엣지 (면마다 정점)" }, { value: 0, label: "스무스 (위치마다 정점)" }], value: 1, onChange: x => { hard = !!x; } });
          const Lv = V3.norm([0.5, 0.8, 0.35]);
          const faces = [
            { n: [1, 0, 0], v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] }, { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
            { n: [0, 1, 0], v: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] }, { n: [0, -1, 0], v: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
            { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] }, { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] }
          ];
          F.draw = g => {
            const b = cam.basis();
            const vis = faces.map(f => ({ f, d: V3.dot(V3.sub(V3.mul(f.n, 1), b.pos), f.n) })).filter(o => o.d < 0);
            vis.forEach(({ f }) => {
              const k = hard ? Math.max(0, V3.dot(f.n, Lv)) : 0.55 + 0.25 * V3.dot(f.n, Lv);
              const c = Math.round(40 + 190 * k);
              cam.poly(f.v, { fill: `rgb(${Math.round(c * 0.55)},${Math.round(c * 0.8)},${c})`, stroke: "rgba(236,239,244,0.5)", w: 1.2 });
            });
            const corner = [1, 1, 1];
            if (hard) {
              [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((n, i) => cam.arrow(corner, V3.add(corner, V3.mul(n, 1.1)), ["green", "red", "blue"][i], { w: 3 }));
              cam.tex("정점 3개", corner, "white", { dx: 20, dy: 18, italic: false, size: 13 });
            } else {
              cam.arrow(corner, V3.add(corner, V3.mul(V3.norm([1, 1, 1]), 1.2)), "teal", { w: 3.5 });
              cam.tex("정점 1개", corner, "white", { dx: 20, dy: 18, italic: false, size: 13 });
            }
            cam.dot(corner, "yellow", 6);
            L.set("nv", hard ? 24 : 8);
            L.set("why", hard ? "모서리마다 면 3개 → 같은 위치에 노멀 3개 → 정점 3개로 나눔 (6면 × 4)" : "위치마다 평균 노멀 하나 → 모서리가 뭉개져 둥글게 칠해짐");
          };
        }
      } },
      "같은 이유로 ==UV 이음매(텍스처가 끊기는 곳)에서도 정점이 나뉩니다==. 모델링 툴의 정점 수와 엔진이 보고하는 정점 수가 다른 것은 대부분 이 하드 엣지와 UV 이음매 때문입니다.",

      { use: [
        ["엔진", "정점 수가 늘어나는 이유", "엔진 통계의 정점 수가 모델링 툴보다 많다면 ==하드 엣지·UV 이음매·머티리얼 경계==에서 정점이 나뉜 것입니다."],
        ["아트", "스무딩 그룹", "3ds Max·Maya·Blender의 스무딩 그룹/하드 엣지 설정이 곧 정점 노멀을 평균할지 나눌지의 선택입니다."],
        ["게임", "저폴리 + 노멀 맵", "하이폴리의 굴곡을 노멀 맵으로 구워(베이킹) 저폴리에 입히는 것이 게임 에셋의 표준 흐름입니다."],
        ["엔진", "나나이트", "UE5 나나이트는 수백만 삼각형을 클러스터로 묶어 압축 저장하고, 화면에 필요한 만큼만 골라 그립니다."]
      ] },

      { recap: [
        ["정점 버퍼 + 인덱스 버퍼", "위치·노멀·UV 목록 + 번호 셋씩 묶은 삼각형"],
        ["면 노멀 = normalize((B − A) × (C − A))", "플랫: 각진 음영"],
        ["정점 노멀 = 이웃 면 노멀 평균", "스무스: 실루엣은 그대로, 음영만 둥글게"],
        ["하드 엣지 · UV 이음매", "같은 위치라도 정점을 나눠야 함"]
      ] }
    ]
  });
})();
