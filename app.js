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
const panel = document.querySelector("#panel");
const panelTitle = document.querySelector("#panelTitle");
const panelBody = document.querySelector("#panelBody");
const closePanelButton = document.querySelector("#closePanel");

const BLACK = "#030405";
const WHITE = "#f2f2ee";
const MUTED = "#81868c";
const RED = "#e9162f";
const RED_DIM = "#6e0b17";
const FOCAL = 680;
const CITY_INTRO_START = 8;
const CITY_INTRO_END = 17.4;
const GRAPH_TRANSITION_SECONDS = 2.8;
const GRAPH_DISSOLVE_START_SECONDS = 2.14;
const GRAPH_DISSOLVE_SECONDS = 0.74;

const URL_STEAM = "https://store.steampowered.com/app/3864580/PON/";
const URL_DISCORD = "https://discord.com/invite/KUwMKcFucr";
const URL_YOUTUBE = "https://www.youtube.com/@steampon";
const URL_TIKTOK = "https://www.tiktok.com/@devci__";
const URL_INSTAGRAM = "https://www.instagram.com/devci_inc/";
const URL_PUBLISHER_SITE = "https://spaghetticat.io/";
const URL_PUBLISHER_STEAM = "https://store.steampowered.com/curator/46103900";
const URL_MARS_INSTAGRAM = "https://www.instagram.com/marsdevgod/";
const URL_MARS_TIKTOK = "https://www.tiktok.com/@marsdevgod";
const URL_MARS_YOUTUBE = "https://www.youtube.com/@marsdevgod";
const URL_DEVCI_INSTAGRAM = "https://www.instagram.com/devci_inc/";
const URL_DEVCI_TIKTOK = "https://www.tiktok.com/@devci__";
const URL_DEVCI_YOUTUBE = "https://www.youtube.com/@Devci";

const NODE_BEHAVIOR = {
  PON:           { type: "gallery" },
  WISHLIST_PON:  { type: "url",    href: URL_STEAM },
  DISCORD_PON:   { type: "url",    href: URL_DISCORD },
  YOUTUBE_PON:   { type: "url",    href: URL_YOUTUBE },
  TIKTOK_PON:    { type: "url",    href: URL_TIKTOK },
  INSTAGRAM:     { type: "url",    href: URL_INSTAGRAM },
  DEVELOPER_MARS:  { type: "panel",  key: "mars" },
  DEVELOPER_DEVCI: { type: "panel",  key: "devci" },
  PUBLISHER:        { type: "panel",  key: "publisher" },
  TASKS:            { type: "panel",  key: "tasks" },
  FAQ:           { type: "panel",  key: "faq" },
  ABOUT_TEAM:    { type: "panel",  key: "about" },
};

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
let panelActive = false;
let hintStart = 0;
let lastTime = performance.now();
let bgPhase = 0;
let audioCtx = null;
let activeLang = "en";
let projectedNodes = [];
let cityIntroDone = false;
let graphTransitionStart = 0;
let viewTouched = false;

const noise = Array.from({ length: 520 }, () => [Math.random(), Math.random(), Math.random()]);
const scanColumns = Array.from({ length: 16 }, () => Math.random());
const nodes = [];
const sparks = [];
const cityBlocks = [];
const cityRoads = [];
const cityNeurons = [];
const cityLandmarks = [];
const cityScanLabels = [];
const CITY_TO_GRAPH = {
  PON: "PON",
  WISHLIST: "WISHLIST_PON",
  DISCORD: "DISCORD_PON",
  YOUTUBE: "YOUTUBE_PON",
  TIKTOK: "TIKTOK_PON",
  INSTAGRAM: "INSTAGRAM",
  MARS: "DEVELOPER_MARS",
  DEVCI: "DEVELOPER_DEVCI",
  PUBLISHER: "PUBLISHER",
  TASKS: "TASKS",
  FAQ: "FAQ",
  TEAM: "ABOUT_TEAM",
};
const FLAT_MAP_BOUNDARY = [
  [-560, -250], [-430, -320], [-210, -292], [-80, -338], [105, -300],
  [270, -315], [475, -248], [535, -106], [488, 48], [558, 162],
  [392, 238], [170, 310], [-42, 280], [-245, 324], [-455, 232],
  [-532, 70], [-500, -86], [-560, -250],
];

function seededNoise(index) {
  const x = Math.sin(index * 127.1 + 17.13) * 43758.5453;
  return x - Math.floor(x);
}

function seedCity() {
  for (let gx = -13; gx <= 13; gx += 1) {
    for (let gy = -8; gy <= 8; gy += 1) {
      const islandEdge = 8.7 - Math.abs(gx) * 0.24 + Math.sin(gx * 0.55) * 0.7;
      if (Math.abs(gy + Math.sin(gx * 0.4) * 0.55) > islandEdge) continue;
      const n = seededNoise((gx + 30) * 41 + (gy + 22) * 23);
      const center = Math.max(0, 1 - Math.hypot(gx * 0.75, gy * 1.08) / 8.2);
      const downtown = Math.max(0, 1 - Math.hypot(gx - 2, gy + 1) / 5.2);
      const waterfront = Math.abs(gy) > islandEdge - 1.5 || Math.abs(gx) > 11;
      const zBase = 12 + n * 34 + center * 95 + downtown * 155;
      const lots = center > 0.42 && !waterfront && (gx + gy) % 2 === 0 ? 2 : 1;
      for (let lot = 0; lot < lots; lot += 1) {
        const ln = seededNoise(n * 9000 + lot * 17);
        cityBlocks.push({
          x: gx * 52 + (lot ? 13 : -10) + (n - 0.5) * 9,
          y: gy * 48 + (lot ? -11 : 10) + (ln - 0.5) * 9,
          w: waterfront ? 24 + ln * 38 : 18 + ln * 28,
          h: waterfront ? 16 + seededNoise(ln * 4) * 34 : 16 + seededNoise(ln * 5) * 32,
          z: waterfront ? 10 + ln * 38 : zBase * (0.72 + ln * 0.7),
          tint: downtown > 0.42 && ln > 0.62 ? "glass" : center > 0.35 ? "tower" : "white",
        });
      }
    }
  }

  for (let i = -13; i <= 13; i += 1) {
    cityRoads.push({ x1: i * 52, y1: -440, x2: i * 52 + Math.sin(i * 0.7) * 28, y2: 440, major: i % 5 === 0 });
  }
  for (let i = -8; i <= 8; i += 1) {
    cityRoads.push({ x1: -710, y1: i * 48, x2: 710, y2: i * 48 + Math.cos(i * 0.9) * 20, major: i % 4 === 0 });
  }
  cityRoads.push({ x1: -690, y1: -315, x2: 640, y2: 265, major: true });
  cityRoads.push({ x1: -620, y1: 355, x2: 680, y2: -240, major: true });
  cityRoads.push({ x1: -440, y1: -420, x2: 470, y2: 420, major: true });

  const placements = [
    ["PON", 25, -20, RED],
    ["WISHLIST", -115, -155, WHITE],
    ["DISCORD", 155, -130, WHITE],
    ["YOUTUBE", 260, 80, WHITE],
    ["TIKTOK", -30, 175, WHITE],
    ["INSTAGRAM", -330, -210, WHITE],
    ["MARS", 345, -190, WHITE],
    ["DEVCI", -380, 135, WHITE],
    ["PUBLISHER", 350, 210, RED],
    ["TASKS", 125, 255, RED],
    ["FAQ", -20, -270, WHITE],
    ["TEAM", -500, -25, WHITE],
  ];
  placements.forEach(([label, x, y, color], index) => {
    cityNeurons.push({ label, x, y, z: 64 + seededNoise(index + 900) * 70, color });
  });

  cityLandmarks.push(
    { x: 18, y: -48, w: 34, h: 34, z: 310, type: "spire" },
    { x: 118, y: -18, w: 28, h: 42, z: 260, type: "antenna" },
    { x: -90, y: 32, w: 46, h: 38, z: 220, type: "core" },
    { x: 238, y: 98, w: 42, h: 34, z: 188, type: "stack" },
    { x: -260, y: -124, w: 36, h: 32, z: 176, type: "needle" },
  );
  cityLandmarks.forEach((block) => {
    cityBlocks.push({ ...block, tint: "glass", landmark: true });
  });

  cityScanLabels.push(
    { text: "ROUTE_01", x: -300, y: -188 },
    { text: "855.31", x: -172, y: -236 },
    { text: "557.40", x: 4, y: 12 },
    { text: "343.74", x: 340, y: 90 },
    { text: "984.71", x: -282, y: 225 },
    { text: "P.O.N. TRACE", x: 50, y: -46 },
  );
}

