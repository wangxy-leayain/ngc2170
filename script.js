/* =========================================================
   Settings you may need to change
   ========================================================= */

// The APOD image is about 80 light-years wide (APOD, 15 October 2010).
const IMAGE_WIDTH_LY = 80;

// Hotspots on the APOD image. x and y are percentages of the image size.
// To move a dot, open the site with ?edit at the end of the address
// (e.g. index.html?edit), click on the image, and the coordinates
// will appear in the readout.
const HOTSPOTS = [
  {
    id: "cluster",
    x: 56.3, y: 50.5,
    title: "Central young star cluster",
    text: "The dense central core is less than 2 light-years across and contains many young, massive stars. The most massive stars are less than ten million years old (European Southern Observatory 2010)."
  },
  {
    id: "ngc2170",
    x: 62.1, y: 53.0,
    title: "NGC 2170",
    text: "NGC 2170 is a reflection nebula. Dust scatters blue light more strongly than red light (UNSW School of Physics n.d.b)."
  },
  {
    id: "outflows",
    x: 52.2, y: 54.3,
    title: "Pink and red outflows",
    text: "In the image, the glowing pink and red features are likely gas flowing away from young stars (European Southern Observatory 2010)."
  },
  {
    id: "streamers",
    x: 54.3, y: 26.2,
    title: "Dust streamers",
    text: "The strong stellar winds and radiation from young, hot stars have shaped the surrounding dust and gas into long streamers (European Southern Observatory 2010)."
  },
  {
    id: "dark",
    x: 57.8, y: 71.3,
    title: "Dark dust",
    text: "Infrared light is not scattered as much as visible light (UNSW School of Physics n.d.c), so thick dust clouds become nearly transparent (European Southern Observatory/J. Emerson/VISTA/Digitized Sky Survey 2 2010). The dark patches that remain are probably where the dust is thickest."
  }
];

// Which hotspot the distance readout measures from.
const CENTRE_ID = "cluster";


/* =========================================================
   Helpers
   ========================================================= */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hudBand = document.getElementById("hud-band");
const hudPos = document.getElementById("hud-pos");


/* =========================================================
   1. Boot screen
   ========================================================= */

(function boot() {
  const box = document.getElementById("boot");
  const out = document.getElementById("boot-text");
  if (!box) return;

  const lines = [
    "> connecting to VISTA survey telescope ...... ok",
    "> loading near-infrared bands (3) ........... ok",
    "> target: Monoceros R2 / NGC 2170",
    "> distance: ~2,700 light-years",
    "> field of view: ~80 light-years",
    "> ready."
  ];

  function finish() {
    box.classList.add("done");
    setTimeout(() => box.remove(), 600);
  }

  if (reduceMotion) { finish(); return; }

  box.addEventListener("click", finish);
  window.addEventListener("keydown", finish, { once: true });

  let i = 0;
  const timer = setInterval(() => {
    out.textContent += lines[i] + "\n";
    i++;
    if (i === lines.length) {
      clearInterval(timer);
      setTimeout(finish, 500);
    }
  }, 260);
})();


/* =========================================================
   2. HUD: show the band of the section on screen
   ========================================================= */

