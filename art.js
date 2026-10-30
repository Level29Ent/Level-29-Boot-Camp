// Level 29 Boot Camp — art kit: textured characters, sky, terrain, props, per-level dressing.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- seeded random ---------- */
let seed = 29;
export function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
export function reseed(s) { seed = s; }
const rr = (a, b) => a + rand() * (b - a);

/* ---------- character texture atlas ---------- */
const W = 512, CS = 64;
export const C = { CAMO: 0, CAMO_LT: 1, KHAKI: 2, OLIVE: 3, BOOT: 4, BLACK: 5, BRASS: 6, SKIN: 7, HAIR: 11, CAMPAIGN: 15, WHITE: 16, GUN: 17, RIFLE: 18, TAN: 19, RED: 20, BLUE: 21, RIBBON: 22, OD: 23, MOUTH: 24, EYE: 25, GOLD: 26, TEE: 27, JEANS: 28, HAIRLONG: 29, SOLE: 30, PAD_DK: 31 };
const SKINS = ['#b88a70', '#7c5946', '#d4b39e', '#563d30'];
const atlasCanvas = document.createElement('canvas'); atlasCanvas.width = atlasCanvas.height = W;
(function paintAtlas() {
  const g = atlasCanvas.getContext('2d');
  const cell = k => [(k % 8) * CS, Math.floor(k / 8) * CS];
  const grain = (k, base, amt = 0.07, px = 2) => {
    const [x0, y0] = cell(k); g.fillStyle = base; g.fillRect(x0, y0, CS, CS);
    const c = new THREE.Color(base);
    for (let y = 0; y < CS; y += px) for (let x = 0; x < CS; x += px) {
      const f = 1 + (rand() - 0.5) * amt * 2; g.fillStyle = `rgb(${Math.min(255, c.r * 255 * f)},${Math.min(255, c.g * 255 * f)},${Math.min(255, c.b * 255 * f)})`; g.fillRect(x0 + x, y0 + y, px, px);
    }
  };
  const camo = (k, base, cols) => {
    const [x0, y0] = cell(k); g.fillStyle = base; g.fillRect(x0, y0, CS, CS);
    for (const [col, n] of cols) for (let i = 0; i < n; i++) {
      let x = Math.floor(rand() * 16), y = Math.floor(rand() * 16); g.fillStyle = col;
      const len = 2 + Math.floor(rand() * 4);
      for (let j = 0; j < len; j++) { g.fillRect(x0 + (x % 16) * 4, y0 + (y % 16) * 4, 4, 4); if (rand() < 0.5) x++; else y++; }
    }
  };
  camo(C.CAMO, '#7a7656', [['#4a5737', 34], ['#5e5139', 26], ['#23271e', 18]]);
  camo(C.CAMO_LT, '#9a9472', [['#6f7a55', 26], ['#7f7254', 18], ['#4a4c3a', 10]]);
  grain(C.KHAKI, '#c9b48a'); grain(C.OLIVE, '#59603f'); grain(C.BOOT, '#9b7d55', 0.09);
  grain(C.BLACK, '#1b1b1d', 0.05); grain(C.BRASS, '#d6aa48', 0.12); grain(C.CAMPAIGN, '#6f5536', 0.08);
  grain(C.WHITE, '#ece8de', 0.04); grain(C.GUN, '#55595c', 0.06); grain(C.RIFLE, '#2a2b2a', 0.05);
  grain(C.TAN, '#a5976c', 0.08); grain(C.RED, '#b3232f', 0.06); grain(C.BLUE, '#2f6fae', 0.06);
  grain(C.OD, '#4f5636', 0.08); grain(C.MOUTH, '#6e3b33', 0.04); grain(C.EYE, '#151515', 0.02);
  grain(C.GOLD, '#ffc72c', 0.05); grain(C.TEE, '#8e9aa3', 0.06); grain(C.JEANS, '#3c5578', 0.1);
  grain(C.SOLE, '#2e2c28', 0.05); grain(C.PAD_DK, '#3a3a3c', 0.06);
  SKINS.forEach((s, i) => {
    grain(C.SKIN + i, s, 0.035);
    const [x0, y0] = cell(C.HAIR + i); grain(C.HAIR + i, s, 0.035);
    for (let n = 0; n < 900; n++) { g.fillStyle = 'rgba(25,18,12,.55)'; g.fillRect(x0 + rand() * CS, y0 + rand() * CS, 2, 2); }
  });
  grain(C.HAIRLONG, '#3b2a1c', 0.12);
  { const [x0, y0] = cell(C.RIBBON); const cols = ['#c8102e', '#ffc72c', '#1f4e9c', '#2f7d32', '#ffffff', '#c8102e'];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(x0 + i * (CS / 6), y0, CS / 6, CS); }); }
})();
const atlasTex = new THREE.CanvasTexture(atlasCanvas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestMipmapLinearFilter; atlasTex.colorSpace = THREE.SRGBColorSpace;
export const charMat = new THREE.MeshStandardMaterial({ map: atlasTex, roughness: 0.88, flatShading: true });
charMat.userData.keep = true;

/* ---------- geometry builders ---------- */
function prep(geo, x, y, z, rx, ry, rz) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  if (rx) geo.rotateX(rx); if (ry) geo.rotateY(ry); if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z); return geo;
}
class AtlasBuilder {
  constructor() { this.g = []; }
  add(geo, cell, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    geo = prep(geo, x, y, z, rx, ry, rz);
    const uv = geo.attributes.uv, cx = (cell % 8) * CS, cy = Math.floor(cell / 8) * CS, pad = 3, s = CS - 2 * pad;
    for (let i = 0; i < uv.count; i++) { uv.setXY(i, (cx + pad + uv.getX(i) * s) / W, 1 - (cy + pad + (1 - uv.getY(i)) * s) / W); }
    this.g.push(geo); return this;
  }
  box(w, h, d, cell, x, y, z, rx, ry, rz) { return this.add(new THREE.BoxGeometry(w, h, d), cell, x, y, z, rx, ry, rz); }
  cyl(rt, rb, h, cell, x, y, z, seg = 8, rx, ry, rz) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), cell, x, y, z, rx, ry, rz); }
  mesh(parent) { const m = new THREE.Mesh(mergeGeometries(this.g), charMat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
}
export const vMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
vMat.userData.keep = true;
export class Builder {
  constructor() { this.g = []; }
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, jitter = 0.04) {
    geo = prep(geo, x, y, z, rx, ry, rz);
    if (geo.attributes.uv) geo.deleteAttribute('uv');
    const c = new THREE.Color(color), f = 1 + (rand() - 0.5) * jitter * 2, n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r * f; a[i * 3 + 1] = c.g * f; a[i * 3 + 2] = c.b * f; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); this.g.push(geo); return this;
  }
  box(w, h, d, c, x, y, z, rx, ry, rz, j) { return this.add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz, j); }
  cyl(rt, rb, h, c, x, y, z, seg = 8, rx, ry, rz, j) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz, j); }
  cone(r, h, c, x, y, z, seg = 6, rx, ry, rz) { return this.add(new THREE.ConeGeometry(r, h, seg), c, x, y, z, rx, ry, rz); }
  ico(r, c, x, y, z, detail = 0, sx = 1, sy = 1, sz = 1) { const g = new THREE.IcosahedronGeometry(r, detail); g.scale(sx, sy, sz); return this.add(g, c, x, y, z); }
  torus(r, t, c, x, y, z, rx = 0, ry = 0) { return this.add(new THREE.TorusGeometry(r, t, 6, 14), c, x, y, z, rx, ry); }
  get empty() { return this.g.length === 0; }
  geometry() { return mergeGeometries(this.g); }
  mesh(parent, shadow = true) { if (this.empty) return null; const m = new THREE.Mesh(this.geometry(), vMat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
}

/* ---------- characters ---------- */
// limbs order kept as [armL, legL, armR, legR] for gameplay code.
export function makePerson(parent, x, z, variant = 'recruit', opts = {}) {
  const skin = opts.skin ?? Math.floor(rand() * 4);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.order = 'YXZ'; parent.add(g);
  const body = new THREE.Group(); g.add(body);
  const di = variant === 'di', civ = variant === 'civ';
  const top = di ? C.KHAKI : civ ? C.TEE : C.CAMO, bottom = di ? C.OLIVE : civ ? C.JEANS : C.CAMO, SK = C.SKIN + skin;
  const core = new AtlasBuilder();
  // pelvis, belt, torso
  core.box(0.44, 0.22, 0.26, bottom, 0, 1.0, 0);
  core.box(0.46, 0.06, 0.28, di ? C.BLACK : civ ? C.BLACK : C.TAN, 0, 1.12, 0);
  core.box(0.08, 0.05, 0.02, C.BRASS, 0, 1.12, -0.145);
  core.box(0.42, 0.24, 0.25, top, 0, 1.27, 0);
  core.box(0.5, 0.3, 0.29, top, 0, 1.5, 0);
  core.box(0.52, 0.06, 0.28, top, 0, 1.66, 0);
  if (!civ) { // collar + pockets
    core.box(0.2, 0.06, 0.06, top, -0.08, 1.7, -0.11, 0, 0.5, 0).box(0.2, 0.06, 0.06, top, 0.08, 1.7, -0.11, 0, -0.5, 0);
    core.box(0.14, 0.12, 0.02, di ? C.KHAKI : C.CAMO_LT, -0.13, 1.54, -0.15).box(0.14, 0.12, 0.02, di ? C.KHAKI : C.CAMO_LT, 0.13, 1.54, -0.15);
  }
  if (di) { core.box(0.13, 0.04, 0.012, C.RIBBON, -0.13, 1.625, -0.152).box(0.1, 0.022, 0.012, C.BLACK, 0.13, 1.625, -0.152); core.box(0.012, 0.6, 0.012, C.KHAKI, 0, 1.4, -0.148); }
  else if (!civ) core.box(0.05, 0.05, 0.012, C.BLACK, -0.13, 1.56, -0.162);
  if (opts.pack) { core.box(0.44, 0.5, 0.22, C.OD, 0, 1.38, 0.25).box(0.4, 0.14, 0.2, C.OD, 0, 1.06, 0.24).box(0.06, 0.48, 0.03, C.TAN, -0.15, 1.42, 0.37).box(0.06, 0.48, 0.03, C.TAN, 0.15, 1.42, 0.37); }
  // neck + head
  core.cyl(0.065, 0.075, 0.1, SK, 0, 1.73, 0, 8);
  core.box(0.25, 0.28, 0.27, SK, 0, 1.92, 0);
  core.box(0.255, 0.06, 0.275, civ ? C.HAIRLONG : C.HAIR + skin, 0, 2.05, 0.002);
  if (civ) core.box(0.26, 0.16, 0.06, C.HAIRLONG, 0, 1.96, 0.12);
  core.box(0.035, 0.08, 0.06, SK, -0.135, 1.92, 0.01).box(0.035, 0.08, 0.06, SK, 0.135, 1.92, 0.01);
  core.box(0.045, 0.028, 0.012, C.EYE, -0.058, 1.945, -0.137).box(0.045, 0.028, 0.012, C.EYE, 0.058, 1.945, -0.137);
  core.box(0.07, 0.016, 0.014, C.HAIR + skin, -0.058, 1.985, -0.138).box(0.07, 0.016, 0.014, C.HAIR + skin, 0.058, 1.985, -0.138);
  core.box(0.045, 0.07, 0.05, SK, 0, 1.9, -0.145);
  core.box(0.08, 0.016, 0.012, C.MOUTH, 0, 1.835, -0.137);
  if (di) { // campaign cover ("smokey bear")
    core.cyl(0.27, 0.27, 0.018, C.CAMPAIGN, 0, 2.08, 0, 16);
    core.cyl(0.09, 0.14, 0.16, C.CAMPAIGN, 0, 2.17, 0, 4, 0, Math.PI / 4, 0);
    core.cyl(0.141, 0.141, 0.025, C.BLACK, 0, 2.1, 0, 4, 0, Math.PI / 4, 0);
  } else if (opts.cover) {
    core.box(0.27, 0.08, 0.28, C.CAMO, 0, 2.1, 0.005).box(0.24, 0.016, 0.1, C.CAMO, 0, 2.065, -0.18);
  }
  core.mesh(body);
  // limbs
  const limbs = [], fore = [], shin = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.31, 1.63, 0); body.add(arm);
    const ua = new AtlasBuilder();
    ua.box(0.14, 0.2, 0.15, top, 0, -0.1, 0);
    if (!di && !civ) ua.box(0.155, 0.08, 0.165, C.CAMO_LT, 0, -0.22, 0); // rolled sleeve
    else ua.box(0.15, 0.05, 0.16, top, 0, -0.2, 0);
    ua.box(0.12, 0.08, 0.12, SK, 0, -0.29, 0);
    if (di) ua.box(0.012, 0.035, 0.07, C.GOLD, side * 0.076, -0.08, 0).box(0.012, 0.035, 0.07, C.GOLD, side * 0.076, -0.13, 0);
    ua.mesh(arm);
    const el = new THREE.Group(); el.position.y = -0.32; arm.add(el);
    new AtlasBuilder().box(0.115, 0.24, 0.12, SK, 0, -0.12, 0).box(0.11, 0.1, 0.075, SK, 0, -0.29, -0.01).box(0.035, 0.06, 0.04, SK, -side * 0.05, -0.26, -0.04).mesh(el);
    limbs.push(arm); fore.push(el);
    const leg = new THREE.Group(); leg.position.set(side * 0.12, 0.93, 0); body.add(leg);
    new AtlasBuilder().box(0.19, 0.46, 0.22, bottom, 0, -0.22, 0).box(0.07, 0.12, 0.04, bottom, side * 0.1, -0.24, -0.02).mesh(leg);
    const kn = new THREE.Group(); kn.position.y = -0.45; leg.add(kn);
    const sb = new AtlasBuilder().box(0.175, 0.32, 0.2, bottom, 0, -0.15, 0);
    if (civ) sb.box(0.19, 0.14, 0.32, C.WHITE, 0, -0.41, -0.05).box(0.2, 0.03, 0.33, C.SOLE, 0, -0.475, -0.05);
    else sb.box(0.195, 0.16, 0.22, di ? C.BLACK : C.BOOT, 0, -0.33, 0).box(0.2, 0.12, 0.34, di ? C.BLACK : C.BOOT, 0, -0.42, -0.06).box(0.205, 0.035, 0.35, C.SOLE, 0, -0.48, -0.06);
    sb.mesh(kn);
    limbs.push(leg); shin.push(kn);
  }
  g.userData = { limbs, fore, shin, body, variant, skin, pose: opts.pose || 'stand' };
  return g;
}
export function makeRifle(parent, x = 0.14, y = 1.5, z = -0.42) {
  const r = new AtlasBuilder();
  r.box(0.05, 0.08, 0.7, C.RIFLE, 0, 0, 0); // receiver + handguard
  r.box(0.065, 0.075, 0.32, C.PAD_DK, 0, -0.005, -0.18);
  r.cyl(0.012, 0.012, 0.32, C.GUN, 0, 0.005, -0.5, 6, Math.PI / 2);
  r.box(0.05, 0.1, 0.24, C.RIFLE, 0, -0.02, 0.43); // stock
  r.box(0.04, 0.16, 0.06, C.RIFLE, 0, -0.11, -0.04, -0.25); // magazine
  r.box(0.035, 0.1, 0.04, C.RIFLE, 0, -0.08, 0.13, 0.35); // grip
  r.box(0.04, 0.05, 0.12, C.GUN, 0, 0.065, 0.03); // optic
  r.cyl(0.022, 0.022, 0.07, C.BLACK, 0, 0.07, -0.05, 8, Math.PI / 2);
  const m = r.mesh(parent); m.position.set(x, y, z); return m;
}
export function makePugil(foreArm, color) {
  const b = new AtlasBuilder().cyl(0.025, 0.025, 1.3, C.TAN, 0, 0, 0, 6, 0, 0, Math.PI / 2)
    .box(0.24, 0.2, 0.2, color, -0.6, 0, 0).box(0.24, 0.2, 0.2, color, 0.6, 0, 0);
  const m = b.mesh(foreArm); m.position.set(0, -0.3, -0.05); return m;
}
export function makeHelmet(body, colorHex) {
  const geo = new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55, flatShading: true }));
  m.position.set(0, 1.93, 0); m.castShadow = true; body.add(m);
  const cage = new Builder(); for (let i = -1; i <= 1; i++) cage.box(0.012, 0.18, 0.012, '#d8d4c8', i * 0.06, 1.9, -0.17); cage.box(0.2, 0.012, 0.012, '#d8d4c8', 0, 1.88, -0.172); cage.mesh(body);
  return m;
}
export function animatePerson(p, moving, t, crouch = false) {
  if (!p) return;
  const u = p.userData, [aL, lL, aR, lR] = u.limbs, [fL, fR] = u.fore, [sL, sR] = u.shin, b = u.body;
  const pose = crouch ? 'crawl' : u.pose;
  b.rotation.set(0, 0, 0); b.position.set(0, 0, 0);
  aL.rotation.set(0, 0, -0.05); aR.rotation.set(0, 0, 0.05); fL.rotation.set(0.12, 0, 0); fR.rotation.set(0.12, 0, 0);
  lL.rotation.set(0, 0, 0); lR.rotation.set(0, 0, 0); sL.rotation.set(0, 0, 0); sR.rotation.set(0, 0, 0);
  const s = Math.sin(t);
  if (pose === 'crawl') {
    b.rotation.x = -1.38; b.position.set(0, 0.18, 0.25);
    aL.rotation.x = 2.5 + (moving ? s * 0.5 : 0); aR.rotation.x = 2.5 - (moving ? s * 0.5 : 0); fL.rotation.x = fR.rotation.x = 0.4;
    lL.rotation.x = moving ? s * 0.35 : 0; lR.rotation.x = moving ? -s * 0.35 : 0; sL.rotation.x = -0.4; sR.rotation.x = -0.4;
  } else if (pose === 'swim') {
    b.rotation.x = -1.25; b.position.set(0, 0.35, 0.3);
    aL.rotation.x = (t * 0.9) % (Math.PI * 2); aR.rotation.x = (t * 0.9 + Math.PI) % (Math.PI * 2);
    lL.rotation.x = Math.sin(t * 2.4) * 0.35; lR.rotation.x = -Math.sin(t * 2.4) * 0.35;
  } else if (pose === 'tread') {
    aL.rotation.set(0.3, 0, -1.0 + Math.sin(t * 3) * 0.35); aR.rotation.set(0.3, 0, 1.0 - Math.sin(t * 3) * 0.35);
    lL.rotation.x = 0.5 + Math.sin(t * 3) * 0.4; lR.rotation.x = 0.5 - Math.sin(t * 3) * 0.4; sL.rotation.x = sR.rotation.x = -0.8;
  } else if (pose === 'kneel') {
    b.position.y = -0.42; lL.rotation.x = 1.45; sL.rotation.x = -1.45; lR.rotation.x = -0.1; sR.rotation.x = -1.5;
    aL.rotation.x = 0.6; aR.rotation.x = 0.35; fL.rotation.x = 0.5; b.rotation.x = -0.12;
  } else if (pose === 'hang') {
    aL.rotation.set(Math.PI * 0.97 + (moving ? s * 0.25 : 0), 0, 0.1); aR.rotation.set(Math.PI * 0.97 - (moving ? s * 0.25 : 0), 0, -0.1); fL.rotation.x = fR.rotation.x = 0;
    lL.rotation.x = moving ? s * 0.3 : 0.1; lR.rotation.x = moving ? -s * 0.3 : 0.1; sL.rotation.x = sR.rotation.x = -0.35;
  } else if (pose === 'kneelaim') {
    b.position.y = -0.42; lL.rotation.x = 1.45; sL.rotation.x = -1.45; lR.rotation.x = -0.1; sR.rotation.x = -1.5;
    aR.rotation.set(1.25, 0, -0.35); fR.rotation.x = 0.55; aL.rotation.set(1.45, 0, 0.42); fL.rotation.x = 0.22; b.rotation.y = 0.15;
  } else if (pose === 'aim') {
    aR.rotation.set(1.25, 0, -0.35); fR.rotation.x = 0.55; aL.rotation.set(1.45, 0, 0.42); fL.rotation.x = 0.22;
    lL.rotation.x = moving ? s * 0.55 : 0.18; lR.rotation.x = moving ? -s * 0.55 : -0.18;
    sL.rotation.x = moving ? -Math.max(0, Math.sin(t + 1.2)) * 0.65 : 0;
    sR.rotation.x = moving ? -Math.max(0, Math.sin(t + 1.2 + Math.PI)) * 0.65 : 0;
    b.rotation.y = 0.15;
  } else if (moving) {
    lL.rotation.x = s * 0.7; lR.rotation.x = -s * 0.7;
    sL.rotation.x = -Math.max(0, Math.sin(t + 1.2)) * 1.1; sR.rotation.x = -Math.max(0, Math.sin(t + 1.2 + Math.PI)) * 1.1;
    aL.rotation.x = -s * 0.6; aR.rotation.x = s * 0.6; fL.rotation.x = 0.35 + Math.max(0, -s) * 0.4; fR.rotation.x = 0.35 + Math.max(0, s) * 0.4;
    b.position.y = Math.abs(Math.cos(t)) * 0.045; b.rotation.x = -0.05;
  } else {
    b.position.y = Math.sin(t * 0.25) * 0.006;
  }
}

