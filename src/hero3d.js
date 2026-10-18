// Homepage hero: our four product lines hanging in a dark studio, rendered in 3D.
// Each garment is a cut-out of our own product photo, inflated with a depth map and
// lit with a normal map, so it turns on its wire and catches the light.
//
// This is the source of assets/hero3d.js. Rebuild after editing:
//   npm i three@0.186.1 esbuild
//   npx esbuild src/hero3d.js --bundle --minify --format=esm --outfile=assets/hero3d.js
//
// Maps live in images/hero3d/ (<name>-color.webp, -normal.webp, -depth.webp).
// If WebGL or loading fails, the plain HTML cards in #rig stay as the fallback.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, PlaneGeometry, BoxGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial, Line, BufferGeometry,
  Float32BufferAttribute, TextureLoader, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping,
  AmbientLight, SpotLight, DirectionalLight, Raycaster, Vector2, Vector3, DoubleSide
} from "three";

const root = document.documentElement;
const stage = document.getElementById("stage");
const links = [...stage.querySelectorAll(".rig a.card")];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FOV = 28, TAN = Math.tan((FOV / 2) * Math.PI / 180);

// Desktop row: x, bottom edge, depth, height (world units). Width comes from the photo.
const ROW = [
  { x: -4.6, y: -1.2, z: -0.4, h: 2.45 },
  { x: -1.6, y: -1.7, z: 0.4, h: 3.9 },
  { x: 1.5, y: -0.8, z: 0, h: 2.3 },
  { x: 4.6, y: -1.65, z: -0.3, h: 3.8 }
];
const RING_R = 1.55;

const lerp = (a, b, t) => a + (b - a) * t;

function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,.85)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

// Small alpha mask so clicks on empty parts of a garment's rectangle don't count
function alphaMask(img) {
  const w = 96, h = Math.round(96 * img.height / img.width);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  return (u, v) => d[(Math.min(h - 1, Math.floor((1 - v) * h)) * w + Math.min(w - 1, Math.floor(u * w))) * 4 + 3] > 120;
}

