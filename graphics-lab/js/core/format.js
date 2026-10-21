/* ===== 서식: 본문 마크업과 인라인 수식 하이라이트 =====
   본문:  $수식$  ==형광펜==  **굵게**  [[색:글자]]  `코드`
   수식:  숫자·함수·기호를 토큰으로 나눠 색을 입힙니다. 기호 색은 SYM(주제별로 덮어씀)에서 찾습니다.
          x^2 → 위첨자, a_x → 아래첨자, {키} → 그림과 연동되는 실시간 값 */

// 그림(항상 어두운 배경)용 3b1b 팔레트. 본문 글자색은 CSS 변수(--c-이름)가 테마별로 맡습니다.
const PAL = {
  blue: "#58C4DD", teal: "#5CD0B3", green: "#83C167", yellow: "#F4D345", gold: "#F0AC5F",
  red: "#FC6255", purple: "#B189C6", pink: "#E36FC8", orange: "#FF862F", grey: "#8A93A6",
  white: "#ECEFF4", dim: "#5B6478", bg: "#10131A", grid: "rgba(88,196,221,0.16)", gridMajor: "rgba(88,196,221,0.34)"
};

// 모든 주제에 공통으로 쓰는 기호 색 약속 (x는 초록, y는 빨강, 각도는 파랑 …)
const SYM_BASE = {
  x: "green", y: "red", z: "blue", "î": "green", "ĵ": "red", "k̂": "blue",
  "θ": "blue", "φ": "teal", "α": "pink", "β": "teal", "γ": "gold",
  v: "yellow", u: "pink", w: "teal", a: "yellow", b: "pink", k: "gold",
  N: "yellow", L: "gold", V: "teal", H: "purple", R: "pink", M: "purple", P: "white", Q: "white"
};

const FN_WORDS = new Set(["sin", "cos", "tan", "atan", "atan2", "sqrt", "dot", "cross", "normalize", "length",
  "max", "min", "clamp", "lerp", "floor", "frac", "abs", "pow", "reflect", "det", "sign", "saturate", "mip", "log2", "smoothstep", "step"]);

