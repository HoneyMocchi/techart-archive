/* 30 TAA · 지터 · 디더링 */
(() => {
  const f2 = n => num(n, 2);
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

  lesson({
    topic: "taa", title: "TAA · 지터 · 디더링", desc: "시간과 노이즈로 해상도 벌기", stage: "화면 후처리",
    sym: { "α": "teal", t: "teal" },
    hook: "한 프레임에 픽셀당 샘플 하나밖에 못 쏜다면, ==프레임마다 샘플 위치를 조금씩 흔들고(지터) 지난 프레임들과 섞으면== 여러 샘플을 쏜 것과 비슷해집니다. 노이즈를 일부러 넣어 계단을 숨기는 디더링도 같은 생각입니다.",
    blocks: [
      { h: "지터 + 누적 = 시간으로 하는 안티에일리어싱" },
      "확대한 픽셀 격자 위의 삼각형 가장자리입니다. 매 프레임 샘플 점이 [[yellow:픽셀 안에서 다른 곳]]을 찍고, 결과를 ==이전 결과와 $α$ 비율로 섞습니다==. 재생하면 계단(왼쪽)이 점점 부드러운 가장자리(오른쪽)로 수렴합니다.",
      { fig: {
        aspect: 0.5, view: { x0: 0, x1: 16, y0: 0, y1: 8 },
        eq: ["히스토리 = lerp(히스토리, 이번 프레임, α),   α = {a}   (프레임 {f})"],
        setup(F, C, L) {
          let a = 0.1, frame = 0, hist = new Float32Array(16 * 8).fill(-1);
          C.play(true);
          C.slider({ label: "섞는 비율 $α$", min: 0.02, max: 1, value: a, onInput: x => { a = x; } });
          C.button("↺ 다시", () => { hist.fill(-1); frame = 0; });
          const inside = (x, y) => (y - 1.2) * 1.6 - (x - 0.5) * 0.55 < 0 && x * 0.3 + y < 9;
          let acc = 0;
          F.loop(dt => { acc += dt; if (acc > 0.12) { acc = 0; frame++; } });
          let last = -1;
          F.draw = g => {
            const jx = halton(frame % 16 + 1, 2), jy = halton(frame % 16 + 1, 3);
            if (frame !== last) {
              for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) {
                const v = inside(i + jx, j + jy) ? 1 : 0, k = j * 16 + i;
                hist[k] = hist[k] < 0 ? v : lerp(hist[k], v, a);
              }
              last = frame;
            }
            for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) {
              const cur = inside(i + jx, j + jy) ? 1 : 0, h = hist[j * 16 + i];
              const left = i < 8, v = left ? cur : h;
              g.poly([[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], { fill: `rgba(244,211,69,${v})`, stroke: "rgba(236,239,244,0.12)", w: 1 });
              g.dot([i + jx, j + jy], "rgba(255,255,255,0.7)", 2.2);
            }
            g.line([8, 0], [8, 8], "white", { w: 2 });
            g.text("이번 프레임만", [4, 7.6], "white", { size: 12, bold: true }); g.text("누적(TAA)", [12, 7.6], "white", { size: 12, bold: true });
            L.set("a", f2(a)); L.set("f", frame);
          };
        }
      } },
      "샘플 위치는 무작위 대신 ==고르게 퍼지는 수열(할턴)==로 정합니다. $α$가 작을수록 부드럽지만 변화에 늦게 반응하고, 크면 빨리 반응하지만 계단이 남습니다.",

      { h: "움직이면 생기는 문제: 고스팅" },
      "물체가 움직이면 지난 프레임의 같은 픽셀에는 ==다른 것==이 있었습니다. 그대로 섞으면 잔상(고스팅)이 남습니다. 해결책은 둘입니다. 모션 벡터로 ==지난 프레임에서 그 점이 있던 자리를 찾아 읽고==(재투영), 그래도 이상한 값은 ==주변 픽셀 색 범위로 잘라 냅니다==(클램프).",
      { fig: {
        aspect: 0.4, view: { x0: 0, x1: 40, y0: 0, y1: 16 },
        eq: ["{eq}"],
        setup(F, C, L) {
          let mode = 0, hist = new Float32Array(40 * 16), pos = 4, last = -1, frame = 0;
          C.play(true);
          C.seg({ options: [{ value: 0, label: "그냥 섞기" }, { value: 1, label: "재투영" }, { value: 2, label: "재투영 + 클램프" }], value: 0, onChange: x => { mode = x; hist.fill(0); } });
          let acc = 0;
          F.loop(dt => { acc += dt; if (acc > 0.05) { acc = 0; frame++; pos += 0.6; if (pos > 36) pos = 4; } });
          const cur = (x, y) => (Math.abs(x - pos) < 2.5 && Math.abs(y - 8) < 2.5 ? 1 : 0);
          F.draw = g => {
            if (frame !== last) {
              const nh = new Float32Array(hist.length);
              for (let i = 0; i < 40; i++) for (let j = 0; j < 16; j++) {
                const c = cur(i + 0.5, j + 0.5);
                let h = hist[j * 40 + i];
                if (mode >= 1) { const pi = Math.round(i - 0.6); h = pi >= 0 ? hist[j * 40 + pi] : c; }   // 지난 위치에서 읽기
                if (mode === 2) { let mn = 1, mx = 0; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const v = cur(i + di + 0.5, j + dj + 0.5); mn = Math.min(mn, v); mx = Math.max(mx, v); } h = clamp(h, mn, mx); }
                nh[j * 40 + i] = lerp(h, c, 0.1);
              }
              hist = nh; last = frame;
            }
            for (let i = 0; i < 40; i++) for (let j = 0; j < 16; j++) {
              const v = hist[j * 40 + i];
              if (v > 0.01) g.poly([[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], { fill: `rgba(227,111,200,${v})` });
            }
            g.poly([[pos - 2.5, 5.5], [pos + 2.5, 5.5], [pos + 2.5, 10.5], [pos - 2.5, 10.5]], { stroke: "white", w: 1.5, dash: [4, 3] });
            L.set("eq", ["지난 프레임 같은 자리를 섞음 → 뒤로 긴 잔상", "모션 벡터로 지난 위치를 읽음 → 잔상 대부분 사라짐", "주변 색 범위로 히스토리를 잘라 냄 → 남은 잔상까지 제거"][mode]);
          };
        }
      } },

      { h: "디더링: 노이즈로 계단 숨기기" },
      "부드러운 그라데이션을 적은 비트로 저장하면 ==띠(밴딩)==가 생깁니다. 저장 직전에 아주 작은 노이즈를 더하면 띠가 점묘로 흩어져 눈에 띄지 않습니다. 비트 수와 노이즈 종류를 바꿔 보세요.",
      { fig: {
        aspect: 0.42, view: { x0: 0, x1: 10, y0: 0, y1: 4.2 },
        eq: ["저장 값 = floor(값 · 단계 + 노이즈) / 단계   ({lv}단계)"],
        setup(F, C, L) {
          let bits = 4, mode = "bayer";
          C.slider({ label: "비트 수", min: 1, max: 8, step: 1, value: bits, fmt: x => x + "비트", onInput: x => { bits = x; } });
          C.seg({ options: [{ value: "none", label: "디더 없음" }, { value: "white", label: "백색 노이즈" }, { value: "bayer", label: "베이어 행렬" }], value: mode, onChange: x => { mode = x; } });
          F.draw = g => {
            const lv = Math.pow(2, bits) - 1;
            g.field(320, (x, y, i, j) => {
              const v = clamp(x / 10, 0, 1) * (y > 2.1 ? 1 : 0.35) + (y > 2.1 ? 0 : 0.1);
              const n = mode === "none" ? 0.5 : mode === "white" ? Math.random() : BAYER[(j % 4) * 4 + (i % 4)];
              const q = Math.floor(v * lv + n) / lv;
              return [q * 255 * 0.95, q * 255 * 0.9, q * 255, 255];
            }, { smooth: false });
            L.set("lv", lv + 1);
          };
        }
      } },
      { key: "TAA·디더링·노이즈 샘플링은 ==공간 대신 시간과 노이즈로 해상도를 버는 기술==입니다. 요즘 업스케일러(TSR·DLSS)도 같은 지터와 히스토리 위에 서 있습니다." },

      { use: [
        ["엔진", "TSR과 TAA", "UE의 기본 안티에일리어싱 TSR은 이 장의 지터 + 재투영 + 클램프에 업스케일까지 더한 것입니다. 빠른 물체 뒤 잔상이 보이면 히스토리 설정 문제입니다."],
        ["셰이더", "디더 투명", "머티리얼의 DitherTemporalAA 노드로 반투명 대신 '구멍 뚫기 + 시간 누적'으로 머리카락·LOD 전환을 부드럽게 합니다."],
        ["게임", "어두운 장면의 띠", "하늘·안개 그라데이션의 밴딩은 최종 출력 직전에 작은 노이즈(필름 그레인·디더)를 더해 없앱니다."],
        ["실생활", "신문 망점과 GIF", "흑백 신문의 망점 인쇄와 256색 GIF의 점묘가 디더링입니다. 적은 색으로 많은 색을 흉내 냅니다."]
      ] },

      { recap: [
        ["샘플 위치 = 할턴 지터", "프레임마다 픽셀 안의 다른 곳"],
        ["lerp(히스토리, 현재, α)", "시간 누적 안티에일리어싱"],
        ["재투영 + 주변 색 클램프", "움직임 잔상(고스팅) 제거"],
        ["floor(값·단계 + 노이즈)", "디더링: 밴딩을 노이즈로"]
      ] }
    ]
  });
})();
