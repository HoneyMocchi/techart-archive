/* ===== 주제 메타데이터: 난이도와 태그 =====
   난이도 1 기초 · 2 중급 · 3 심화. 태그는 검색·필터에 쓰이며, 아래 TAG_ORDER 순서로 보여 줍니다. */

const LEVEL_NAMES = ["", "기초", "중급", "심화"];
const TAG_ORDER = ["수학", "변환", "기하", "텍스처", "조명", "색", "머티리얼", "셰이더", "노이즈", "절차적", "SDF",
  "애니메이션", "시뮬레이션", "이펙트", "배경", "후처리", "안티에일리어싱", "샘플링", "레이 트레이싱", "GPU", "메모리", "성능", "툴"];

const LESSON_META = {
  vector: [1, "수학"], trig: [1, "수학"], dotcross: [1, "수학 조명"], transform: [1, "수학 변환"],
  rotation3d: [2, "수학 변환 애니메이션"], curves: [1, "수학 애니메이션"],
  mesh: [1, "기하"], projection: [2, "변환 기하"], raster: [2, "기하 GPU"], texture: [1, "텍스처"],
  triplanar: [2, "텍스처 머티리얼"], tangent: [2, "텍스처 조명 머티리얼"],
  lighting: [1, "조명"], color: [1, "색"], pbr: [2, "조명 머티리얼"], fresnel: [2, "조명 머티리얼"],
  ibl: [3, "조명 수학"], shadow: [2, "조명 GPU"], fog: [2, "조명 후처리"],
  shader: [1, "셰이더 절차적"], derivatives: [2, "셰이더 GPU"], noise: [2, "노이즈 절차적"], sdf: [2, "SDF 절차적 셰이더"],
  skinning: [2, "애니메이션"], vertexanim: [2, "애니메이션 셰이더"], physics: [2, "시뮬레이션 수학"],
  blur: [2, "후처리"], hdr: [2, "후처리 색"], ssao: [3, "후처리 조명"], taa: [3, "후처리 안티에일리어싱 샘플링"],
  raytrace: [2, "레이 트레이싱"], pathtrace: [3, "레이 트레이싱 샘플링 수학"],
  deferred: [2, "GPU 성능"], gpu: [2, "GPU 성능 메모리"], culling: [2, "성능 기하"], float: [2, "수학 GPU"],
  texpack: [1, "텍스처 메모리"], texel: [1, "텍스처"], baking: [2, "텍스처 툴"], heightblend: [2, "머티리얼"],
  parallax: [2, "머티리얼 텍스처"], decal: [2, "머티리얼"], toon: [2, "조명 머티리얼"], vfx: [2, "이펙트"],
  grading: [2, "색 후처리"], shadercost: [2, "성능 셰이더"], impostor: [2, "성능 텍스처"],
  pca: [2, "수학 툴"], colorspace: [2, "색"], gather: [2, "텍스처 GPU 성능"], aa: [2, "안티에일리어싱 후처리"], edgefill: [2, "텍스처 툴"],
  mipmap: [2, "텍스처 샘플링"], bitpack: [2, "메모리 GPU"], morton: [3, "메모리 GPU"], compiler: [3, "셰이더 성능"],
  vat: [2, "애니메이션 이펙트 텍스처"], ocean: [2, "시뮬레이션 이펙트"], caustic: [3, "이펙트 조명"], volume: [3, "이펙트 텍스처"],
  warp: [3, "노이즈 절차적 색"], sdfadv: [3, "SDF 절차적 레이 트레이싱"], alphacov: [3, "안티에일리어싱 텍스처"],
  pixelart: [3, "텍스처 샘플링"], normalblend: [2, "텍스처 조명 머티리얼"], jfa: [3, "후처리 SDF GPU"],
  sampling: [3, "샘플링 수학 안티에일리어싱"], bluenoise: [3, "노이즈 샘플링"], gpuhash: [3, "노이즈 GPU"],
  quadinterp: [3, "텍스처 기하"], sss: [3, "조명 후처리"], gtao: [3, "조명 후처리"], smaa: [3, "안티에일리어싱 후처리"],
  midpoly: [2, "배경 기하 조명 툴"], edgedecal: [2, "배경 머티리얼 GPU"], tiling: [2, "배경 텍스처 머티리얼"],
  atlas: [2, "배경 텍스처 샘플링"], texarray: [2, "배경 텍스처 메모리"]
};

// "레이 트레이싱"처럼 띄어 쓴 태그가 있어 공백으로 자르지 않고 목록과 맞춰 읽습니다
function lessonMeta(topic) {
  const m = LESSON_META[topic] || [1, ""];
  const tags = TAG_ORDER.filter(t => (" " + m[1] + " ").includes(" " + t + " "));
  return { level: m[0], tags };
}