seedCity();

const publisherProjects = [
  {
    title: "P.O.N.",
    image: "./assets/og_preview_v2.png",
    desc: "TEAM VAC signal project. VHS horror interface, recovered tapes and Steam wishlist target.",
    featured: true,
  },
  {
    title: "Provoron",
    image: "./assets/publisher/provoron.jpg",
    desc: "Hand-drawn, touching and atmospheric tale of coming of age and self-acceptance.",
  },
  {
    title: "Lost in the Roots",
    image: "./assets/publisher/lost_in_the_roots.jpg",
    desc: "Haunting adventure puzzle wrapped in a grim, tangled mystery.",
  },
  {
    title: "Kaiju Cleaner Simulator",
    image: "./assets/publisher/kaiju_cleaner.png",
    desc: "Co-op cleanup simulator about giant kaiju carcasses after epic battles.",
  },
  {
    title: "BUS: Bro u Survived",
    image: "./assets/publisher/bus_bro_u_survived.jpg",
    desc: "Co-op story-driven survival adventure with a bus, zombies and an epidemic mystery.",
  },
];

function publisherHtml() {
  const cards = publisherProjects.map((project, index) => `
    <article class="publisher-card${project.featured ? " publisher-card--featured" : ""}">
      <div class="publisher-shot">
        <img src="${project.image}" alt="${project.title}" loading="lazy" />
      </div>
      <div class="publisher-card-meta">
        <span>PROJECT_${String(index + 1).padStart(2, "0")}</span>
        <h2>${project.title}</h2>
        <p>${project.desc}</p>
      </div>
    </article>
  `).join("");

  return `
    <div class="publisher-dossier">
      <div class="publisher-hero">
        <img class="publisher-hero-bg" src="./assets/publisher/spaghetti_cat_header.jpg" alt="Spaghetti Cat" loading="lazy" />
        <div class="publisher-hero-overlay">
          <img class="publisher-icon" src="./assets/publisher/spaghetti_cat_icon.png" alt="" loading="lazy" />
          <span>[ VERIFIED EXTERNAL NODE ]</span>
          <h2>SPAGHETTI CAT</h2>
          <p>Publishing and developer-support partner for indie games. Public signal: interesting games made with soul.</p>
          <div class="publisher-actions">
            <a href="${URL_PUBLISHER_SITE}" target="_blank" rel="noopener noreferrer">OPEN SITE</a>
            <a href="${URL_PUBLISHER_STEAM}" target="_blank" rel="noopener noreferrer">STEAM CURATOR</a>
          </div>
        </div>
      </div>
      <div class="publisher-mirror">
        <div class="publisher-mirror-head">
          <span>LIVE_SITE_MIRROR</span>
          <b>spaghetticat.io</b>
        </div>
        <iframe
          title="Spaghetti Cat live mirror"
          src="${URL_PUBLISHER_SITE}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
        <p>If the live mirror is blocked by the publisher site, use OPEN SITE above.</p>
      </div>
      <div class="publisher-grid">${cards}</div>
      <div class="publisher-terminal">
        <b>SERVICE VECTOR</b>
        <span>&gt; publishing support / marketing / PR / QA / development support</span>
        <span>&gt; campaign coverage from announcement through release and beyond</span>
        <span>&gt; contact channel: info@spaghetticat.io</span>
      </div>
    </div>
  `;
}

function marsHtml() {
  return `
    <div class="developer-dossier developer-dossier--mars">
      <div class="developer-photo">
        <img src="./assets/developers/team_vac_mask.png" alt="Mars developer" loading="lazy" />
        <div class="developer-photo-tag">VISUAL NODE / MARSDEVGOD</div>
      </div>
      <div class="developer-profile">
        <span>[ VERIFIED TEAM NODE ]</span>
        <h2>MARS DEVELOPER</h2>
        <p>Creative signal linked to TEAM VAC OS. Social vector: marsdevgod.</p>
        <div class="developer-actions">
          <a href="${URL_MARS_INSTAGRAM}" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
          <a href="${URL_MARS_TIKTOK}" target="_blank" rel="noopener noreferrer">TIKTOK</a>
          <a href="${URL_MARS_YOUTUBE}" target="_blank" rel="noopener noreferrer">YOUTUBE</a>
        </div>
        <div class="developer-terminal">
          <b>IDENTITY TRACE</b>
          <span>&gt; handle: marsdevgod</span>
          <span>&gt; role: developer / visual operator</span>
          <span>&gt; status: connected to TEAM VAC signal map</span>
        </div>
      </div>
    </div>
  `;
}

function devciHtml() {
  return `
    <div class="developer-dossier developer-dossier--devci">
      <div class="developer-photo">
        <img src="./assets/developers/team_vac_mask.png" alt="Devci developer" loading="lazy" />
        <div class="developer-photo-tag">CORE NODE / DEVCI</div>
      </div>
      <div class="developer-profile">
        <span>[ VERIFIED TEAM NODE ]</span>
        <h2>DEVELOPER DEVCI</h2>
        <p>Primary creator signal for TEAM VAC OS and P.O.N. Social vector: devci.</p>
        <div class="developer-actions">
          <a href="${URL_DEVCI_INSTAGRAM}" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
          <a href="${URL_DEVCI_TIKTOK}" target="_blank" rel="noopener noreferrer">TIKTOK</a>
          <a href="${URL_DEVCI_YOUTUBE}" target="_blank" rel="noopener noreferrer">YOUTUBE</a>
        </div>
        <div class="developer-terminal">
          <b>IDENTITY TRACE</b>
          <span>&gt; handle: devci / devci_inc</span>
          <span>&gt; role: developer / project operator</span>
          <span>&gt; status: linked to TEAM VAC core</span>
        </div>
      </div>
    </div>
  `;
}

