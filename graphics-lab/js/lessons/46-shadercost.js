/* 46 셰이더 비용 · 퍼뮤테이션 · 오버드로 */
(() => {
  const f0 = n => num(n, 0);

  lesson({
    topic: "shadercost", title: "셰이더 비용과 오버드로", desc: "무엇이 프레임을 먹는가", stage: "테크아트 실전",
    sym: { n: "orange" },
    hook: "TA의 큰 역할 중 하나는 ==아름다움을 지키면서 프레임 예산 안에 넣는 것==입니다. 픽셀당 셰이더 비용 × 겹쳐 그린 횟수, 그리고 셰이더 변형(퍼뮤테이션) 수가 가장 흔한 범인입니다.",
    blocks: [
      { h: "셰이더 복잡도 뷰: 비용 × 겹침" },
      "불투명 바닥 위에 반투명 연기 판 여러 장을 겹쳤습니다(판을 끌어 보세요). 각 픽셀의 비용은 ==그 픽셀을 덮은 모든 머티리얼의 명령어 수 합==입니다. 초록 → 빨강 → 흰색 순으로 비쌉니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 8, y0: 0, y1: 4 },
        eq: ["픽셀 비용 = 불투명 {o} + Σ 반투명 판 {t} × 겹친 수   ·   가장 비싼 픽셀 {mx}"],
        setup(F, C, L) {
          let opaque = 120, trans = 90;
          const Q = [[2.2, 2.0], [3.0, 2.3], [3.6, 1.8], [5.6, 2.2], [4.4, 2.6]];
          Q.forEach(p => F.vec(p, "white", { snap: 0.02 }));
          C.slider({ label: "바닥 머티리얼 명령어", min: 40, max: 400, step: 10, value: opaque, fmt: f0, onInput: x => { opaque = x; } });
          C.slider({ label: "연기 머티리얼 명령어", min: 20, max: 300, step: 10, value: trans, fmt: f0, onInput: x => { trans = x; } });
          F.draw = g => {
            let mx = 0;
            g.field(200, (x, y) => {
              let c = opaque;
              Q.forEach(p => { if (Math.abs(x - p[0]) < 1.1 && Math.abs(y - p[1]) < 1.1) c += trans; });
              mx = Math.max(mx, c);
              const k = clamp(c / 900, 0, 1.2);
              const col = k < 0.5 ? [lerp(40, 240, k * 2), lerp(180, 200, k * 2), 60] : k < 1 ? [240, lerp(200, 40, (k - 0.5) * 2), lerp(60, 40, (k - 0.5) * 2)] : [255, lerp(40, 255, (k - 1) * 5), lerp(40, 255, (k - 1) * 5)];
              return [...col, 255];
            });
            Q.forEach(p => g.poly([[p[0] - 1.1, p[1] - 1.1], [p[0] + 1.1, p[1] - 1.1], [p[0] + 1.1, p[1] + 1.1], [p[0] - 1.1, p[1] + 1.1]], { stroke: "rgba(16,19,26,0.6)", w: 1 }));
            L.set("o", opaque); L.set("t", trans); L.set("mx", mx);
          };
        }
      } },
      { key: "같은 연기라도 ==겹쳐 놓은 곳이 열 배 비쌉니다==. 화면 가득 찬 반투명(가까이 다가간 연기, 비 효과)이 프레임 저하의 단골 원인입니다." },

      { h: "컷아웃: 투명한 테두리를 잘라 내기" },
      "파티클은 보통 사각형 판에 그립니다. 그런데 그림의 대부분이 투명하면 ==투명한 픽셀도 셰이더를 돌립니다==. 그림 모양을 따라 다각형으로 잘라 내면 그만큼 픽셀이 줄어듭니다. 꼭짓점 수를 바꿔 보세요.",
      { fig: {
        aspect: 0.5, view: { x0: -2, x1: 2, y0: -1, y1: 1 },
        eq: ["그리는 넓이: 사각형 100% → 컷아웃 {p}%   (그림이 차지하는 넓이 {s}%)"],
        setup(F, C, L) {
          let nv = 8;
          C.slider({ label: "컷아웃 꼭짓점 수", min: 3, max: 16, step: 1, value: nv, fmt: f0, onInput: x => { nv = x; } });
          const shapeR = a => 0.55 + 0.25 * Math.cos(a * 3) + 0.1 * Math.sin(a * 5);
          F.draw = g => {
            const c = [0, 0];
            g.poly([[-0.95, -0.95], [0.95, -0.95], [0.95, 0.95], [-0.95, 0.95]], { stroke: "orange", w: 1.5, dash: [5, 4], fill: "rgba(255,134,47,0.08)" });
            const sp = []; for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; sp.push([Math.cos(a) * shapeR(a), Math.sin(a) * shapeR(a)]); }
            g.poly(sp, { fill: "rgba(236,239,244,0.75)" });
            // 볼록 껍질에 가깝게: 바깥으로 살짝 부풀린 nv각형
            const hull = []; for (let i = 0; i < nv; i++) { const a = i / nv * TAU; let r = 0; for (let k = -6; k <= 6; k++) r = Math.max(r, shapeR(a + k / 6 * Math.PI / nv)); hull.push([Math.cos(a) * r / Math.cos(Math.PI / nv), Math.sin(a) * r / Math.cos(Math.PI / nv)]); }
            const hc = hull.map(p => [clamp(p[0], -0.95, 0.95), clamp(p[1], -0.95, 0.95)]);
            g.poly(hc, { stroke: "teal", w: 2, fill: "rgba(92,208,179,0.12)" });
            const area = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
            const quad = 1.9 * 1.9;
            L.set("p", f0(area(hc) / quad * 100)); L.set("s", f0(area(sp) / quad * 100));
            g.text("사각형 판", [-0.95, 0.95], "orange", { size: 11, align: "left", dy: -8 }); g.text("컷아웃", [1.2, 0], "teal", { size: 12, bold: true, align: "left" });
          };
        }
      } },
      "꼭짓점을 늘리면 픽셀은 줄지만 정점·삼각형이 늘어 8개 안팎이 보통의 균형점입니다. 반투명이 아니라 ==알파 테스트(구멍 뚫기)==를 쓰는 잎사귀도 같은 이유로 컷아웃을 씁니다.",

      { h: "퍼뮤테이션 폭발" },
      "머티리얼의 '정적 스위치'는 분기를 없애 주지만, ==스위치 하나마다 셰이더가 두 벌==로 컴파일됩니다. 여기에 품질 단계·플랫폼·정점 종류가 곱해집니다. 스위치를 켜 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2, stretch: true },
        eq: ["셰이더 수 = 2^{n} (스위치) × {q} (품질) × {p} (플랫폼) × {v} (정점 종류) = {total}"],
        setup(F, C, L) {
          let n = 4, q = 3, p = 2, v = 4;
          C.slider({ label: "정적 스위치 수", min: 0, max: 14, step: 1, value: n, fmt: f0, onInput: x => { n = x; } });
          C.slider({ label: "품질 단계", min: 1, max: 4, step: 1, value: q, fmt: f0, onInput: x => { q = x; } });
          C.slider({ label: "플랫폼", min: 1, max: 4, step: 1, value: p, fmt: f0, onInput: x => { p = x; } });
          C.slider({ label: "정점 종류(스태틱·스켈레탈·인스턴스…)", min: 1, max: 8, step: 1, value: v, fmt: f0, onInput: x => { v = x; } });
          F.draw = g => {
            const total = Math.pow(2, n) * q * p * v, sec = total * 0.4;
            const lw = clamp(Math.log10(total) / 7, 0, 1);
            g.poly([[0.5, 2.2], [9.5, 2.2], [9.5, 3.0], [0.5, 3.0]], { stroke: "rgba(236,239,244,0.25)", w: 1 });
            g.poly([[0.5, 2.2], [0.5 + 9 * lw, 2.2], [0.5 + 9 * lw, 3.0], [0.5, 3.0]], { fill: total > 1e5 ? PAL.red : total > 1e4 ? PAL.orange : PAL.green });
            ["1", "10", "100", "1천", "1만", "10만", "100만", "1000만"].forEach((t, i) => g.text(t, [0.5 + i / 7 * 9, 2.2], "grey", { size: 10, dy: 10 }));
            g.text(`컴파일 ≈ ${sec > 3600 ? num(sec / 3600, 1) + "시간" : sec > 60 ? num(sec / 60, 0) + "분" : num(sec, 0) + "초"} (셰이더당 0.4초 가정, 코어 1개)`, [5, 3.6], "white", { size: 13, bold: true });
            L.set("n", n); L.set("q", q); L.set("p", p); L.set("v", v); L.set("total", total.toLocaleString());
          };
        }
      } },
      { key: "TA는 ==마스터 머티리얼 수를 줄이고, 스위치 대신 파라미터(런타임 분기)를 쓸 곳을 가르고==, 쓰지 않는 사용처(Usage) 플래그를 꺼서 퍼뮤테이션을 관리합니다. 셰이더 캐시가 커지면 로딩 끊김(PSO 컴파일 히치)도 늘어납니다." },

      { use: [
        ["엔진", "뷰 모드", "UE의 Shader Complexity, Quad Overdraw, Shader Complexity & Quads 뷰 모드가 이 장의 히트맵입니다. 머티리얼 에디터의 Stats 창이 명령어 수를 보여 줍니다."],
        ["엔진", "파티클 컷아웃", "Niagara 스프라이트의 Cutout Texture 설정이 이 장의 컷아웃입니다. SubUV 프레임마다 자동으로 다각형을 만듭니다."],
        ["TA", "마스터 머티리얼 설계", "프로젝트 전체가 몇 개의 마스터 머티리얼과 인스턴스로 돌아가게 설계하면 퍼뮤테이션·메모리·유지보수가 모두 줄어듭니다."],
        ["최적화", "PSO 캐시", "PC·콘솔 첫 실행 끊김의 원인은 셰이더 변형을 그 자리에서 컴파일하는 것입니다. PSO 캐시 수집과 미리 컴파일로 줄입니다."]
      ] },

      { recap: [
        ["픽셀 비용 = Σ (덮은 머티리얼 명령어)", "셰이더 복잡도 = 비용 × 겹침"],
        ["컷아웃 다각형", "투명한 픽셀은 그리지 않기"],
        ["2^스위치 × 품질 × 플랫폼 × 정점 종류", "퍼뮤테이션 폭발"],
        ["마스터 머티리얼 + 인스턴스", "변형 수 관리"]
      ] }
    ]
  });
})();