(function hud() {
  const sections = document.querySelectorAll("section[data-band]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) hudBand.textContent = entry.target.dataset.band;
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  sections.forEach((s) => observer.observe(s));
})();


/* =========================================================
   3. Visible / infrared compare slider
   ========================================================= */

(function compare() {
  const stage = document.getElementById("compare");
  const range = document.getElementById("compare-range");
  function update() {
    stage.style.setProperty("--pos", range.value + "%");
  }
  range.addEventListener("input", update);
  update();
})();


/* =========================================================
   4. APOD image: hotspots and light-year readout
   ========================================================= */

(function apod() {
  const img = document.getElementById("apod-img");
  const layer = document.getElementById("hotspots");
  const readout = document.getElementById("apod-readout");
  const pop = document.getElementById("popover");
  const popTitle = document.getElementById("popover-title");
  const popText = document.getElementById("popover-text");
  const editMode = new URLSearchParams(location.search).has("edit");
  const centre = HOTSPOTS.find((h) => h.id === CENTRE_ID);

  // Create one button for each hotspot.
  HOTSPOTS.forEach((h) => {
    const btn = document.createElement("button");
    btn.className = "hotspot";
    btn.style.left = h.x + "%";
    btn.style.top = h.y + "%";
    btn.setAttribute("aria-label", h.title);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPopover(h, btn);
    });
    layer.appendChild(btn);
  });

  function openPopover(h, btn) {
    popTitle.textContent = h.title;
    popText.textContent = h.text;
    pop.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const below = r.bottom + 12;
    const top = below + pop.offsetHeight > window.innerHeight ? r.top - pop.offsetHeight - 12 : below;
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function closePopover() { pop.hidden = true; }
  document.getElementById("popover-close").addEventListener("click", closePopover);
  document.addEventListener("click", (e) => {
    if (!pop.hidden && !pop.contains(e.target)) closePopover();
  });
  window.addEventListener("scroll", closePopover, { passive: true });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopover(); });

  // Convert a mouse position into percentages and light-years.
  function measure(e) {
    const r = img.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const lyPerPx = IMAGE_WIDTH_LY / r.width;
    const dx = (px * 100 - centre.x) / 100 * r.width * lyPerPx;
    const dy = (py * 100 - centre.y) / 100 * r.height * lyPerPx;
    return { px, py, dist: Math.sqrt(dx * dx + dy * dy) };
  }

  img.parentElement.addEventListener("mousemove", (e) => {
    const m = measure(e);
    if (m.px < 0 || m.px > 1 || m.py < 0 || m.py > 1) return;
    const text = "~" + m.dist.toFixed(1) + " ly from the cluster";
    readout.textContent = editMode
      ? "x: " + (m.px * 100).toFixed(1) + "%  y: " + (m.py * 100).toFixed(1) + "%"
      : text;
    hudPos.textContent = (m.px * IMAGE_WIDTH_LY).toFixed(1) + ", " +
      (m.py * IMAGE_WIDTH_LY * (img.naturalHeight / img.naturalWidth || 0.8)).toFixed(1) + " ly";
  });

  img.parentElement.addEventListener("mouseleave", () => {
    readout.textContent = "Move over the image";
    hudPos.textContent = "--";
  });

  // In edit mode, clicking prints the position so you can copy it into HOTSPOTS.
  if (editMode) {
    img.parentElement.addEventListener("click", (e) => {
      const m = measure(e);
      const msg = "x: " + (m.px * 100).toFixed(1) + ", y: " + (m.py * 100).toFixed(1);
      console.log(msg);
      readout.textContent = "clicked → " + msg;
    });
  }
})();


/* =========================================================
   5. Scroll-driven star formation diagram
   ========================================================= */