async function start() {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.className = "gl-canvas";
  canvas.setAttribute("aria-hidden", "true");

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 2, 0.1, 100);
  const rig = new Group();
  scene.add(rig);

  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new SpotLight(0xfff1dc, 5.5, 0, 0.55, 0.9, 0);
  key.position.set(0, 9, 8);
  scene.add(key, key.target);
  const rim = new DirectionalLight(0xffcf6b, 2.2);
  rim.position.set(-6, 4, -5);
  const fill = new DirectionalLight(0xbcd0ff, 0.5);
  fill.position.set(6, 1, 6);
  scene.add(rim, fill);

  const loader = new TextureLoader();
  const blob = blobTexture();
  const wireMat = new LineBasicMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.45 });
  const clipMat = new MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.8, roughness: 0.35 });

  const items = await Promise.all(links.map(async (a, i) => {
    const base = a.dataset.gl;
    const [map, normalMap, displacementMap] = await Promise.all(
      ["color", "normal", "depth"].map(k => loader.loadAsync(`${base}-${k}.webp`))
    );
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    const img = map.image, aspect = img.width / img.height;
    const h = ROW[i].h, w = h * aspect;
    const seg = 140, sx = Math.max(8, Math.round(seg * Math.min(1, aspect))), sy = Math.max(8, Math.round(seg * Math.min(1, 1 / aspect)));
    const mat = new MeshStandardMaterial({
      map, normalMap, displacementMap,
      displacementScale: 0.13 * Math.min(w, h),
      roughness: +a.dataset.rough || 0.85, metalness: 0,
      alphaTest: 0.5, side: DoubleSide
    });
    const body = new Mesh(new PlaneGeometry(w, h, sx, sy), mat);
    body.position.y = -h / 2;
    const pivot = new Group();
    pivot.add(body);
    const wire = new Line(new BufferGeometry().setAttribute("position", new Float32BufferAttribute([0, 0, 0, 0, 12, 0], 3)), wireMat);
    const clip = new Mesh(new BoxGeometry(0.13, 0.07, 0.05), clipMat);
    clip.position.set(0, 0.01, 0.04);
    pivot.add(wire, clip);
    rig.add(pivot);
    const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.55 }));
    shadow.rotation.x = -Math.PI / 2;
    rig.add(shadow);

    const tag = document.createElement("a");
    tag.className = "gl-tag";
    tag.href = a.getAttribute("href");
    tag.tabIndex = -1;
    tag.setAttribute("aria-hidden", "true");
    tag.innerHTML = a.querySelector(".tag").innerHTML;

    return {
      a, tag, pivot, body, mat, shadow, w, h, hit: alphaMask(img),
      ph: i * 1.7, focus: 0, dim: 1, lift: 0, scale: 1, turn: 0
    };
  }));

  const tags = document.createElement("div");
  tags.className = "gl-tags";
  items.forEach(it => tags.appendChild(it.tag));
  const dots = document.createElement("div");
  dots.className = "gl-dots";
  dots.setAttribute("aria-hidden", "true");
  items.forEach(() => dots.appendChild(document.createElement("i")));
  stage.append(canvas, tags, dots);

  let mode = "row", vw = 1, vh = 1, floorY = -2.3;
  let hovered = -1, focused = -1, active = 0, ringAngle = 0, nextAuto = performance.now() + 3500;
  const tilt = new Vector2(), tiltTarget = new Vector2();

  function layout() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    mode = vw < 761 || camera.aspect < 1.3 ? "ring" : "row";
    stage.dataset.mode = mode;
    if (mode === "row") {
      const z = Math.max(6.6 / (TAN * camera.aspect), 2.6 / TAN);
      camera.position.set(0, 0.1, z);
      camera.lookAt(0, 0.1, 0);
      floorY = -2.25;
    } else {
      const z = Math.max(2.75 / (TAN * camera.aspect), 2.6 / TAN);
      camera.position.set(0, 1.1, z);
      camera.lookAt(0, 0.1, 0);
      floorY = -1.55;
    }
    camera.updateProjectionMatrix();
  }
  layout();
  new ResizeObserver(layout).observe(stage);

  // Pointer: hover / tilt on desktop, swipe and tap on the ring
  const ray = new Raycaster(), ndc = new Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(items.map(it => it.body));
    for (const h of hits) {
      const i = items.findIndex(it => it.body === h.object);
      if (items[i].hit(h.uv.x, h.uv.y)) return i;
    }
    return -1;
  }
  function go(i) { location.href = items[i].a.href; }
  function setActive(i) { active = (i + items.length) % items.length; }
  const hold = () => { nextAuto = performance.now() + 7000; };

  let downX = 0, downY = 0, downT = 0;
  canvas.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    tiltTarget.set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    hovered = pick(e);
    canvas.style.cursor = hovered >= 0 ? "pointer" : "";
  });
  canvas.addEventListener("pointerleave", () => { hovered = -1; tiltTarget.set(0, 0); canvas.style.cursor = ""; });
  canvas.addEventListener("pointerdown", e => { downX = e.clientX; downY = e.clientY; downT = performance.now(); });
  canvas.addEventListener("pointerup", e => {
    const dx = e.clientX - downX, dy = e.clientY - downY;
    hold();
    if (mode === "ring" && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { setActive(active + (dx < 0 ? 1 : -1)); return; }
    if (Math.hypot(dx, dy) > 10) return;
    const i = pick(e);
    if (i < 0) return;
    if (mode === "ring") { i === active ? go(i) : setActive(i); return; }
    // Touch on a big screen: first tap brings it forward, second tap opens
    if (e.pointerType !== "mouse" && hovered !== i) { hovered = i; return; }
    go(i);
  });
  items.forEach((it, i) => {
    it.a.addEventListener("focus", () => { focused = i; hold(); if (mode === "ring") setActive(i); });
    it.a.addEventListener("blur", () => { if (focused === i) focused = -1; });
  });

  let visible = true, raf = 0;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(stage);

  const t0 = performance.now(), proj = new Vector3();
  let prev = t0;
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - prev) / 1000, 0.05), t = (now - t0) / 1000;
    prev = now;
    const k = 1 - Math.exp(-dt * 7);

    // The ring turns to the next line every few seconds until someone touches it
    if (mode === "ring" && !reduce && focused < 0 && now > nextAuto) { setActive(active + 1); nextAuto = now + 3500; }

    tilt.lerp(tiltTarget, k * 0.6);
    rig.rotation.y = mode === "row" ? tilt.x * 0.14 : 0;
    rig.rotation.x = mode === "row" ? tilt.y * 0.05 : 0;
    ringAngle = lerp(ringAngle, -active * Math.PI / 2, k * 0.8);

    const sel = mode === "row" ? (hovered >= 0 ? hovered : focused) : active;
    items.forEach((it, i) => {
      // Garments drop in on their wires one after another, then settle
      const d = reduce ? 1 : Math.max(0, t - 0.15 - i * 0.14);
      const drop = reduce ? 0 : d > 0 ? 7 * Math.exp(-6 * d) * Math.cos(7 * d) : 50;
      const settle = reduce ? 0 : Math.exp(-1.6 * d);
      const sway = reduce ? 0 : Math.sin(t * 0.9 + it.ph);
      const isSel = i === sel;
      it.focus = lerp(it.focus, isSel ? 1 : 0, k);
      let x, y, z, face, s = 1;
      if (mode === "row") {
        x = ROW[i].x; z = ROW[i].z + it.focus * 1.1;
        y = ROW[i].y + it.h;
        face = lerp(0.32 * Math.sin(t * 0.45 + it.ph) * (reduce ? 0 : 1), tilt.x * 0.5, it.focus);
        it.dim = lerp(it.dim, sel >= 0 && !isSel ? 0.3 : 1, k);
      } else {
        s = 0.82;
        const ang = i * Math.PI / 2 + ringAngle;
        x = Math.sin(ang) * RING_R; z = Math.cos(ang) * RING_R - 0.4;
        y = 0.3 + (it.h * s) / 2;
        face = ang * 0.35 + 0.12 * Math.sin(t * 0.5 + it.ph) * (reduce ? 0 : 1);
        it.dim = lerp(it.dim, 0.12 + 0.88 * Math.max(0, Math.cos(ang)) ** 1.5, k);
      }
      it.scale = lerp(it.scale, s * (1 + it.focus * (mode === "row" ? 0.07 : 0.05)), k);
      it.pivot.position.set(x, y + Math.max(-1, drop), z);
      it.pivot.scale.setScalar(it.scale);
      it.pivot.rotation.z = sway * (0.012 + settle * 0.08);
      it.body.rotation.y = face;
      it.mat.color.setScalar(it.dim);

      const bottom = y - it.h * it.pivot.scale.y;
      it.shadow.position.set(x, floorY, z + 0.1);
      const near = Math.max(0, 1 - (bottom - floorY) / 3);
      it.shadow.scale.set(it.w * it.pivot.scale.x * 1.1, it.w * it.pivot.scale.x * 0.35, 1);
      it.shadow.material.opacity = 0.5 * near * (1 - Math.min(1, Math.abs(drop) / 3)) * it.dim;

      // HTML label under each garment (row) or only under the front one (ring)
      proj.set(x, mode === "row" ? bottom - 0.12 : floorY - 0.1, mode === "row" ? z : RING_R);
      proj.applyMatrix4(rig.matrixWorld).project(camera);
      const sx = (proj.x * 0.5 + 0.5) * vw, sy = Math.min((-proj.y * 0.5 + 0.5) * vh, vh - 92);
      it.tag.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translateX(-50%)`;
      it.tag.classList.toggle("on", isSel);
      it.tag.classList.toggle("show", mode === "row" ? d > 0.6 : isSel);
      it.tag.classList.toggle("kb", i === focused);
      dots.children[i].classList.toggle("on", i === active);
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  stage.classList.add("gl-on");
  root.classList.add("gl3d");
  raf = requestAnimationFrame(frame);
}

start().then(() => clearTimeout(window.__gl3dTimer), () => { clearTimeout(window.__gl3dTimer); root.classList.remove("gl3d"); });
