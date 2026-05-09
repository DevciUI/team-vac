const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");
const queryForm = document.querySelector("#queryForm");
const queryInput = document.querySelector("#queryInput");
const langButtons = document.querySelectorAll("[data-lang]");
const i18nNodes = document.querySelectorAll("[data-i18n]");
const startGate = document.querySelector("#startGate");
const startButton = document.querySelector("#startButton");
const boot = document.querySelector("#boot");
const bootFill = document.querySelector("#bootFill");
const denied = document.querySelector("#denied");
const wishlistButton = document.querySelector("#wishlistButton");
const gallery = document.querySelector("#gallery");
const closeGalleryButton = document.querySelector("#closeGallery");

const BLACK = "#030405";
const WHITE = "#f2f2ee";
const MUTED = "#81868c";
const RED = "#e9162f";
const RED_DIM = "#6e0b17";
const FOCAL = 680;
const STEAM_URL = "https://store.steampowered.com/app/3864580/PON/";

let width = innerWidth;
let height = innerHeight;
let yaw = -0.28;
let pitch = 0.22;
let zoom = 1;
let panX = 70;
let panY = 8;
let dragging = false;
let dragStart = null;
let bootStarted = false;
let bootDone = false;
let bootStart = 0;
let activity = 0;
let galleryActive = false;
let hintStart = 0;
let lastTime = performance.now();
let bgPhase = 0;
let audioCtx = null;
let activeLang = "ru";
let projectedNodes = [];

const noise = Array.from({ length: 520 }, () => [Math.random(), Math.random(), Math.random()]);
const scanColumns = Array.from({ length: 16 }, () => Math.random());
const nodes = [];
const sparks = [];

const copy = {
  ru: {
    gateTitle: "TEAM VAC OS / VAC HANDSHAKE",
    gateSub: "ТРЕБУЕТСЯ ПОДТВЕРЖДЕНИЕ ПОЛЬЗОВАТЕЛЯ",
    startButton: "нажми на меня",
    gateFooter: "ENTER / SPACE / ЛЕВЫЙ КЛИК",
    hack: "P.O.N. malware взломал тебя.",
    unlock: "Перейдите на страницу Steam и добавьте в wishlist для разблокировки.",
    wishlist: "добавить в wishlist",
    hint1: "нажми на нейрон PON",
    hint2: "или введи тег в поиск",
  },
  en: {
    gateTitle: "TEAM VAC OS / VAC HANDSHAKE",
    gateSub: "USER CONFIRMATION REQUIRED",
    startButton: "click me",
    gateFooter: "ENTER / SPACE / LEFT CLICK",
    hack: "P.O.N. malware hacked you.",
    unlock: "Open the Steam page and add it to your wishlist to unlock.",
    wishlist: "add to wishlist",
    hint1: "click the PON neuron",
    hint2: "or type a tag in search",
  },
  basic: {
    gateTitle: "TEAM VAC OS",
    gateSub: "PRESS BUTTON TO START",
    startButton: "click",
    gateFooter: "ENTER / SPACE / CLICK",
    hack: "P.O.N. malware hacked you.",
    unlock: "Go to Steam. Add to wishlist. Unlock.",
    wishlist: "wishlist",
    hint1: "click PON",
    hint2: "search also works",
  },
};

function resize() {
  width = innerWidth;
  height = innerHeight;
  canvas.width = Math.floor(width * devicePixelRatio);
  canvas.height = Math.floor(height * devicePixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

addEventListener("resize", resize);
resize();

function setLanguage(lang) {
  activeLang = copy[lang] ? lang : "ru";
  document.documentElement.lang = activeLang === "ru" ? "ru" : "en";
  i18nNodes.forEach((node) => {
    const key = node.dataset.i18n;
    if (copy[activeLang][key]) node.textContent = copy[activeLang][key];
  });
  langButtons.forEach((button) => button.classList.toggle("active", button.dataset.lang === activeLang));
}

langButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setLanguage(button.dataset.lang);
  });
});

setLanguage(activeLang);

function beep(freq = 740, duration = 0.08, volume = 0.05) {
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration + 0.02);
}