const taskItems = [
  {
    id: "pcgamer",
    number: "01",
    title: "Teaser for PC Gamer Show",
    note: "Тизер для PC Gamer Show. Монтаж, звук, финальный визуальный контроль.",
    progress: 75,
    href: "./tasks/pc-gamer-show.html",
    signal: "TRAILER_SIGNAL",
  },
  {
    id: "tiktok",
    number: "02",
    title: "Create 2 TikToks",
    note: "Два TikTok-ролика: референсы, структура, хуки, монтажные заметки.",
    progress: 0,
    href: "./tasks/tiktok-pipeline.html",
    signal: "SHORTS_VECTOR",
  },
  {
    id: "weekvision",
    number: "03",
    title: "WeekVision Playtest",
    note: "Рекомпозиция проекта на составные части и сборка WeekVision Play test.",
    progress: 15,
    href: "./tasks/weekvision-playtest.html",
    signal: "BUILD_RECOMPOSE",
  },
];

function taskBoardHtml() {
  const cards = taskItems.map((item) => `
    <article class="task-card task-card--${item.id}" style="--progress:${item.progress}">
      <div class="task-card-top">
        <span>${item.signal}</span>
        <b>${item.number}</b>
      </div>
      <h2>${item.title}</h2>
      <p>${item.note}</p>
      <div class="task-loadline" aria-label="${item.progress}% complete">
        <i></i>
        <strong>${item.progress}%</strong>
      </div>
      <div class="task-meta">
        <span>&gt; status: ${item.progress === 0 ? "waiting for input" : "active"}</span>
        <span>&gt; route: ${item.href.replace("./", "")}</span>
      </div>
      <a class="task-open" href="${item.href}" target="_blank" rel="noopener noreferrer">OPEN PROGRESS NODE</a>
    </article>
  `).join("");

  return `
    <div class="task-dossier">
      <header class="task-command">
        <div>
          <span>[ ACTIVE WORKLOAD NODE ]</span>
          <h2>TASKBOARD / TEAM VAC</h2>
          <p>Красная загрузка показывает текущий процент. Каждый блок ведет в отдельную страницу-досье для прогресса, рефов и заметок.</p>
        </div>
        <div class="task-total">
          <b>AVG</b>
          <strong>30%</strong>
          <em>WORKLOAD</em>
        </div>
      </header>
      <section class="task-grid">${cards}</section>
      <footer class="task-footer">
        <span>&gt; click a task to open its progress dossier in a new tab</span>
        <span>&gt; edit the linked HTML files to publish new progress like an Obsidian note</span>
      </footer>
    </div>
  `;
}