/* ---------- textures for flags and decals ---------- */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const usFlagTex = canvasTex(256, 136, (g, w, h) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#b22234'; g.fillRect(0, i * h / 13, w, h / 13 + 1); }
  g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = '#fff';
  for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) g.fillRect(6 + c * 16 + (r % 2 ? 8 : 0), 4 + r * 7.6, 3, 3);
});
const usmcFlagTex = canvasTex(256, 136, (g, w, h) => {
  g.fillStyle = '#a6192e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffc72c'; g.lineWidth = 6;
  g.beginPath(); g.arc(w / 2, h / 2 + 4, 30, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(w / 2 - 30, h / 2 + 4); g.lineTo(w / 2 + 30, h / 2 + 4); g.moveTo(w / 2, h / 2 - 26); g.lineTo(w / 2, h / 2 + 34); g.stroke();
  g.fillStyle = '#ffc72c'; g.beginPath(); g.moveTo(w / 2 - 34, h / 2 - 34); g.lineTo(w / 2, h / 2 - 22); g.lineTo(w / 2 + 34, h / 2 - 34); g.lineTo(w / 2, h / 2 - 28); g.fill();
  g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText('SEMPER FIDELIS', w / 2, h - 10);
});
const footTex = canvasTex(128, 128, (g) => {
  g.fillStyle = '#f2c230';
  const foot = (x, rot) => { g.save(); g.translate(x, 64); g.rotate(rot); g.beginPath(); g.ellipse(0, -14, 13, 30, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0, 30, 10, 14, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
  foot(42, -0.12); foot(86, 0.12);
});
footTex.userData = { keep: true }; usFlagTex.userData = { keep: true }; usmcFlagTex.userData = { keep: true };
const footMat = new THREE.MeshStandardMaterial({ map: footTex, transparent: true, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
footMat.userData.keep = true;

/* ---------- environment / lighting ---------- */
const skyUniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;
  void main(){ float h = vDir.y; vec3 col = h > 0.0 ? mix(horizon, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(horizon, bottom, clamp(-h*4.0,0.0,1.0));
  float d = max(dot(normalize(vDir), normalize(sunDir)), 0.0); col += sunCol * (pow(d, 900.0) * 3.0 + pow(d, 12.0) * 0.35 + pow(d,3.0)*0.08);
  gl_FragColor = vec4(col, 1.0); }`
}));
sky.renderOrder = -10; sky.frustumCulled = false;
export const ENV = {
  receive: { top: '#16203f', horizon: '#d98a62', bottom: '#2b2a33', fog: '#3e3e55', near: 30, far: 175, sun: '#ffb07a', si: 1.0, sunPos: [-40, 9, -70], hs: '#7d8fc8', hg: '#3a3328', hi: 1.15, exp: 1.05, night: true },
  drill: { top: '#3f84d1', horizon: '#f0dfbd', bottom: '#8b8676', fog: '#d6d0bd', near: 70, far: 230, sun: '#fff1d6', si: 3.1, sunPos: [-30, 50, 25], hs: '#cfe0ff', hg: '#6e6550', hi: 1.7, exp: 1.08 },
  course: { top: '#3a80d6', horizon: '#ece3c6', bottom: '#8b8676', fog: '#ddd5bd', near: 70, far: 230, sun: '#fff3df', si: 3.3, sunPos: [25, 60, 10], hs: '#cfe0ff', hg: '#75684e', hi: 1.6, exp: 1.05 },
  swim: { top: '#2c7ddf', horizon: '#d4eaf2', bottom: '#8b9a9a', fog: '#cfe2e6', near: 70, far: 240, sun: '#fff6e8', si: 3.2, sunPos: [30, 55, 30], hs: '#d5e8ff', hg: '#6a6b5a', hi: 1.7, exp: 1.05 },
  combat: { top: '#4b6fb3', horizon: '#f6c287', bottom: '#857560', fog: '#e2bf98', near: 50, far: 200, sun: '#ffbf80', si: 3.0, sunPos: [-55, 22, 10], hs: '#c9cff0', hg: '#6d5a40', hi: 1.35, exp: 1.08 },
  range: { top: '#7b9cc0', horizon: '#e6dfcc', bottom: '#8f8a78', fog: '#d9d3c0', near: 45, far: 175, sun: '#fff0d4', si: 2.5, sunPos: [30, 40, 35], hs: '#d6e0ee', hg: '#6f6650', hi: 1.75, exp: 1.05 },
  crucible: { top: '#2f3f68', horizon: '#f09a62', bottom: '#5d4c42', fog: '#b98b74', near: 35, far: 160, sun: '#ff9d64', si: 2.2, sunPos: [0, 10, -120], hs: '#a9afd0', hg: '#6a5844', hi: 1.7, exp: 1.25 },
  forest: { top: '#4f86c6', horizon: '#dfe6d2', bottom: '#5d6b4a', fog: '#c4cfba', near: 45, far: 190, sun: '#fff1d8', si: 2.8, sunPos: [-30, 45, 20], hs: '#d2e2f0', hg: '#4e5a36', hi: 1.6, exp: 1.05 },
  night: { top: '#070b1c', horizon: '#26304f', bottom: '#14161f', fog: '#1b2034', near: 25, far: 140, sun: '#9fb4ff', si: 1.15, sunPos: [30, 40, -40], hs: '#6f82c4', hg: '#2a2a33', hi: 1.25, exp: 1.25, night: true },
  coast: { top: '#3d88d8', horizon: '#e9e6d6', bottom: '#8a8f86', fog: '#dfe3dc', near: 60, far: 220, sun: '#fff4e0', si: 3.1, sunPos: [35, 50, 10], hs: '#d5e6ff', hg: '#6c6a55', hi: 1.65, exp: 1.05 },
  mountain: { top: '#3d6fb8', horizon: '#e4ecf2', bottom: '#9aa3a8', fog: '#d9e2e8', near: 50, far: 200, sun: '#ffffff', si: 3.0, sunPos: [-20, 40, 30], hs: '#e2ecff', hg: '#8a8f92', hi: 1.8, exp: 1.0 },
  grad: { top: '#3b6db2', horizon: '#ffc37d', bottom: '#8a7b63', fog: '#f0cfa2', near: 60, far: 220, sun: '#ffd099', si: 2.9, sunPos: [-25, 22, -90], hs: '#cdd6f3', hg: '#6e5c43', hi: 1.45, exp: 1.08 }
};
export function initLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x555555, 1.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 200 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target); scene.add(sky);
  return { hemi, sun };
}
let current = ENV.drill;
export function applyEnv(kind, scene, lights, renderer) {
  const e = current = ENV[kind];
  skyUniforms.top.value.set(e.top); skyUniforms.horizon.value.set(e.horizon); skyUniforms.bottom.value.set(e.bottom); skyUniforms.sunCol.value.set(e.sun);
  skyUniforms.sunDir.value.set(...e.sunPos).normalize();
  scene.background = new THREE.Color(e.horizon); scene.fog = new THREE.Fog(e.fog, e.near, e.far);
  lights.hemi.color.set(e.hs); lights.hemi.groundColor.set(e.hg); lights.hemi.intensity = e.hi;
  lights.sun.color.set(e.sun); lights.sun.intensity = e.si; renderer.toneMappingExposure = e.exp;
}
const sunOff = new THREE.Vector3();
const animated = { flags: [], water: null, clouds: null, lamps: [] };
export function updateArt(t, camera, focus, lights) {
  sky.position.copy(camera.position);
  sunOff.set(...current.sunPos).normalize().multiplyScalar(70);
  lights.sun.position.copy(focus).add(sunOff); lights.sun.target.position.copy(focus);
  for (const f of animated.flags) {
    const pos = f.geometry.attributes.position, base = f.userData.base;
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; const k = (x + f.userData.w / 2) / f.userData.w; pos.setZ(i, Math.sin(x * 2.2 - t * 5 + f.userData.ph) * 0.18 * k); pos.setY(i, base[i * 3 + 1] - k * k * 0.12); }
    pos.needsUpdate = true; f.geometry.computeVertexNormals();
  }
  if (animated.water) {
    const w = animated.water, pos = w.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, Math.sin(x * 1.4 + t * 1.9) * 0.035 + Math.cos(y * 0.9 - t * 1.4) * 0.04); }
    pos.needsUpdate = true; w.geometry.computeVertexNormals();
  }
  if (animated.clouds) animated.clouds.position.x = Math.sin(t * 0.01) * 20 + t * 0.4 % 80;
}
export function resetAnimated() { animated.flags = []; animated.water = null; animated.clouds = null; animated.lamps = []; }

/* ---------- terrain & nature ---------- */
const n2 = (x, z) => Math.sin(x * 0.045 + Math.sin(z * 0.031) * 2.1) * 0.5 + Math.sin(z * 0.052 + x * 0.021) * 0.35 + Math.sin((x + z) * 0.11) * 0.15;
export function terrain(parent, palette, flatW = 18, opts = {}) {
  const size = opts.size || 340, cz = opts.center ?? -40, zMin = opts.zMin ?? -105; const geo = new THREE.PlaneGeometry(size, size, Math.round(size / 3.1), Math.round(size / 3.1)); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, cz);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const cA = new THREE.Color(palette[0]), cB = new THREE.Color(palette[1]), cC = new THREE.Color(palette[2]), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const dx = Math.max(0, Math.abs(x) - flatW), dz = Math.max(0, z - 22, zMin - z), d = Math.hypot(dx, dz);
    const rise = Math.min(1, d / 30);
    const h = d > 0 ? rise * rise * (6 + n2(x, z) * 5) + Math.max(0, d - 60) * 0.25 : 0;
    pos.setY(i, opts.hole && opts.hole(x, z) ? -2.2 : h - 0.04);
    const n = n2(x * 2.3, z * 2.3) * 0.5 + 0.5;
    tmp.copy(cA).lerp(cB, n); if (h > 4) tmp.lerp(cC, Math.min(1, (h - 4) / 10));
    const f = 0.94 + rand() * 0.1; col[i * 3] = tmp.r * f; col[i * 3 + 1] = tmp.g * f; col[i * 3 + 2] = tmp.b * f;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, vMat); m.receiveShadow = true; parent.add(m);
  return (x, z) => { const dx = Math.max(0, Math.abs(x) - flatW), dz = Math.max(0, z - 22, zMin - z), d = Math.hypot(dx, dz); const rise = Math.min(1, d / 30); return d > 0 ? rise * rise * (6 + n2(x, z) * 5) + Math.max(0, d - 60) * 0.25 : 0; };
}
function palmGeo() {
  const b = new Builder(); let x = 0, y = 0;
  for (let i = 0; i < 9; i++) { const nx = x + 0.06 * i * 0.25; b.cyl(0.2 - i * 0.008, 0.23 - i * 0.008, 0.9, i % 2 ? '#8a7352' : '#7a6447', nx, y + 0.45, 0, 7); b.cyl(0.235 - i * 0.008, 0.235 - i * 0.008, 0.08, '#5f4e37', nx, y + 0.88, 0, 7); x = nx; y += 0.9; }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, droop = 0.35 + (i % 3) * 0.2;
    for (let s = 0; s < 4; s++) {
      const r = 0.6 + s * 0.75, fx = x + Math.cos(a) * r, fz = Math.sin(a) * r, fy = y + 0.25 - s * s * 0.14 * droop * 2;
      b.box(0.9, 0.04, 0.42 - s * 0.07, s % 2 ? '#4f6a35' : '#5d7a3c', fx, fy, fz, 0, -a, -0.35 * s * droop);
    }
  }
  b.ico(0.32, '#5a4a30', x, y + 0.1, 0, 0);
  return b.geometry();
}
function shrubGeo() { const b = new Builder(); for (let i = 0; i < 4; i++) b.ico(0.5 + rand() * 0.3, i % 2 ? '#6b7445' : '#7c7f4c', rr(-0.4, 0.4), 0.35 + rand() * 0.2, rr(-0.4, 0.4), 0, 1, 0.7, 1); return b.geometry(); }
function rockGeo() { const g = new THREE.IcosahedronGeometry(1, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rr(0.7, 1.2), p.getY(i) * rr(0.45, 0.8), p.getZ(i) * rr(0.7, 1.2)); const b = new Builder(); b.add(g, '#8d8374', 0, 0.2, 0, 0, 0, 0, 0); return b.geometry(); }
function grassGeo() { const b = new Builder(); for (let i = 0; i < 5; i++) b.cone(0.05, 0.5 + rand() * 0.3, i % 2 ? '#8f8a4f' : '#a59b5c', rr(-0.15, 0.15), 0.3, rr(-0.15, 0.15), 3, rr(-0.3, 0.3), 0, rr(-0.3, 0.3)); return b.geometry(); }
function pineGeo() { const b = new Builder(); b.cyl(0.14, 0.22, 2.2, '#5e4a33', 0, 1.1, 0, 6); for (let i = 0; i < 4; i++) b.cone(1.6 - i * 0.32, 1.9, i % 2 ? '#2f4a2c' : '#38573a', 0, 2 + i * 1.05, 0, 7); return b.geometry(); }
function snowPineGeo() { const b = new Builder(); b.cyl(0.14, 0.22, 2.2, '#5e4a33', 0, 1.1, 0, 6); for (let i = 0; i < 4; i++) { b.cone(1.6 - i * 0.32, 1.9, '#2f4a3a', 0, 2 + i * 1.05, 0, 7); b.cone(1.0 - i * 0.2, 0.6, '#eef3f6', 0, 2.75 + i * 1.05, 0, 7); } return b.geometry(); }
function oakGeo() { const b = new Builder(); b.cyl(0.2, 0.3, 2.6, '#5b4630', 0, 1.3, 0, 7); for (let i = 0; i < 5; i++) b.ico(rr(1.1, 1.6), i % 2 ? '#4d6b34' : '#5a7a3c', rr(-0.9, 0.9), rr(3, 4.2), rr(-0.9, 0.9), 0, 1, 0.85, 1); return b.geometry(); }
const GEO = {};
function geoOf(k) { return GEO[k] || (GEO[k] = { palm: palmGeo, shrub: shrubGeo, rock: rockGeo, grass: grassGeo, pine: pineGeo, snowpine: snowPineGeo, oak: oakGeo }[k]()); }

export function scatter(parent, kind, count, place, scale = [0.8, 1.3], shadow = true) {
  const geo = geoOf(kind); const im = new THREE.InstancedMesh(geo, vMat, count); im.userData.keepGeo = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  let n = 0;
  for (let tries = 0; tries < count * 6 && n < count; tries++) {
    const r = place(); if (!r) continue;
    const sc = rr(scale[0], scale[1]); e.set(kind === 'palm' || kind === 'oak' ? rr(-0.06, 0.06) : 0, rand() * Math.PI * 2, kind === 'palm' ? rr(-0.06, 0.06) : 0); q.setFromEuler(e);
    p.set(r[0], r[1] ?? 0, r[2]); s.set(sc, sc * (kind === 'rock' ? rr(0.7, 1.3) : 1), sc); m.compose(p, q, s); im.setMatrixAt(n++, m);
  }
  im.count = n; im.castShadow = shadow; im.receiveShadow = true; parent.add(im); return im;
}
export function mountains(parent, colors = ['#8e8a7c', '#b6ad98'], cz = -40, rad = 1) {
  const b = new Builder();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rr(-0.1, 0.1), r = rr(170, 215) * rad, x = Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * rr(0.9, 1.1), Math.max(-0.2, p.getY(k)) * rr(0.9, 1.15), p.getZ(k) * rr(0.9, 1.1));
    g.scale(rr(30, 55), rr(22, 48), rr(30, 50)); b.add(g, i % 2 ? colors[0] : colors[1], x, -6, z, 0, rand() * 3, 0, 0.06);
  }
  b.mesh(parent, false);
}
export function clouds(parent) {
  const b = new Builder();
  for (let i = 0; i < 16; i++) { const x = rr(-180, 180), z = rr(-220, 80), y = rr(55, 85); for (let k = 0; k < 5; k++) b.ico(rr(5, 9), '#ffffff', x + rr(-10, 10), y + rr(-2, 2), z + rr(-5, 5), 1, 1.6, 0.55, 1, 0.02); }
  const m = b.mesh(parent, false); m.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, transparent: true, opacity: 0.82, fog: false, emissive: 0x555555 });
  animated.clouds = m; return m;
}

/* ---------- props ---------- */
export function flagPole(parent, x, z, which = 'us', h = 12) {
  const b = new Builder(); b.cyl(0.07, 0.1, h, '#c9ccd0', x, h / 2, z, 8).ico(0.16, '#d8b455', x, h + 0.1, z).cyl(0.6, 0.8, 0.4, '#b5ad9c', x, 0.2, z, 10); b.mesh(parent);
  const w = 3.4, hh = 1.8, geo = new THREE.PlaneGeometry(w, hh, 16, 6);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: which === 'us' ? usFlagTex : usmcFlagTex, side: THREE.DoubleSide, roughness: 0.8 }));
  m.material.userData.keep = true; m.position.set(x + w / 2 + 0.08, h - hh / 2 - 0.1, z); m.castShadow = true; parent.add(m);
  m.userData = { base: Float32Array.from(geo.attributes.position.array), w, ph: rand() * 6 }; animated.flags.push(m); return m;
}
export function lampPost(b, parent, x, z, side = 1, light = false) {
  b.cyl(0.07, 0.1, 5, '#3b3d40', x, 2.5, z, 8).box(1.1, 0.07, 0.07, '#3b3d40', x - side * 0.5, 5, z).box(0.4, 0.14, 0.24, '#2b2c2e', x - side * 1, 4.92, z).box(0.34, 0.03, 0.2, '#fff2c7', x - side * 1, 4.84, z);
  if (light) { const l = new THREE.PointLight(0xffc98a, 30, 18, 1.6); l.position.set(x - side * 1, 4.6, z); parent.add(l); }
}
export function footprints(parent, x, z, rows = 4, cols = 6, sp = 1.1) {
  const geo = new THREE.PlaneGeometry(0.85, 0.85); geo.rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(geo, footMat, rows * cols); const m = new THREE.Matrix4(); let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { m.makeTranslation(x + (c - (cols - 1) / 2) * sp, 0.045, z - r * sp); im.setMatrixAt(i++, m); }
  im.receiveShadow = true; parent.add(im);
}
// Spanish-colonial style recruit depot building (MCRD San Diego inspired).
export function depotBuilding(b, x, z, len = 22, depth = 12, face = 1, floors = 2) {
  const wallC = '#e6d6b4', trim = '#f3eadb', roof = '#b65a35', glass = '#3d4f58';
  const fh = 3.6, H = floors * fh, fx = x - face * depth / 2; // front plane x
  b.box(depth, H, len, wallC, x, H / 2, z, 0, 0, 0, 0.02);
  b.box(depth + 0.3, 0.35, len + 0.3, trim, x, H + 0.1, z);
  // hipped tile roof
  for (let i = 0; i < 6; i++) { const t = i / 6; b.box((depth + 1) * (1 - t * 0.85), 0.32, (len + 1) * (1 - t * 0.35), i % 2 ? roof : '#a84f2e', x, H + 0.4 + i * 0.3, z, 0, 0, 0, 0.03); }
  for (let k = -len / 2; k <= len / 2; k += 0.9) b.box(0.08, 0.06, 0.08, '#8e3f24', fx + face * 0.2, H + 0.32, z + k);
  // arcade
  const arcD = 2.4, ax = fx - face * arcD;
  b.box(arcD, 0.3, len, '#d9c6a0', fx - face * arcD / 2, fh - 0.15, z); // walkway roof
  b.box(arcD + 0.2, 0.08, len + 0.1, '#b0a184', fx - face * arcD / 2, 0.04, z);
  for (let k = -len / 2; k <= len / 2 + 0.01; k += len / Math.round(len / 3)) {
    b.box(0.42, fh - 0.3, 0.42, trim, ax, (fh - 0.3) / 2, z + k);
    b.box(0.55, 0.18, 0.55, trim, ax, 0.09, z + k);
  }
  const bays = Math.round(len / 3), bay = len / bays;
  for (let i = 0; i < bays; i++) { const cz = z - len / 2 + bay * (i + 0.5);
    b.box(0.3, 0.55, bay - 0.5, trim, ax, fh - 0.62, cz); // arch spandrel
    b.box(0.32, 0.25, bay - 1.2, trim, ax, fh - 0.98, cz);
  }
  // windows and doors on both floors
  for (let f = 0; f < floors; f++) for (let i = 0; i < bays; i++) {
    const cz = z - len / 2 + bay * (i + 0.5), y = f * fh + (f === 0 ? 1.15 : 1.9);
    if (f === 0 && i === Math.floor(bays / 2)) { b.box(0.12, 2.3, 1.5, '#5a4130', fx - face * 0.05, 1.15, cz).box(0.14, 0.15, 1.8, trim, fx - face * 0.06, 2.35, cz); continue; }
    b.box(0.1, 1.5, 1.1, glass, fx - face * 0.05, y + 0.25, cz).box(0.14, 0.12, 1.35, trim, fx - face * 0.06, y - 0.55, cz).box(0.14, 0.12, 1.35, trim, fx - face * 0.06, y + 1.05, cz).box(0.13, 1.5, 0.06, trim, fx - face * 0.07, y + 0.25, cz);
  }
  // back/side windows
  for (let i = 0; i < bays; i++) for (let f = 0; f < floors; f++) b.box(0.1, 1.2, 1, glass, x + face * depth / 2 + face * 0.05, f * fh + 1.9, z - len / 2 + bay * (i + 0.5));
}
export function bus(b, x, z, ry = 0) {
  const P = (px, py, pz) => { const c = Math.cos(ry), s = Math.sin(ry); return [x + px * c + pz * s, py, z - px * s + pz * c]; };
  const add = (w, h, d, col, px, py, pz) => { const [a, bb, c] = P(px, py, pz); b.box(w, h, d, col, a, bb, c, 0, ry, 0); };
  add(2.6, 2.4, 11, '#e9e7df', 0, 1.65, 0); add(2.62, 0.75, 9.6, '#232a30', 0, 2.2, 0.4); add(2.62, 0.12, 11.02, '#4e5a66', 0, 1.25, 0);
  add(2.4, 0.9, 0.05, '#232a30', 0, 2.1, -5.52); add(0.8, 1.9, 0.06, '#232a30', 1.31, 1.35, -4.3);
  add(2.4, 0.3, 0.2, '#b5b4ae', 0, 0.55, -5.55); add(0.4, 0.2, 0.06, '#fff4c4', -0.9, 0.95, -5.53); add(0.4, 0.2, 0.06, '#fff4c4', 0.9, 0.95, -5.53);
  for (const wz of [-3.6, 3.4]) for (const wx of [-1.2, 1.2]) { const [a, bb, c] = P(wx, 0.5, wz); b.cyl(0.5, 0.5, 0.35, '#1d1d1f', a, bb, c, 12, 0, ry, Math.PI / 2); }
}
export function bleachers(b, x, z, len = 14, face = 1, rows = 5) {
  for (let r = 0; r < rows; r++) { b.box(1, 0.12, len, '#9aa1a6', x + face * r * 0.9, 0.45 + r * 0.55, z); b.box(0.06, 0.5 + r * 0.55, len, '#6d7378', x + face * (r * 0.9 + 0.45), (0.5 + r * 0.55) / 2, z); }
  for (let k = -len / 2; k <= len / 2; k += len / 4) b.box(0.08, rows * 0.55 + 0.5, 0.08, '#55595d', x + face * (rows - 1) * 0.9, (rows * 0.55 + 0.5) / 2, z + k);
}
export function crowd(parent, x, z, len, face = 1, rows = 5) {
  const b = new Builder(); b.box(0.38, 0.5, 0.25, '#ffffff', 0, 0.25, 0, 0, 0, 0, 0).box(0.2, 0.22, 0.2, '#e0b591', 0, 0.62, 0, 0, 0, 0, 0);
  const geo = b.geometry(), count = rows * Math.floor(len / 0.65);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), count);
  const shirts = ['#c8102e', '#ffc72c', '#2e5ea8', '#e9e6dc', '#3d6b3f', '#7a4a8c', '#d9772b', '#1d1d1f'];
  const m = new THREE.Matrix4(), c = new THREE.Color(); let i = 0;
  for (let r = 0; r < rows; r++) for (let k = 0; k < Math.floor(len / 0.65); k++) {
    if (rand() < 0.15) continue; m.makeTranslation(x + face * r * 0.9, 0.51 + r * 0.55, z - len / 2 + k * 0.65 + rr(-0.1, 0.1)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(shirts[Math.floor(rand() * shirts.length)])); i++;
  }
  im.count = i; im.castShadow = true; parent.add(im); return im;
}
export function sandbags(b, x, z, len, ry = 0, layers = 2) {
  for (let l = 0; l < layers; l++) for (let k = 0; k < len; k++) { const o = (k - len / 2 + (l % 2) * 0.5) * 0.62; b.box(0.6, 0.24, 0.38, l % 2 ? '#b8a77a' : '#a99a70', x + Math.cos(ry) * o, 0.12 + l * 0.24, z - Math.sin(ry) * o, 0, ry + rr(-0.06, 0.06), 0, 0.06); }
}
export function tower(b, x, z, h = 6, cabin = '#c9b48a') {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.18, h, 0.18, '#6d5b43', x + dx * 1.1, h / 2, z + dz * 1.1);
  b.box(2.8, 0.15, 2.8, '#6d5b43', x, h, z).box(2.6, 1.9, 2.6, cabin, x, h + 1, z).box(2.62, 0.8, 2.62, '#3d4f58', x, h + 1.25, z).box(3.2, 0.15, 3.2, '#8e3f24', x, h + 2.05, z);
  for (let i = 0; i < Math.floor(h / 0.6); i++) b.box(0.6, 0.06, 0.18, '#7f6b50', x + 1.5, 0.3 + i * 0.6, z + 1.2);
}
export function logWall(b, x, z, w, h, color = '#7d6247') {
  const n = Math.max(1, Math.round(h / 0.3));
  for (let i = 0; i < n; i++) b.cyl(0.16, 0.16, w, i % 2 ? color : '#6b533b', x, 0.15 + i * (h / n), z, 8, 0, 0, Math.PI / 2, 0.05);
  b.box(0.22, h + 0.5, 0.22, '#5c4632', x - w / 2 - 0.1, (h + 0.5) / 2, z).box(0.22, h + 0.5, 0.22, '#5c4632', x + w / 2 + 0.1, (h + 0.5) / 2, z);
}
export function plankWall(b, x, z, w, h) {
  for (let i = 0; i < Math.round(w / 0.3); i++) b.box(0.29, h, 0.18, i % 2 ? '#8b6e4c' : '#7c6142', x - w / 2 + 0.15 + i * 0.3, h / 2, z, 0, 0, 0, 0.05);
  b.box(w + 0.6, 0.2, 0.3, '#5c4632', x, h, z).box(0.3, h + 0.6, 0.3, '#5c4632', x - w / 2 - 0.2, (h + 0.6) / 2, z).box(0.3, h + 0.6, 0.3, '#5c4632', x + w / 2 + 0.2, (h + 0.6) / 2, z);
  for (const rx of [-2, 0, 2]) b.cyl(0.035, 0.035, h, '#c9b58a', x + rx, h / 2, z + 0.12, 5);
}
export function wireField(b, parent, x, z, w = 8, len = 6) {
  for (const side of [-1, 1]) for (let k = -len / 2; k <= len / 2; k += 1.5) b.box(0.1, 1.15, 0.1, '#5b4a34', x + side * w / 2, 0.57, z + k);
  for (let k = -len / 2; k <= len / 2; k += 1.5) b.cyl(0.015, 0.015, w, '#9a9a90', x, 1.05, z + k, 4, 0, 0, Math.PI / 2, 0);
  for (const side of [-1, 1]) b.cyl(0.015, 0.015, len, '#9a9a90', x + side * w / 2, 1.05, z, 4, Math.PI / 2, 0, 0, 0);
  // coiled concertina along the strands
  for (let k = -len / 2; k <= len / 2; k += 0.75) for (let s = -w / 2 + 0.4; s < w / 2; s += 0.8) b.torus(0.18, 0.012, '#b3b3a8', x + s, 1.05, z + k, 0, Math.PI / 2);
  b.box(w, 0.04, len, '#8a7a5a', x, 0.02, z);
}
export function water(parent, w, l, x, y, z) {
  const geo = new THREE.PlaneGeometry(w, l, Math.round(w * 2), Math.round(l * 2));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#1f7fa8', roughness: 0.35, metalness: 0.0, transparent: true, opacity: 0.62, flatShading: true }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); animated.water = m; return m;
}
export function placeBuilt(parent, build, x, z, ry) { const b = new Builder(); build(b); const g = b.geometry(); g.rotateY(ry); g.translate(x, 0, z); const m = new THREE.Mesh(g, vMat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