function seedMap() {
  nodes.push({ label: "CORE", x: 0, y: 0, z: 0, color: WHITE, pulse: 0.45, alert: 0, links: [] });
  const seeds = [
    "PON",
    "MOBILE_DATA",
    "SOCIAL_MEDIA",
    "SMS",
    "CAMERA_FEED",
    "AUDIO_TRACE",
    "LOCATION",
    "ARCHIVE",
    "BIOMETRIC",
    "VECTOR",
    "BREACH",
    "NODE_045",
    "SIGNAL",
  ];

  seeds.forEach((label, i) => {
    const angle = (i / seeds.length) * Math.PI * 2;
    const radius = 190 + Math.random() * 130;
    const node = {
      label,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.68,
      z: -160 + Math.random() * 340,
      color: ["PON", "CAMERA_FEED", "BIOMETRIC", "BREACH"].includes(label) ? RED : WHITE,
      pulse: 0,
      alert: label === "PON" ? 0.35 : ["CAMERA_FEED", "BIOMETRIC", "BREACH"].includes(label) ? 0.25 : 0,
      links: [0],
    };
    nodes[0].links.push(nodes.length);
    nodes.push(node);
  });

  for (let i = 0; i < 18; i += 1) {
    const a = 1 + Math.floor(Math.random() * (nodes.length - 1));
    const b = 1 + Math.floor(Math.random() * (nodes.length - 1));
    if (a !== b && !nodes[a].links.includes(b)) {
      nodes[a].links.push(b);
      nodes[b].links.push(a);
    }
  }
}

seedMap();

function rotate(x, y, z) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  [x, z] = [x * cy - z * sy, x * sy + z * cy];
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  return [x, y, z];
}

function project(x, y, z) {
  const [rx, ry, rz] = rotate(x, y, z);
  const depth = rz + 760;
  const scale = (FOCAL / Math.max(170, depth)) * zoom;
  return [width / 2 + panX + rx * scale, height / 2 + panY + ry * scale, scale, rz];
}

function worldFromScreen(sx, sy, z) {
  return [(sx - width / 2 - panX) / zoom, (sy - height / 2 - panY) / zoom, z];
}

function linkCount() {
  return nodes.reduce((sum, node) => sum + node.links.length, 0) / 2;
}

function findOrCreateNode(raw) {
  const label = raw.toUpperCase().replace(/\s+/g, "_").slice(0, 28);
  const existing = nodes.findIndex((node) => node.label === label);
  if (existing >= 0) return existing;

  const anchor = 1 + Math.floor(Math.random() * (nodes.length - 1));
  const base = nodes[anchor];
  const angle = Math.random() * Math.PI * 2;
  const distance = 125 + Math.random() * 80;
  const node = {
    label,
    x: base.x + Math.cos(angle) * distance,
    y: base.y + Math.sin(angle) * distance * 0.74,
    z: base.z - 135 + Math.random() * 270,
    color: RED,
    pulse: 1,
    alert: 1,
    links: [anchor],
  };
  nodes[anchor].links.push(nodes.length);
  nodes.push(node);
  return nodes.length - 1;
}

function launchActivity(value, sourcePoint = null) {
  const text = value.trim();
  if (!bootDone || !text) return;
  activity += 1;
  if (galleryActive) closeGallery(false);
  const target = findOrCreateNode(text);
  nodes[target].pulse = 1;
  nodes[target].alert = 1;
  sparks.push({
    text: text.toUpperCase(),
    source: sourcePoint || worldFromScreen(220, 44, -410),
    target,
    start: performance.now(),
    duration: 820,
    openGallery: nodes[target].label === "PON",
  });
  beep(1180, 0.07, 0.035);
}

queryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  launchActivity(queryInput.value);
  queryInput.value = "";
});

queryInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  launchActivity(queryInput.value);
  queryInput.value = "";
});

wishlistButton.addEventListener("click", (event) => {
  event.stopPropagation();
  window.open(STEAM_URL, "_blank", "noopener,noreferrer");
});

function startBoot() {
  if (bootStarted) return;
  bootStarted = true;
  bootStart = performance.now();
  startGate.classList.add("hidden");
  boot.classList.remove("hidden");
  document.documentElement.requestFullscreen?.().catch(() => {});
  beep(740, 0.09, 0.04);
}

startButton.addEventListener("click", startBoot);
startGate.addEventListener("click", startBoot);
addEventListener("keydown", (event) => {
  if (!bootStarted && (event.key === "Enter" || event.key === " ")) startBoot();
  if (event.key === "Escape" && galleryActive) closeGallery(true);
});

closeGalleryButton.addEventListener("click", () => closeGallery(true));