const UNIT_WORDS = new Set(["rad", "px", "KB", "MB", "GB", "ms", "fps", "bit", "fov", "FOV"]);

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function symClass(name, sym) {
  const base = name.replace(/[̂̃̇'′]/g, "");
  const c = (sym && (sym[name] || sym[base])) || SYM_BASE[name] || SYM_BASE[base];
  return c ? " c-" + c : "";
}

const MATH_TOKEN = /\{([\w.\-]+)\}|(\d+(?:\.\d+)?)|([A-Za-zÀ-ſͰ-Ͽ](?:[A-Za-z0-9À-ſͰ-Ͽ]|[̂̃̇'′])*)|([가-힣]+(?:\s+[가-힣]+)*)|(\s+)|([\^_])|(.)/g;

// 행렬: [[a, b; c, d]] (쉼표=열, 세미콜론=행). 열이 둘 이상이면 열마다 î(초록)·ĵ(빨강)·이동(청록) 색을 입힙니다.
// [[green: a; c]] 처럼 앞에 색 이름을 붙이면 행렬 전체를 그 색으로 칠합니다.
const MAT_COLS = ["green", "red", "teal"];
function fmtMatrix(body, sym) {
  let tint = "";
  const m = body.match(/^\s*(\w+):\s*(.*)$/);
  if (m && /^[a-z]+$/.test(m[1])) { tint = m[1]; body = m[2]; }
  const rows = body.split(";").map(r => r.split(",").map(c => c.trim()));
  const n = Math.max(...rows.map(r => r.length));
  // 동차 좌표의 마지막 행(0, 0, 1)은 흐리게
  const homo = rows.length === n && n >= 3 && rows[n - 1].every(c => /^[01]$/.test(c));
  const cells = rows.map((r, i) => r.map((c, j) => {
    const color = homo && i === n - 1 ? "grey" : tint || (n > 1 ? MAT_COLS[j] : "");
    return `<span class="mat-c${color ? " c-" + color : ""}">${fmtMathInner(c, sym)}</span>`;
  }).join("")).join("");
  return `<span class="mat"><span class="mat-g" style="grid-template-columns:repeat(${n},auto)">${cells}</span></span>`;
}

function fmtMath(src, sym) {
  return `<span class="math">${String(src).split(/\[\[(.+?)\]\]/).map((part, i) => i % 2 ? fmtMatrix(part, sym) : fmtMathInner(part, sym)).join("")}</span>`;
}

function fmtMathInner(src, sym) {
  let out = "";
  let pendingScript = "";
  let m;
  MATH_TOKEN.lastIndex = 0;
  const emit = html => {
    if (pendingScript) { out += `<${pendingScript}>${html}</${pendingScript}>`; pendingScript = ""; }
    else out += html;
  };
  while ((m = MATH_TOKEN.exec(src))) {
    const [, live, num, id, hangul, ws, script, ch] = m;
    if (live) emit(`<span class="live" data-k="${live}">·</span>`);
    else if (num) emit(`<span class="m-num">${num}</span>`);
    else if (id) {
      if (FN_WORDS.has(id)) emit(`<span class="m-fn${sym && sym[id] ? " c-" + sym[id] : ""}">${id}</span>`);
      else if (UNIT_WORDS.has(id)) emit(`<span class="m-unit">${id}</span>`);
      else emit(`<span class="m-id${symClass(id, sym)}">${escHtml(id)}</span>`);
    } else if (hangul) emit(`<span class="m-txt">${hangul}</span>`);
    else if (ws) out += " ";
    else if (script) {
      const tag = script === "^" ? "sup" : "sub";
      if (src[MATH_TOKEN.lastIndex] === "(") {
        // x_(i+1), e^(−kx): 괄호 묶음을 통째로 첨자로 (괄호 자체는 감춤)
        let depth = 0, j = MATH_TOKEN.lastIndex;
        for (; j < src.length; j++) { if (src[j] === "(") depth++; else if (src[j] === ")" && --depth === 0) break; }
        const inner = src.slice(MATH_TOKEN.lastIndex + 1, j);
        const html = fmtMathInner(inner, sym);          // 같은 정규식을 쓰므로 다음 위치를 다시 지정
        MATH_TOKEN.lastIndex = Math.min(src.length, j + 1);
        out += `<${tag}>${html}</${tag}>`;
      } else pendingScript = tag;
    }
    else if (pendingScript && (ch === "−" || ch === "-")) {
      // x^−1 처럼 부호가 붙은 첨자는 부호와 숫자를 함께 올립니다
      const nx = MATH_TOKEN.exec(src);
      emit(`<span class="m-op">−</span>${nx && nx[2] ? `<span class="m-num">${nx[2]}</span>` : ""}`);
      if (nx && !nx[2]) MATH_TOKEN.lastIndex = nx.index;
    } else {
      const op = ch === "*" ? "·" : ch;
      emit(`<span class="m-op">${escHtml(op)}</span>`);
    }
  }
  return out;
}

function fmtText(src, sym) {
  const slots = [];
  let s = String(src).replace(/\$([^$]+)\$/g, (_, m) => { slots.push(fmtMath(m, sym)); return `\u0000${slots.length - 1}\u0000`; });
  s = s.replace(/`([^`]+)`/g, (_, c) => { slots.push(`<code>${escHtml(c)}</code>`); return `\u0000${slots.length - 1}\u0000`; });
  s = escHtml(s);
  s = s.replace(/==(.+?)==/g, "<mark>$1</mark>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\[\[(\w+):(.+?)\]\]/g, '<span class="c-$1 tint">$2</span>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
}

// 실시간 값 표기: 소수 자릿수 고정 + 음수 기호를 수학용 마이너스로
function num(v, d = 2) {
  if (!isFinite(v)) return "∞";
  const s = Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d);
  return s.replace("-", "−");
}
