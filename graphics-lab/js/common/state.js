const state = {
  active: 0,
  vector: { angle: 34, length: 4.2, zoom: 45 },
  trig: { angle: 48, radius: 1, frequency: 1 },
  dotcross: { aAngle: -12, aLength: 4.2, bAngle: 58, bLength: 3.8 },
  transform: { scaleX: 1.15, scaleY: 0.75, rotation: 34, tx: 1.1, ty: -0.6 },
  projection: { fov: 62, distance: 5.6, yaw: 32, mode: "perspective" },
  raster: { sampleX: 58, sampleY: 44, resolution: 20 },
  texture: { u: 0.37, v: 0.58, tiling: 3, filter: "bilinear" },
  lighting: { lightAngle: -42, normalAngle: 16, roughness: 0.34, ambient: 0.12 },
  gpu: { width: 1920, height: 1080, overdraw: 1.4, vertices: 36000, triangles: 72000 }
};

const lessons = Array.from(document.querySelectorAll(".lesson"));
const topicNav = document.getElementById("topicNav");
const currentTopic = document.getElementById("currentTopic");
const drawFns = {};
const canvasLayouts = {};
const dragState = { active: false, topic: "", target: "" };
const autoState = { topic: "", raf: 0, last: 0 };
const C = {
  bg: "#0e1621",
  panel: "#121a24",
  panelSoft: "#182433",
  panelDeep: "#0f1722",
  grid: "#233144",
  axis: "#64778c",
  line: "#2f4157",
  ink: "#e8eef7",
  muted: "#99a7b8",
  tag: "rgba(12, 18, 27, 0.94)",
  blue: "#60a5fa",
  teal: "#2dd4bf",
  orange: "#fb923c",
  red: "#fb7185",
  green: "#4ade80",
  yellow: "#facc15"
};