function hitNode(clientX, clientY) {
  let best = null;
  let bestDistance = Infinity;
  projectedNodes.forEach(([sx, sy, scale], i) => {
    const node = nodes[i];
    const radius = Math.max(18, (15 + Math.min(12, node.label.length * 0.2)) * scale);
    const distance = Math.hypot(clientX - sx, clientY - sy);
    if (distance <= radius && distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

canvas.addEventListener("pointerdown", (event) => {
  if (!bootStarted) {
    startBoot();
    return;
  }
  if (!bootDone || galleryActive) return;
  dragging = true;
  dragStart = [event.clientX, event.clientY, event.shiftKey, event.clientX, event.clientY];
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging || !dragStart || galleryActive) return;
  const [px, py, pan, startX, startY] = dragStart;
  const dx = event.clientX - px;
  const dy = event.clientY - py;
  dragStart = [event.clientX, event.clientY, event.shiftKey || pan, startX, startY];
  if (event.shiftKey || pan) {
    panX += dx;
    panY += dy;
  } else {
    yaw += dx * 0.006;
    pitch = Math.max(-1.12, Math.min(1.12, pitch + dy * 0.005));
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (dragStart && bootDone && !galleryActive) {
    const [, , , startX, startY] = dragStart;
    const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
    const target = moved < 9 ? hitNode(event.clientX, event.clientY) : null;
    if (target !== null) {
      launchActivity(nodes[target].label, worldFromScreen(event.clientX, event.clientY, -410));
    }
  }
  dragging = false;
  dragStart = null;
});

canvas.addEventListener("wheel", (event) => {
  if (!bootDone || galleryActive) return;
  event.preventDefault();
  zoom = Math.max(0.45, Math.min(2.7, zoom * (event.deltaY < 0 ? 1.09 : 0.91)));
}, { passive: false });

function openGallery() {
  galleryActive = true;
  gallery.classList.remove("hidden");
  dragging = false;
  beep(360, 0.18, 0.04);
}

function closeGallery(playSound = true) {
  galleryActive = false;
  gallery.classList.add("hidden");
  if (playSound) beep(520, 0.12, 0.035);
}

function drawBackground() {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, width, height);
  bgPhase += 0.008;

  noise.forEach(([nx, ny, seed]) => {
    const blink = Math.sin(bgPhase * 4 + seed * 20);
    if (blink > -0.35) {
      ctx.fillStyle = blink < 0.72 ? "#1d2023" : WHITE;
      const size = seed < 0.88 ? 1 : 2;
      ctx.fillRect(nx * width, ny * height, size, size);
    }
  });

  ctx.strokeStyle = "#090d10";
  ctx.lineWidth = 1;
  for (let y = 92; y < height; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let x = 0; x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  scanColumns.forEach((col) => {
    const x = col * width;
    const offset = (bgPhase * 90 + x) % height;
    ctx.strokeStyle = "#1e2226";
    ctx.beginPath();
    ctx.moveTo(x, offset);
    ctx.lineTo(x, Math.min(height, offset + 90));
    ctx.stroke();
  });
}

function text(value, x, y, color = WHITE, size = 12, align = "left", weight = "400") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Consolas, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function drawHud() {
  const compact = width < 720;
  text(compact ? "TAP NODE  |  DRAG ORBIT  |  PINCH/SEARCH" : "CLICK NODE  |  LMB ORBIT  |  SHIFT+LMB PAN  |  WHEEL ZOOM", 24, compact ? 72 : 82, MUTED, 10);
  text("SIGNAL_CAPTURE / NODE INJECTION", 24, compact ? 98 : 112, RED, 11, "left", "700");
  text("TEAM VAC OS // ctOS-style graph", width - 26, 24, WHITE, compact ? 11 : 13, "right", "700");
  text(`NODES ${String(nodes.length).padStart(3, "0")}  LINKS ${String(linkCount()).padStart(3, "0")}  EVENTS ${String(activity).padStart(3, "0")}`, width - 26, 48, MUTED, 10, "right");
  ctx.strokeStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(24, compact ? 124 : 138);
  ctx.lineTo(compact ? Math.min(300, width - 24) : 420, compact ? 124 : 138);
  ctx.moveTo(Math.max(width - 380, 24), 70);
  ctx.lineTo(width - 26, 70);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, compact ? 125 : 139);
  ctx.lineTo(compact ? 116 : 136, compact ? 125 : 139);
  ctx.moveTo(Math.max(width - 150, 160), 71);
  ctx.lineTo(width - 26, 71);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.strokeStyle = "#202428";
  ctx.strokeRect(24, height - 98, width - 48, 70);
  text("TIMELINE 24HRS", 36, height - 90, MUTED, 10);
  const bars = compact ? Math.floor((width - 76) / 10) : 96;
  for (let i = 0; i < bars; i += 1) {
    const h = 8 + (Math.sin(i * 0.23 + bgPhase * 4) + 1) * 22;
    ctx.fillStyle = i % 17 === 0 ? RED : WHITE;
    ctx.fillRect(38 + i * (compact ? 10 : 12), height - 38 - h, 5, h);
  }

  const age = (performance.now() - hintStart) / 1000;
  if (bootDone && !galleryActive && age < 14) {
    ctx.fillStyle = "#050607";
    ctx.strokeStyle = "#34383d";
    const hintY = compact ? 142 : 190;
    const hintW = Math.min(360, width - 48);
    ctx.fillRect(24, hintY, hintW, 82);
    ctx.strokeRect(24, hintY, hintW, 82);
    ctx.fillStyle = RED;
    ctx.fillRect(24, hintY, hintW, 2);
    text("QUICK TRACE HINT", 40, hintY + 15, WHITE, 11, "left", "700");
    text(copy[activeLang].hint1, 40, hintY + 40, MUTED, 10);
    text(copy[activeLang].hint2, 40, hintY + 60, Math.floor(age * 2.5) % 2 ? WHITE : RED, 10, "left", "700");
  }
}

function drawLinks(projected) {
  const drawn = new Set();
  nodes.forEach((node, i) => {
    node.links.forEach((link) => {
      const a = Math.min(i, link);
      const b = Math.max(i, link);
      const key = `${a}:${b}`;
      if (drawn.has(key)) return;
      drawn.add(key);
      const [x1, y1, s1] = projected[a];
      const [x2, y2, s2] = projected[b];
      ctx.strokeStyle = nodes[a].alert > 0.15 || nodes[b].alert > 0.15 ? RED_DIM : "#6f7376";
      ctx.lineWidth = Math.max(1, (s1 + s2) * 0.62);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  });
  ctx.lineWidth = 1;
}

function drawSparks(projected) {
  const now = performance.now();
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    const t = (now - spark.start) / spark.duration;
    if (t >= 1) {
      nodes[spark.target].pulse = 1;
      nodes[spark.target].alert = 1;
      if (spark.openGallery) openGallery();
      sparks.splice(i, 1);
      continue;
    }
    const eased = 1 - (1 - t) ** 3;
    const target = nodes[spark.target];
    const x = spark.source[0] + (target.x - spark.source[0]) * eased;
    const y = spark.source[1] + (target.y - spark.source[1]) * eased;
    const z = spark.source[2] + (target.z - spark.source[2]) * eased;
    const [sx, sy, scale] = project(x, y, z);
    const [tx, ty] = projected[spark.target];
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy);
    ctx.lineTo(sx + 18, sy);
    ctx.moveTo(sx, sy - 18);
    ctx.lineTo(sx, sy + 18);
    ctx.stroke();
    ctx.strokeStyle = RED;
    const r = 6 + 10 * Math.sin(t * Math.PI);
    ctx.strokeRect(sx - r, sy - r, r * 2, r * 2);
    text(spark.text.slice(0, 20), sx + 18, sy - 15, WHITE, Math.max(8, 11 * scale), "left", "700");
  }
  ctx.lineWidth = 1;
}

function drawNodes(projected, dt) {
  const order = projected.map((p, i) => [p[3], i]).sort((a, b) => a[0] - b[0]).map((item) => item[1]);
  order.forEach((i) => {
    const node = nodes[i];
    const [sx, sy, scale] = projected[i];
    node.pulse = Math.max(0, node.pulse - dt * 0.0009);
    node.alert = Math.max(0, node.alert - dt * 0.00016);
    const radius = (7.5 + Math.min(9, node.label.length * 0.12)) * scale + node.pulse * 12;
    const ring = radius * (2.2 + node.alert);
    const color = node.alert > 0.05 ? RED : WHITE;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - ring - 8, sy);
    ctx.lineTo(sx - radius - 2, sy);
    ctx.moveTo(sx + radius + 2, sy);
    ctx.lineTo(sx + ring + 8, sy);
    ctx.moveTo(sx, sy - ring - 8);
    ctx.lineTo(sx, sy - radius - 2);
    ctx.moveTo(sx, sy + radius + 2);
    ctx.lineTo(sx, sy + ring + 8);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
    text(node.label, sx, sy + ring + 10, color, Math.max(7, Math.min(13, 9 * scale + 3)), "center", "700");
  });
}

function loop(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  if (bootStarted && !bootDone) {
    const elapsed = (now - bootStart) / 1000;
    bootFill.style.width = `${Math.min(100, (elapsed / 9) * 100)}%`;
    denied.classList.toggle("hidden", !(elapsed >= 2 && elapsed < 8));
    boot.classList.toggle("hidden", elapsed >= 2 && elapsed < 8);
    if (elapsed >= 9) {
      bootDone = true;
      boot.classList.add("hidden");
      denied.classList.add("hidden");
      queryForm.classList.remove("hidden");
      hintStart = performance.now();
      beep(740, 0.09, 0.04);
    }
  }

  nodes.slice(1).forEach((node, i) => {
    node.z += Math.sin(now * 0.00072 + i * 0.9) * 0.16;
    node.y += Math.cos(now * 0.00048 + i * 1.3) * 0.07;
  });

  drawBackground();
  const projected = nodes.map((node) => project(node.x, node.y, node.z));
  projectedNodes = projected;
  drawHud();
  drawLinks(projected);
  drawSparks(projected);
  drawNodes(projected, dt);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
