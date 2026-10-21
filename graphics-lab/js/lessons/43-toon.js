/* 43 툰 셰이딩과 외곽선 */
(() => {
  const f2 = n => num(n, 2);
  const srgb = v => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
  const lin = c => Math.pow(c / 255, 2.2);

  lesson({
    topic: "toon", title: "툰 셰이딩과 외곽선", desc: "램프·림·외곽선", stage: "테크아트 실전",
    sym: { N: "yellow", L: "gold", V: "teal" },
    hook: "셀 애니메이션 느낌은 ==연속적인 명암을 몇 단계 색으로 끊고(램프), 윤곽선을 그리는== 두 가지로 만들어집니다. 둘 다 '아티스트가 정한 색'이 물리보다 우선한다는 점이 PBR과 다릅니다. 이 프로젝트의 ToonLit 셰이딩 모델이 이 장의 실전판입니다.",
    blocks: [
      { h: "램프 셰이딩: N·L을 색표로 바꾸기" },
      "아래 색 띠가 램프 텍스처입니다. $N·L$(왼쪽 −1 … 오른쪽 1)을 가로 좌표로 써서 색을 읽습니다. ==경계 점(노란 핸들)을 끌어== 그림자 범위와 경계 부드러움을 바꿔 보세요. 그림자 색을 검정이 아닌 색조로 고르는 것이 툰 셰이딩의 핵심입니다.",
      { fig: {
        aspect: 0.56, view: { x0: -2, x1: 2, y0: -1.12, y1: 1.12 },
        eq: ["색 = 램프(N·L · 0.5 + 0.5) · 기본색   ·   경계 {a}, {b}"],
        setup(F, C, L) {
          let e1 = -0.05, e2 = 0.45, soft = 0.02, shadeHue = "purple";
          const sun = [-0.9, 0.6];
          F.vec(sun, "gold", { snap: 0.01 });
          F.handle({ color: "yellow", get: () => [-1.8 + (e1 + 1) / 2 * 3.6, -0.98], set: x => { e1 = clamp((x + 1.8) / 3.6 * 2 - 1, -1, e2 - 0.05); } });
          F.handle({ color: "yellow", get: () => [-1.8 + (e2 + 1) / 2 * 3.6, -0.98], set: x => { e2 = clamp((x + 1.8) / 3.6 * 2 - 1, e1 + 0.05, 1); } });
          C.slider({ label: "경계 부드러움", min: 0.002, max: 0.2, value: soft, onInput: x => { soft = x; } });
          C.seg({ options: [{ value: "purple", label: "보라 그림자" }, { value: "teal", label: "청록 그림자" }, { value: "black", label: "검정 (비추천)" }], value: shadeHue, onChange: x => { shadeHue = x; } });
          const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
          const ramp = k => {
            const sh = shadeHue === "black" ? [0.04, 0.04, 0.05] : shadeHue === "purple" ? [0.35, 0.22, 0.45] : [0.18, 0.38, 0.42];
            const mid = [0.75, 0.6, 0.6], lit = [1, 0.93, 0.85];
            const t1 = ss(e1 - soft, e1 + soft, k), t2 = ss(e2 - soft, e2 + soft, k);
            return sh.map((c, i) => lerp(lerp(c, mid[i], t1), lit[i], t2));
          };
          F.draw = g => {
            const c = [0, 0.12], R = 0.85, base = [lin(250), lin(200), lin(180)];
            const Ld = (() => { const d = [(sun[0] - c[0]) / R, (sun[1] - c[1]) / R], r = Math.min(V.len(d), 1.9), az = Math.atan2(d[1], d[0]), a = r * Math.PI / 2; return [Math.sin(a) * Math.cos(az), Math.sin(a) * Math.sin(az), Math.cos(a)]; })();
            g.field(Math.round(R * 120), (x, y) => {
              const nx = (x - c[0]) / R, ny = (y - c[1]) / R, r2 = nx * nx + ny * ny;
              if (r2 > 1) return null;
              const n = [nx, ny, Math.sqrt(1 - r2)], k = V3.dot(n, Ld), rc = ramp(k);
              return base.map((b, i) => srgb(b * rc[i] * 1.1)).concat(255 * clamp((1 - r2) * 40, 0, 1));
            }, { rect: { x0: c[0] - R, x1: c[0] + R, y0: c[1] - R, y1: c[1] + R } });
            g.field(200, (x, y) => { const k = (x + 1.8) / 3.6 * 2 - 1, rc = ramp(k); return rc.map(v => srgb(v)).concat(255); }, { rect: { x0: -1.8, x1: 1.8, y0: -1.08, y1: -0.9 }, smooth: false });
            g.text("램프: N·L = −1", [-1.8, -0.88], "grey", { size: 10, align: "left", dy: -6 }); g.text("1", [1.8, -0.88], "grey", { size: 10, align: "right", dy: -6 });
            g.circle(sun, 0.07, "gold", { fill: "gold", w: 0 });
            L.set("a", f2(e1)); L.set("b", f2(e2));
          };
        }
      } },

      { h: "외곽선 ①: 뒤집힌 껍데기(인버티드 헐)" },
      "모델을 ==노멀 방향으로 조금 부풀린 복사본을 뒷면만 검게== 그리면, 원래 모델 뒤로 테두리만 삐져나옵니다. 가장 오래되고 싼 방법입니다. 각진 모서리에서 면 노멀로 부풀리면 ==틈이 벌어지는== 것을 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["껍데기 정점 = 위치 + 노멀 · 두께 ({w})"],
        setup(F, C, L) {
          let w = 0.08, smooth = true;
          C.slider({ label: "두께", min: 0, max: 0.25, value: w, onInput: x => { w = x; } });
          C.seg({ options: [{ value: 1, label: "부드러운 노멀로 부풀림" }, { value: 0, label: "면 노멀로 부풀림" }], value: 1, onChange: x => { smooth = !!x; } });
          const shape = [[-1.2, -0.6], [-0.2, -0.7], [0.3, -0.2], [1.2, -0.5], [1.3, 0.4], [0.2, 0.7], [-0.6, 0.4], [-1.3, 0.3]];
          F.draw = g => {
            const n = shape.length, out = [];
            for (let i = 0; i < n; i++) {
              const a = shape[(i + n - 1) % n], p = shape[i], b = shape[(i + 1) % n];
              const n1 = V.norm([p[1] - a[1], a[0] - p[0]]).map(v => -v), n2 = V.norm([b[1] - p[1], p[0] - b[0]]).map(v => -v);
              if (smooth) out.push([V.add(p, V.mul(V.norm(V.add(n1, n2)), w))]);
              else out.push([V.add(p, V.mul(n1, w)), V.add(p, V.mul(n2, w))]);
            }
            if (smooth) g.poly(out.map(o => o[0]), { fill: "#05060a", stroke: "#05060a", w: 1 });
            else for (let i = 0; i < n; i++) { const p = shape[i], q = shape[(i + 1) % n]; g.poly([out[i][1], out[(i + 1) % n][0], q, p], { fill: "#05060a" }); }
            g.poly([[-2, -1], [2, -1], [2, 1], [-2, 1]], { fill: "rgba(200,215,230,0.0)" });
            g.poly(shape, { fill: "rgba(240,200,170,1)" });
            if (!smooth && w > 0.02) shape.forEach((p, i) => g.circle(p, 0.05, "red", { w: 1.5 }));
            L.set("w", f2(w));
          };
        }
      } },
      "실무에서는 하드 엣지가 있는 모델도 ==외곽선용 부드러운 노멀을 따로 구워 버텍스 컬러나 UV 채널에 저장==하고 그 방향으로 부풀립니다. 카메라 거리에 따라 두께를 보정해 멀리서도 일정하게 보이게 합니다.",

      { h: "외곽선 ②: 화면에서 깊이·노멀 경계 찾기" },
      "후처리로 G버퍼(33장)의 ==깊이와 노멀이 이웃 픽셀과 크게 다른 곳==을 찾아 선을 긋습니다(소벨 필터, 27장). 물체 안쪽의 접힌 선까지 잡을 수 있습니다. 문턱값을 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["선 = (|깊이 차| > {dt}) 또는 (1 − N·N_이웃 > {nt})"],
        setup(F, C, L) {
          let dt = 0.08, nt = 0.25, view = 0;
          C.slider({ label: "깊이 문턱", min: 0.01, max: 0.5, value: dt, onInput: x => { dt = x; } });
          C.slider({ label: "노멀 문턱", min: 0.02, max: 1, value: nt, onInput: x => { nt = x; } });
          C.seg({ options: [{ value: 0, label: "결과" }, { value: 1, label: "선만" }], value: 0, onChange: x => { view = x; } });
          const ro = [0, 0.3, 0];
          const hit = rd => {
            let best = { t: 20, n: [0, 1, 0], id: 0 };
            [[[-0.7, -0.1, 3.2], 0.55, 1], [[0.55, -0.25, 2.8], 0.4, 2]].forEach(([c, r, id]) => { const oc = V3.sub(ro, c), b = V3.dot(oc, rd), cc = V3.dot(oc, oc) - r * r, d = b * b - cc; if (d > 0) { const t = -b - Math.sqrt(d); if (t > 0 && t < best.t) best = { t, n: V3.norm(V3.sub(V3.add(ro, V3.mul(rd, t)), c)), id }; } });
            const bx = [[0.2, -0.65, 3.4], [1.2, 0.15, 4.2]]; let t0 = -1e9, t1 = 1e9, ax = 0;
            for (let k = 0; k < 3; k++) { let a = (bx[0][k] - ro[k]) / rd[k], d = (bx[1][k] - ro[k]) / rd[k]; if (a > d) [a, d] = [d, a]; if (a > t0) { t0 = a; ax = k; } t1 = Math.min(t1, d); }
            if (t0 < t1 && t0 > 0 && t0 < best.t) { const n = [0, 0, 0]; n[ax] = -Math.sign(rd[ax]); best = { t: t0, n, id: 3 }; }
            if (rd[1] < 0) { const t = (-0.65 - ro[1]) / rd[1]; if (t < best.t) best = { t, n: [0, 1, 0], id: 4 }; }
            return best;
          };
          F.draw = g => {
            const px = 4 / 200, Ld = V3.norm([0.5, 0.8, -0.4]);
            const at = (x, y) => hit(V3.norm([x * 0.5, y * 0.5 - 0.15, 1]));
            g.field(200, (x, y) => {
              const h = at(x, y), hr = at(x + px, y), hu = at(x, y + px);
              const dd = Math.max(Math.abs(h.t - hr.t), Math.abs(h.t - hu.t)) / h.t;
              const nd = Math.max(1 - V3.dot(h.n, hr.n), 1 - V3.dot(h.n, hu.n));
              const line = dd > dt || nd > nt;
              if (view === 1) return line ? [20, 20, 25, 255] : [235, 235, 230, 255];
              if (line) return [25, 20, 30, 255];
              const base = [[0, 0, 0], [0.95, 0.55, 0.45], [0.45, 0.75, 0.95], [0.95, 0.85, 0.45], [0.75, 0.8, 0.7]][h.id] || [0.5, 0.6, 0.8];
              const k = V3.dot(h.n, Ld) > 0.25 ? 1 : 0.62;
              return h.t >= 20 ? [200, 220, 235, 255] : base.map(c => srgb(c * k * 0.9)).concat(255);
            });
            L.set("dt", f2(dt)); L.set("nt", f2(nt));
          };
        }
      } },

      { use: [
        ["프로젝트", "ToonLit 셰이딩 모델", "이 저장소의 커스텀 엔진 ToonLit은 $N·L$을 툰 프로필 램프 아틀라스로 바꾸고, 그림자도 램프 안에 접어 '작가가 정한 어두운 색'이 나오게 합니다."],
        ["게임", "애니메이션 풍 게임", "원신·길티기어·젤다는 램프 + 얼굴 그림자 텍스처 + 인버티드 헐 외곽선 조합을 쓰고, 노멀을 손으로 고쳐 얼굴 음영을 다듬습니다."],
        ["TA", "외곽선 노멀 굽기", "하드 엣지 모델에 외곽선용 스무스 노멀을 구워 넣는 DCC 스크립트는 툰 프로젝트 TA의 단골 작업입니다."],
        ["엔진", "포스트 프로세스 외곽선", "UE에서는 Custom Depth·Stencil로 대상만 골라 후처리 머티리얼에서 소벨 외곽선을 그립니다. 하이라이트 표시에도 같은 방법을 씁니다."]
      ] },

      { recap: [
        ["램프(N·L · 0.5 + 0.5)", "명암을 단계 색으로, 그림자는 색조로"],
        ["위치 + 노멀 · 두께, 뒷면만", "인버티드 헐 외곽선 (스무스 노멀 필요)"],
        ["깊이·노멀 차이 > 문턱", "후처리 외곽선"],
        ["작가가 정한 색 > 물리", "툰과 PBR의 차이"]
      ] }
    ]
  });
})();