const copy = {
  en: {
    gateTitle: "TEAM VAC OS",
    gateSub: "USER CONFIRMATION REQUIRED",
    startButton: "CONFIRM",
    gateFooter: "ENTER / SPACE / LEFT CLICK",
    hack: "P.O.N. malware hacked you.",
    unlock: "Open the Steam page and add to wishlist to unlock.",
    wishlist: "ADD TO WISHLIST",
    hint1: "Click the PON node",
    hint2: "Or type a tag in search",
    mars:  {
      title: "DEVELOPER_MARS",
      html: marsHtml,
      panelClass: "panel-body--developer",
    },
    devci: {
      title: "DEVELOPER_DEVCI",
      html: devciHtml,
      panelClass: "panel-body--developer",
    },
    publisher: {
      title: "PUBLISHER / SPAGHETTI CAT",
      html: publisherHtml,
      panelClass: "panel-body--publisher",
    },
    tasks: {
      title: "TASKS / WORKLOAD",
      html: taskBoardHtml,
      panelClass: "panel-body--tasks",
    },
    faq:   { title: "FAQ",             body: "[ DATA ENCRYPTED ]" },
    about: { title: "ABOUT_TEAM",      body: "Team VAC - Void Analytics Core" },
  },
  ru: {
    gateTitle: "TEAM VAC OS",
    gateSub: "ТРЕБУЕТСЯ ПОДТВЕРЖДЕНИЕ ДОСТУПА",
    startButton: "ПОДТВЕРДИТЬ",
    gateFooter: "ENTER / SPACE / ЛКМ",
    hack: "Вирус P.O.N. получил доступ к системе.",
    unlock: "Добавить игру в список желаемого Steam для разблокировки.",
    wishlist: "ДОБАВИТЬ В СПИСОК ЖЕЛАЕМОГО",
    hint1: "Кликнуть по узлу PON",
    hint2: "Или ввести тег в поиск",
    mars:  {
      title: "DEVELOPER_MARS",
      html: marsHtml,
      panelClass: "panel-body--developer",
    },
    devci: {
      title: "DEVELOPER_DEVCI",
      html: devciHtml,
      panelClass: "panel-body--developer",
    },
    publisher: {
      title: "PUBLISHER / SPAGHETTI CAT",
      html: publisherHtml,
      panelClass: "panel-body--publisher",
    },
    tasks: {
      title: "TASKS / WORKLOAD",
      html: taskBoardHtml,
      panelClass: "panel-body--tasks",
    },
    faq:   { title: "FAQ",             body: "[ ДАННЫЕ ЗАШИФРОВАНЫ ]" },
    about: { title: "ABOUT_TEAM",      body: "[ ДАННЫЕ ЗАШИФРОВАНЫ ]" },
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
  if (!bootDone) applyDefaultGraphView();
}

function applyDefaultGraphView() {
  if (viewTouched) return;
  if (width < 720) {
    yaw = -0.18;
    pitch = 0.16;
    zoom = 0.56;
    panX = 0;
    panY = -48;
  } else {
    yaw = -0.28;
    pitch = 0.22;
    zoom = 1;
    panX = 70;
    panY = 8;
  }
}

addEventListener("resize", resize);
resize();

function setLanguage(lang) {
  activeLang = copy[lang] ? lang : "en";
  document.documentElement.lang = activeLang;
  i18nNodes.forEach((node) => {
    const key = node.dataset.i18n;
    const value = copy[activeLang][key];
    if (typeof value === "string") node.textContent = value;
  });
  langButtons.forEach((button) => button.classList.toggle("active", button.dataset.lang === activeLang));
  if (panelActive) refreshPanelText();
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
    "WISHLIST_PON",
    "DISCORD_PON",
    "YOUTUBE_PON",
    "TIKTOK_PON",
    "INSTAGRAM",
    "DEVELOPER_MARS",
    "DEVELOPER_DEVCI",
    "PUBLISHER",
    "TASKS",
    "FAQ",
    "ABOUT_TEAM",
  ];

  seeds.forEach((label, i) => {
    const angle = (i / seeds.length) * Math.PI * 2;
    const radius = 190 + Math.random() * 130;
    const node = {
      label,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.68,
      z: -160 + Math.random() * 340,
      color: label === "PON" || label === "TASKS" ? RED : WHITE,
      pulse: 0,
      alert: label === "PON" || label === "TASKS" ? 0.35 : 0,
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
  if (panelActive) closePanel(false);
  const target = findOrCreateNode(text);
  nodes[target].pulse = 1;
  nodes[target].alert = 1;
  sparks.push({
    text: text.toUpperCase(),
    source: sourcePoint || worldFromScreen(220, 44, -410),
    target,
    start: performance.now(),
    duration: 820,
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
  window.open(URL_STEAM, "_blank", "noopener,noreferrer");
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
  if (event.key === "Escape") {
    if (galleryActive) closeGallery(true);
    else if (panelActive) closePanel(true);
  }
});

closeGalleryButton.addEventListener("click", () => closeGallery(true));
closePanelButton.addEventListener("click", () => closePanel(true));

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
  if (!bootDone || galleryActive || panelActive) return;
  dragging = true;
  dragStart = [event.clientX, event.clientY, event.clientX, event.clientY];
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging || !dragStart || galleryActive || panelActive) return;
  const [px, py, startX, startY] = dragStart;
  const dx = event.clientX - px;
  const dy = event.clientY - py;
  dragStart = [event.clientX, event.clientY, startX, startY];
  if (event.shiftKey) {
    panX += dx;
    panY += dy;
  } else {
    yaw += dx * 0.006;
    pitch = Math.max(-1.12, Math.min(1.12, pitch + dy * 0.005));
  }
  viewTouched = true;
});

canvas.addEventListener("pointerup", (event) => {
  if (dragStart && bootDone && !galleryActive && !panelActive) {
    const [, , startX, startY] = dragStart;
    const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
    const target = moved < 9 ? hitNode(event.clientX, event.clientY) : null;
    if (target !== null) {
      launchActivity(nodes[target].label, worldFromScreen(event.clientX, event.clientY, -410));
    }
  }
  dragging = false;
  dragStart = null;
});

canvas.addEventListener("pointercancel", () => {
  dragging = false;
  dragStart = null;
});

canvas.addEventListener("wheel", (event) => {
  if (!bootDone || galleryActive || panelActive) return;
  event.preventDefault();
  viewTouched = true;
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

function refreshPanelText() {
  const key = panel.dataset.key;
  const entry = key && copy[activeLang][key];
  if (!entry) return;
  panelTitle.textContent = entry.title;
  panelBody.className = "panel-body";
  if (entry.panelClass) panelBody.classList.add(entry.panelClass);
  if (entry.html) {
    panelBody.innerHTML = typeof entry.html === "function" ? entry.html() : entry.html;
  } else {
    panelBody.textContent = entry.body;
  }
}

function openPanel(key) {
  panelActive = true;
  panel.dataset.key = key;
  refreshPanelText();
  panel.classList.remove("hidden");
  dragging = false;
  beep(360, 0.18, 0.04);
}

function closePanel(playSound = true) {
  panelActive = false;
  panel.classList.add("hidden");
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

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function smootherStep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function cityProject(x, y, z, progress) {
  const travel = easeInOut(Math.min(1, Math.max(0, progress)));
  const side = Math.min(1, Math.max(0, (progress - 0.28) / 0.62));
  const cameraZoom = 0.48 + travel * 0.9;
  const yawCity = -0.66 + side * 0.2;
  const pitchCity = -0.96 + side * 1.34;
  const panCityX = side * -58;
  const panCityY = -22 + side * 118;

  x += Math.sin(progress * Math.PI) * 9;
  y += (1 - travel) * 52;

  const cy = Math.cos(yawCity);
  const sy = Math.sin(yawCity);
  const cp = Math.cos(pitchCity);
  const sp = Math.sin(pitchCity);
  [x, y] = [x * cy - y * sy, x * sy + y * cy];
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  const depth = z + 780;
  const scale = (FOCAL / Math.max(210, depth)) * cameraZoom;
  return [
    width / 2 + panCityX + x * scale,
    height / 2 + panCityY + y * scale,
    scale,
    z,
  ];
}

function polygon(points, fill, stroke = null) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawCityRoad(x1, y1, x2, y2, progress, major = false) {
  const [sx1, sy1] = cityProject(x1, y1, 0, progress);
  const [sx2, sy2] = cityProject(x2, y2, 0, progress);
  ctx.strokeStyle = major ? "rgba(15,18,22,.86)" : "rgba(28,31,36,.72)";
  ctx.lineWidth = major ? 7 : 3;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  if (major) {
    ctx.strokeStyle = "rgba(242,242,238,.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(233,22,47,.24)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 18]);
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawCityBlock(block, progress, reveal) {
  const z = block.z * reveal;
  const base = [
    cityProject(block.x - block.w / 2, block.y - block.h / 2, 0, progress),
    cityProject(block.x + block.w / 2, block.y - block.h / 2, 0, progress),
    cityProject(block.x + block.w / 2, block.y + block.h / 2, 0, progress),
    cityProject(block.x - block.w / 2, block.y + block.h / 2, 0, progress),
  ];
  const top = [
    cityProject(block.x - block.w / 2, block.y - block.h / 2, z, progress),
    cityProject(block.x + block.w / 2, block.y - block.h / 2, z, progress),
    cityProject(block.x + block.w / 2, block.y + block.h / 2, z, progress),
    cityProject(block.x - block.w / 2, block.y + block.h / 2, z, progress),
  ];
  const alpha = Math.min(1, 0.18 + reveal * 0.82);
  const glass = block.tint === "glass";
  const tower = block.tint === "tower";
  const roof = glass ? `rgba(255,255,255,${0.34 * alpha})` : tower ? `rgba(242,242,238,${0.3 * alpha})` : `rgba(242,242,238,${0.24 * alpha})`;
  const sideA = glass ? `rgba(242,242,238,${0.2 * alpha})` : `rgba(242,242,238,${0.15 * alpha})`;
  const sideB = glass ? `rgba(242,242,238,${0.12 * alpha})` : `rgba(242,242,238,${0.09 * alpha})`;
  const line = glass ? `rgba(255,255,255,${0.48 * alpha})` : `rgba(242,242,238,${0.32 * alpha})`;

  polygon([base[0], base[1], base[2], base[3]], "rgba(242,242,238,.018)", "rgba(242,242,238,.1)");
  if (reveal <= 0.02) return;

  polygon([base[1], base[2], top[2], top[1]], sideB, "rgba(242,242,238,.09)");
  polygon([base[2], base[3], top[3], top[2]], sideA, "rgba(242,242,238,.09)");
  polygon([top[0], top[1], top[2], top[3]], roof, line);

  if (block.z * reveal > 80) {
    const cap = cityProject(block.x, block.y, z + 4, progress);
    ctx.strokeStyle = glass ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.22)";
    ctx.beginPath();
    ctx.arc(cap[0], cap[1], Math.max(2, 5 * cap[2]), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (block.landmark && reveal > 0.35) {
    const topCenter = cityProject(block.x, block.y, z + (block.type === "spire" ? 74 : 42) * reveal, progress);
    const roofCenter = cityProject(block.x, block.y, z, progress);
    ctx.strokeStyle = block.type === "spire" || block.type === "antenna" ? "rgba(233,22,47,.72)" : "rgba(255,255,255,.36)";
    ctx.lineWidth = block.type === "spire" ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(roofCenter[0], roofCenter[1]);
    ctx.lineTo(topCenter[0], topCenter[1]);
    ctx.stroke();
    if (block.type === "core") {
      ctx.strokeStyle = "rgba(233,22,47,.45)";
      ctx.beginPath();
      ctx.arc(roofCenter[0], roofCenter[1], Math.max(5, 12 * roofCenter[2]), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = `rgba(255,255,255,${0.055 * alpha})`;
  ctx.lineWidth = 1;
  const floors = Math.min(5, Math.floor(block.z / 13));
  for (let i = 1; i <= floors; i += 1) {
    const fz = z * (i / (floors + 1));
    const p1 = cityProject(block.x + block.w / 2, block.y - block.h / 2, fz, progress);
    const p2 = cityProject(block.x + block.w / 2, block.y + block.h / 2, fz, progress);
    const p3 = cityProject(block.x - block.w / 2, block.y + block.h / 2, fz, progress);
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.stroke();
  }
}

function drawCityRiver(progress) {
  const waterTop = [
    cityProject(-860, -540, -8, progress),
    cityProject(860, -540, -8, progress),
    cityProject(820, -430, -8, progress),
    cityProject(-820, -430, -8, progress),
  ];
  const waterBottom = [
    cityProject(-860, 430, -8, progress),
    cityProject(820, 420, -8, progress),
    cityProject(880, 555, -8, progress),
    cityProject(-880, 555, -8, progress),
  ];
  polygon(waterTop, "rgba(0,0,0,.76)", "rgba(242,242,238,.14)");
  polygon(waterBottom, "rgba(0,0,0,.82)", "rgba(242,242,238,.16)");

  for (let i = 0; i < 32; i += 1) {
    const y = i % 2 ? -485 : 495;
    const x1 = -780 + i * 52;
    const p1 = cityProject(x1, y + Math.sin(i) * 10, -6, progress);
    const p2 = cityProject(x1 + 34, y + Math.sin(i + 1) * 10, -6, progress);
    ctx.strokeStyle = "rgba(242,242,238,.11)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
}

function drawCityIsland(progress) {
  const land = [
    cityProject(-760, -425, 0, progress),
    cityProject(765, -405, 0, progress),
    cityProject(725, 410, 0, progress),
    cityProject(-760, 395, 0, progress),
  ];
  polygon(land, "rgba(242,242,238,.08)", "rgba(242,242,238,.22)");

  const piers = [
    [-720, -438, 86, 18], [-540, -438, 120, 18], [520, -422, 90, 20],
    [-650, 414, 120, 20], [-340, 414, 84, 18], [600, 425, 140, 20],
  ];
  piers.forEach(([x, y, w, h]) => {
    const pts = [
      cityProject(x, y, 1, progress),
      cityProject(x + w, y, 1, progress),
      cityProject(x + w, y + h, 1, progress),
      cityProject(x, y + h, 1, progress),
    ];
    polygon(pts, "rgba(242,242,238,.22)", "rgba(242,242,238,.24)");
  });
}

function drawCityPark(x, y, w, h, progress) {
  const points = [
    cityProject(x - w / 2, y - h / 2, 1, progress),
    cityProject(x + w / 2, y - h / 2, 1, progress),
    cityProject(x + w / 2, y + h / 2, 1, progress),
    cityProject(x - w / 2, y + h / 2, 1, progress),
  ];
  polygon(points, "rgba(242,242,238,.055)", "rgba(242,242,238,.2)");
  for (let i = 0; i < 14; i += 1) {
    const px = x - w / 2 + seededNoise(i + x) * w;
    const py = y - h / 2 + seededNoise(i + y + 45) * h;
    const [sx, sy, scale] = cityProject(px, py, 6 + seededNoise(i) * 8, progress);
    ctx.fillStyle = "rgba(242,242,238,.24)";
    ctx.fillRect(sx - 2 * scale, sy - 3 * scale, 4 * scale, 6 * scale);
  }
}

function drawPowerLine(progress) {
  const pylons = [
    [-430, -240],
    [-250, -160],
    [-70, -70],
    [130, 10],
    [315, 110],
  ];
  const wires = [];
  pylons.forEach(([x, y], index) => {
    const base = cityProject(x, y, 0, progress);
    const top = cityProject(x, y, 70, progress);
    const left = cityProject(x - 18, y, 40, progress);
    const right = cityProject(x + 18, y, 40, progress);
    ctx.strokeStyle = "rgba(18,20,24,.58)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.lineTo(top[0], top[1]);
    ctx.moveTo(left[0], left[1]);
    ctx.lineTo(right[0], right[1]);
    ctx.moveTo(left[0], left[1]);
    ctx.lineTo(base[0], base[1]);
    ctx.moveTo(right[0], right[1]);
    ctx.lineTo(base[0], base[1]);
    ctx.stroke();
    wires.push([left, top, right]);
    if (index > 0) {
      const prev = wires[index - 1];
      ctx.strokeStyle = "rgba(18,20,24,.42)";
      ctx.lineWidth = 1;
      for (let j = 0; j < 3; j += 1) {
        ctx.beginPath();
        ctx.moveTo(prev[j][0], prev[j][1]);
        ctx.lineTo(wires[index][j][0], wires[index][j][1]);
        ctx.stroke();
      }
    }
  });
}

function drawCityScanLayer(progress, cameraProgress, reveal) {
  const scan = Math.min(1, Math.max(0, (progress - 0.16) / 0.34));
  if (scan <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const sweepX = -640 + scan * 1280;
  const top = cityProject(sweepX, -430, 190, cameraProgress);
  const bottom = cityProject(sweepX + 130, 420, 0, cameraProgress);
  ctx.strokeStyle = `rgba(233,22,47,${0.78 * (1 - Math.abs(scan - 0.5) * 0.7)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.lineTo(bottom[0], bottom[1]);
  ctx.stroke();

  cityNeurons.forEach((node, index) => {
    const appear = Math.min(1, Math.max(0, reveal * 1.25 - index * 0.04));
    if (appear <= 0) return;
    const [baseX, baseY] = cityProject(node.x, node.y, 0, cameraProgress);
    const [topX, topY, scale] = cityProject(node.x, node.y, node.z * 0.8, cameraProgress);
    ctx.strokeStyle = node.color === RED ? `rgba(233,22,47,${appear})` : `rgba(242,242,238,${0.72 * appear})`;
    ctx.lineWidth = node.color === RED ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(topX, topY);
    ctx.stroke();
    const r = Math.max(8, 14 * scale);
    ctx.beginPath();
    ctx.arc(topX, topY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(topX - r * 0.32, topY - r * 0.32, r * 0.64, r * 0.64);
  });

  const labelAlpha = Math.min(1, Math.max(0, (progress - 0.28) / 0.24));
  cityScanLabels.forEach((label, index) => {
    const [sx, sy, scale] = cityProject(label.x, label.y, 82 + (index % 3) * 28, cameraProgress);
    text(label.text, sx, sy, index % 3 === 0 ? RED : WHITE, Math.max(7, 9 * scale), "left", "700");
    ctx.globalAlpha = labelAlpha;
    ctx.strokeStyle = index % 3 === 0 ? "rgba(233,22,47,.32)" : "rgba(242,242,238,.18)";
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy + 10);
    ctx.lineTo(sx - 42 * scale, sy + 26 * scale);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function drawCityNeuron(neuron, index, progress, reveal) {
  const stem = Math.max(0, reveal - index * 0.035);
  const [baseX, baseY] = cityProject(neuron.x, neuron.y, 0, progress);
  const [topX, topY, scale] = cityProject(neuron.x, neuron.y, neuron.z * Math.min(1, stem * 1.8), progress);
  const alpha = Math.min(1, stem * 2.4);
  if (alpha <= 0) return;
  ctx.strokeStyle = neuron.color === RED ? `rgba(233,22,47,${alpha})` : `rgba(242,242,238,${0.58 * alpha})`;
  ctx.lineWidth = neuron.color === RED ? 2 : 1;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(topX, topY);
  ctx.stroke();
  const r = (12 + Math.sin(bgPhase * 12 + index) * 2) * scale;
  ctx.beginPath();
  ctx.arc(topX, topY, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(topX, topY, r * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = neuron.color === RED ? RED : WHITE;
  ctx.fillRect(topX - 2, topY - 2, 4, 4);
  text(neuron.label, topX + 12, topY - 8, neuron.color, Math.max(8, 10 * scale), "left", "700");
}

function mapProject(x, y, progress) {
  const settle = easeInOut(Math.min(1, Math.max(0, progress / 0.72)));
  const zoomMap = 0.92 + (1 - settle) * 0.22;
  const angle = (-0.24 + settle * 0.24) + Math.sin(progress * Math.PI) * 0.018;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const rx = x * ca - y * sa;
  const ry = x * sa + y * ca;
  const fit = Math.min(width / 1180, height / 700) * 1.1 * zoomMap;
  return [
    width * (0.5 - 0.06 * (1 - settle)) + rx * fit,
    height * (0.52 + 0.02 * (1 - settle)) + ry * fit,
    fit,
  ];
}

function drawPolyline(points, progress, stroke, lineWidth = 1, dash = null) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const [sx, sy] = mapProject(x, y, progress);
    if (index === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function drawFlatMapRoads(progress) {
  const roadAlpha = Math.min(1, Math.max(0, (progress - 0.08) / 0.34));
  for (let i = -9; i <= 9; i += 1) {
    const x = i * 55 + Math.sin(i * 0.8) * 15;
    drawPolyline([[x, -315], [x + Math.sin(i) * 42, 312]], progress, `rgba(242,242,238,${0.16 * roadAlpha})`, i % 4 === 0 ? 1.6 : 0.8);
  }
  for (let i = -5; i <= 5; i += 1) {
    const y = i * 54 + Math.cos(i) * 11;
    drawPolyline([[-545, y], [540, y + Math.sin(i * 1.4) * 24]], progress, `rgba(242,242,238,${0.17 * roadAlpha})`, i % 3 === 0 ? 1.5 : 0.8);
  }

  const arterials = [
    [[-520, -255], [-260, -130], [12, -35], [286, 98], [520, 238]],
    [[-460, 245], [-210, 125], [46, 20], [250, -98], [505, -230]],
    [[-310, -300], [-180, -95], [-55, 118], [80, 286]],
    [[124, -310], [92, -128], [70, 80], [38, 298]],
  ];
  arterials.forEach((line, i) => {
    drawPolyline(line, progress, i < 2 ? `rgba(233,22,47,${0.28 * roadAlpha})` : `rgba(242,242,238,${0.22 * roadAlpha})`, i < 2 ? 1.7 : 1.1, i < 2 ? [8, 12] : null);
  });

  for (let i = 0; i < 135; i += 1) {
    const n = seededNoise(i + 6000);
    const x = -520 + seededNoise(i * 7) * 1040;
    const y = -290 + seededNoise(i * 11) * 580;
    if (Math.abs(x) + Math.abs(y) > 760 + n * 80) continue;
    const [sx, sy, scale] = mapProject(x, y, progress);
    ctx.fillStyle = `rgba(242,242,238,${0.09 * roadAlpha + n * 0.07 * roadAlpha})`;
    ctx.fillRect(sx, sy, Math.max(1, scale * 2.5), Math.max(1, scale * 2.5));
  }
}

function insideMapShape(x, y) {
  const edge = 305 - Math.abs(x) * 0.13 + Math.sin(x * 0.012) * 36;
  return Math.abs(y + Math.sin(x * 0.01) * 26) < edge && Math.abs(x) < 575;
}

function drawSatelliteCityMass(progress) {
  const alpha = Math.min(1, Math.max(0, (progress - 0.02) / 0.3));
  const massCount = width < 720 ? 330 : 520;
  const traceCount = width < 720 ? 52 : 80;
  for (let i = 0; i < massCount; i += 1) {
    const n1 = seededNoise(i * 13 + 12);
    const n2 = seededNoise(i * 17 + 90);
    const x = -555 + n1 * 1110;
    const y = -320 + n2 * 640;
    if (!insideMapShape(x, y)) continue;
    const district = Math.max(0, 1 - Math.hypot(x * 0.75, y * 1.12) / 420);
    const [sx, sy, scale] = mapProject(x, y, progress);
    const w = (2 + seededNoise(i * 19) * 8 + district * 8) * scale;
    const h = (1 + seededNoise(i * 23) * 5 + district * 5) * scale;
    ctx.fillStyle = `rgba(242,242,238,${(0.035 + district * 0.09) * alpha})`;
    ctx.fillRect(sx, sy, Math.max(1, w), Math.max(1, h));
  }

  for (let i = 0; i < traceCount; i += 1) {
    const x = -520 + seededNoise(i * 31) * 1040;
    const y = -290 + seededNoise(i * 37) * 580;
    if (!insideMapShape(x, y)) continue;
    const len = 28 + seededNoise(i * 43) * 90;
    const angle = (Math.round(seededNoise(i * 47) * 4) * Math.PI) / 4;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    if (!insideMapShape(x2, y2)) continue;
    drawPolyline([[x, y], [x2, y2]], progress, `rgba(242,242,238,${0.08 * alpha})`, 1);
  }
}

function drawFlatMapBoundary(progress) {
  drawPolyline(FLAT_MAP_BOUNDARY, progress, "rgba(233,22,47,.72)", 5, [9, 13]);
  drawPolyline(FLAT_MAP_BOUNDARY, progress, "rgba(233,22,47,.22)", 13, [9, 13]);
}

function drawFlatMapNodes(progress) {
  const reveal = Math.min(1, Math.max(0, (progress - 0.36) / 0.38));
  cityNeurons.forEach((node, index) => {
    const x = node.x * 1.05;
    const y = node.y * 0.92;
    const [sx, sy, scale] = mapProject(x, y, progress);
    const alpha = Math.min(1, Math.max(0, reveal * 1.25 - index * 0.045));
    if (alpha <= 0) return;
    const redNode = node.color === RED || index % 4 === 0;
    ctx.strokeStyle = redNode ? `rgba(233,22,47,${alpha})` : `rgba(242,242,238,${0.78 * alpha})`;
    ctx.lineWidth = redNode ? 2 : 1;
    const radius = (13 + Math.sin(bgPhase * 10 + index) * 1.2) * scale;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(sx - 3 * scale, sy - 3 * scale, 6 * scale, 6 * scale);
    text(`${Math.floor(170 + seededNoise(index + 90) * 820)}.${Math.floor(seededNoise(index + 200) * 99)}`, sx + 12, sy - 8, redNode ? RED : WHITE, Math.max(7, 9 * scale), "left", "700");
  });

  const traceAlpha = Math.min(1, Math.max(0, (progress - 0.55) / 0.32));
  for (let i = 1; i < cityNeurons.length; i += 1) {
    const a = cityNeurons[0];
    const b = cityNeurons[i];
    drawPolyline([[a.x * 1.05, a.y * 0.92], [b.x * 1.05, b.y * 0.92]], progress, i % 3 === 0 ? `rgba(233,22,47,${0.36 * traceAlpha})` : `rgba(242,242,238,${0.22 * traceAlpha})`, 1);
  }
}

function drawFlatCtosMap(progress) {
  const mapFade = Math.min(1, Math.max(0, progress / 0.18));
  ctx.save();
  ctx.globalAlpha = mapFade;
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, width, height);

  const land = [
    [-600, -280], [-450, -360], [-180, -330], [38, -358], [285, -324],
    [540, -235], [575, -55], [510, 38], [580, 165], [390, 272],
    [116, 342], [-96, 300], [-330, 345], [-545, 214], [-585, 10],
  ];
  const landScreen = land.map(([x, y]) => mapProject(x, y, progress));
  polygon(landScreen, "rgba(242,242,238,.035)", "rgba(242,242,238,.11)");

  drawSatelliteCityMass(progress);
  drawFlatMapRoads(progress);
  drawFlatMapBoundary(progress);
  drawFlatMapNodes(progress);

  ctx.strokeStyle = "rgba(242,242,238,.15)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const sweep = Math.min(1, Math.max(0, (progress - 0.62) / 0.28));
  ctx.strokeStyle = `rgba(233,22,47,${0.8 * sweep})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * (0.12 + sweep * 0.68), 0);
  ctx.lineTo(width * (0.02 + sweep * 0.86), height);
  ctx.stroke();

  ctx.restore();
}

function drawBoundaryDissolveShards(dissolve) {
  const d = smootherStep(dissolve);
  if (d <= 0) return;
  const alpha = Math.sin(Math.PI * d) * 0.42 + Math.max(0, 1 - d) * 0.16;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const shardCount = width < 720 ? 52 : 86;
  for (let i = 0; i < shardCount; i += 1) {
    const segment = i % (FLAT_MAP_BOUNDARY.length - 1);
    const a = FLAT_MAP_BOUNDARY[segment];
    const b = FLAT_MAP_BOUNDARY[segment + 1];
    const n = seededNoise(i * 31 + 1700);
    const x = a[0] + (b[0] - a[0]) * n;
    const y = a[1] + (b[1] - a[1]) * n;
    const [sx, sy, scale] = mapProject(x, y, 1);
    const angle = seededNoise(i * 47 + 9) * Math.PI * 2;
    const drift = d * (8 + seededNoise(i * 53) * 58);
    const w = Math.max(3, (8 + seededNoise(i * 61) * 34) * scale);
    const h = Math.max(1, (1 + seededNoise(i * 67) * 3) * scale);
    ctx.fillStyle = `rgba(242,242,238,${alpha * (0.28 + seededNoise(i * 7) * 0.72)})`;
    ctx.fillRect(sx + Math.cos(angle) * drift, sy + Math.sin(angle) * drift, w, h);
  }
  ctx.restore();
}

function drawMapDissolveGlitch(dissolve) {
  const d = smootherStep(dissolve);
  if (d <= 0) return;
  ctx.save();
  ctx.globalAlpha = d * 0.78;
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, width, height);

  const soft = Math.sin(Math.PI * d);
  const center = height * 0.5;
  const bandHeight = height * (0.2 + soft * 0.18);
  const glow = ctx.createLinearGradient(0, center - bandHeight, 0, center + bandHeight);
  glow.addColorStop(0, "rgba(242,242,238,0)");
  glow.addColorStop(0.48, `rgba(242,242,238,${0.045 * soft})`);
  glow.addColorStop(0.5, `rgba(242,242,238,${0.075 * soft})`);
  glow.addColorStop(0.52, `rgba(242,242,238,${0.045 * soft})`);
  glow.addColorStop(1, "rgba(242,242,238,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = glow;
  ctx.fillRect(0, center - bandHeight, width, bandHeight * 2);
  ctx.restore();
}

function drawMonochromeCity3D(progress) {
  const phase = Math.min(1, Math.max(0, progress / 0.66));
  const reveal = Math.min(1, Math.max(0, phase / 0.42));
  const cameraProgress = 0.14 + easeInOut(phase) * 0.58;
  ctx.save();
  ctx.globalAlpha = Math.min(1, phase * 1.4);
  drawCityRiver(cameraProgress);
  drawCityIsland(cameraProgress);
  cityRoads.forEach((road) => drawCityRoad(road.x1, road.y1, road.x2, road.y2, cameraProgress, road.major));
  drawCityPark(-460, 255, 190, 74, cameraProgress);
  drawCityPark(380, -210, 180, 90, cameraProgress);
  drawCityPark(315, 250, 230, 76, cameraProgress);
  const sortedBlocks = cityBlocks
    .map((block, index) => ({ block, index, depth: cityProject(block.x, block.y, block.z, cameraProgress)[3] }))
    .sort((a, b) => a.depth - b.depth);
  const cityRenderStep = width < 720 ? 2 : 1;
  sortedBlocks.forEach(({ block, index }) => {
    if (cityRenderStep > 1 && !block.landmark && index % cityRenderStep !== 0) return;
    const localReveal = Math.min(1, Math.max(0, reveal * 1.16 - (index % 9) * 0.025));
    drawCityBlock(block, cameraProgress, localReveal);
  });
  drawPowerLine(cameraProgress);
  drawCityScanLayer(progress, cameraProgress, reveal);

  const flatten = Math.min(1, Math.max(0, (progress - 0.5) / 0.16));
  if (flatten > 0) {
    ctx.fillStyle = `rgba(3,4,5,${0.72 * flatten})`;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawCityIntro(elapsed) {
  const raw = (elapsed - CITY_INTRO_START) / (CITY_INTRO_END - CITY_INTRO_START);
  const progress = Math.min(1, Math.max(0, raw));
  drawBackground();
  if (progress < 0.68) {
    drawMonochromeCity3D(progress);
  }
  if (progress > 0.48) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (progress - 0.48) / 0.22);
    drawFlatCtosMap(Math.min(1, (progress - 0.48) / 0.52));
    ctx.restore();
  }

  const scan = Math.floor(progress * 100);
  text("TEAM VAC OS // CTOS CITY SIGNAL MAP", 26, 24, WHITE, width < 720 ? 11 : 14, "left", "700");
  text("BLACK/WHITE/RED TRACE LAYER / NEURAL OVERLAY", 26, 48, "rgba(242,242,238,.72)", 10);
  text(`MAP_SYNC ${String(scan).padStart(3, "0")}%  NODES ${String(cityNeurons.length).padStart(3, "0")}  CAMERA ${progress < .48 ? "CITY_ORBIT" : progress < .76 ? "FLATTENING" : "LOCKED_2D"}`, 26, 70, RED, 10);
  ctx.strokeStyle = RED;
  ctx.strokeRect(24, 102, Math.min(430, width - 48), 8);
  ctx.fillStyle = RED;
  ctx.fillRect(24, 102, Math.min(430, width - 48) * progress, 8);
  text(progress < 0.48 ? "> 3D CITY BREACH / EXTRUDING URBAN MESH" : progress < 0.76 ? "> FLATTENING CITY INTO CTOS MAP" : "> CAMERA LOCK / NEURAL ROUTES EMBEDDED", 26, 124, WHITE, 10);

  ctx.strokeStyle = "rgba(242,242,238,.28)";
  ctx.strokeRect(width - Math.min(340, width * .44) - 24, height - 112, Math.min(340, width * .44), 74);
  text("CITY MAP // TRACE_VECTOR", width - 42, height - 96, WHITE, 10, "right", "700");
  text("SOURCE: TEAM VAC / P.O.N. MALWARE", width - 42, height - 76, MUTED, 9, "right");
  text("STATUS: CITY GRAPH INJECTED", width - 42, height - 58, RED, 9, "right", "700");
}

function drawCityToGraphBase(t, dissolve = 0) {
  const d = smootherStep(dissolve);
  const fade = Math.max(0, (1 - d) ** 2);
  const mapFade = Math.max(0, (1 - d) ** 2.25);
  drawBackground();
  if (mapFade > 0.02) {
    ctx.save();
    ctx.globalAlpha = mapFade;
    drawFlatCtosMap(1);
    ctx.restore();
  }
  drawMapDissolveGlitch(dissolve);

  ctx.save();
  ctx.globalAlpha = Math.max(0, fade - 0.08);
  text("CITY MAP LOCKED // NEURAL ROUTES DETACHED", 26, 24, WHITE, width < 720 ? 10 : 13, "left", "700");
  text("MORPHING 2D SIGNAL POSITIONS INTO 3D TEAM VAC GRAPH", 26, 48, RED, 10);
  ctx.restore();
}

function drawHud() {
  const compact = width < 720;
  text(compact ? "TAP NODE  |  DRAG ORBIT  |  PINCH/SEARCH" : "CLICK NODE  |  LMB ORBIT  |  SHIFT+LMB PAN  |  WHEEL ZOOM", 24, compact ? 66 : 82, MUTED, 10);
  text("SIGNAL_CAPTURE / NODE INJECTION", 24, compact ? 92 : 112, RED, 11, "left", "700");
  if (!compact) {
    text("TEAM VAC OS // ctOS-style graph", width - 26, 24, WHITE, 13, "right", "700");
    text(`NODES ${String(nodes.length).padStart(3, "0")}  LINKS ${String(linkCount()).padStart(3, "0")}  EVENTS ${String(activity).padStart(3, "0")}`, width - 26, 48, MUTED, 10, "right");
  }
  ctx.strokeStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(24, compact ? 118 : 138);
  ctx.lineTo(compact ? Math.min(300, width - 24) : 420, compact ? 118 : 138);
  if (!compact) {
    ctx.moveTo(Math.max(width - 380, 24), 70);
    ctx.lineTo(width - 26, 70);
  }
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, compact ? 119 : 139);
  ctx.lineTo(compact ? 116 : 136, compact ? 119 : 139);
  if (!compact) {
    ctx.moveTo(Math.max(width - 150, 160), 71);
    ctx.lineTo(width - 26, 71);
  }
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.strokeStyle = "#202428";
  const timelineY = height - (compact ? 72 : 98);
  const timelineH = compact ? 48 : 70;
  ctx.strokeRect(24, timelineY, width - 48, timelineH);
  text("TIMELINE 24HRS", 36, timelineY + 8, MUTED, 10);
  const barPitch = compact ? 10 : 12;
  const bars = Math.floor((width - 76) / barPitch);
  for (let i = 0; i < bars; i += 1) {
    const wave = (
      Math.sin(i * 0.23 + bgPhase * 4) +
      Math.sin(i * 0.07 + bgPhase * 5.3) * 0.4
    ) / 1.4;
    const h = compact ? 5 + (wave + 1) * 14 : 8 + (wave + 1) * 22;
    ctx.fillStyle = i % 17 === 0 ? RED : WHITE;
    ctx.fillRect(38 + i * barPitch, timelineY + timelineH - 12 - h, 5, h);
  }

  const age = (performance.now() - hintStart) / 1000;
  if (bootDone && !galleryActive && !panelActive && age < 14) {
    ctx.fillStyle = "#050607";
    ctx.strokeStyle = "#34383d";
    const hintY = compact ? 136 : 190;
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
      const behavior = NODE_BEHAVIOR[nodes[spark.target].label];
      if (behavior?.type === "gallery") {
        openGallery();
      } else if (behavior?.type === "url" && behavior.href !== "TODO") {
        window.open(behavior.href, "_blank", "noopener,noreferrer");
      } else if (behavior?.type === "panel") {
        openPanel(behavior.key);
      }
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

function drawGraphScene(dt, alpha = 1, includeBackground = true) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (includeBackground) drawBackground();
  const projected = nodes.map((node) => project(node.x, node.y, node.z));
  projectedNodes = projected;
  drawHud();
  drawLinks(projected);
  drawSparks(projected);
  drawNodes(projected, dt);
  ctx.restore();
}

function graphIndexForCityNode(cityNode) {
  const label = CITY_TO_GRAPH[cityNode.label] || cityNode.label;
  return nodes.findIndex((node) => node.label === label);
}

function drawMorphGraph(t, dt) {
  const eased = easeInOut(Math.min(1, Math.max(0, t)));
  const cityProjected = new Map();
  cityNeurons.forEach((cityNode) => {
    const index = graphIndexForCityNode(cityNode);
    if (index < 0) return;
    const [mx, my, ms] = mapProject(cityNode.x * 1.05, cityNode.y * 0.92, 1);
    const [gx, gy, gs, gz] = project(nodes[index].x, nodes[index].y, nodes[index].z);
    cityProjected.set(index, [
      mx + (gx - mx) * eased,
      my + (gy - my) * eased,
      ms + (gs - ms) * eased,
      gz,
    ]);
  });

  const projected = nodes.map((node, index) => {
    if (cityProjected.has(index)) return cityProjected.get(index);
    const [gx, gy, gs, gz] = project(node.x, node.y, node.z);
    const sx = width * (0.5 + (seededNoise(index + 440) - 0.5) * 0.24);
    const sy = height * (0.52 + (seededNoise(index + 660) - 0.5) * 0.22);
    return [
      sx + (gx - sx) * eased,
      sy + (gy - sy) * eased,
      0.7 + (gs - 0.7) * eased,
      gz,
    ];
  });

  projectedNodes = projected;
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.35 + eased * 0.65);
  drawHud();
  drawLinks(projected);
  drawSparks(projected);
  drawNodes(projected, dt);
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  if (bootStarted && !bootDone) {
    const elapsed = (now - bootStart) / 1000;
    bootFill.style.width = `${Math.min(100, (elapsed / CITY_INTRO_END) * 100)}%`;
    denied.classList.toggle("hidden", !(elapsed >= 2 && elapsed < 8));
    boot.classList.toggle("hidden", elapsed >= 2);
    if (elapsed >= CITY_INTRO_START && elapsed < CITY_INTRO_END) {
      drawCityIntro(elapsed);
      requestAnimationFrame(loop);
      return;
    }
    if (elapsed >= CITY_INTRO_END) {
      bootDone = true;
      cityIntroDone = true;
      graphTransitionStart = now;
      boot.classList.add("hidden");
      denied.classList.add("hidden");
      queryForm.classList.remove("hidden");
      applyDefaultGraphView();
      hintStart = performance.now();
      beep(740, 0.09, 0.04);
    }
  }

  nodes.slice(1).forEach((node, i) => {
    node.z += Math.sin(now * 0.00072 + i * 0.9) * 0.16;
    node.y += Math.cos(now * 0.00048 + i * 1.3) * 0.07;
  });

  const transitionEnd = Math.max(GRAPH_TRANSITION_SECONDS, GRAPH_DISSOLVE_START_SECONDS + GRAPH_DISSOLVE_SECONDS);
  const transitionAge = graphTransitionStart ? (now - graphTransitionStart) / 1000 : transitionEnd;
  const dissolveStart = GRAPH_DISSOLVE_START_SECONDS;
  const dissolveSpan = GRAPH_DISSOLVE_SECONDS;
  if (transitionAge < transitionEnd) {
    const linearT = Math.min(1, transitionAge / GRAPH_TRANSITION_SECONDS);
    const t = easeInOut(linearT);
    const dissolve = Math.min(1, Math.max(0, (transitionAge - dissolveStart) / dissolveSpan));
    drawCityToGraphBase(t, dissolve);
    if (linearT < 1) drawMorphGraph(t, dt);
    else drawGraphScene(dt, 1, false);
  } else {
    drawGraphScene(dt, 1, true);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