(function scrolly() {
  const steps = Array.from(document.querySelectorAll(".step"));
  const stages = document.querySelectorAll(".stage");
  const figure = document.querySelector(".scrolly-figure");
  const phone = window.matchMedia("(max-width: 760px)");
  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    // Text scrolling under the top bar (or under the diagram on phones)
    // only fades once at least half of the step has moved past this line.
    const topLine = phone.matches ? figure.getBoundingClientRect().bottom : 60;
    let current = "1";
    steps.forEach((s) => {
      const r = s.getBoundingClientRect();
      const middle = (r.top + r.bottom) / 2;
      const bright = r.top < vh * 0.8 && middle > topLine;
      s.classList.toggle("active", bright);
      // The diagram shows the last step whose top has reached mid-screen.
      if (r.top < vh * 0.5) current = s.dataset.stage;
    });
    stages.forEach((g) => g.classList.toggle("active", g.dataset.stage === current));
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();


/* =========================================================
   6. Dust pushed away by a "young star" (your cursor)
   ========================================================= */

(function wind() {
  const canvas = document.getElementById("wind-canvas");
  const ctx = canvas.getContext("2d");
  const COUNT = 2500;
  const RADIUS = 90;  // how far the "star" pushes, in pixels
  let w, h, dpr, particles = [];
  const star = { x: -999, y: -999, on: false };

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
  }

  // Place particles in a few overlapping clumps, like a dusty cloud.
  function makeParticles() {
    particles = [];
    const clumps = [
      [0.30, 0.45, 0.22], [0.55, 0.55, 0.25], [0.75, 0.40, 0.18], [0.45, 0.30, 0.15]
    ];
    for (let i = 0; i < COUNT; i++) {
      const c = clumps[i % clumps.length];
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * c[2];
      const hx = (c[0] + Math.cos(a) * r) * w;
      const hy = (c[1] + Math.sin(a) * r * 0.8) * h;
      particles.push({
        hx, hy, x: hx, y: hy, vx: 0, vy: 0,
        size: Math.random() * 1.6 + 0.4,
        hue: Math.random() < 0.15 ? "255,122,168" : "180,150,210"
      });
    }
  }

  function move(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    star.x = p.clientX - r.left;
    star.y = p.clientY - r.top;
    star.on = true;
  }
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("touchmove", (e) => { move(e); e.preventDefault(); }, { passive: false });
  canvas.addEventListener("mouseleave", () => { star.on = false; });
  canvas.addEventListener("touchend", () => { star.on = false; });

  function frame() {
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      // Push away from the star if it is close.
      if (star.on) {
        const dx = p.x - star.x;
        const dy = p.y - star.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < RADIUS) {
          const force = (RADIUS - d) / RADIUS * 2.2;
          p.vx += dx / d * force;
          p.vy += dy / d * force;
        }
      }
      // Slowly drift back home, with friction.
      p.vx += (p.hx - p.x) * 0.004;
      p.vy += (p.hy - p.y) * 0.004;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;

      ctx.fillStyle = "rgba(" + p.hue + ",0.7)";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // Draw the star at the cursor.
    if (star.on) {
      const g = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 30);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.3, "rgba(255,233,176,0.8)");
      g.addColorStop(1, "rgba(255,179,71,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  frame();
})();


/* =========================================================
   7. Counting numbers in the discovery section
   ========================================================= */

(function counters() {
  const nums = document.querySelectorAll("[data-count]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      observer.unobserve(el);
      if (reduceMotion) { el.textContent = target.toLocaleString(); return; }
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / 1200, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => observer.observe(n));
})();


/* =========================================================
   8. Filtering stars by motion (simplified illustration)
   ========================================================= */

(function sky() {
  const canvas = document.getElementById("sky-canvas");
  const ctx = canvas.getContext("2d");
  const countEl = document.getElementById("sky-count");
  const MEMBERS = 70;
  const FIELD = 230;
  // All cluster members share roughly one direction of motion.
  const CLUSTER_MOTION = { x: -1, y: 0.25 };
  let w, h, stars = [];
  let showMotion = false;
  let filtered = false;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
    draw();
  }

  function makeStars() {
    stars = [];
    for (let i = 0; i < MEMBERS + FIELD; i++) {
      const member = i < MEMBERS;
      let mx, my;
      if (member) {
        mx = CLUSTER_MOTION.x + (Math.random() - 0.5) * 0.3;
        my = CLUSTER_MOTION.y + (Math.random() - 0.5) * 0.3;
      } else {
        const a = Math.random() * Math.PI * 2;
        const s = 0.4 + Math.random() * 1.2;
        mx = Math.cos(a) * s;
        my = Math.sin(a) * s;
      }
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        mx, my, member,
        r: Math.random() * 1.5 + 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    let shown = 0;
    for (const s of stars) {
      const dim = filtered && !s.member;
      if (!dim) shown++;
      ctx.globalAlpha = dim ? 0.08 : 1;
      ctx.fillStyle = filtered && s.member ? "#ff7aa8" : "#dfe6ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (showMotion) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.mx * 18, s.y + s.my * 18);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    countEl.textContent = filtered
      ? shown + " stars share one motion"
      : stars.length + " stars in view";
  }

  document.getElementById("btn-motion").addEventListener("click", () => {
    showMotion = !showMotion;
    draw();
  });
  document.getElementById("btn-filter").addEventListener("click", () => {
    filtered = true;
    showMotion = true;
    draw();
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    filtered = false;
    showMotion = false;
    makeStars();
    draw();
  });

  window.addEventListener("resize", resize);
  resize();
})();
